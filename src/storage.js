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
    ui: { ...base.ui, ...stored.ui },
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
