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

export function getLearningStats() {
  state.learningStats = state.learningStats ?? {};
  return state.learningStats;
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

export function loadDemo(demoId) {
  state = createDemoState(demoId);
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
  if (collectionName === "morningRoutine") {
    recordItemEvent(collectionName, id, "done");
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
    recordItemEvent(collectionName, id, "done");
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
    recordItemEvent(collectionName, id, "done");
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
  item.status = "done";
  item.completed = true;
  item.completedAt = new Date().toISOString();
  delete item.snoozedUntil;
  saveState(state);
}

export function doItNow(collectionName, id) {
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

export function skipItem(collectionName, id) {
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
  };
}

export function getMorningBriefingData() {
  return {
    morningRoutine: getGeneratedMorningRoutine(),
    bigThings: getScoredActionableItems().slice(0, 3),
    guidance: getGeneratedGuidance(),
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
  return [
    ...state.actions,
    ...state.routines,
    ...state.timeline,
    ...getGeneratedRecommendations(),
    ...getGeneratedGuidance(),
    ...getGeneratedMorningRoutine(),
  ];
}

export function getGeneratedMorningRoutine() {
  const profile = state.interviewProfile ?? {};
  const activeRulesets = new Set(profile.activeRulesets ?? []);
  const routine = [];
  const dayPart = getDayPart();

  if (dayPart !== "morning") {
    return [];
  }

  if (profile.fitness?.goal === "weight_loss" || activeRulesets.has("weight_loss_support")) {
    routine.push(createMorningRoutineItem({
      id: "morning-weight-loss-water",
      title: "Drink water",
      category: "Health",
      priority: "High",
      reason: "Weight Loss morning routine",
    }));
    routine.push(createMorningRoutineItem({
      id: "morning-weight-loss-walk",
      title: "Morning walk",
      category: "Fitness",
      priority: "Medium",
      reason: "Weight Loss morning routine",
    }));
  }

  if (profile.fitness?.goal === "muscle_gain" || activeRulesets.has("muscle_gain_support")) {
    routine.push(createMorningRoutineItem({
      id: "morning-muscle-water",
      title: "Drink water",
      category: "Health",
      priority: "High",
      reason: "Muscle Gain morning routine",
    }));
    routine.push(createMorningRoutineItem({
      id: "morning-muscle-protein",
      title: "Protein intake",
      category: "Health",
      priority: "Medium",
      reason: "Muscle Gain morning routine",
    }));
  }

  if (profile.adhd?.busyFailureMode || activeRulesets.has("time_blindness_support") || activeRulesets.has("decision_paralysis_support")) {
    routine.push(createMorningRoutineItem({
      id: "morning-adhd-planning-review",
      title: "Morning planning review",
      category: "Personal",
      priority: "High",
      reason: "ADHD morning routine",
    }));
  }

  if (profile.work?.workType === "self_employed" || activeRulesets.has("self_employed")) {
    routine.push(createMorningRoutineItem({
      id: "morning-self-employed-revenue",
      title: "Review revenue opportunities",
      category: "Work",
      workType: "revenue",
      priority: "High",
      reason: "Self-employed morning routine",
    }));
  }

  return routine.filter((item) => !isDone(item));
}

function getGeneratedGuidance() {
  const profile = state.interviewProfile ?? {};
  const activeRulesets = new Set(profile.activeRulesets ?? []);
  const guidance = [];
  const dayPart = getDayPart();

  if (dayPart === "morning" && (profile.adhd?.busyFailureMode || activeRulesets.has("time_blindness_support") || activeRulesets.has("decision_paralysis_support"))) {
    guidance.push(createGuidance({
      id: "guide-adhd-morning-planning",
      title: "Do a quick morning plan",
      category: "Personal",
      priority: "High",
      preferredWindow: "Today",
      reason: "ADHD morning planning guidance",
    }));
  }

  if (activeRulesets.has("time_blindness_support")) {
    guidance.push(createGuidance({
      id: "guide-adhd-transition",
      title: "Check the next transition",
      category: "Personal",
      priority: "Medium",
      preferredWindow: "Today",
      reason: "ADHD transition guidance",
    }));
  }

  if (profile.fitness?.goal === "weight_loss" || activeRulesets.has("weight_loss_support")) {
    guidance.push(createGuidance({
      id: "guide-weight-loss-water",
      title: "Drink water early today",
      category: "Health",
      priority: "Medium",
      preferredWindow: "Today",
      reason: "Weight Loss water guidance",
    }));
    if (dayPart === "morning") {
      guidance.push(createGuidance({
        id: "guide-weight-loss-walk",
        title: "Take a short morning walk",
        category: "Fitness",
        priority: "Medium",
        preferredWindow: "Today",
        reason: "Weight Loss movement guidance",
      }));
    }
  }

  if (profile.fitness?.goal === "muscle_gain" || activeRulesets.has("muscle_gain_support")) {
    guidance.push(createGuidance({
      id: "guide-muscle-protein",
      title: "Plan protein with your next meal",
      category: "Health",
      priority: "Medium",
      preferredWindow: "Today",
      reason: "Muscle Gain protein guidance",
    }));
    guidance.push(createGuidance({
      id: "guide-muscle-recovery",
      title: "Check recovery before training",
      category: "Fitness",
      priority: "Medium",
      preferredWindow: "Today",
      reason: "Muscle Gain recovery guidance",
    }));
  }

  if (profile.work?.workType === "self_employed" || activeRulesets.has("self_employed")) {
    guidance.push(createGuidance({
      id: "guide-self-employed-revenue",
      title: "Review revenue-producing work",
      category: "Work",
      workType: "revenue",
      priority: "High",
      preferredWindow: "Today",
      reason: "Self-employed revenue guidance",
    }));
    guidance.push(createGuidance({
      id: "guide-self-employed-followup",
      title: "Pick one follow-up to send",
      category: "Work",
      workType: "follow_up",
      priority: "Medium",
      preferredWindow: "Today",
      reason: "Self-employed follow-up guidance",
    }));
  }

  return guidance.filter((item) => !isDone(item));
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

function createGuidance(baseGuidance) {
  const savedState = state.guidanceState?.[baseGuidance.id] ?? {};
  return {
    areaId: "guidance",
    estimatedEffortMinutes: 10,
    type: "Guidance",
    source: "Ruleset",
    timingType: "flexible",
    dueDate: "Today",
    workType: "none",
    ...baseGuidance,
    ...savedState,
  };
}

function createMorningRoutineItem(baseRoutine) {
  const savedState = state.morningRoutineState?.[baseRoutine.id] ?? {};
  return {
    areaId: "morningRoutine",
    estimatedEffortMinutes: 10,
    type: "Morning Routine",
    source: "Ruleset",
    timingType: "flexible",
    dueDate: "Today",
    preferredWindow: "Today",
    workType: "none",
    ...baseRoutine,
    ...savedState,
  };
}

function getActionableCandidates() {
  const generatedRecommendations = getGeneratedRecommendations();
  const generatedGuidance = getGeneratedGuidance();
  const generatedMorningRoutine = getGeneratedMorningRoutine();

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

  if (item.type === "Guidance") {
    reasons.push(item.reason ?? "ruleset guidance");
  }

  if (item.type === "Morning Routine") {
    reasons.push(item.reason ?? "morning routine");
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

  const adaptiveEffect = getAdaptiveEffect(candidate.collection, item);
  score += adaptiveEffect.score;

  return {
    ...candidate,
    title: item.title ?? item.name,
    areaId: item.areaId,
    effort,
    score,
    reasons,
    ruleEffects,
    why: formatWhy(reasons, [...ruleEffects, ...adaptiveEffect.reasons]),
    isSkipped: skipped,
  };
}

function getAdaptiveEffect(collectionName, item) {
  const stats = getLearningStats()[getLearningKey(collectionName, item.id)];
  if (!stats) {
    return { score: 0, reasons: [] };
  }

  const reasons = [];
  let score = 0;

  if (stats.dismissCount >= 2) {
    const penalty = Math.min(stats.dismissCount * 5, 20);
    score -= penalty;
    reasons.push("Often dismissed, so it is shown less strongly");
  }

  const currentMinute = getCurrentMinuteOfDay();
  const snoozeCount = getWindowCount(stats.snoozeWindows, currentMinute, 60);
  if (snoozeCount >= 2) {
    const penalty = Math.min(4 + snoozeCount * 2, 12);
    score -= penalty;
    reasons.push("Often snoozed around this time");
  }

  if (stats.completionCount >= 2 && Number.isFinite(stats.preferredCompletionMinute)) {
    const distance = getMinuteDistance(currentMinute, stats.preferredCompletionMinute);
    if (distance <= 60) {
      score += Math.min(4 + stats.completionCount * 2, 12);
      reasons.push(`Usually completed around ${formatMinuteOfDay(stats.preferredCompletionMinute)}.`);
    }
  }

  return { score, reasons };
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

function recordItemEvent(collectionName, id, eventName, item = null) {
  state.learningStats = state.learningStats ?? {};

  const trackedItem = item ?? findByCollection(collectionName, id);
  const key = getLearningKey(collectionName, id);
  const now = new Date();
  const minuteOfDay = now.getHours() * 60 + now.getMinutes();
  const existing = state.learningStats[key] ?? createEmptyLearningStats(collectionName, id, trackedItem);
  const next = {
    ...existing,
    collection: collectionName,
    itemId: id,
    title: trackedItem?.title ?? trackedItem?.name ?? existing.title ?? id,
    updatedAt: now.toISOString(),
  };

  if (eventName === "done") {
    next.completionCount = Number(next.completionCount ?? 0) + 1;
    next.completionTimes = appendRecentMinute(next.completionTimes, minuteOfDay);
    next.preferredCompletionTime = formatMinuteOfDay(getAverageMinute(next.completionTimes));
    next.preferredCompletionMinute = getAverageMinute(next.completionTimes);
  }

  if (eventName === "snoozed") {
    next.snoozeCount = Number(next.snoozeCount ?? 0) + 1;
    next.snoozeWindows = appendRecentMinute(next.snoozeWindows, minuteOfDay);
  }

  if (eventName === "dismissed") {
    next.dismissCount = Number(next.dismissCount ?? 0) + 1;
  }

  if (eventName === "skipped") {
    next.skipCount = Number(next.skipCount ?? 0) + 1;
  }

  state.learningStats[key] = next;
}

function createEmptyLearningStats(collectionName, id, item) {
  return {
    collection: collectionName,
    itemId: id,
    title: item?.title ?? item?.name ?? id,
    completionCount: 0,
    snoozeCount: 0,
    dismissCount: 0,
    skipCount: 0,
    preferredCompletionTime: null,
    preferredCompletionMinute: null,
    completionTimes: [],
    snoozeWindows: [],
  };
}

function getLearningKey(collectionName, id) {
  return `${collectionName}:${id}`;
}

function appendRecentMinute(values = [], minuteOfDay) {
  return [...values, minuteOfDay].slice(-10);
}

function getAverageMinute(values = []) {
  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + Number(value), 0) / values.length);
}

function getCurrentMinuteOfDay() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getWindowCount(values = [], targetMinute, windowMinutes) {
  return values.filter((value) => getMinuteDistance(Number(value), targetMinute) <= windowMinutes).length;
}

function getMinuteDistance(left, right) {
  const distance = Math.abs(Number(left) - Number(right));
  return Math.min(distance, 1440 - distance);
}

function formatMinuteOfDay(minuteOfDay) {
  if (!Number.isFinite(minuteOfDay)) {
    return "";
  }

  const normalized = ((Math.round(minuteOfDay) % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
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
