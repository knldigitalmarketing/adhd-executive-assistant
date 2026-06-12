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
