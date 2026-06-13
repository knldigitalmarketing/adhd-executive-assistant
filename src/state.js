import { appState as defaultState } from "./data.js";
import { scoreActionableCandidate } from "./decision.js";
import {
  buildSmartIntervention,
  ensureInterventionState,
  getCachedIntervention,
  recordInterventionOutcome,
  recordInterventionShown,
} from "./intervention-engine.js";
import {
  buildProfileWithRulesets,
  ensureProfileShape,
  getFirstUnansweredQuestionId,
  getNextQuestionId,
  getQuestionById,
  getVisibleQuestions,
  pruneHiddenAnswers,
} from "./interview.js";
import {
  buildGeneratedGuidance,
  buildGeneratedMorningRoutine,
  buildGeneratedRecommendations,
} from "./guidance-routines.js";
import {
  buildEndOfDayReviewData,
  buildGoalProgressSummary,
  buildLifeAreaDashboardData,
  buildWeeklyReviewData,
  buildTomorrowPlanningData,
  completeEndOfDayReviewFromCarryoverIds,
  getGoalAreaForItem,
  recordGoalProgressEntry,
  saveWeeklyReviewSnapshot,
} from "./progress-review.js";
import {
  buildGeneratedRecoverySuggestions,
  computeAdaptiveEffect,
  recordLearningEvent,
  recordMissedItems,
  recordRecoveryHistoryEntry,
} from "./recovery-adaptation.js";
import { clearState, loadState, saveState } from "./storage.js";
import { ensureTipState, getTipById, recordTipShown, selectAdhdTip } from "./tips.js";

let state = loadState(defaultState);
state.interviewProfile = buildProfileWithRulesets(ensureProfileShape(state.interviewProfile));
state.tipState = ensureTipState(state.tipState);
state.interventionState = ensureInterventionState(state.interventionState);

export function getState() {
  return state;
}

export function getLearningStats() {
  state.learningStats = state.learningStats ?? {};
  return state.learningStats;
}

export function getFocusModeData() {
  const focus = state.focusMode;
  if (!focus) {
    return {
      status: "idle",
      timeRemaining: formatFocusTime(25 * 60),
      remainingSeconds: 25 * 60,
      durationSeconds: 25 * 60,
    };
  }

  const remainingSeconds = getFocusRemainingSeconds(focus);
  return {
    ...focus,
    remainingSeconds,
    timeRemaining: formatFocusTime(remainingSeconds),
  };
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
  state.tipState = ensureTipState(state.tipState);
  state.interventionState = ensureInterventionState(state.interventionState);
}

export function loadDemo(demoId) {
  state = createDemoState(demoId);
  saveState(state);
}

export function startFocus(collectionName, id) {
  const item = findByCollection(collectionName, id);
  if (!item) {
    return;
  }

  state.focusMode = {
    id: `focus-${Date.now()}`,
    collection: collectionName,
    itemId: id,
    title: item.title ?? item.name,
    status: "running",
    durationSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    startedAt: new Date().toISOString(),
    resumedAt: new Date().toISOString(),
  };
  saveState(state);
}

export function pauseFocus() {
  if (!state.focusMode || state.focusMode.status !== "running") {
    return;
  }

  state.focusMode = {
    ...state.focusMode,
    status: "paused",
    remainingSeconds: getFocusRemainingSeconds(state.focusMode),
    pausedAt: new Date().toISOString(),
  };
  saveState(state);
}

export function resumeFocus() {
  if (!state.focusMode || state.focusMode.status !== "paused") {
    return;
  }

  state.focusMode = {
    ...state.focusMode,
    status: "running",
    resumedAt: new Date().toISOString(),
  };
  saveState(state);
}

export function endFocus(markNowDone = false) {
  if (!state.focusMode) {
    return;
  }

  const focus = getFocusModeData();
  const endedAt = new Date().toISOString();
  state.focusHistory = state.focusHistory ?? [];
  state.focusHistory.push({
    id: focus.id,
    collection: focus.collection,
    itemId: focus.itemId,
    title: focus.title,
    startedAt: focus.startedAt,
    endedAt,
    durationSeconds: focus.durationSeconds,
    completedSeconds: Math.max(0, focus.durationSeconds - focus.remainingSeconds),
    completedFocus: focus.remainingSeconds === 0,
    markedDone: Boolean(markNowDone),
  });
  state.focusHistory = state.focusHistory.slice(-50);
  state.focusMode = null;

  if (markNowDone) {
    markDone(focus.collection, focus.itemId);
    return;
  }

  saveState(state);
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
  if (collectionName === "recoverySuggestions") {
    const item = findByCollection(collectionName, id);
    recordItemEvent(collectionName, id, "done");
    recordGoalProgress(collectionName, id, item);
    state.recoveryState[id] = {
      ...state.recoveryState[id],
      status: "done",
      completed: true,
      completedAt: new Date().toISOString(),
    };
    recordRecoveryHistory(id, "done");
    saveState(state);
    return;
  }

  if (collectionName === "morningRoutine") {
    const item = findByCollection(collectionName, id);
    recordItemEvent(collectionName, id, "done");
    recordGoalProgress(collectionName, id, item);
    state.morningRoutineState[id] = {
      ...state.morningRoutineState[id],
      status: "done",
      completed: true,
      completedAt: new Date().toISOString(),
    };
    saveState(state);
    return;
  }

  if (collectionName === "guidance") {
    const item = findByCollection(collectionName, id);
    recordItemEvent(collectionName, id, "done");
    recordGoalProgress(collectionName, id, item);
    state.guidanceState[id] = {
      ...state.guidanceState[id],
      status: "done",
      completed: true,
      completedAt: new Date().toISOString(),
    };
    saveState(state);
    return;
  }

  if (collectionName === "recommendations") {
    const item = findByCollection(collectionName, id);
    recordItemEvent(collectionName, id, "done");
    recordGoalProgress(collectionName, id, item);
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

  recordItemEvent(collectionName, id, "done", item);
  recordGoalProgress(collectionName, id, item);
  item.status = "done";
  item.completed = true;
  item.completedAt = new Date().toISOString();
  delete item.snoozedUntil;
  saveState(state);
}

export function doItNow(collectionName, id) {
  if (collectionName === "recoverySuggestions") {
    state.recoveryState[id] = {
      ...state.recoveryState[id],
      status: "doing",
      startedAt: new Date().toISOString(),
    };
    recordRecoveryHistory(id, "doing");
    saveState(state);
    return;
  }

  if (collectionName === "morningRoutine") {
    state.morningRoutineState[id] = {
      ...state.morningRoutineState[id],
      status: "doing",
      startedAt: new Date().toISOString(),
    };
    saveState(state);
    return;
  }

  if (collectionName === "guidance") {
    state.guidanceState[id] = {
      ...state.guidanceState[id],
      status: "doing",
      startedAt: new Date().toISOString(),
    };
    saveState(state);
    return;
  }

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
  if (collectionName === "recoverySuggestions") {
    snoozeRecoverySuggestion(id);
    return;
  }

  if (collectionName === "morningRoutine") {
    snoozeMorningRoutine(id);
    return;
  }

  if (collectionName === "guidance") {
    snoozeGuidance(id);
    return;
  }

  if (collectionName === "recommendations") {
    snoozeRecommendation(id);
    return;
  }

  const item = findByCollection(collectionName, id);
  if (!item) {
    return;
  }

  recordItemEvent(collectionName, id, "snoozed", item);
  item.status = "snoozed";
  item.completed = false;
  item.snoozedUntil = getSnoozeLabel();
  saveState(state);
}

export function snoozeRecommendation(id) {
  recordItemEvent("recommendations", id, "snoozed");
  state.recommendationState[id] = {
    ...state.recommendationState[id],
    status: "snoozed",
    snoozedUntil: getSnoozeLabel(),
  };
  saveState(state);
}

export function snoozeGuidance(id) {
  recordItemEvent("guidance", id, "snoozed");
  state.guidanceState[id] = {
    ...state.guidanceState[id],
    status: "snoozed",
    snoozedUntil: getSnoozeLabel(),
  };
  saveState(state);
}

export function snoozeMorningRoutine(id) {
  recordItemEvent("morningRoutine", id, "snoozed");
  state.morningRoutineState[id] = {
    ...state.morningRoutineState[id],
    status: "snoozed",
    snoozedUntil: getSnoozeLabel(),
  };
  saveState(state);
}

export function snoozeRecoverySuggestion(id) {
  recordItemEvent("recoverySuggestions", id, "snoozed");
  state.recoveryState[id] = {
    ...state.recoveryState[id],
    status: "snoozed",
    snoozedUntil: getSnoozeLabel(),
  };
  recordRecoveryHistory(id, "snoozed");
  saveState(state);
}

export function skipItem(collectionName, id) {
  if (collectionName === "recoverySuggestions") {
    recordItemEvent(collectionName, id, "skipped");
    state.recoveryState[id] = {
      ...state.recoveryState[id],
      status: "skipped",
      completed: false,
      skippedUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
    recordRecoveryHistory(id, "skipped");
    saveState(state);
    return;
  }

  if (collectionName === "morningRoutine") {
    recordItemEvent(collectionName, id, "skipped");
    state.morningRoutineState[id] = {
      ...state.morningRoutineState[id],
      status: "skipped",
      completed: false,
      skippedUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
    saveState(state);
    return;
  }

  if (collectionName === "guidance") {
    recordItemEvent(collectionName, id, "skipped");
    state.guidanceState[id] = {
      ...state.guidanceState[id],
      status: "skipped",
      completed: false,
      skippedUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
    saveState(state);
    return;
  }

  if (collectionName === "recommendations") {
    recordItemEvent(collectionName, id, "skipped");
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

  recordItemEvent(collectionName, id, "skipped", item);
  item.status = "skipped";
  item.completed = false;
  item.skippedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  saveState(state);
}

export function dismissRecommendation(id) {
  recordItemEvent("recommendations", id, "dismissed");
  state.recommendationState[id] = {
    ...state.recommendationState[id],
    status: "dismissed",
    dismissedAt: new Date().toISOString(),
  };
  saveState(state);
}

export function dismissGuidance(id) {
  recordItemEvent("guidance", id, "dismissed");
  state.guidanceState[id] = {
    ...state.guidanceState[id],
    status: "dismissed",
    dismissedAt: new Date().toISOString(),
  };
  saveState(state);
}

export function dismissMorningRoutine(id) {
  recordItemEvent("morningRoutine", id, "dismissed");
  state.morningRoutineState[id] = {
    ...state.morningRoutineState[id],
    status: "dismissed",
    dismissedAt: new Date().toISOString(),
  };
  saveState(state);
}

export function dismissRecoverySuggestion(id) {
  recordItemEvent("recoverySuggestions", id, "dismissed");
  state.recoveryState[id] = {
    ...state.recoveryState[id],
    status: "dismissed",
    dismissedAt: new Date().toISOString(),
  };
  recordRecoveryHistory(id, "dismissed");
  saveState(state);
}

export function dismissItem(collectionName, id) {
  const item = findByCollection(collectionName, id);
  if (!item) {
    return;
  }

  recordItemEvent(collectionName, id, "dismissed", item);
  item.status = "dismissed";
  item.dismissedAt = new Date().toISOString();
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
    tip: getAdhdTip("working"),
    intervention: getSmartIntervention("working"),
  };
}

export function getMorningBriefingData() {
  return {
    goalProgress: getGoalProgressSummary(),
    tomorrowPlanning: getTomorrowPlanningData(),
    morningRoutine: getGeneratedMorningRoutine(),
    recoverySuggestions: getGeneratedRecoverySuggestions(),
    bigThings: getScoredActionableItems().slice(0, 3),
    guidance: getGeneratedGuidance(),
    scheduledToday: getScheduledCandidates()
      .filter(isOpen)
      .sort((left, right) => getRawMinutesUntilScheduledStart(left) - getRawMinutesUntilScheduledStart(right)),
    potentialIssues: getPotentialIssues(),
    tip: getAdhdTip("briefing"),
    intervention: getSmartIntervention("briefing"),
  };
}

export function getTomorrowPlanningData() {
  return buildTomorrowPlanningData({
    state,
    isDone,
    inferTimingType,
    getRawMinutesUntilScheduledStart,
    getEstimatedEffort,
    getPriorityWeight,
  });
}

export function getEndOfDayReviewData() {
  return buildEndOfDayReviewData(getProgressReviewContext());
}

export function completeEndOfDayReview(carryoverIds = []) {
  completeEndOfDayReviewFromCarryoverIds(getProgressReviewContext(), carryoverIds);
}

export function getWeeklyReviewData() {
  return buildWeeklyReviewData(getProgressReviewContext());
}

export function getLifeAreaDashboardData() {
  return buildLifeAreaDashboardData(getProgressReviewContext());
}

export function completeWeeklyReview() {
  saveWeeklyReviewSnapshot(getProgressReviewContext());
}

export function getGoalProgressSummary() {
  return buildGoalProgressSummary({ state, getTodayKey });
}

export function getAdhdTip(contextName = "dashboard") {
  state.tipState = ensureTipState(state.tipState);
  const context = getTipContext(contextName);
  const todayKey = getTodayKey();
  const cached = state.tipState.lastShownByContext?.[contextName];
  const cachedTip = cached?.date === todayKey ? getTipById(cached.tipId, context) : null;
  const tip = cachedTip ?? selectAdhdTip(context);
  if (recordTipShown(state, contextName, tip)) {
    saveState(state);
  }
  return tip;
}

export function getSmartIntervention(contextName = "dashboard") {
  state.interventionState = ensureInterventionState(state.interventionState);
  const todayKey = getTodayKey();
  const cached = getCachedIntervention(state.interventionState, contextName, todayKey);
  if (cached) {
    return {
      ...cached,
      reason: "Selected earlier today for this screen.",
    };
  }

  const intervention = buildSmartIntervention(getInterventionContext(contextName));
  if (!intervention) {
    return null;
  }

  if (recordInterventionShown(state, contextName, intervention, todayKey)) {
    saveState(state);
  }
  return intervention;
}

export function completeSmartIntervention(id, contextName = "dashboard") {
  recordInterventionOutcome(state, id, "accepted", contextName);
  saveState(state);
}

export function dismissSmartIntervention(id, contextName = "dashboard") {
  recordInterventionOutcome(state, id, "dismissed", contextName);
  saveState(state);
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

export function formatFocusTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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
  return [
    ...state.actions,
    ...state.routines,
    ...state.timeline,
    ...getGeneratedRecommendations(),
    ...getGeneratedGuidance(),
    ...getGeneratedMorningRoutine(),
    ...getGeneratedRecoverySuggestions(),
  ];
}

function getProgressReviewContext() {
  return {
    state,
    saveState,
    getTodayKey,
    getLearningStats,
    getGeneratedRecommendations,
    getGeneratedGuidance,
    getGeneratedMorningRoutine,
    getGeneratedRecoverySuggestions,
    findByCollection,
    isDone,
    isSnoozed,
    isSkipped,
    isOverdue,
    statusText,
  };
}

function getTipContext(contextName) {
  const learningStats = getLearningStats();
  const statsValues = Object.values(learningStats);
  const profile = state.interviewProfile ?? {};

  return {
    contextName,
    dayPart: getDayPart(),
    activeRulesets: profile.activeRulesets ?? [],
    recentTipIds: state.tipState?.recentTipIds ?? [],
    hasMissedTasks: statsValues.some((stats) => stats.lastMissedDate === getTodayKey() || Number(stats.missedCount ?? 0) > 0),
    hasSnoozedItems: statsValues.some((stats) => Number(stats.snoozeCount ?? 0) > 0) || allCompletableItems().some(isSnoozed),
    hasOverwhelm: profile.adhd?.busyFailureMode === "overwhelmed" || profile.adhd?.supportNeeded === "choose",
  };
}

function getInterventionContext(contextName) {
  return {
    contextName,
    profile: state.interviewProfile ?? {},
    learningStats: getLearningStats(),
    focusHistory: state.focusHistory ?? [],
    openItems: allCompletableItems().filter(isOpen),
    interventionState: state.interventionState,
    now: new Date(),
  };
}

export function getGeneratedMorningRoutine() {
  return buildGeneratedMorningRoutine({ state, isDone, getDayPart });
}

function getGeneratedGuidance() {
  return buildGeneratedGuidance({ state, isDone, getDayPart });
}

function getGeneratedRecommendations() {
  return buildGeneratedRecommendations({ state, isDone });
}

function getGeneratedRecoverySuggestions() {
  recordMissedOpenItems();
  return buildGeneratedRecoverySuggestions({
    state,
    getLearningStats,
    findByCollection,
    isDone,
    inferTimingType,
  });
}

function getActionableCandidates() {
  const generatedRecommendations = getGeneratedRecommendations();
  const generatedGuidance = getGeneratedGuidance();
  const generatedMorningRoutine = getGeneratedMorningRoutine();
  const generatedRecoverySuggestions = getGeneratedRecoverySuggestions();

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
    ...generatedRecommendations.map((item, index) => ({
      collection: "recommendations",
      item,
      order: state.actions.length + state.routines.length + state.timeline.length + state.focusSessions.length + index,
    })),
    ...generatedGuidance.map((item, index) => ({
      collection: "guidance",
      item,
      order:
        state.actions.length +
        state.routines.length +
        state.timeline.length +
        state.focusSessions.length +
        generatedRecommendations.length +
        index,
    })),
    ...generatedMorningRoutine.map((item, index) => ({
      collection: "morningRoutine",
      item,
      order:
        state.actions.length +
        state.routines.length +
        state.timeline.length +
        state.focusSessions.length +
        generatedRecommendations.length +
        generatedGuidance.length +
        index,
    })),
    ...generatedRecoverySuggestions.map((item, index) => ({
      collection: "recoverySuggestions",
      item,
      order:
        state.actions.length +
        state.routines.length +
        state.timeline.length +
        state.focusSessions.length +
        generatedRecommendations.length +
        generatedGuidance.length +
        generatedMorningRoutine.length +
        index,
    })),
  ];
}

function scoreCandidate(candidate) {
  return scoreActionableCandidate(getDecisionContext(), candidate);
}

function getDecisionContext() {
  return {
    state,
    isOverdue,
    isDueToday,
    isHealthTask,
    isSnoozed,
    isSkipped,
    isMovementTask,
    inferTimingType,
    getRawMinutesUntilScheduledStart,
    getDeadlineUrgencyScore,
    getEstimatedEffort,
    getAdaptiveEffect,
    formatWhy,
  };
}

function getAdaptiveEffect(collectionName, item) {
  return computeAdaptiveEffect({ collectionName, item, getLearningStats, getCurrentMinuteOfDay });
}

function recordItemEvent(collectionName, id, eventName, item = null) {
  recordLearningEvent({ state, collectionName, id, eventName, item, findByCollection, getTodayKey });
}

function recordGoalProgress(collectionName, id, item = null) {
  const trackedItem = item ?? findByCollection(collectionName, id);
  recordGoalProgressEntry({ state, collectionName, id, item: trackedItem });
}

function getGoalArea(item = {}) {
  return getGoalAreaForItem(item);
}

function recordMissedOpenItems() {
  recordMissedItems({
    state,
    isOpen,
    inferTimingType,
    getRawMinutesUntilScheduledStart,
    getLearningStats,
    getTodayKey,
    recordItemEvent,
    saveState,
  });
}

function recordRecoveryHistory(id, eventName) {
  recordRecoveryHistoryEntry({ state, id, eventName });
}

function getCurrentMinuteOfDay() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getEstimatedEffort(item) {
  return Number(item.estimatedEffortMinutes ?? 30);
}

function getPriorityWeight(priority) {
  if (priority === "High") {
    return 3;
  }
  if (priority === "Medium") {
    return 2;
  }
  if (priority === "Low") {
    return 1;
  }
  return 0;
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

function getFocusRemainingSeconds(focus) {
  if (!focus) {
    return 25 * 60;
  }

  if (focus.status !== "running") {
    return Math.max(0, Number(focus.remainingSeconds ?? focus.durationSeconds ?? 25 * 60));
  }

  const resumedAt = new Date(focus.resumedAt ?? focus.startedAt).getTime();
  if (Number.isNaN(resumedAt)) {
    return Math.max(0, Number(focus.remainingSeconds ?? focus.durationSeconds ?? 25 * 60));
  }

  const elapsedSeconds = Math.floor((Date.now() - resumedAt) / 1000);
  return Math.max(0, Number(focus.remainingSeconds ?? focus.durationSeconds ?? 25 * 60) - elapsedSeconds);
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

function createDemoState(demoId) {
  const demoState = clone(defaultState);
  demoState.ui = {
    activeView: "briefing",
    lastMorningBriefingDate: null,
  };
  demoState.recommendationState = {};
  demoState.guidanceState = {};
  demoState.morningRoutineState = {};
  demoState.learningStats = {};
  demoState.recoveryState = {};
  demoState.recoveryHistory = [];
  demoState.tipState = {
    recentTipIds: [],
    lastShownByContext: {},
  };
  demoState.interventionState = {
    recentInterventionIds: [],
    lastShownByContext: {},
    dismissedToday: [],
    effectiveness: {},
    history: [],
  };
  demoState.focusMode = null;
  demoState.focusHistory = [];
  demoState.progressHistory = [];
  demoState.endOfDayReviews = {};
  demoState.weeklyReviewHistory = {};

  if (demoId === "adhd-weight-loss") {
    demoState.interviewProfile = buildProfileWithRulesets({
      adhd: { busyFailureMode: "time", supportNeeded: "choose" },
      fitness: { wantsSupport: "yes", barrier: "time", goal: "weight_loss" },
      health: { wantsSupport: "yes", trackFirst: "medications" },
      work: {},
      money: {},
      relationships: {},
      activeRulesets: [],
    });
    demoState.actions = [
      createDemoTask("demo-water-bottle", "Fill water bottle", "Health", "flexible", "Today", "High"),
      createDemoTask("demo-walk-shoes", "Put walking shoes by the door", "Fitness", "flexible", "Today", "Medium"),
      createDemoTask("demo-plan-meals", "Choose simple lunch", "Health", "deadline", "Today", "Medium"),
    ];
    demoState.timeline = [
      createDemoScheduledItem("demo-morning-walk", "Morning walk", "8:30 AM", "Fitness", 20),
      createDemoScheduledItem("demo-lunch-check", "Lunch check-in", "12:00 PM", "Health", 10),
    ];
  } else if (demoId === "adhd-muscle-gain") {
    demoState.interviewProfile = buildProfileWithRulesets({
      adhd: { busyFailureMode: "forget", supportNeeded: "remember" },
      fitness: { wantsSupport: "yes", barrier: "forget", goal: "muscle_gain" },
      health: { wantsSupport: "yes", trackFirst: "refills" },
      work: {},
      money: {},
      relationships: {},
      activeRulesets: [],
    });
    demoState.actions = [
      createDemoTask("demo-protein", "Plan protein with breakfast", "Health", "flexible", "Today", "High"),
      createDemoTask("demo-lift", "Pack gym clothes", "Fitness", "flexible", "Today", "Medium"),
      createDemoTask("demo-refill", "Check supplement supply", "Health", "deadline", "Tomorrow", "Medium"),
    ];
    demoState.timeline = [
      createDemoScheduledItem("demo-workout", "Strength workout", "5:30 PM", "Fitness", 45),
      createDemoScheduledItem("demo-evening-protein", "Evening protein reminder", "7:30 PM", "Health", 5),
    ];
  } else if (demoId === "self-employed") {
    demoState.interviewProfile = buildProfileWithRulesets({
      adhd: { busyFailureMode: "overwhelmed", supportNeeded: "choose" },
      fitness: {},
      health: {},
      work: { wantsSupport: "yes", helpFirst: "priorities", workType: "self_employed" },
      money: { wantsSupport: "yes", trackFirst: "income" },
      relationships: {},
      activeRulesets: [],
    });
    demoState.actions = [
      createDemoTask("demo-proposal", "Send paid proposal", "Work", "flexible", "Today", "High", "revenue"),
      createDemoTask("demo-invoice", "Review unpaid invoice", "Money", "deadline", "Today", "High", "revenue"),
      createDemoTask("demo-receipts", "File receipts", "Work", "flexible", "Today", "Medium", "admin"),
    ];
    demoState.timeline = [
      createDemoScheduledItem("demo-client-call", "Client follow-up call", "10:30 AM", "Work", 30),
      createDemoScheduledItem("demo-admin-block", "Admin block", "3:00 PM", "Work", 45),
    ];
  }

  demoState.routines = [];
  demoState.focusSessions = [];
  demoState.interview = {
    currentQuestionId: null,
    completed: true,
  };

  return demoState;
}

function createDemoTask(id, title, category, timingType, when, priority, workType = "none") {
  const task = {
    id,
    title,
    areaId: category.toLowerCase(),
    category,
    workType,
    timingType,
    status: "todo",
    priority,
    estimatedEffortMinutes: 15,
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

  return task;
}

function createDemoScheduledItem(id, title, startTime, category, estimatedEffortMinutes) {
  return {
    id,
    title,
    areaId: category.toLowerCase(),
    category,
    workType: "none",
    timingType: "scheduled",
    startTime,
    time: startTime,
    type: "Scheduled",
    status: "Upcoming",
    priority: "Medium",
    estimatedEffortMinutes,
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function findByCollection(collectionName, id) {
  if (collectionName === "recoverySuggestions") {
    return getGeneratedRecoverySuggestions().find((item) => item.id === id);
  }

  if (collectionName === "morningRoutine") {
    return getGeneratedMorningRoutine().find((item) => item.id === id);
  }

  if (collectionName === "guidance") {
    return getGeneratedGuidance().find((item) => item.id === id);
  }

  if (collectionName === "recommendations") {
    return getGeneratedRecommendations().find((item) => item.id === id);
  }

  return state[collectionName]?.find((item) => item.id === id);
}

function getSnoozeLabel() {
  const date = new Date(Date.now() + 30 * 60 * 1000);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getDayPart() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "morning";
  }
  if (hour < 17) {
    return "afternoon";
  }
  return "evening";
}

function titleCase(value) {
  return String(value)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
