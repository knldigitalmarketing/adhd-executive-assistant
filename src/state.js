import { appState as defaultState } from "./data.js";
import { buildContextSignals, getContextAwareInfluence } from "./context-aware-recommendations.js";
import { scoreActionableCandidate } from "./decision.js";
import {
  ensureEnergyMoodState,
  getEnergyMoodContextDetails,
  getEnergyMoodData as buildEnergyMoodData,
  getEnergyMoodInfluenceForItem,
  recordEnergyMoodCheckIn,
} from "./energy-mood-tracking.js";
import {
  buildSmartIntervention,
  ensureInterventionState,
  getCachedIntervention,
  recordInterventionOutcome,
  recordInterventionShown,
} from "./intervention-engine.js";
import {
  ensureSmartReschedulingState,
  getSmartReschedulingData,
  runSmartRescheduling,
} from "./smart-rescheduling.js";
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
  buildDueHabitItems,
  clearHabitDraft,
  completeHabit,
  createHabit,
  deleteHabit as removeHabit,
  ensureHabitState,
  getHabitInfluenceForItem,
  getHabitTrackingData as buildHabitTrackingData,
  setHabitActive,
  setHabitDraft,
  updateHabit,
} from "./habit-tracking.js";
import {
  buildMedicationRefillItems,
  ensureMedicationState,
  getMedicationTrackingData as buildMedicationTrackingData,
  saveMedicationGroup as saveMedicationGroupItems,
  setMedicationItemState,
  updateMedicationDetails,
} from "./medication-tracking.js";
import {
  clearGoalDraft,
  completeGoal,
  createGoal,
  deleteGoal as removeGoal,
  ensureGoalState,
  getGoalInfluenceForItem,
  getGoalSettingData as buildGoalSettingData,
  getTopActiveGoals,
  reactivateGoal,
  setGoalDraft,
  updateGoal,
} from "./goal-setting.js";
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
  clearProjectDraft,
  completeProject,
  createProject,
  deleteProject as removeProject,
  ensureProjectState,
  getProjectById,
  getProjectTrackingData as buildProjectTrackingData,
  reactivateProject,
  setProjectDraft,
  updateProject,
} from "./project-tracking.js";
import {
  ensurePositiveReinforcementState,
  recordPositiveReinforcementShown,
  selectPositiveReinforcement,
} from "./positive-reinforcement.js";
import {
  buildGeneratedRecoverySuggestions,
  computeAdaptiveEffect,
  recordLearningEvent,
  recordMissedItems,
  recordRecoveryHistoryEntry,
} from "./recovery-adaptation.js";
import {
  buildDueRecurringOccurrences,
  clearRecurringTaskDraft,
  completeRecurringOccurrence,
  createRecurringTask,
  deleteRecurringTask as removeRecurringTask,
  ensureRecurringTaskState,
  getRecurringTaskData as buildRecurringTaskData,
  setRecurringTaskActive,
  setRecurringTaskDraft,
  updateRecurringTask,
} from "./recurring-task-engine.js";
import {
  addActionsToRoutine,
  addMedicationGroupStep,
  buildScheduledRoutineSteps,
  buildActiveRoutineSteps,
  clearRoutineBuilderDraft,
  createRoutineContainer,
  createRoutinePlan,
  deleteRoutinePlan,
  ensureRoutineBuilderState,
  getRoutineBuilderData as buildRoutineBuilderData,
  moveRoutineStep,
  moveRoutineStepToIndex,
  removeRoutineStep,
  setRoutineBuilderDraft,
  setRoutinePlanActive,
  updateRoutineSchedule,
  updateRoutinePlan,
} from "./routine-builder.js";
import {
  closeRoutineSession,
  completeRoutineSessionStep,
  ensureRoutineGuidanceState,
  getDueRoutineAlarmPrompt,
  getActiveRoutineGuidance as buildActiveRoutineGuidance,
  getRoutineGuidanceSettings as buildRoutineGuidanceSettings,
  isRoutineReminderDue,
  markRoutineAlarmPrompted as markRoutineAlarmPromptedInState,
  markRoutinePrompted,
  pauseRoutineSession,
  resumeRoutineSession,
  skipRoutineSessionStep,
  startRoutineSession,
  updateRoutineGuidanceSettings,
} from "./routine-guidance.js";
import { clearState, loadState, saveState } from "./storage.js";
import { ensureTipState, getTipById, recordTipShown, selectHelpfulStrategy } from "./tips.js";
import {
  approveVoiceListItems as approveVoiceListDraftItems,
  clearVoiceListDraft as clearVoiceListEntryDraft,
  deleteSavedVoiceListItem as deleteSavedVoiceListEntryItem,
  ensureVoiceListEntryState,
  getVoiceListEntryData as buildVoiceListEntryData,
  reviewVoiceListText as reviewVoiceListEntryText,
  setSavedVoiceListGroupDone,
  setSavedVoiceListItemDone,
  setGeneralListType as setVoiceListGeneralListType,
  updateVoiceListItem as updateVoiceListEntryItem,
  removeVoiceListItem as removeVoiceListEntryItem,
  setGeneralListName as setVoiceListGeneralListName,
} from "./voice-list-entry.js";

let state = loadState(defaultState);
let unlockError = "";
state.interviewProfile = buildProfileWithRulesets(ensureProfileShape(state.interviewProfile));
state.tipState = ensureTipState(state.tipState);
state.positiveReinforcementState = ensurePositiveReinforcementState(state.positiveReinforcementState);
state.interventionState = ensureInterventionState(state.interventionState);
ensureEnergyMoodState(state);
ensureRoutineBuilderState(state);
ensureRoutineGuidanceState(state);
ensureMedicationState(state);
ensureGoalState(state);
ensureProjectState(state);
ensureHabitState(state);
ensureRecurringTaskState(state);
ensureSmartReschedulingState(state);
ensureVoiceListEntryState(state);
initializePrivacyLock();

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
  if (state.ui?.lastMorningBriefingDate !== getTodayKey() && !state.ui?.activeView) {
    return "briefing";
  }

  return state.ui?.activeView ?? "command-center";
}

export function getAppearanceSettings() {
  return {
    backgroundType: state.ui?.appearance?.backgroundType ?? "color",
    backgroundColor: state.ui?.appearance?.backgroundColor ?? "#dfeeff",
    overlay: state.ui?.appearance?.overlay ?? "medium",
    imageDataUrl: state.ui?.appearance?.imageDataUrl ?? "",
    imageName: state.ui?.appearance?.imageName ?? "",
  };
}

export function getAccountSettings() {
  const account = state.ui?.account ?? {};
  const privacyLock = account.privacyLock ?? {};
  return {
    displayName: account.displayName ?? state.user?.firstName ?? "",
    profilePhotoDataUrl: account.profilePhotoDataUrl ?? "",
    profilePhotoName: account.profilePhotoName ?? "",
    privacyLock: {
      enabled: Boolean(privacyLock.enabled),
      configured: Boolean(privacyLock.passcodeHash),
      lastChangedAt: privacyLock.lastChangedAt ?? null,
    },
    isLocked: isPrivacyLocked(),
    unlockError,
  };
}

export function isPrivacyLocked() {
  const privacyLock = state.ui?.account?.privacyLock;
  return Boolean(privacyLock?.enabled && privacyLock?.passcodeHash && !isSessionUnlocked());
}

export function saveAccountProfile(formData) {
  const current = getAccountSettings();
  const displayName = String(formData.get("displayName") ?? current.displayName).trim();
  state.ui = {
    ...state.ui,
    account: {
      ...state.ui?.account,
      displayName: displayName || current.displayName,
    },
  };
  state.user = {
    ...state.user,
    firstName: displayName || state.user?.firstName,
  };
  saveState(state);
}

export function saveProfilePhoto(imageDataUrl, imageName = "") {
  state.ui = {
    ...state.ui,
    account: {
      ...state.ui?.account,
      profilePhotoDataUrl: imageDataUrl,
      profilePhotoName: imageName,
    },
  };
  saveState(state);
}

export function clearProfilePhoto() {
  state.ui = {
    ...state.ui,
    account: {
      ...state.ui?.account,
      profilePhotoDataUrl: "",
      profilePhotoName: "",
    },
  };
  saveState(state);
}

export async function savePrivacyLock(formData) {
  const passcode = String(formData.get("passcode") ?? "");
  const confirmPasscode = String(formData.get("confirmPasscode") ?? "");
  unlockError = "";

  if (passcode.length < 4) {
    unlockError = "Use at least 4 characters for the local passcode.";
    return false;
  }

  if (passcode !== confirmPasscode) {
    unlockError = "The passcodes did not match.";
    return false;
  }

  state.ui = {
    ...state.ui,
    account: {
      ...state.ui?.account,
      privacyLock: {
        enabled: true,
        passcodeHash: await hashPasscode(passcode),
        lastChangedAt: new Date().toISOString(),
      },
    },
  };
  setSessionUnlocked(true);
  saveState(state);
  return true;
}

export function disablePrivacyLock() {
  unlockError = "";
  state.ui = {
    ...state.ui,
    account: {
      ...state.ui?.account,
      privacyLock: {
        enabled: false,
        passcodeHash: "",
        lastChangedAt: null,
      },
    },
  };
  setSessionUnlocked(false);
  saveState(state);
}

export function lockApp() {
  unlockError = "";
  setSessionUnlocked(false);
}

export async function unlockApp(formData) {
  const privacyLock = state.ui?.account?.privacyLock;
  const passcode = String(formData.get("passcode") ?? "");
  unlockError = "";

  if (!privacyLock?.enabled || !privacyLock?.passcodeHash) {
    setSessionUnlocked(true);
    return true;
  }

  if ((await hashPasscode(passcode)) !== privacyLock.passcodeHash) {
    unlockError = "That passcode did not unlock the app.";
    return false;
  }

  setSessionUnlocked(true);
  return true;
}

export function getUnlockError() {
  return unlockError;
}

export function saveAppearanceSettings(formData) {
  const current = getAppearanceSettings();
  state.ui = {
    ...state.ui,
    appearance: {
      ...current,
      backgroundType: String(formData.get("backgroundType") ?? current.backgroundType),
      backgroundColor: String(formData.get("backgroundColor") ?? current.backgroundColor),
      overlay: String(formData.get("overlay") ?? current.overlay),
    },
  };
  saveState(state);
}

export function saveAppearanceImage(imageDataUrl, imageName = "") {
  const current = getAppearanceSettings();
  state.ui = {
    ...state.ui,
    appearance: {
      ...current,
      backgroundType: "image",
      imageDataUrl,
      imageName,
    },
  };
  saveState(state);
}

export function clearAppearanceImage() {
  const current = getAppearanceSettings();
  state.ui = {
    ...state.ui,
    appearance: {
      ...current,
      backgroundType: "color",
      imageDataUrl: "",
      imageName: "",
    },
  };
  saveState(state);
}

export function setActiveView(activeView) {
  state.ui = { ...state.ui, activeView };
  saveState(state);
}

export function getSetupJourneyData() {
  const skippedSteps = new Set(state.ui?.setup?.skippedSteps ?? []);
  const steps = getSetupStepDefinitions().map((step) => {
    const complete = isSetupStepComplete(step.id);
    return {
      ...step,
      complete,
      skipped: skippedSteps.has(step.id) && !complete,
      status: complete ? "Done" : skippedSteps.has(step.id) ? "Skipped for now" : "Ready",
    };
  });
  const nextStep = steps.find((step) => !step.complete && !step.skipped) ?? steps.find((step) => !step.complete) ?? null;

  return {
    progressive: getProgressiveSetupData(),
    steps,
    nextStep,
    completeCount: steps.filter((step) => step.complete).length,
    totalCount: steps.length,
  };
}

export function getProgressiveSetupData() {
  const progressive = ensureProgressiveSetup();
  const helpArea = getProgressiveHelpArea(progressive.helpArea);
  return {
    ...progressive,
    helpAreas: getProgressiveHelpAreas(),
    selectedHelpArea: helpArea,
    followUpPrompt: helpArea?.prompt ?? "",
    helperText: "Start with one thing. You can add more later as your assistant becomes useful.",
    optionalText: "If you already know several things you want help with, you can add more now. But you do not need to fill everything out today.",
    promptExamples: getProgressivePromptExamples(),
  };
}

export function startProgressiveSetup() {
  const progressive = ensureProgressiveSetup();
  progressive.introSeen = true;
  progressive.step = progressive.name ? "help" : "name";
  saveState(state);
}

export function resetProgressiveOnboarding() {
  state.ui = {
    ...state.ui,
    activeView: "setup",
    setup: {
      ...state.ui?.setup,
      progressive: getDefaultProgressiveSetup(),
    },
  };
  saveState(state);
}

export function saveProgressiveName(formData) {
  const name = String(formData.get("progressiveName") ?? "").trim();
  const progressive = ensureProgressiveSetup();
  progressive.name = name;
  progressive.step = "help";
  state.ui.account = {
    ...state.ui?.account,
    displayName: name,
  };
  state.user = {
    ...state.user,
    firstName: name || state.user?.firstName,
  };
  saveState(state);
}

export function saveProgressiveHelpArea(formData) {
  const helpArea = String(formData.get("helpArea") ?? "").trim();
  const progressive = ensureProgressiveSetup();
  if (!getProgressiveHelpArea(helpArea)) {
    return;
  }

  progressive.helpArea = helpArea;
  progressive.step = "detail";
  saveState(state);
}

export function completeProgressiveSetup(formData) {
  const firstThing = String(formData.get("firstThing") ?? "").trim();
  const moreThings = String(formData.get("moreThings") ?? "").trim();
  const starterType = String(formData.get("starterType") ?? "").trim();
  const confirmed = String(formData.get("confirmProgressiveSetup") ?? "") === "true";
  const progressive = ensureProgressiveSetup();
  if (!firstThing) {
    return false;
  }

  progressive.firstThing = firstThing;
  progressive.moreThings = moreThings;
  progressive.starterItem = previewProgressiveStarterItem(progressive.helpArea, firstThing, starterType);

  if (!confirmed) {
    progressive.step = "review";
    saveState(state);
    return true;
  }

  progressive.completed = true;
  progressive.step = "complete";
  progressive.starterItem = createProgressiveStarterItem(progressive.helpArea, firstThing, starterType || progressive.starterItem?.type);
  progressive.starterAcknowledgementDismissed = false;
  state.ui.activeView = "command-center";
  saveState(state);
  return true;
}

export function editProgressiveStarterAnswer() {
  const progressive = ensureProgressiveSetup();
  progressive.step = "detail";
  saveState(state);
}

export function dismissProgressiveStarterAcknowledgement() {
  const progressive = ensureProgressiveSetup();
  progressive.starterAcknowledgementDismissed = true;
  saveState(state);
}

export function startSetupStep(stepId) {
  const step = getSetupStepDefinitions().find((item) => item.id === stepId);
  if (!step) {
    return;
  }

  state.ui = {
    ...state.ui,
    activeView: step.view,
    setup: {
      ...state.ui?.setup,
      skippedSteps: (state.ui?.setup?.skippedSteps ?? []).filter((id) => id !== stepId),
    },
  };
  saveState(state);
}

export function skipSetupStep(stepId) {
  const stepIds = new Set(getSetupStepDefinitions().map((step) => step.id));
  if (!stepIds.has(stepId)) {
    return;
  }

  const skippedSteps = new Set(state.ui?.setup?.skippedSteps ?? []);
  skippedSteps.add(stepId);
  state.ui = {
    ...state.ui,
    setup: {
      ...state.ui?.setup,
      skippedSteps: [...skippedSteps],
    },
  };
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
  setSessionUnlocked(false);
  unlockError = "";
  state = loadState(defaultState);
  state.interviewProfile = buildProfileWithRulesets(ensureProfileShape(state.interviewProfile));
  state.tipState = ensureTipState(state.tipState);
  state.positiveReinforcementState = ensurePositiveReinforcementState(state.positiveReinforcementState);
  state.interventionState = ensureInterventionState(state.interventionState);
  ensureEnergyMoodState(state);
  ensureRoutineBuilderState(state);
  ensureGoalState(state);
  ensureHabitState(state);
  ensureRecurringTaskState(state);
  ensureSmartReschedulingState(state);
  ensureVoiceListEntryState(state);
  initializePrivacyLock();
}

export function loadDemo(demoId) {
  state = createDemoState(demoId);
  ensureVoiceListEntryState(state);
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
  if (collectionName === "medicationRefills") {
    const item = findByCollection(collectionName, id);
    recordItemEvent(collectionName, id, "done", item);
    recordGoalProgress(collectionName, id, item);
    setMedicationItemState(state, id, {
      status: "done",
      completed: true,
      completedAt: new Date().toISOString(),
    });
    saveState(state);
    return;
  }

  if (collectionName === "recurringOccurrences") {
    const item = findByCollection(collectionName, id);
    const recurringTask = completeRecurringOccurrence(state, id);
    recordItemEvent(collectionName, id, "done", item);
    recordGoalProgress(collectionName, id, item ?? recurringTask);
    saveState(state);
    return;
  }

  if (collectionName === "habitItems") {
    const item = findByCollection(collectionName, id);
    const habit = completeHabit(state, id);
    recordItemEvent(collectionName, id, "done", item);
    recordGoalProgress(collectionName, id, item ?? habit);
    saveState(state);
    return;
  }

  if (collectionName === "routineSteps") {
    const item = findByCollection(collectionName, id);
    recordItemEvent(collectionName, id, "done", item);
    recordGoalProgress(collectionName, id, item);
    state.routineStepState[id] = {
      ...state.routineStepState[id],
      dateKey: getTodayKey(),
      status: "done",
      completed: true,
      completedAt: new Date().toISOString(),
    };
    saveState(state);
    return;
  }

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
  if (collectionName === "medicationRefills") {
    setMedicationItemState(state, id, {
      status: "doing",
      startedAt: new Date().toISOString(),
    });
    saveState(state);
    return;
  }

  if (collectionName === "recurringOccurrences") {
    state.recurringOccurrenceState[id] = {
      ...state.recurringOccurrenceState[id],
      status: "doing",
      startedAt: new Date().toISOString(),
    };
    saveState(state);
    return;
  }

  if (collectionName === "routineSteps") {
    state.routineStepState[id] = {
      ...state.routineStepState[id],
      dateKey: getTodayKey(),
      status: "doing",
      startedAt: new Date().toISOString(),
    };
    saveState(state);
    return;
  }

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
  if (collectionName === "medicationRefills") {
    const item = findByCollection(collectionName, id);
    recordItemEvent(collectionName, id, "snoozed", item);
    setMedicationItemState(state, id, {
      status: "snoozed",
      completed: false,
      snoozedUntil: getSnoozeLabel(),
    });
    saveState(state);
    return;
  }

  if (collectionName === "recurringOccurrences") {
    const item = findByCollection(collectionName, id);
    recordItemEvent(collectionName, id, "snoozed", item);
    state.recurringOccurrenceState[id] = {
      ...state.recurringOccurrenceState[id],
      status: "snoozed",
      completed: false,
      snoozedUntil: getSnoozeLabel(),
    };
    saveState(state);
    return;
  }

  if (collectionName === "routineSteps") {
    const item = findByCollection(collectionName, id);
    recordItemEvent(collectionName, id, "snoozed", item);
    state.routineStepState[id] = {
      ...state.routineStepState[id],
      dateKey: getTodayKey(),
      status: "snoozed",
      completed: false,
      snoozedUntil: getSnoozeLabel(),
    };
    saveState(state);
    return;
  }

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
  if (collectionName === "medicationRefills") {
    const item = findByCollection(collectionName, id);
    recordItemEvent(collectionName, id, "skipped", item);
    setMedicationItemState(state, id, {
      status: "skipped",
      completed: false,
      skippedUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
    saveState(state);
    return;
  }

  if (collectionName === "recurringOccurrences") {
    const item = findByCollection(collectionName, id);
    recordItemEvent(collectionName, id, "skipped", item);
    state.recurringOccurrenceState[id] = {
      ...state.recurringOccurrenceState[id],
      status: "skipped",
      completed: false,
      skippedUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
    saveState(state);
    return;
  }

  if (collectionName === "routineSteps") {
    const item = findByCollection(collectionName, id);
    recordItemEvent(collectionName, id, "skipped", item);
    state.routineStepState[id] = {
      ...state.routineStepState[id],
      dateKey: getTodayKey(),
      status: "skipped",
      completed: false,
      skippedUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
    saveState(state);
    return;
  }

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
  if (collectionName === "medicationRefills") {
    const item = findByCollection(collectionName, id);
    recordItemEvent(collectionName, id, "dismissed", item);
    setMedicationItemState(state, id, {
      status: "dismissed",
      dismissedAt: new Date().toISOString(),
    });
    saveState(state);
    return;
  }

  if (collectionName === "recurringOccurrences") {
    const item = findByCollection(collectionName, id);
    recordItemEvent(collectionName, id, "dismissed", item);
    state.recurringOccurrenceState[id] = {
      ...state.recurringOccurrenceState[id],
      status: "dismissed",
      dismissedAt: new Date().toISOString(),
    };
    saveState(state);
    return;
  }

  if (collectionName === "routineSteps") {
    const item = findByCollection(collectionName, id);
    recordItemEvent(collectionName, id, "dismissed", item);
    state.routineStepState[id] = {
      ...state.routineStepState[id],
      dateKey: getTodayKey(),
      status: "dismissed",
      dismissedAt: new Date().toISOString(),
    };
    saveState(state);
    return;
  }

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
  const projectId = String(formData.get("projectId") ?? "").trim();
  const task = {
    id: `action-${Date.now()}`,
    areaId,
    title,
    category,
    workType,
    timingType,
    status: "todo",
    priority: String(formData.get("priority") ?? "Medium"),
    estimatedEffortMinutes: getDefaultEstimatedMinutes(title),
    createdAt: new Date().toISOString(),
  };
  if (projectId && getProjectById(state, projectId)) {
    task.projectId = projectId;
  }

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

export function addHourlyItem(formData) {
  const type = String(formData.get("hourlyType") ?? "task");
  const title = String(formData.get("hourlyTitle") ?? "").trim();
  const hour = String(formData.get("hourlyTime") ?? "9:00 AM");
  if (!title) {
    return;
  }

  if (type === "task") {
    addTask(makeStateFormData({
      title,
      timingType: "scheduled",
      when: hour,
      priority: "Medium",
      category: "Personal",
      workType: "None",
      areaId: "projects",
    }));
    return;
  }

  if (type === "habit") {
    createHabit(state, makeStateFormData({
      habitName: title,
      habitCategory: "Personal",
      habitFrequencyType: "daily",
      habitTargetDays: "",
      habitDailyTargetCount: "1",
      habitWeeklyTargetCount: "1",
      habitActive: "active",
    }));
    saveState(state);
    return;
  }

  if (type === "routine") {
    const routine = createRoutinePlan(state, makeStateFormData({
      routineName: title,
      routineType: getDayPart(),
      routineActive: "active",
      routineSteps: `${title} - ${getDefaultEstimatedMinutes(title)}`,
    }));
    state.timeline.unshift({
      id: `timeline-${Date.now()}`,
      title,
      time: hour,
      startTime: hour,
      type: "Routine",
      areaId: "projects",
      status: "Upcoming",
      priority: "Medium",
      timingType: "scheduled",
      estimatedEffortMinutes: getDefaultEstimatedMinutes(title),
      routinePlanId: routine.id,
      createdAt: new Date().toISOString(),
    });
    saveState(state);
    return;
  }

  if (type === "project") {
    createProject(state, makeStateFormData({
      projectTitle: title,
      projectCategory: "Personal",
      projectNextStep: "",
    }));
    saveState(state);
    return;
  }

  const item = {
    id: `${type}-${Date.now()}`,
    title,
    time: hour,
    startTime: hour,
    type: type === "meal" ? "Meal" : "Note",
    areaId: type === "meal" ? "health" : "projects",
    status: "Upcoming",
    priority: "Medium",
    timingType: "scheduled",
    estimatedEffortMinutes: type === "meal" ? 30 : 5,
    createdAt: new Date().toISOString(),
  };
  if (type === "meal") {
    state.meals = Array.isArray(state.meals) ? state.meals : [];
    state.meals.unshift(item);
  } else {
    state.notes = Array.isArray(state.notes) ? state.notes : [];
    state.notes.unshift(item);
  }
  state.timeline.unshift(item);
  saveState(state);
}

export function createProjectNextTask(id) {
  const project = getProjectById(state, id);
  if (!project?.nextStep) {
    return null;
  }

  const task = {
    id: `action-${Date.now()}`,
    areaId: "projects",
    title: project.nextStep,
    category: project.category === "Work" ? "Work" : "Personal",
    workType: "none",
    timingType: "flexible",
    status: "todo",
    priority: "Medium",
    estimatedEffortMinutes: getDefaultEstimatedMinutes(project.nextStep),
    preferredWindow: "Today",
    dueDate: "Today",
    projectId: project.id,
    createdAt: new Date().toISOString(),
  };

  state.actions.unshift(task);
  saveState(state);
  return task;
}

function makeStateFormData(values) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.append(key, value ?? "");
  }
  return formData;
}

function getDefaultEstimatedMinutes(title) {
  const value = String(title ?? "").toLowerCase();
  if (/\b(medication|medications|medicine|meds|pill|pills|take my|take supplement|supplement|drink water|water)\b/.test(value)) {
    return 1;
  }
  if (/\b(stretch|stretching)\b/.test(value)) {
    return 15;
  }
  if (/\b(email review|review email|review emails|inbox|email)\b/.test(value)) {
    return 25;
  }
  return 15;
}

export function getRoutineBuilderData() {
  return buildRoutineBuilderData(state, getDayPart);
}

export function getMedicationTrackingData() {
  return buildMedicationTrackingData(state);
}

export function saveMedicationGroup(formData) {
  const result = saveMedicationGroupItems(state, formData);
  saveState(state);
  return result;
}

export function saveMedicationDetails(formData) {
  updateMedicationDetails(state, formData);
  saveState(state);
}

export function getVoiceListEntryData(targetId) {
  return buildVoiceListEntryData(state, targetId);
}

export function reviewVoiceListText(targetId, text) {
  reviewVoiceListEntryText(state, targetId, text);
  saveState(state);
}

export function updateVoiceListItem(targetId, itemId, text) {
  updateVoiceListEntryItem(state, targetId, itemId, text);
  saveState(state);
}

export function removeVoiceListItem(targetId, itemId) {
  removeVoiceListEntryItem(state, targetId, itemId);
  saveState(state);
}

export function clearVoiceListDraft(targetId) {
  clearVoiceListEntryDraft(state, targetId);
  saveState(state);
}

export function approveVoiceListItems(targetId) {
  const approvedItems = approveVoiceListDraftItems(state, targetId);
  saveState(state);
  return approvedItems;
}

export function deleteSavedVoiceListItem(targetId, itemId) {
  deleteSavedVoiceListEntryItem(state, targetId, itemId);
  saveState(state);
}

export function markSavedVoiceListItemDone(targetId, itemId) {
  setSavedVoiceListItemDone(state, targetId, itemId, true);
  saveState(state);
}

export function reopenSavedVoiceListItem(targetId, itemId) {
  setSavedVoiceListItemDone(state, targetId, itemId, false);
  saveState(state);
}

export function markGeneralListDone(listName) {
  setSavedVoiceListGroupDone(state, listName, true);
  saveState(state);
}

export function reopenGeneralList(listName) {
  setSavedVoiceListGroupDone(state, listName, false);
  saveState(state);
}

export function setGeneralListName(listName) {
  setVoiceListGeneralListName(state, listName);
  saveState(state);
}

export function setGeneralListDetails(listName, listType) {
  setVoiceListGeneralListName(state, listName);
  setVoiceListGeneralListType(state, listType);
  saveState(state);
}

export function saveRoutine(formData) {
  const id = String(formData.get("routineId") ?? "").trim();
  let routine = null;
  if (id) {
    routine = updateRoutinePlan(state, id, formData);
  } else {
    routine = createRoutinePlan(state, formData);
  }
  syncRoutineTimelineItem(routine);
  saveState(state);
}

export function createRoutineFromTemplate(templateId, customName = "") {
  const routine = createRoutineContainer(state, templateId, customName);
  saveState(state);
  return routine;
}

export function addRoutineActions(routineId, actionNames) {
  const routine = addActionsToRoutine(state, routineId, actionNames);
  saveState(state);
  return routine;
}

export function addMedicationGroupToRoutine(routineId, groupName, schedule) {
  const routine = addMedicationGroupStep(state, routineId, groupName, schedule);
  saveState(state);
  return routine;
}

export function moveRoutineAction(routineId, stepId, direction) {
  moveRoutineStep(state, routineId, stepId, direction);
  saveState(state);
}

export function moveRoutineActionToIndex(routineId, stepId, targetIndex) {
  moveRoutineStepToIndex(state, routineId, stepId, targetIndex);
  saveState(state);
}

export function removeRoutineAction(routineId, stepId) {
  removeRoutineStep(state, routineId, stepId);
  saveState(state);
}

export function saveRoutineSchedule(routineId, formData) {
  const routine = updateRoutineSchedule(state, routineId, formData);
  syncRoutineTimelineItem(routine);
  saveState(state);
}

export function getRoutineGuidanceSettings() {
  return buildRoutineGuidanceSettings(state);
}

export function saveRoutineGuidanceSettings(formData) {
  updateRoutineGuidanceSettings(state, formData);
  saveState(state);
}

export function getActiveRoutineGuidance(routineId = "") {
  return buildActiveRoutineGuidance(state, routineId);
}

export function startActiveRoutine(routineId) {
  const guidance = startRoutineSession(state, routineId);
  saveState(state);
  return guidance;
}

export function completeActiveRoutineStep(routineId, stepId) {
  const before = getActiveRoutineGuidance(routineId);
  const item = before?.steps.flatMap((step) => step.children?.length ? step.children : [step]).find((step) => step.id === stepId);
  const guidance = completeRoutineSessionStep(state, routineId, stepId);
  recordItemEvent("routineSteps", item?.itemId ?? `routine-step-${routineId}-${stepId}`, "done", item);
  recordGoalProgress("routineSteps", item?.itemId ?? `routine-step-${routineId}-${stepId}`, item);
  saveState(state);
  return guidance;
}

export function skipActiveRoutineStep(routineId, stepId) {
  const before = getActiveRoutineGuidance(routineId);
  const item = before?.steps.flatMap((step) => step.children?.length ? step.children : [step]).find((step) => step.id === stepId);
  const guidance = skipRoutineSessionStep(state, routineId, stepId);
  recordItemEvent("routineSteps", item?.itemId ?? `routine-step-${routineId}-${stepId}`, "skipped", item);
  saveState(state);
  return guidance;
}

export function pauseActiveRoutine() {
  pauseRoutineSession(state);
  saveState(state);
}

export function resumeActiveRoutine() {
  resumeRoutineSession(state);
  saveState(state);
}

export function closeActiveRoutine() {
  closeRoutineSession(state);
  saveState(state);
}

export function markActiveRoutinePrompted() {
  markRoutinePrompted(state);
  saveState(state);
}

export function shouldRemindActiveRoutine() {
  return isRoutineReminderDue(getActiveRoutineGuidance());
}

export function getDueRoutineAlarm() {
  return getDueRoutineAlarmPrompt(state);
}

export function acknowledgeRoutineAlarm(routineId) {
  markRoutineAlarmPromptedInState(state, routineId);
  saveState(state);
}

export function editRoutine(id) {
  setRoutineBuilderDraft(state, id);
  saveState(state);
}

export function cancelRoutineEdit() {
  clearRoutineBuilderDraft(state);
  saveState(state);
}

export function deleteRoutine(id) {
  deleteRoutinePlan(state, id);
  removeRoutineTimelineItem(id);
  saveState(state);
}

export function activateRoutine(id) {
  setRoutinePlanActive(state, id, true);
  syncRoutineTimelineItem(state.routinePlans.find((routine) => routine.id === id));
  saveState(state);
}

export function deactivateRoutine(id) {
  setRoutinePlanActive(state, id, false);
  removeRoutineTimelineItem(id);
  saveState(state);
}

export function getHabitTrackingData() {
  return buildHabitTrackingData(state);
}

export function saveHabit(formData) {
  const id = String(formData.get("habitId") ?? "").trim();
  if (id) {
    updateHabit(state, id, formData);
  } else {
    createHabit(state, formData);
  }
  saveState(state);
}

export function editHabit(id) {
  setHabitDraft(state, id);
  saveState(state);
}

export function cancelHabitEdit() {
  clearHabitDraft(state);
  saveState(state);
}

export function deleteHabit(id) {
  removeHabit(state, id);
  saveState(state);
}

export function activateHabit(id) {
  setHabitActive(state, id, true);
  saveState(state);
}

export function deactivateHabit(id) {
  setHabitActive(state, id, false);
  saveState(state);
}

export function getRecurringTaskData() {
  return buildRecurringTaskData(state);
}

export function saveRecurringTask(formData) {
  const id = String(formData.get("recurringTaskId") ?? "").trim();
  if (id) {
    updateRecurringTask(state, id, formData);
  } else {
    createRecurringTask(state, formData);
  }
  saveState(state);
}

export function addWaterBreakTemplate() {
  const today = getTodayKey();
  const waterBreaks = [
    ["Water break - morning", "9:00 AM"],
    ["Water break - late morning", "11:00 AM"],
    ["Water break - early afternoon", "1:00 PM"],
    ["Water break - mid afternoon", "3:00 PM"],
    ["Water break - evening", "5:00 PM"],
  ];

  for (const [name, scheduledTime] of waterBreaks) {
    const exists = state.recurringTasks.some((task) => task.templateId === "water-breaks-v1" && task.name === name);
    if (exists) {
      continue;
    }

    createRecurringTask(state, makeStateFormData({
      recurringTaskName: name,
      recurringTaskType: "daily",
      recurringTaskNextOccurrence: today,
      recurringTaskScheduledTime: scheduledTime,
      recurringTaskCustomSchedule: "",
      recurringTaskCategory: "Health",
      recurringTaskPriority: "Low",
      recurringTaskActive: "active",
    })).templateId = "water-breaks-v1";
  }
  saveState(state);
}

export function editRecurringTask(id) {
  setRecurringTaskDraft(state, id);
  saveState(state);
}

export function cancelRecurringTaskEdit() {
  clearRecurringTaskDraft(state);
  saveState(state);
}

export function deleteRecurringTask(id) {
  removeRecurringTask(state, id);
  saveState(state);
}

export function activateRecurringTask(id) {
  setRecurringTaskActive(state, id, true);
  saveState(state);
}

export function deactivateRecurringTask(id) {
  setRecurringTaskActive(state, id, false);
  saveState(state);
}

export function getGoalSettingData() {
  return buildGoalSettingData(state);
}

export function saveGoal(formData) {
  const id = String(formData.get("goalId") ?? "").trim();
  if (id) {
    updateGoal(state, id, formData);
  } else {
    createGoal(state, formData);
  }
  saveState(state);
}

export function editGoal(id) {
  setGoalDraft(state, id);
  saveState(state);
}

export function cancelGoalEdit() {
  clearGoalDraft(state);
  saveState(state);
}

export function deleteGoal(id) {
  removeGoal(state, id);
  saveState(state);
}

export function markGoalComplete(id) {
  completeGoal(state, id);
  saveState(state);
}

export function reactivateCompletedGoal(id) {
  reactivateGoal(state, id);
  saveState(state);
}

export function getProjectTrackingData() {
  return buildProjectTrackingData(state);
}

export function saveProject(formData) {
  const id = String(formData.get("projectId") ?? "").trim();
  if (id) {
    updateProject(state, id, formData);
  } else {
    createProject(state, formData);
  }
  saveState(state);
}

export function editProject(id) {
  setProjectDraft(state, id);
  saveState(state);
}

export function cancelProjectEdit() {
  clearProjectDraft(state);
  saveState(state);
}

export function deleteProject(id) {
  removeProject(state, id);
  saveState(state);
}

export function markProjectComplete(id) {
  completeProject(state, id);
  saveState(state);
}

export function reactivateCompletedProject(id) {
  reactivateProject(state, id);
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
  const recommendedRoutineId = recommendation?.collection === "routineSteps" ? recommendation.item.routineId : "";

  return {
    now: recommendation,
    activeRoutine: getActiveRoutineGuidance(recommendedRoutineId),
    comingUp,
    timeRemaining: recommendation ? getTimeRemainingLabel(comingUp) : "Time Remaining: Due now",
    tip: getHelpfulStrategy("working"),
    intervention: getSmartIntervention("working"),
  };
}

export function getMorningBriefingData() {
  const smartRescheduling = applySmartRescheduling();

  return {
    goalProgress: getGoalProgressSummary(),
    energyMood: getEnergyMoodData(),
    smartRescheduling,
    goals: getTopActiveGoals(state, 3),
    habits: getHabitTrackingData(),
    medications: getMedicationTrackingData(),
    recurringTasks: getRecurringTaskData(),
    tomorrowPlanning: getTomorrowPlanningData(),
    morningRoutine: getGeneratedMorningRoutine(),
    builtRoutines: getRoutineBuilderData(),
    recoverySuggestions: getGeneratedRecoverySuggestions(),
    bigThings: getScoredActionableItems().slice(0, 3),
    guidance: getGeneratedGuidance(),
    scheduledToday: getScheduledCandidates()
      .filter(isOpen)
      .sort((left, right) => getRawMinutesUntilScheduledStart(left) - getRawMinutesUntilScheduledStart(right)),
    potentialIssues: getPotentialIssues(),
    tip: getHelpfulStrategy("briefing"),
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

export function getEnergyMoodData() {
  return buildEnergyMoodData(state);
}

export function saveEnergyMoodCheckIn(formData) {
  recordEnergyMoodCheckIn(state, formData);
  saveState(state);
}

export function getSmartReschedulingSummary() {
  return getSmartReschedulingData(getSmartReschedulingContext());
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

export function getHelpfulStrategy(contextName = "dashboard") {
  state.tipState = ensureTipState(state.tipState);
  const context = getTipContext(contextName);
  const todayKey = getTodayKey();
  const cached = state.tipState.lastShownByContext?.[contextName];
  const cachedTip = cached?.date === todayKey ? getTipById(cached.tipId, context) : null;
  const tip = cachedTip ?? selectHelpfulStrategy(context);
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

function initializePrivacyLock() {
  const privacyLock = state.ui?.account?.privacyLock;
  if (privacyLock?.enabled && privacyLock?.passcodeHash && !isSessionUnlocked()) {
    setSessionUnlocked(false);
  }
}

function isSessionUnlocked() {
  try {
    return window.sessionStorage?.getItem("life-enablement-unlocked") === "true";
  } catch {
    return false;
  }
}

function setSessionUnlocked(isUnlocked) {
  try {
    if (isUnlocked) {
      window.sessionStorage?.setItem("life-enablement-unlocked", "true");
    } else {
      window.sessionStorage?.removeItem("life-enablement-unlocked");
    }
  } catch {
    // Session storage can be unavailable in strict browser modes. The lock still blocks on reload.
  }
}

async function hashPasscode(passcode) {
  if (globalThis.crypto?.subtle) {
    const encoded = new TextEncoder().encode(`life-enablement-local-lock:${passcode}`);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  let hash = 0;
  const salted = `life-enablement-local-lock:${passcode}`;
  for (let index = 0; index < salted.length; index += 1) {
    hash = ((hash << 5) - hash + salted.charCodeAt(index)) | 0;
  }
  return `prototype-${Math.abs(hash)}`;
}

export function getScoredActionableItems() {
  return getActionableCandidates()
    .filter((candidate) => !isDone(candidate.item))
    .filter((candidate) => !candidate.item.hideFromNow)
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

export function getPositiveReinforcement(contextName = "dashboard") {
  state.positiveReinforcementState = ensurePositiveReinforcementState(state.positiveReinforcementState);
  const now = new Date();
  const message = selectPositiveReinforcement(getPositiveReinforcementContext(contextName, now));
  if (recordPositiveReinforcementShown(state, contextName, message, now)) {
    saveState(state);
  }
  return message;
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
    ...getDueRecurringOccurrences(),
    ...getGeneratedRecommendations(),
    ...getGeneratedGuidance(),
    ...getGeneratedMorningRoutine(),
    ...getActiveRoutineSteps(),
    ...getMedicationRefillItems(),
    ...getDueHabitItems(),
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

function getPositiveReinforcementContext(contextName, now) {
  return {
    contextName,
    now,
    todayKey: getTodayKey(),
    todayStats: getTodayStats(),
    goalProgress: getGoalProgressSummary(),
    habits: getHabitTrackingData(),
    energyMood: getEnergyMoodData(),
    learningStats: getLearningStats(),
    progressHistory: state.progressHistory ?? [],
    recoveryHistory: state.recoveryHistory ?? [],
    reinforcementState: state.positiveReinforcementState,
    nowRecommendation: getDecisionRecommendation(),
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

function applySmartRescheduling() {
  const before = JSON.stringify(state.smartReschedulingState ?? {});
  const result = runSmartRescheduling(getSmartReschedulingContext());
  const after = JSON.stringify(state.smartReschedulingState ?? {});
  if (before !== after) {
    saveState(state);
  }
  return result;
}

function getSmartReschedulingContext() {
  return {
    state,
    learningStats: getLearningStats(),
    getTodayKey,
    isDone,
    isSnoozed,
    isSkipped,
    inferTimingType,
    getEstimatedEffort,
  };
}

export function getGeneratedMorningRoutine() {
  return buildGeneratedMorningRoutine({ state, isDone, getDayPart });
}

function getActiveRoutineSteps() {
  return buildActiveRoutineSteps({ state, isDone, getDayPart });
}

function getMedicationRefillItems() {
  return buildMedicationRefillItems({ state });
}

function getDueHabitItems() {
  return buildDueHabitItems({ state });
}

function getDueRecurringOccurrences() {
  return buildDueRecurringOccurrences({ state });
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
  const activeRoutineSteps = getActiveRoutineSteps();
  const medicationRefills = getMedicationRefillItems();
  const dueHabitItems = getDueHabitItems();
  const dueRecurringOccurrences = getDueRecurringOccurrences();
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
    ...dueRecurringOccurrences.map((item, index) => ({
      collection: "recurringOccurrences",
      item,
      order: state.actions.length + state.routines.length + state.timeline.length + state.focusSessions.length + index,
    })),
    ...generatedRecommendations.map((item, index) => ({
      collection: "recommendations",
      item,
      order: state.actions.length + state.routines.length + state.timeline.length + state.focusSessions.length + dueRecurringOccurrences.length + index,
    })),
    ...generatedGuidance.map((item, index) => ({
      collection: "guidance",
      item,
      order:
        state.actions.length +
        state.routines.length +
        state.timeline.length +
        state.focusSessions.length +
        dueRecurringOccurrences.length +
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
        dueRecurringOccurrences.length +
        generatedRecommendations.length +
        generatedGuidance.length +
        index,
    })),
    ...activeRoutineSteps.map((item, index) => ({
      collection: "routineSteps",
      item,
      order:
        state.actions.length +
        state.routines.length +
        state.timeline.length +
        state.focusSessions.length +
        dueRecurringOccurrences.length +
        generatedRecommendations.length +
        generatedGuidance.length +
        generatedMorningRoutine.length +
        index,
    })),
    ...medicationRefills.map((item, index) => ({
      collection: "medicationRefills",
      item,
      order:
        state.actions.length +
        state.routines.length +
        state.timeline.length +
        state.focusSessions.length +
        dueRecurringOccurrences.length +
        generatedRecommendations.length +
        generatedGuidance.length +
        generatedMorningRoutine.length +
        activeRoutineSteps.length +
        index,
    })),
    ...dueHabitItems.map((item, index) => ({
      collection: "habitItems",
      item,
      order:
        state.actions.length +
        state.routines.length +
        state.timeline.length +
        state.focusSessions.length +
        dueRecurringOccurrences.length +
        generatedRecommendations.length +
        generatedGuidance.length +
        generatedMorningRoutine.length +
        activeRoutineSteps.length +
        medicationRefills.length +
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
        dueRecurringOccurrences.length +
        generatedRecommendations.length +
        generatedGuidance.length +
        generatedMorningRoutine.length +
        activeRoutineSteps.length +
        medicationRefills.length +
        dueHabitItems.length +
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
    getGoalInfluence,
    getHabitInfluence,
    getEnergyMoodInfluence,
    getContextAwareInfluence,
    getContextSignals,
    getEnergyMoodContext,
    hasLowMood,
    getActiveMode,
    getDayPart,
    getFocusStatus,
    hasMissedTasks,
    hasOverwhelm,
    formatWhy,
  };
}

function getAdaptiveEffect(collectionName, item) {
  return computeAdaptiveEffect({ collectionName, item, getLearningStats, getCurrentMinuteOfDay });
}

function getGoalInfluence(item) {
  return getGoalInfluenceForItem(state, item, inferTimingType);
}

function getHabitInfluence(item) {
  return getHabitInfluenceForItem(state, item, inferTimingType);
}

function getEnergyMoodInfluence(item) {
  return getEnergyMoodInfluenceForItem(state, item, getEstimatedEffort);
}

function getContextSignals() {
  return buildContextSignals({
    state,
    getDayPart,
    getEnergyMoodData,
    getLearningStats,
    getSmartReschedulingSummary,
    getEstimatedEffort,
    isDone,
  });
}

function getEnergyMoodContext() {
  return getEnergyMoodContextDetails(state);
}

function hasLowMood() {
  const mood = getEnergyMoodData().latestCheckIn?.mood;
  return mood === "low" || mood === "stressed";
}

function getActiveMode() {
  return state.ui?.activeView ?? "working";
}

function getFocusStatus() {
  return getFocusModeData().status;
}

function hasMissedTasks() {
  return Object.values(getLearningStats()).some((stats) => stats.lastMissedDate === getTodayKey() || Number(stats.missedCount ?? 0) > 0);
}

function hasOverwhelm() {
  const profile = state.interviewProfile ?? {};
  return profile.adhd?.busyFailureMode === "overwhelmed" || profile.adhd?.supportNeeded === "choose";
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
  return [
    ...state.actions,
    ...state.timeline,
    ...state.focusSessions,
    ...buildScheduledRoutineSteps({ state, isDone }),
    ...getDueRecurringOccurrences(),
  ].filter((item) => (item.timingType ?? inferTimingType(item)) === "scheduled");
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

function ensureProgressiveSetup() {
  state.ui = state.ui ?? {};
  state.ui.setup = state.ui.setup ?? {};
  state.ui.setup.progressive = {
    ...getDefaultProgressiveSetup(),
    ...state.ui.setup.progressive,
  };
  return state.ui.setup.progressive;
}

function getDefaultProgressiveSetup() {
  return {
    step: "intro",
    introSeen: false,
    name: "",
    helpArea: "",
    firstThing: "",
    moreThings: "",
    completed: false,
    starterItem: null,
  };
}

function getProgressiveHelpAreas() {
  return [
    { id: "health", label: "Health", prompt: "What's one health thing you'd like to improve?", category: "Health" },
    { id: "work", label: "Work", prompt: "What's one work thing you want help staying on top of?", category: "Work" },
    { id: "home", label: "Home", prompt: "What's one home responsibility you want less stress around?", category: "Home" },
    { id: "money", label: "Money", prompt: "What's one money task or goal you want help with?", category: "Money" },
    { id: "relationships", label: "Relationships", prompt: "Who or what would you like to stay more connected to?", category: "Relationships" },
    { id: "hobbies", label: "Hobbies", prompt: "What's something fun or meaningful you'd like to make more room for?", category: "Personal" },
    { id: "organized", label: "Just getting organized", prompt: "What's one thing that feels scattered right now?", category: "Personal" },
  ];
}

function getProgressiveHelpArea(id) {
  return getProgressiveHelpAreas().find((area) => area.id === id) ?? null;
}

function getProgressivePromptExamples() {
  return [
    "This sounds like something you do every day. Want to track it as a habit?",
    "This has multiple steps. Want me to turn it into a routine?",
    "Meal suggestions would work better if I know a few foods you keep around. Want to add some now?",
    "This sounds like a recurring responsibility. Want me to set it up once so it comes back automatically?",
    "When you're ready, you can add things like medications, supplements, bills, meals, and routines so I can help with more of the legwork.",
  ];
}

function createProgressiveStarterItem(helpAreaId, firstThing, starterTypeOverride = "") {
  const helpArea = getProgressiveHelpArea(helpAreaId) ?? getProgressiveHelpArea("organized");
  const now = new Date().toISOString();
  const baseId = `starter-${Date.now()}`;
  state.actions = Array.isArray(state.actions) ? state.actions : [];
  ensureHabitState(state);
  ensureGoalState(state);
  ensureRecurringTaskState(state);
  const starterType = normalizeStarterType(starterTypeOverride || previewProgressiveStarterItem(helpAreaId, firstThing).type);

  if (starterType === "Goal") {
    const goal = {
      id: `goal-${baseId}`,
      title: firstThing,
      category: helpArea.category,
      priority: helpArea.id === "money" ? "High" : "Medium",
      deadline: "",
      status: "active",
      createdAt: now,
      updatedAt: now,
      source: "progressive-setup",
    };
    state.goals.unshift(goal);
    return { type: "Goal", title: goal.title, location: "Goals", message: "Saved as a goal. I will use it to guide future suggestions without treating it like something due right now." };
  }

  if (starterType === "Habit") {
    const habit = {
      id: `habit-${baseId}`,
      name: firstThing,
      category: helpArea.category,
      frequencyType: "daily",
      targetDays: [],
      dailyTargetCount: 1,
      weeklyTargetCount: 1,
      active: true,
      hideFromNow: true,
      createdAt: now,
      updatedAt: now,
      source: "progressive-setup",
    };
    state.habits.unshift(habit);
    return { type: "Habit", title: habit.name, location: "Habits", message: "Saved as a habit. It will be there when you are ready to build it into your day." };
  }

  const action = {
    id: `action-${baseId}`,
    areaId: helpArea.id === "work" ? "business" : helpArea.id === "home" ? "home" : "projects",
    title: firstThing,
    category: helpArea.category,
    workType: helpArea.id === "work" ? "follow_up" : "none",
    timingType: "flexible",
    preferredWindow: "Today",
    dueDate: "Today",
    status: "todo",
    priority: helpArea.id === "work" ? "High" : "Medium",
    estimatedEffortMinutes: 15,
    hideFromNow: true,
    createdAt: now,
    source: "progressive-setup",
  };
  state.actions.unshift(action);
  return { type: "Task", title: action.title, location: "Today", message: "Saved as a task. It is in Today, but I will not force it into Now unless it becomes time-sensitive." };
}

function previewProgressiveStarterItem(helpAreaId, firstThing, starterType = "") {
  const helpArea = getProgressiveHelpArea(helpAreaId) ?? getProgressiveHelpArea("organized");
  const type = normalizeStarterType(starterType || suggestProgressiveStarterType(helpArea, firstThing));
  const messages = {
    Goal: "I think this is a goal because it sounds like a direction you want life to move toward.",
    Habit: "I think this is a habit because it sounds like something to keep visible and repeat.",
    Task: "I think this is a task because it sounds like one concrete next step.",
  };

  return { type, title: firstThing, message: messages[type] ?? messages.Task };
}

function suggestProgressiveStarterType(helpArea, firstThing) {
  const firstThingText = firstThing.toLowerCase();
  const soundsLikeGoal = /\b(i want to|want to|trying to|i'm trying to|im trying to|i need help|need help|improve|more time|make more room|find more time|spend more time|lose weight|gain muscle|save money|get healthier)\b/.test(firstThingText);
  const soundsLikeHabit = /\b(every day|daily|each morning|each night|each evening|every morning|every night|take my|take meds|drink water|walk after|stretch)\b/.test(firstThingText);

  if (soundsLikeGoal) {
    return "Goal";
  }

  if (soundsLikeHabit || helpArea.id === "health") {
    return "Habit";
  }

  if (helpArea.id === "money" || helpArea.id === "hobbies" || helpArea.id === "relationships") {
    return "Goal";
  }

  return "Task";
}

function normalizeStarterType(type) {
  return ["Goal", "Habit", "Task"].includes(type) ? type : "Task";
}

function getSetupStepDefinitions() {
  return [
    {
      id: "account",
      view: "account",
      title: "Account and privacy",
      summary: "Add your name, optional picture, and turn on the local privacy lock.",
      what: "Account and privacy is the front door to the assistant. It identifies who the space belongs to and gives basic local protection before personal details are added.",
      userUse: "The user adds a name, optional profile picture, and decides whether to turn on the local Privacy Lock.",
      appUse: "The app uses this for the welcome name, profile image, and whether to show the dashboard right away or ask for a passcode first.",
      bigPicture: "This supports trust. A life assistant is going to hold personal routines, money concerns, health context, goals, and responsibilities, so it needs a clear front door.",
      smallPicture: "Day to day, this is where someone locks the app, changes their picture, or adjusts the basic local privacy setup.",
    },
    {
      id: "interview",
      view: "dashboard",
      title: "Support interview",
      summary: "Answer a few questions so the assistant knows what kind of help to turn on first.",
      what: "The support interview is how the assistant learns where life gets harder and what kind of support should be active first.",
      userUse: "The user answers one question at a time. They can pause, skip sections, and edit answers later.",
      appUse: "The app turns answers into support modes that shape recommendations, guidance, explanations, routines, and what gets surfaced next.",
      bigPicture: "This is the assistant learning how to help without making the user design the whole system from scratch.",
      smallPicture: "In daily use, these answers change whether the assistant favors simpler tasks, transition support, movement prompts, bill visibility, follow-ups, or other support patterns.",
    },
    {
      id: "goals",
      view: "goals",
      title: "Goals",
      summary: "Add the bigger outcomes the assistant should help protect.",
      what: "A goal in this app is a direction the assistant should protect, not just a wish on a list.",
      userUse: "The user adds one or two important outcomes, chooses a life area, sets priority, and adds a deadline only when useful.",
      appUse: "The app uses goals to lightly influence recommendations, progress summaries, life area dashboards, and daily priorities without overpowering scheduled or urgent items.",
      bigPicture: "Goals tell the assistant what kind of life the user is trying to make more room for.",
      smallPicture: "Day to day, goals help small actions feel connected to something bigger, like health, money stability, relationship follow-through, or personal freedom.",
    },
    {
      id: "habits",
      view: "habits",
      title: "Habits",
      summary: "Add repeatable actions that should stay visible, like water, medication, or movement.",
      what: "A habit is a repeatable action the user wants to build, maintain, or remember.",
      userUse: "The user adds the habit name, category, frequency, and target. It can be once a day, several times a day, or a weekly target.",
      appUse: "The app tracks completions, streaks, daily targets, and goal area progress. Habits can appear in Day Glimpse, Working Mode, and the Life Area Dashboard.",
      bigPicture: "Habits are the small repeated behaviors that make the user's bigger life direction easier to live.",
      smallPicture: "Day to day, the app can bring forward a habit like water, medication, walking, stretching, or reading without making the user remember it on their own.",
    },
    {
      id: "routines",
      view: "routines",
      title: "Routines",
      summary: "Build step-by-step flows for mornings, evenings, or custom repeatable moments.",
      what: "A routine is a guided sequence of steps, not just one repeatable action.",
      userUse: "The user names the routine, chooses when it helps, and adds each step with a rough minute estimate.",
      appUse: "The app can surface routine steps in the morning flow, Working Mode, recommendations, and progress tracking.",
      bigPicture: "Routines reduce the number of choices needed to start, transition, or close down a part of the day.",
      smallPicture: "Day to day, a routine can guide someone through a morning launch, evening shutdown, workout prep, cleaning flow, or any repeatable sequence.",
    },
    {
      id: "recurring-tasks",
      view: "recurring-tasks",
      title: "Recurring tasks",
      summary: "Add responsibilities that come back daily, weekly, monthly, or on a custom rhythm.",
      what: "A recurring task is a responsibility that keeps coming back on a schedule.",
      userUse: "The user adds the task name, recurrence pattern, next occurrence date, category, and priority.",
      appUse: "The app creates the next occurrence after completion, prevents duplicates, and can surface the item before it becomes overdue.",
      bigPicture: "Recurring tasks protect life maintenance: the things that become expensive, stressful, or embarrassing when they sneak up.",
      smallPicture: "Day to day, this can handle trash night, medication refills, bill reviews, insurance checks, cleaning tasks, renewals, and other repeat responsibilities.",
    },
    {
      id: "shop",
      view: "shop",
      title: "Food and shopping support",
      summary: "Add pantry foods, meal ideas, or shopping items using typing, paste, or voice.",
      what: "Food and shopping support is where the assistant starts learning practical household context.",
      userUse: "The user types, pastes, or speaks pantry foods, favorite meals, supplements, or shopping items, then reviews and approves the cleaned list.",
      appUse: "For now the app saves local lists. Later, it can use this context for meal ideas, shopping suggestions, pantry awareness, and lower-friction food planning.",
      bigPicture: "This turns everyday household details into usable context instead of another thing the user has to keep in their head.",
      smallPicture: "Day to day, this helps capture what is in the house, what runs out, and what might support meals or shopping without starting from a blank page.",
    },
    {
      id: "settings",
      view: "settings",
      title: "Appearance",
      summary: "Choose a calm color or use a personal photo as the background.",
      what: "Appearance is the visual feel of the assistant: color, photo background, and softness.",
      userUse: "The user chooses a background color or uploads a personal image, then adjusts how softly the image appears behind the app.",
      appUse: "The app saves the preference locally and applies it across the experience so the space feels familiar each time it opens.",
      bigPicture: "A life assistant should feel like a place the user wants to return to, not a sterile task tool.",
      smallPicture: "Day to day, this makes the dashboard easier to emotionally settle into, especially if the user uses personal landscapes, flowers, sunsets, or calming colors.",
    },
    {
      id: "briefing",
      view: "briefing",
      title: "Day Glimpse",
      summary: "Review the first daily orientation screen before entering the working flow.",
      what: "Day Glimpse is the daily orientation screen before the user starts working through the day.",
      userUse: "The user reviews what matters, notices issues, and presses Start My Day when ready.",
      appUse: "The app pulls together big things, scheduled items, potential issues, progress, routine items, guidance, and support suggestions.",
      bigPicture: "This gives the user a calm starting point instead of throwing them straight into tasks and decisions.",
      smallPicture: "Day to day, this is the morning check-in that helps the user hit the ground running with fewer forgotten details.",
    },
  ];
}

function isSetupStepComplete(stepId) {
  if (stepId === "account") {
    const account = state.ui?.account ?? {};
    return Boolean(account.displayName || account.profilePhotoDataUrl || account.privacyLock?.passcodeHash);
  }
  if (stepId === "interview") {
    return getInterviewState().progress.answered > 0 || Boolean(state.interview?.completed);
  }
  if (stepId === "goals") {
    return (state.goals ?? []).some((goal) => !goal.isDraft);
  }
  if (stepId === "habits") {
    return (state.habits ?? []).some((habit) => !habit.isDraft);
  }
  if (stepId === "routines") {
    return (state.routinePlans ?? []).some((routine) => !routine.isDraft);
  }
  if (stepId === "recurring-tasks") {
    return (state.recurringTasks ?? []).some((task) => !task.isDraft);
  }
  if (stepId === "shop") {
    const savedLists = state.voiceListEntry?.savedLists ?? {};
    return Object.values(savedLists).some((items) => Array.isArray(items) && items.length > 0);
  }
  if (stepId === "settings") {
    const appearance = getAppearanceSettings();
    return appearance.backgroundType === "image" || appearance.backgroundColor !== "#dfeeff";
  }
  if (stepId === "briefing") {
    return Boolean(state.ui?.lastMorningBriefingDate);
  }
  return false;
}

function createDemoState(demoId) {
  const demoState = clone(defaultState);
  demoState.ui = {
    ...defaultState.ui,
    appearance: { ...defaultState.ui.appearance, ...state.ui?.appearance },
    account: {
      ...defaultState.ui.account,
      ...state.ui?.account,
      privacyLock: { ...defaultState.ui.account.privacyLock, ...state.ui?.account?.privacyLock },
    },
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
  demoState.positiveReinforcementState = {
    recentMessageIds: [],
    currentByContext: {},
  };
  demoState.interventionState = {
    recentInterventionIds: [],
    lastShownByContext: {},
    dismissedToday: [],
    effectiveness: {},
    history: [],
  };
  demoState.energyMood = {
    checkIns: [],
  };
  demoState.smartReschedulingState = {
    history: [],
    lastRunDate: null,
  };
  demoState.routinePlans = [];
  demoState.routineStepState = {};
  demoState.routineBuilderDraftId = null;
  demoState.recurringTasks = [];
  demoState.recurringTaskDraftId = null;
  demoState.recurringTaskCompletions = {};
  demoState.recurringOccurrenceState = {};
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

  if (collectionName === "routineSteps") {
    return getActiveRoutineSteps().find((item) => item.id === id);
  }

  if (collectionName === "medicationRefills") {
    return getMedicationRefillItems().find((item) => item.id === id);
  }

  if (collectionName === "habitItems") {
    return getDueHabitItems().find((item) => item.id === id);
  }

  if (collectionName === "recurringOccurrences") {
    return getDueRecurringOccurrences().find((item) => item.id === id);
  }

  if (collectionName === "guidance") {
    return getGeneratedGuidance().find((item) => item.id === id);
  }

  if (collectionName === "recommendations") {
    return getGeneratedRecommendations().find((item) => item.id === id);
  }

  return state[collectionName]?.find((item) => item.id === id);
}

function syncRoutineTimelineItem(routine) {
  if (!routine?.id) {
    return;
  }

  removeRoutineTimelineItem(routine.id);
  if (!routine.active || !routine.startTime) {
    return;
  }

  const totalMinutes = (routine.steps ?? []).reduce((sum, step) => sum + Number(step.estimatedMinutes ?? 0), 0);
  const hasInAppAlarm = routine.alarmPreference === "in-app" || routine.alarmPreference === "both" || routine.alarmPreference === "prompt";
  state.timeline.unshift({
    id: getRoutineTimelineId(routine.id),
    routinePlanId: routine.id,
    title: hasInAppAlarm ? `Start ${routine.name} - in-app alarm` : `Start ${routine.name}`,
    time: routine.startTime,
    startTime: routine.startTime,
    type: hasInAppAlarm ? "Routine Alarm Prompt" : "Routine Start",
    areaId: "routineBuilder",
    status: "Upcoming",
    priority: routine.type === "morning" ? "High" : "Medium",
    timingType: "scheduled",
    estimatedEffortMinutes: Math.max(5, totalMinutes),
    category: "Personal",
    workType: "none",
    createdAt: new Date().toISOString(),
  });
}

function removeRoutineTimelineItem(routineId) {
  state.timeline = state.timeline.filter((item) => item.routinePlanId !== routineId && item.id !== getRoutineTimelineId(routineId));
}

function getRoutineTimelineId(routineId) {
  return `timeline-routine-${routineId}`;
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
