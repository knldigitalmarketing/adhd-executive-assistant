export const DEFAULT_ROUTINE_GUIDANCE_SETTINGS = {
  voiceGuidance: false,
  chimes: true,
  reminderIntervalMinutes: 5,
  autoReadNextStep: false,
  confirmBeforeSkip: false,
};

export function ensureRoutineGuidanceState(state) {
  state.routineGuidance = state.routineGuidance ?? {};
  state.routineGuidance.alarmState = state.routineGuidance.alarmState ?? {};
  state.routineGuidance.settings = {
    ...DEFAULT_ROUTINE_GUIDANCE_SETTINGS,
    ...(state.routineGuidance.settings ?? {}),
  };
  state.routineGuidance.activeSession = normalizeActiveSession(state.routineGuidance.activeSession);
}

export function getRoutineGuidanceSettings(state) {
  ensureRoutineGuidanceState(state);
  return { ...state.routineGuidance.settings };
}

export function updateRoutineGuidanceSettings(state, formData) {
  ensureRoutineGuidanceState(state);
  state.routineGuidance.settings = {
    voiceGuidance: formData.get("routineVoiceGuidance") === "on",
    chimes: formData.get("routineChimes") === "on",
    reminderIntervalMinutes: normalizeReminderInterval(formData.get("routineReminderInterval")),
    autoReadNextStep: formData.get("routineAutoRead") === "on",
    confirmBeforeSkip: formData.get("routineConfirmSkip") === "on",
  };
  return getRoutineGuidanceSettings(state);
}

export function startRoutineSession(state, routineId, now = new Date()) {
  ensureRoutineGuidanceState(state);
  const routine = getRoutine(state, routineId);
  if (!routine) {
    return null;
  }
  state.routineGuidance.activeSession = {
    routineId,
    dateKey: getDateKey(now),
    status: "active",
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lastPromptAt: now.toISOString(),
  };
  return buildRoutineGuidanceData(state, routineId, now);
}

export function pauseRoutineSession(state, now = new Date()) {
  ensureRoutineGuidanceState(state);
  const session = state.routineGuidance.activeSession;
  if (!session || session.dateKey !== getDateKey(now)) {
    return null;
  }
  session.status = "paused";
  session.updatedAt = now.toISOString();
  return session;
}

export function resumeRoutineSession(state, now = new Date()) {
  ensureRoutineGuidanceState(state);
  const session = state.routineGuidance.activeSession;
  if (!session || session.dateKey !== getDateKey(now)) {
    return null;
  }
  session.status = "active";
  session.updatedAt = now.toISOString();
  session.lastPromptAt = now.toISOString();
  return session;
}

export function closeRoutineSession(state) {
  ensureRoutineGuidanceState(state);
  state.routineGuidance.activeSession = null;
}

export function completeRoutineSessionStep(state, routineId, stepId, now = new Date()) {
  ensureRoutineGuidanceState(state);
  const itemId = resolveRoutineActionItemId(state, routineId, stepId);
  state.routineStepState[itemId] = {
    ...state.routineStepState[itemId],
    dateKey: getDateKey(now),
    status: "done",
    completed: true,
    completedAt: now.toISOString(),
  };
  updateSessionAfterStep(state, routineId, now);
  return buildRoutineGuidanceData(state, routineId, now);
}

export function skipRoutineSessionStep(state, routineId, stepId, now = new Date()) {
  ensureRoutineGuidanceState(state);
  const itemId = resolveRoutineActionItemId(state, routineId, stepId);
  state.routineStepState[itemId] = {
    ...state.routineStepState[itemId],
    dateKey: getDateKey(now),
    status: "skipped",
    completed: false,
    skippedAt: now.toISOString(),
  };
  updateSessionAfterStep(state, routineId, now);
  return buildRoutineGuidanceData(state, routineId, now);
}

export function markRoutinePrompted(state, now = new Date()) {
  ensureRoutineGuidanceState(state);
  if (state.routineGuidance.activeSession) {
    state.routineGuidance.activeSession.lastPromptAt = now.toISOString();
    state.routineGuidance.activeSession.updatedAt = now.toISOString();
  }
}

export function getDueRoutineAlarmPrompt(state, now = new Date()) {
  ensureRoutineGuidanceState(state);
  const todayKey = getDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return (state.routinePlans ?? [])
    .filter((routine) => routine.active !== false && routine.startTime && usesInAppAlarm(routine.alarmPreference))
    .map((routine) => ({ routine, startMinutes: getMinutesFromTime(routine.startTime) }))
    .filter(({ routine, startMinutes }) => {
      if (startMinutes === null) {
        return false;
      }
      const alarmKey = getRoutineAlarmKey(routine.id, todayKey);
      const alreadyPrompted = state.routineGuidance.alarmState[alarmKey]?.prompted === true;
      return !alreadyPrompted && nowMinutes >= startMinutes && nowMinutes <= startMinutes + 30;
    })
    .sort((left, right) => left.startMinutes - right.startMinutes)[0]?.routine ?? null;
}

export function markRoutineAlarmPrompted(state, routineId, now = new Date()) {
  ensureRoutineGuidanceState(state);
  const alarmKey = getRoutineAlarmKey(routineId, getDateKey(now));
  state.routineGuidance.alarmState[alarmKey] = {
    prompted: true,
    promptedAt: now.toISOString(),
  };
}

export function getActiveRoutineGuidance(state, preferredRoutineId = "", now = new Date()) {
  ensureRoutineGuidanceState(state);
  const todayKey = getDateKey(now);
  const session = state.routineGuidance.activeSession;
  const sessionRoutineId = session?.dateKey === todayKey ? session.routineId : "";
  const routineId = sessionRoutineId || preferredRoutineId;
  return routineId ? buildRoutineGuidanceData(state, routineId, now) : null;
}

export function buildRoutineGuidanceData(state, routineId, now = new Date()) {
  ensureRoutineGuidanceState(state);
  const routine = getRoutine(state, routineId);
  if (!routine) {
    return null;
  }

  const todayKey = getDateKey(now);
  const steps = routine.steps.map((step, index) => buildGuidanceStep(state, routine, step, index, todayKey));
  const actionSteps = steps.flatMap((step) => step.groupType ? (step.children ?? []) : [step]);
  const currentStep = actionSteps.find((step) => !step.completed && !step.skipped) ?? null;
  const completedCount = actionSteps.filter((step) => step.completed).length;
  const skippedCount = actionSteps.filter((step) => step.skipped).length;
  const session = state.routineGuidance.activeSession?.routineId === routineId
    && state.routineGuidance.activeSession?.dateKey === todayKey
    ? state.routineGuidance.activeSession
    : null;

  return {
    routine,
    steps,
    currentStep,
    completedCount,
    skippedCount,
    handledCount: completedCount + skippedCount,
    remainingCount: actionSteps.length - completedCount - skippedCount,
    totalCount: actionSteps.length,
    progressPercent: actionSteps.length ? Math.round(((completedCount + skippedCount) / actionSteps.length) * 100) : 0,
    status: currentStep ? (session?.status ?? "ready") : "complete",
    startedAt: session?.startedAt ?? null,
    lastPromptAt: session?.lastPromptAt ?? null,
    settings: getRoutineGuidanceSettings(state),
  };
}

function buildGuidanceStep(state, routine, step, index, todayKey) {
  if (step.groupType === "medications") {
    const medications = (state.medications ?? []).filter(
      (medication) => medication.active !== false && medication.schedule === (step.schedule ?? "morning"),
    ).sort((left, right) => String(left.createdAt ?? "").localeCompare(String(right.createdAt ?? "")) || left.name.localeCompare(right.name));
    const children = medications.map((medication, childIndex) => {
      const childId = `medication-${medication.id}`;
      const itemId = getRoutineChildItemId(routine.id, step.id, childId);
      const saved = state.routineStepState[itemId]?.dateKey === todayKey ? state.routineStepState[itemId] : {};
      return {
        id: childId,
        medicationId: medication.id,
        parentStepId: step.id,
        parentTitle: step.title,
        title: `Take ${medication.name}`,
        displayTitle: medication.name,
        itemId,
        index: childIndex,
        status: saved.status ?? "todo",
        completed: saved.completed === true || saved.status === "done",
        skipped: saved.status === "skipped",
      };
    });
    return {
      ...step,
      index,
      children,
      completed: children.length > 0 && children.every((child) => child.completed),
      skipped: children.length > 0 && children.every((child) => child.skipped),
    };
  }

  const itemId = getRoutineStepItemId(routine.id, step.id);
  const saved = state.routineStepState[itemId]?.dateKey === todayKey ? state.routineStepState[itemId] : {};
  return {
    ...step,
    itemId,
    index,
    status: saved.status ?? "todo",
    completed: saved.completed === true || saved.status === "done",
    skipped: saved.status === "skipped",
  };
}

export function isRoutineReminderDue(guidance, now = new Date()) {
  if (!guidance?.currentStep || guidance.status !== "active" || !guidance.lastPromptAt) {
    return false;
  }
  const intervalMs = guidance.settings.reminderIntervalMinutes * 60000;
  return now.getTime() - new Date(guidance.lastPromptAt).getTime() >= intervalMs;
}

function updateSessionAfterStep(state, routineId, now) {
  const guidance = buildRoutineGuidanceData(state, routineId, now);
  if (!state.routineGuidance.activeSession || state.routineGuidance.activeSession.routineId !== routineId) {
    startRoutineSession(state, routineId, now);
  }
  state.routineGuidance.activeSession.status = guidance.currentStep ? "active" : "complete";
  state.routineGuidance.activeSession.updatedAt = now.toISOString();
  state.routineGuidance.activeSession.lastPromptAt = now.toISOString();
}

function normalizeActiveSession(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  return {
    routineId: String(value.routineId ?? ""),
    dateKey: String(value.dateKey ?? ""),
    status: ["active", "paused", "complete"].includes(value.status) ? value.status : "active",
    startedAt: value.startedAt ?? null,
    updatedAt: value.updatedAt ?? null,
    lastPromptAt: value.lastPromptAt ?? null,
  };
}

function usesInAppAlarm(value) {
  return value === "in-app" || value === "both" || value === "prompt";
}

function getRoutineAlarmKey(routineId, dateKey) {
  return `${dateKey}:${routineId}`;
}

function getMinutesFromTime(value) {
  const match = String(value ?? "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) {
    return null;
  }
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (period === "PM" && hours !== 12) {
    hours += 12;
  }
  if (period === "AM" && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

function getRoutine(state, routineId) {
  return (state.routinePlans ?? []).find((routine) => routine.id === routineId) ?? null;
}

function normalizeReminderInterval(value) {
  const minutes = Number(value ?? 5);
  return [1, 3, 5, 10, 15, 30].includes(minutes) ? minutes : 5;
}

function getRoutineStepItemId(routineId, stepId) {
  return `routine-step-${routineId}-${stepId}`;
}

function getRoutineChildItemId(routineId, stepId, childId) {
  return `routine-child-${routineId}-${stepId}-${childId}`;
}

function resolveRoutineActionItemId(state, routineId, actionId) {
  const routine = getRoutine(state, routineId);
  const directStep = routine?.steps.find((step) => step.id === actionId);
  if (directStep) {
    return getRoutineStepItemId(routineId, actionId);
  }
  const medicationGroup = routine?.steps.find((step) => step.groupType === "medications");
  if (medicationGroup && String(actionId).startsWith("medication-")) {
    return getRoutineChildItemId(routineId, medicationGroup.id, actionId);
  }
  return getRoutineStepItemId(routineId, actionId);
}

function getDateKey(date) {
  const local = new Date(date);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
}
