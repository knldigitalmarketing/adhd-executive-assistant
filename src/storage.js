const STORAGE_KEY = "adhd-executive-assistant:mvp-state";

export function loadState(defaultState) {
  const fallback = clone(defaultState);

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return fallback;
    }

    return mergeState(fallback, JSON.parse(stored));
  } catch {
    return fallback;
  }
}

export function saveState(state) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState() {
  window.localStorage.removeItem(STORAGE_KEY);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeState(base, stored) {
  return {
    ...base,
    ...stored,
    user: { ...base.user, ...stored.user },
    selectedSnapshot: { ...base.selectedSnapshot, ...stored.selectedSnapshot },
    interview: { ...base.interview, ...stored.interview },
    ui: {
      ...base.ui,
      ...stored.ui,
      setup: {
        ...base.ui?.setup,
        ...stored.ui?.setup,
        progressive: { ...base.ui?.setup?.progressive, ...stored.ui?.setup?.progressive },
        skippedSteps: arrayOrDefault(stored.ui?.setup?.skippedSteps, base.ui?.setup?.skippedSteps ?? []),
      },
      appearance: { ...base.ui?.appearance, ...stored.ui?.appearance },
      account: {
        ...base.ui?.account,
        ...stored.ui?.account,
        privacyLock: { ...base.ui?.account?.privacyLock, ...stored.ui?.account?.privacyLock },
      },
    },
    interviewProfile: {
      ...base.interviewProfile,
      ...stored.interviewProfile,
      adhd: { ...base.interviewProfile?.adhd, ...stored.interviewProfile?.adhd },
      fitness: { ...base.interviewProfile?.fitness, ...stored.interviewProfile?.fitness },
      health: { ...base.interviewProfile?.health, ...stored.interviewProfile?.health },
      work: { ...base.interviewProfile?.work, ...stored.interviewProfile?.work },
      money: { ...base.interviewProfile?.money, ...stored.interviewProfile?.money },
      relationships: { ...base.interviewProfile?.relationships, ...stored.interviewProfile?.relationships },
      activeRulesets: arrayOrDefault(stored.interviewProfile?.activeRulesets, base.interviewProfile?.activeRulesets ?? []),
    },
    recommendationState: { ...base.recommendationState, ...stored.recommendationState },
    guidanceState: { ...base.guidanceState, ...stored.guidanceState },
    morningRoutineState: { ...base.morningRoutineState, ...stored.morningRoutineState },
    learningStats: { ...base.learningStats, ...stored.learningStats },
    recoveryState: { ...base.recoveryState, ...stored.recoveryState },
    recoveryHistory: arrayOrDefault(stored.recoveryHistory, base.recoveryHistory),
    tipState: {
      ...base.tipState,
      ...stored.tipState,
      recentTipIds: arrayOrDefault(stored.tipState?.recentTipIds, base.tipState?.recentTipIds ?? []),
      lastShownByContext: { ...base.tipState?.lastShownByContext, ...stored.tipState?.lastShownByContext },
    },
    positiveReinforcementState: {
      ...base.positiveReinforcementState,
      ...stored.positiveReinforcementState,
      recentMessageIds: arrayOrDefault(stored.positiveReinforcementState?.recentMessageIds, base.positiveReinforcementState?.recentMessageIds ?? []),
      currentByContext: { ...base.positiveReinforcementState?.currentByContext, ...stored.positiveReinforcementState?.currentByContext },
    },
    voiceListEntry: {
      ...base.voiceListEntry,
      ...stored.voiceListEntry,
      activeGeneralListName: stored.voiceListEntry?.activeGeneralListName ?? base.voiceListEntry?.activeGeneralListName,
      activeGeneralListType: stored.voiceListEntry?.activeGeneralListType ?? base.voiceListEntry?.activeGeneralListType,
      drafts: { ...base.voiceListEntry?.drafts, ...stored.voiceListEntry?.drafts },
      savedLists: {
        ...base.voiceListEntry?.savedLists,
        ...stored.voiceListEntry?.savedLists,
        foodMeals: arrayOrDefault(stored.voiceListEntry?.savedLists?.foodMeals, base.voiceListEntry?.savedLists?.foodMeals ?? []),
        shoppingList: arrayOrDefault(stored.voiceListEntry?.savedLists?.shoppingList, base.voiceListEntry?.savedLists?.shoppingList ?? []),
        generalList: arrayOrDefault(stored.voiceListEntry?.savedLists?.generalList, base.voiceListEntry?.savedLists?.generalList ?? []),
        routineSteps: arrayOrDefault(stored.voiceListEntry?.savedLists?.routineSteps, base.voiceListEntry?.savedLists?.routineSteps ?? []),
      },
    },
    interventionState: {
      ...base.interventionState,
      ...stored.interventionState,
      recentInterventionIds: arrayOrDefault(stored.interventionState?.recentInterventionIds, base.interventionState?.recentInterventionIds ?? []),
      lastShownByContext: { ...base.interventionState?.lastShownByContext, ...stored.interventionState?.lastShownByContext },
      dismissedToday: arrayOrDefault(stored.interventionState?.dismissedToday, base.interventionState?.dismissedToday ?? []),
      effectiveness: { ...base.interventionState?.effectiveness, ...stored.interventionState?.effectiveness },
      history: arrayOrDefault(stored.interventionState?.history, base.interventionState?.history ?? []),
    },
    energyMood: {
      ...base.energyMood,
      ...stored.energyMood,
      checkIns: arrayOrDefault(stored.energyMood?.checkIns, base.energyMood?.checkIns ?? []),
    },
    smartReschedulingState: {
      ...base.smartReschedulingState,
      ...stored.smartReschedulingState,
      history: arrayOrDefault(stored.smartReschedulingState?.history, base.smartReschedulingState?.history ?? []),
    },
    routinePlans: arrayOrDefault(stored.routinePlans, base.routinePlans),
    routineStepState: { ...base.routineStepState, ...stored.routineStepState },
    routineBuilderDraftId: stored.routineBuilderDraftId ?? base.routineBuilderDraftId,
    routineGuidance: {
      ...base.routineGuidance,
      ...stored.routineGuidance,
      settings: { ...base.routineGuidance?.settings, ...stored.routineGuidance?.settings },
      activeSession: stored.routineGuidance?.activeSession ?? base.routineGuidance?.activeSession,
    },
    medications: arrayOrDefault(stored.medications, base.medications),
    medicationState: { ...base.medicationState, ...stored.medicationState },
    goals: arrayOrDefault(stored.goals, base.goals),
    goalDraftId: stored.goalDraftId ?? base.goalDraftId,
    projects: arrayOrDefault(stored.projects, base.projects),
    projectDraftId: stored.projectDraftId ?? base.projectDraftId,
    meals: arrayOrDefault(stored.meals, base.meals),
    notes: arrayOrDefault(stored.notes, base.notes),
    habits: arrayOrDefault(stored.habits, base.habits),
    habitDraftId: stored.habitDraftId ?? base.habitDraftId,
    habitCompletions: { ...base.habitCompletions, ...stored.habitCompletions },
    recurringTasks: arrayOrDefault(stored.recurringTasks, base.recurringTasks),
    recurringTaskDraftId: stored.recurringTaskDraftId ?? base.recurringTaskDraftId,
    recurringTaskCompletions: { ...base.recurringTaskCompletions, ...stored.recurringTaskCompletions },
    recurringOccurrenceState: { ...base.recurringOccurrenceState, ...stored.recurringOccurrenceState },
    focusMode: stored.focusMode ?? base.focusMode,
    focusHistory: arrayOrDefault(stored.focusHistory, base.focusHistory),
    progressHistory: arrayOrDefault(stored.progressHistory, base.progressHistory),
    endOfDayReviews: { ...base.endOfDayReviews, ...stored.endOfDayReviews },
    weeklyReviewHistory: { ...base.weeklyReviewHistory, ...stored.weeklyReviewHistory },
    responsibilityAreas: arrayOrDefault(stored.responsibilityAreas, base.responsibilityAreas),
    profiles: arrayOrDefault(stored.profiles, base.profiles),
    routines: arrayOrDefault(stored.routines, base.routines),
    actions: arrayOrDefault(stored.actions, base.actions),
    obligations: arrayOrDefault(stored.obligations, base.obligations),
    discoveries: arrayOrDefault(stored.discoveries, base.discoveries),
    waitingOn: arrayOrDefault(stored.waitingOn, base.waitingOn),
    focusSessions: arrayOrDefault(stored.focusSessions, base.focusSessions),
    timeline: arrayOrDefault(stored.timeline, base.timeline),
  };
}

function arrayOrDefault(value, fallback) {
  return Array.isArray(value) ? value : fallback;
}
