import { appState as defaultState } from "./data.js";
import {
  buildProfileWithRulesets,
  ensureProfileShape,
  getFirstUnansweredQuestionId,
  getNextQuestionId,
  getQuestionById,
  getVisibleQuestions,
  pruneHiddenAnswers,
} from "./interview.js";
import { clearState, loadState, saveState } from "./storage.js";

let state = loadState(defaultState);
state.interviewProfile = buildProfileWithRulesets(ensureProfileShape(state.interviewProfile));

export function getState() {
  return state;
}

export function getActiveView() {
  return state.ui?.activeView ?? "working";
}

export function setActiveView(activeView) {
  state.ui = { ...state.ui, activeView };
  saveState(state);
}

export function resetLocalData() {
  clearState();
  state = loadState(defaultState);
  state.interviewProfile = buildProfileWithRulesets(ensureProfileShape(state.interviewProfile));
}

export function getInterviewState() {
  const profile = buildProfileWithRulesets(ensureProfileShape(state.interviewProfile));
  const visibleQuestions = getVisibleQuestions(profile);
  const currentQuestionId = state.interview.currentQuestionId ?? getFirstUnansweredQuestionId(profile);

  return {
    currentQuestion: currentQuestionId ? getQuestionById(currentQuestionId) : null,
    answeredQuestions: visibleQuestions.filter((question) => profile[question.category]?.[question.field]),
    completed: state.interview.completed,
    profile,
    progress: {
      answered: visibleQuestions.filter((question) => profile[question.category]?.[question.field]).length,
      total: visibleQuestions.length,
    },
  };
}

export function answerInterviewQuestion(questionId, value) {
  const question = getQuestionById(questionId);
  if (!question) {
    return;
  }

  state.interviewProfile = ensureProfileShape(state.interviewProfile);
  state.interviewProfile[question.category][question.field] = value;
  state.interviewProfile = pruneHiddenAnswers(state.interviewProfile);
  state.interviewProfile = buildProfileWithRulesets(state.interviewProfile);

  const nextQuestionId = getNextQuestionId(state.interviewProfile, questionId);
  state.interview.currentQuestionId = nextQuestionId;
  state.interview.completed = nextQuestionId === null;
  saveState(state);
}

export function editInterviewAnswer(questionId) {
  if (!getQuestionById(questionId)) {
    return;
  }

  state.interview.currentQuestionId = questionId;
  state.interview.completed = false;
  saveState(state);
}

export function markDone(collectionName, id) {
  const item = findByCollection(collectionName, id);
  if (!item) {
    return;
  }

  item.status = "done";
  item.completed = true;
  item.completedAt = new Date().toISOString();
  delete item.snoozedUntil;
  saveState(state);
}

export function doItNow(collectionName, id) {
  const item = findByCollection(collectionName, id);
  if (!item) {
    return;
  }

  item.status = "doing";
  item.startedAt = new Date().toISOString();
  delete item.snoozedUntil;
  delete item.skippedUntil;
  saveState(state);
}

export function snoozeItem(collectionName, id) {
  const item = findByCollection(collectionName, id);
  if (!item) {
    return;
  }

  item.status = "snoozed";
  item.completed = false;
  item.snoozedUntil = getSnoozeLabel();
  saveState(state);
}

export function skipItem(collectionName, id) {
  const item = findByCollection(collectionName, id);
  if (!item) {
    return;
  }

  item.status = "skipped";
  item.completed = false;
  item.skippedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  saveState(state);
}

export function addTask(formData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return;
  }

  const areaId = String(formData.get("areaId") ?? "projects");
  state.actions.unshift({
    id: `action-${Date.now()}`,
    areaId,
    title,
      dueDate: String(formData.get("dueDate") ?? "Today"),
      status: "todo",
      priority: String(formData.get("priority") ?? "Medium"),
      estimatedEffortMinutes: 15,
      createdAt: new Date().toISOString(),
    });
  saveState(state);
}

export function getDecisionRecommendation() {
  const scored = getScoredActionableItems();
  if (scored.length === 0) {
    return null;
  }

  const unskipped = scored.filter((candidate) => !candidate.isSkipped);
  return unskipped[0] ?? scored[0];
}

export function getWorkingModeData() {
  const recommendation = getDecisionRecommendation();
  const comingUp = getNextUpcomingItem(recommendation?.item.id);

  return {
    now: recommendation,
    comingUp,
    timeRemaining: recommendation ? getTimeRemainingLabel(comingUp) : "Time Remaining: Due now",
  };
}

export function formatTimeRemaining(minutesUntilDue) {
  if (minutesUntilDue <= 0) {
    return "Time Remaining: Due now";
  }

  const hours = Math.floor(minutesUntilDue / 60);
  const minutes = minutesUntilDue % 60;

  if (hours === 0) {
    return `Time Remaining: ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  }

  if (minutes === 0) {
    return `Time Remaining: ${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  return `Time Remaining: ${hours} ${hours === 1 ? "hour" : "hours"} ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

export function getScoredActionableItems() {
  return getActionableCandidates()
    .filter((candidate) => !isDone(candidate.item))
    .map(scoreCandidate)
    .sort((left, right) => right.score - left.score || left.order - right.order);
}

export function getTodayStats() {
  const items = allCompletableItems();
  return {
    open: items.filter(isOpen).length,
    done: items.filter(isDone).length,
    snoozed: items.filter(isSnoozed).length,
    next: getNextItem(),
  };
}

export function getOpenTodayActions() {
  return state.actions.filter((action) => action.dueDate === "Today" && isOpen(action));
}

export function isDone(item) {
  return item.completed === true || item.status === "done" || item.status === "Done";
}

export function isSnoozed(item) {
  return item.status === "snoozed" || item.status === "Snoozed";
}

export function isSkipped(item) {
  if (!(item.status === "skipped" || item.status === "Skipped")) {
    return false;
  }

  return !item.skippedUntil || new Date(item.skippedUntil).getTime() > Date.now();
}

export function isOpen(item) {
  return !isDone(item) && !isSnoozed(item) && !isSkipped(item);
}

export function statusText(item) {
  if (isDone(item)) {
    return "Done";
  }
  if (isSnoozed(item)) {
    return item.snoozedUntil ? `Snoozed until ${item.snoozedUntil}` : "Snoozed";
  }
  if (isSkipped(item)) {
    return "Skipped for now";
  }
  return item.status && item.status !== "todo" ? titleCase(item.status) : "Open";
}

export function statusTone(item) {
  if (isDone(item)) {
    return "done";
  }
  if (isSnoozed(item)) {
    return "snooze";
  }
  if (isSkipped(item)) {
    return "snooze";
  }
  return "warn";
}

function allCompletableItems() {
  return [...state.actions, ...state.routines, ...state.timeline];
}

function getActionableCandidates() {
  return [
    ...state.actions.map((item, index) => ({ collection: "actions", item, order: index })),
    ...state.routines.map((item, index) => ({ collection: "routines", item, order: state.actions.length + index })),
    ...state.timeline.map((item, index) => ({
      collection: "timeline",
      item,
      order: state.actions.length + state.routines.length + index,
    })),
    ...state.focusSessions.map((item, index) => ({
      collection: "focusSessions",
      item,
      order: state.actions.length + state.routines.length + state.timeline.length + index,
    })),
  ];
}

function scoreCandidate(candidate) {
  const reasons = [];
  const { item } = candidate;
  let score = 0;

  if (isOverdue(item)) {
    score += 100;
    reasons.push("overdue");
  }

  if (isDueToday(item)) {
    score += 50;
    reasons.push("due today");
  }

  if (item.priority === "High") {
    score += 25;
    reasons.push("high priority");
  }

  if (item.priority === "Medium") {
    score += 10;
    reasons.push("medium priority");
  }

  const effort = getEstimatedEffort(item);
  if (effort <= 15) {
    score += 15;
    reasons.push("quick to finish");
  } else if (effort <= 30) {
    score += 10;
    reasons.push("manageable effort");
  }

  if (isSnoozed(item)) {
    score -= 20;
    reasons.push("currently snoozed");
  }

  const skipped = isSkipped(item);
  if (skipped) {
    score -= 30;
    reasons.push("recently skipped");
  }

  return {
    ...candidate,
    title: item.title ?? item.name,
    areaId: item.areaId,
    effort,
    score,
    reasons,
    why: formatWhy(reasons),
    isSkipped: skipped,
  };
}

function getEstimatedEffort(item) {
  return Number(item.estimatedEffortMinutes ?? 30);
}

function isOverdue(item) {
  if (item.dueDate === "Overdue") {
    return true;
  }

  if (!item.dueDate || item.dueDate === "Today" || item.dueDate === "Tomorrow" || item.dueDate === "This week") {
    return false;
  }

  const due = new Date(item.dueDate);
  if (Number.isNaN(due.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function isDueToday(item) {
  return item.dueDate === "Today" || "time" in item || item.type === "Focus Session";
}

function formatWhy(reasons) {
  if (reasons.length === 0) {
    return "It is the best available next action based on your visible commitments.";
  }

  return `Selected because it is ${reasons.join(", ")}.`;
}

function getNextItem() {
  return getDecisionRecommendation()?.item ?? null;
}

function getNextUpcomingItem(currentItemId) {
  return state.timeline.find((item) => item.id !== currentItemId && isOpen(item)) ?? null;
}

function getTimeRemainingLabel(comingUp) {
  if (!comingUp?.time) {
    return "Time Remaining: Due now";
  }

  return formatTimeRemaining(getMinutesUntilTime(comingUp.time));
}

function getMinutesUntilTime(timeText) {
  const target = parseTodayTime(timeText);
  if (!target) {
    return 0;
  }

  return Math.max(Math.ceil((target.getTime() - Date.now()) / 60000), 0);
}

function parseTodayTime(timeText) {
  const match = String(timeText).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) {
    hours += 12;
  }
  if (period === "AM" && hours === 12) {
    hours = 0;
  }

  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  return target;
}

function findByCollection(collectionName, id) {
  return state[collectionName]?.find((item) => item.id === id);
}

function getSnoozeLabel() {
  const date = new Date(Date.now() + 30 * 60 * 1000);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function titleCase(value) {
  return String(value)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
