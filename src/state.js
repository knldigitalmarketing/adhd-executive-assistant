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
  if (state.ui?.lastMorningBriefingDate !== getTodayKey()) {
    return "briefing";
  }

  return state.ui?.activeView ?? "working";
}

export function setActiveView(activeView) {
  state.ui = { ...state.ui, activeView };
  saveState(state);
}

export function startMyDay() {
  state.ui = {
    ...state.ui,
    activeView: "working",
    lastMorningBriefingDate: getTodayKey(),
  };
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
  if (collectionName === "recommendations") {
    state.recommendationState[id] = {
      ...state.recommendationState[id],
      status: "done",
      completed: true,
      completedAt: new Date().toISOString(),
    };
    saveState(state);
    return;
  }

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
  if (collectionName === "recommendations") {
    state.recommendationState[id] = {
      ...state.recommendationState[id],
      status: "doing",
      startedAt: new Date().toISOString(),
    };
    saveState(state);
    return;
  }

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
  if (collectionName === "recommendations") {
    snoozeRecommendation(id);
    return;
  }

  const item = findByCollection(collectionName, id);
  if (!item) {
    return;
  }

  item.status = "snoozed";
  item.completed = false;
  item.snoozedUntil = getSnoozeLabel();
  saveState(state);
}

export function snoozeRecommendation(id) {
  state.recommendationState[id] = {
    ...state.recommendationState[id],
    status: "snoozed",
    snoozedUntil: getSnoozeLabel(),
  };
  saveState(state);
}

export function skipItem(collectionName, id) {
  if (collectionName === "recommendations") {
    state.recommendationState[id] = {
      ...state.recommendationState[id],
      status: "skipped",
      completed: false,
      skippedUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
    saveState(state);
    return;
  }

  const item = findByCollection(collectionName, id);
  if (!item) {
    return;
  }

  item.status = "skipped";
  item.completed = false;
  item.skippedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  saveState(state);
}

export function dismissRecommendation(id) {
  state.recommendationState[id] = {
    ...state.recommendationState[id],
    status: "dismissed",
    dismissedAt: new Date().toISOString(),
  };
  saveState(state);
}

export function addTask(formData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return;
  }

  const areaId = String(formData.get("areaId") ?? "projects");
  const timingType = String(formData.get("timingType") ?? "flexible");
  const when = String(formData.get("when") ?? "Today");
  const category = String(formData.get("category") ?? "Personal");
  const workType = normalizeWorkType(String(formData.get("workType") ?? "none"));
  const task = {
    id: `action-${Date.now()}`,
    areaId,
    title,
    category,
    workType,
    timingType,
    status: "todo",
    priority: String(formData.get("priority") ?? "Medium"),
    estimatedEffortMinutes: 15,
    createdAt: new Date().toISOString(),
  };

  if (timingType === "scheduled") {
    task.startTime = when;
    task.dueDate = "Today";
  } else if (timingType === "deadline") {
    task.deadline = when;
    task.dueDate = when;
  } else {
    task.preferredWindow = when;
    task.dueDate = when;
  }

  state.actions.unshift(task);
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

export function getMorningBriefingData() {
  return {
    bigThings: getScoredActionableItems().slice(0, 3),
    scheduledToday: getScheduledCandidates()
      .filter(isOpen)
      .sort((left, right) => getRawMinutesUntilScheduledStart(left) - getRawMinutesUntilScheduledStart(right)),
    potentialIssues: getPotentialIssues(),
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
    .filter((candidate) => isEligibleCandidate(candidate.item))
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
  return item.completed === true || item.status === "done" || item.status === "Done" || item.status === "dismissed";
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
  return [...state.actions, ...state.routines, ...state.timeline, ...getGeneratedRecommendations()];
}

function getGeneratedRecommendations() {
  const profile = state.interviewProfile ?? {};
  const activeRulesets = new Set(profile.activeRulesets ?? []);
  const recommendations = [];

  if (profile.fitness?.goal === "weight_loss" || activeRulesets.has("weight_loss_support")) {
    recommendations.push(createRecommendation({
      id: "rec-weight-loss-water",
      title: "Drink water this morning",
      category: "Health",
      priority: "Medium",
      timingType: "flexible",
      preferredWindow: "Today",
      dueDate: "Today",
      reason: "Weight Loss support",
    }));
    recommendations.push(createRecommendation({
      id: "rec-weight-loss-walk",
      title: "Take a short morning walk",
      category: "Fitness",
      priority: "Medium",
      timingType: "flexible",
      preferredWindow: "Today",
      dueDate: "Today",
      reason: "Weight Loss support",
    }));
  }

  if (profile.fitness?.goal === "muscle_gain" || activeRulesets.has("muscle_gain_support")) {
    recommendations.push(createRecommendation({
      id: "rec-muscle-protein",
      title: "Plan protein with your next meal",
      category: "Health",
      priority: "Medium",
      timingType: "flexible",
      preferredWindow: "Today",
      dueDate: "Today",
      reason: "Muscle Gain support",
    }));
  }

  if (profile.adhd?.busyFailureMode || activeRulesets.has("time_blindness_support") || activeRulesets.has("decision_paralysis_support")) {
    recommendations.push(createRecommendation({
      id: "rec-adhd-morning-plan",
      title: "Review the day before starting",
      category: "Personal",
      priority: "High",
      timingType: "flexible",
      preferredWindow: "Today",
      dueDate: "Today",
      reason: "ADHD support",
    }));
  }

  if (profile.work?.workType === "self_employed" || activeRulesets.has("self_employed")) {
    recommendations.push(createRecommendation({
      id: "rec-self-employed-revenue-review",
      title: "Review one revenue-producing task",
      category: "Work",
      workType: "revenue",
      priority: "High",
      timingType: "flexible",
      preferredWindow: "Today",
      dueDate: "Today",
      reason: "Self-employed support",
    }));
  }

  return recommendations.filter((item) => !isDone(item));
}

function createRecommendation(baseRecommendation) {
  const savedState = state.recommendationState?.[baseRecommendation.id] ?? {};
  return {
    areaId: "recommendations",
    estimatedEffortMinutes: 10,
    type: "Recommendation",
    source: "Profile",
    workType: "none",
    ...baseRecommendation,
    ...savedState,
  };
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
    ...getGeneratedRecommendations().map((item, index) => ({
      collection: "recommendations",
      item,
      order: state.actions.length + state.routines.length + state.timeline.length + state.focusSessions.length + index,
    })),
  ];
}

function scoreCandidate(candidate) {
  const reasons = [];
  const ruleEffects = [];
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

  if (item.type === "Recommendation") {
    reasons.push(item.reason ?? "profile recommendation");
  }

  const deadlineUrgency = getDeadlineUrgencyScore(item);
  if (deadlineUrgency > 0) {
    score += deadlineUrgency;
    reasons.push("deadline approaching");
  }

  if (item.priority === "High") {
    score += 25;
    reasons.push("high priority");
  }

  if (item.priority === "High" && isHealthTask(item)) {
    score += 5;
    reasons.push("health importance boost");
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

  const rulesetScore = applyRulesetEffects(item, ruleEffects);
  score += rulesetScore;

  return {
    ...candidate,
    title: item.title ?? item.name,
    areaId: item.areaId,
    effort,
    score,
    reasons,
    ruleEffects,
    why: formatWhy(reasons, ruleEffects),
    isSkipped: skipped,
  };
}

function applyRulesetEffects(item, ruleEffects) {
  const activeRulesets = new Set(state.interviewProfile?.activeRulesets ?? []);
  let score = 0;

  if (activeRulesets.has("time_blindness_support") && (item.timingType ?? inferTimingType(item)) === "scheduled") {
    const minutesUntilStart = getRawMinutesUntilScheduledStart(item);
    if (minutesUntilStart <= 15) {
      score += 40;
      ruleEffects.push("Time Blindness Support boost");
    } else if (minutesUntilStart <= 30) {
      score += 20;
      ruleEffects.push("Time Blindness Support boost");
    }
  }

  if (activeRulesets.has("decision_paralysis_support")) {
    const effort = getEstimatedEffort(item);
    if (effort <= 15) {
      score += 10;
      ruleEffects.push("Decision Paralysis Support favors the simplest action");
    } else if (effort > 30) {
      score -= 10;
      ruleEffects.push("Decision Paralysis Support lowers complex actions");
    }
  }

  if (activeRulesets.has("short_movement_blocks") && isMovementTask(item)) {
    score += 10;
    ruleEffects.push("Short Movement Blocks boost");
  }

  if (activeRulesets.has("self_employed")) {
    if (item.category === "Work" && item.workType === "revenue") {
      score += 15;
      ruleEffects.push("Self-employed revenue boost");
    }
    if (item.category === "Work" && (item.workType === "admin" || item.workType === "administrative")) {
      score -= 5;
      ruleEffects.push("Self-employed admin penalty");
    }
  }

  return score;
}

function getEstimatedEffort(item) {
  return Number(item.estimatedEffortMinutes ?? 30);
}

function isOverdue(item) {
  const dueValue = item.deadline ?? item.dueDate;

  if (dueValue === "Overdue") {
    return true;
  }

  if (!dueValue || dueValue === "Today" || dueValue === "Tomorrow" || dueValue === "This week") {
    return false;
  }

  const due = new Date(dueValue);
  if (Number.isNaN(due.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function isDueToday(item) {
  return item.dueDate === "Today" || item.deadline === "Today" || item.preferredWindow === "Today";
}

function formatWhy(reasons, ruleEffects = []) {
  if (reasons.length === 0 && ruleEffects.length === 0) {
    return "It is the best available next action based on your visible commitments.";
  }

  return [...reasons, ...ruleEffects].join("\n");
}

function getNextItem() {
  return getDecisionRecommendation()?.item ?? null;
}

function getPotentialIssues() {
  const issues = [];
  const actionableItems = getActionableCandidates().map((candidate) => candidate.item);

  for (const item of actionableItems) {
    if (isDone(item)) {
      continue;
    }

    if (isOverdue(item)) {
      issues.push({
        id: `${item.id}-overdue`,
        title: item.title ?? item.name,
        detail: "Overdue",
      });
    } else if ((item.timingType ?? inferTimingType(item)) === "deadline" && isDeadlineWithinHours(item, 48)) {
      issues.push({
        id: `${item.id}-deadline`,
        title: item.title ?? item.name,
        detail: "Deadline approaching within 48 hours",
      });
    }
  }

  for (const conflict of getScheduledConflicts()) {
    issues.push(conflict);
  }

  return issues;
}

function getScheduledConflicts() {
  const scheduled = getScheduledCandidates()
    .filter(isOpen)
    .map((item) => ({ item, start: parseTodayTime(item.startTime ?? item.time) }))
    .filter((entry) => entry.start)
    .sort((left, right) => left.start.getTime() - right.start.getTime());

  const conflicts = [];
  for (let index = 1; index < scheduled.length; index += 1) {
    const previous = scheduled[index - 1];
    const current = scheduled[index];
    const previousDuration = Number(previous.item.estimatedEffortMinutes ?? 30);
    const previousEnd = previous.start.getTime() + previousDuration * 60000;

    if (current.start.getTime() < previousEnd) {
      conflicts.push({
        id: `${previous.item.id}-${current.item.id}-conflict`,
        title: `${previous.item.title ?? previous.item.name} / ${current.item.title ?? current.item.name}`,
        detail: "Scheduled tasks may overlap",
      });
    }
  }

  return conflicts;
}

function getNextUpcomingItem(currentItemId) {
  const scheduled = getScheduledCandidates().filter((item) => item.id !== currentItemId && isOpen(item));
  const future = scheduled
    .filter((item) => getRawMinutesUntilScheduledStart(item) > 0)
    .sort((left, right) => getRawMinutesUntilScheduledStart(left) - getRawMinutesUntilScheduledStart(right));

  return future[0] ?? scheduled.sort((left, right) => getMinutesUntilScheduledStart(left) - getMinutesUntilScheduledStart(right))[0] ?? null;
}

function getTimeRemainingLabel(comingUp) {
  const startTime = comingUp?.startTime ?? comingUp?.time;
  if (!startTime) {
    return "Time Remaining: Due now";
  }

  return formatTimeRemaining(getMinutesUntilTime(startTime));
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

function isEligibleCandidate(item) {
  const timingType = item.timingType ?? inferTimingType(item);

  if (timingType === "scheduled") {
    return getMinutesUntilScheduledStart(item) <= 15;
  }

  if (timingType === "flexible") {
    return !item.preferredWindow || item.preferredWindow === "Today" || item.dueDate === "Today";
  }

  if (timingType === "deadline") {
    return true;
  }

  return true;
}

function getDeadlineUrgencyScore(item) {
  if ((item.timingType ?? inferTimingType(item)) !== "deadline") {
    return 0;
  }

  if (isOverdue(item)) {
    return 0;
  }

  const deadline = item.deadline ?? item.dueDate;
  if (deadline === "Today") {
    return 40;
  }
  if (deadline === "Tomorrow") {
    return 20;
  }
  if (deadline === "This week") {
    return 10;
  }

  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const daysAway = Math.ceil((date.getTime() - now.getTime()) / 86400000);

  if (daysAway <= 1) {
    return 20;
  }
  if (daysAway <= 7) {
    return 10;
  }
  return 0;
}

function getScheduledCandidates() {
  return [...state.actions, ...state.timeline, ...state.focusSessions].filter((item) => (item.timingType ?? inferTimingType(item)) === "scheduled");
}

function getMinutesUntilScheduledStart(item) {
  return getMinutesUntilTime(item.startTime ?? item.time);
}

function getRawMinutesUntilScheduledStart(item) {
  const target = parseTodayTime(item.startTime ?? item.time);
  if (!target) {
    return 0;
  }

  return Math.ceil((target.getTime() - Date.now()) / 60000);
}

function inferTimingType(item) {
  if (item.startTime || item.time) {
    return "scheduled";
  }
  if (item.deadline) {
    return "deadline";
  }
  return "flexible";
}

function isMovementTask(item) {
  const title = String(item.title ?? item.name ?? "").toLowerCase();
  return (
    item.category === "Fitness" ||
    item.areaId === "fitness" ||
    (item.areaId === "health" && title.includes("exercise")) ||
    title.includes("walk") ||
    title.includes("stretch") ||
    title.includes("workout")
  );
}

function isHealthTask(item) {
  return item.category === "Health" || item.areaId === "health";
}

function normalizeWorkType(workType) {
  if (workType === "None") {
    return "none";
  }

  return workType.toLowerCase().replaceAll("-", "_");
}

function isDeadlineWithinHours(item, hours) {
  const deadline = item.deadline ?? item.dueDate;
  if (deadline === "Today" || deadline === "Tomorrow") {
    return true;
  }

  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getTime() - Date.now() <= hours * 60 * 60 * 1000;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function findByCollection(collectionName, id) {
  if (collectionName === "recommendations") {
    return getGeneratedRecommendations().find((item) => item.id === id);
  }

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
