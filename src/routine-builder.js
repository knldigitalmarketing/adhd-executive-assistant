export const ROUTINE_TEMPLATES = [
  { id: "morning", name: "Morning Routine", type: "morning" },
  { id: "lunch", name: "Lunch Routine", type: "custom" },
  { id: "dinner", name: "Dinner Routine", type: "custom" },
  { id: "evening", name: "Evening Routine", type: "evening" },
  { id: "work-start", name: "Work Start Routine", type: "custom" },
  { id: "work-shutdown", name: "Work Shutdown Routine", type: "custom" },
];

export function ensureRoutineBuilderState(state) {
  state.routinePlans = Array.isArray(state.routinePlans) ? state.routinePlans : [];
  state.routineStepState = state.routineStepState ?? {};
  state.routineBuilderDraftId = state.routineBuilderDraftId ?? null;
}

export function getRoutineBuilderData(state, getDayPart) {
  ensureRoutineBuilderState(state);
  const dayPart = getDayPart();

  return {
    routines: state.routinePlans,
    draftRoutine: state.routinePlans.find((routine) => routine.id === state.routineBuilderDraftId) ?? null,
    activeSteps: buildActiveRoutineSteps({ state, getDayPart, isDone: (item) => item.completed === true || item.status === "done" || item.status === "dismissed" }),
    scheduledSteps: buildScheduledRoutineSteps({ state, isDone: (item) => item.completed === true || item.status === "done" || item.status === "dismissed" }),
    templates: ROUTINE_TEMPLATES,
    dayPart,
  };
}

export function createRoutineContainer(state, templateId, customName = "") {
  ensureRoutineBuilderState(state);
  const template = ROUTINE_TEMPLATES.find((item) => item.id === templateId);
  const name = customName.trim() || template?.name || "Custom Routine";
  const existing = state.routinePlans.find((routine) => routine.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    state.routineBuilderDraftId = existing.id;
    return existing;
  }

  const now = new Date().toISOString();
  const routine = {
    id: `routine-plan-${Date.now()}`,
    name,
    type: template?.type ?? "custom",
    active: true,
    startTime: "",
    alarmPreference: "none",
    steps: [],
    createdAt: now,
    updatedAt: now,
  };
  state.routinePlans.unshift(routine);
  state.routineBuilderDraftId = routine.id;
  return routine;
}

export function addActionsToRoutine(state, routineId, actionNames) {
  ensureRoutineBuilderState(state);
  state.habits = Array.isArray(state.habits) ? state.habits : [];
  const routine = state.routinePlans.find((item) => item.id === routineId);
  if (!routine) {
    return null;
  }

  const existingTitles = new Set(routine.steps.map((step) => step.title.toLowerCase()));
  const cleanActions = actionNames.map(normalizeRoutineActionTitle).filter(Boolean);

  for (const title of cleanActions) {
    if (existingTitles.has(title.toLowerCase())) {
      continue;
    }

    let habit = state.habits.find((item) => item.name.toLowerCase() === title.toLowerCase());
    if (!habit) {
      habit = {
        id: `habit-routine-${Date.now()}-${state.habits.length}`,
        name: title,
        category: inferRoutineActionCategory(title),
        frequencyType: "daily",
        targetDays: [],
        dailyTargetCount: 1,
        weeklyTargetCount: 1,
        active: true,
        hideFromNow: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: "routine-builder",
      };
      state.habits.unshift(habit);
    }

    routine.steps.push({
      id: `step-${Date.now()}-${routine.steps.length + 1}`,
      title,
      habitId: habit.id,
      order: routine.steps.length + 1,
      estimatedMinutes: getDefaultRoutineMinutes(title),
    });
    existingTitles.add(title.toLowerCase());
  }

  routine.updatedAt = new Date().toISOString();
  normalizeStepOrder(routine);
  return routine;
}

export function moveRoutineStep(state, routineId, stepId, direction) {
  ensureRoutineBuilderState(state);
  const routine = state.routinePlans.find((item) => item.id === routineId);
  if (!routine) {
    return null;
  }

  const index = routine.steps.findIndex((step) => step.id === stepId);
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || nextIndex < 0 || nextIndex >= routine.steps.length) {
    return routine;
  }

  [routine.steps[index], routine.steps[nextIndex]] = [routine.steps[nextIndex], routine.steps[index]];
  normalizeStepOrder(routine);
  routine.updatedAt = new Date().toISOString();
  return routine;
}

export function moveRoutineStepToIndex(state, routineId, stepId, targetIndex) {
  ensureRoutineBuilderState(state);
  const routine = state.routinePlans.find((item) => item.id === routineId);
  const currentIndex = routine?.steps.findIndex((step) => step.id === stepId) ?? -1;
  if (!routine || currentIndex < 0 || targetIndex < 0 || targetIndex >= routine.steps.length) {
    return routine ?? null;
  }

  const [step] = routine.steps.splice(currentIndex, 1);
  routine.steps.splice(targetIndex, 0, step);
  normalizeStepOrder(routine);
  routine.updatedAt = new Date().toISOString();
  return routine;
}

export function removeRoutineStep(state, routineId, stepId) {
  ensureRoutineBuilderState(state);
  const routine = state.routinePlans.find((item) => item.id === routineId);
  if (!routine) {
    return null;
  }
  routine.steps = routine.steps.filter((step) => step.id !== stepId);
  normalizeStepOrder(routine);
  routine.updatedAt = new Date().toISOString();
  return routine;
}

export function updateRoutineSchedule(state, routineId, formData) {
  ensureRoutineBuilderState(state);
  const routine = state.routinePlans.find((item) => item.id === routineId);
  if (!routine) {
    return null;
  }
  routine.startTime = normalizeRoutineStartTime(String(formData.get("routineStartTime") ?? ""));
  routine.alarmPreference = normalizeAlarmPreference(String(formData.get("routineAlarm") ?? "none"));
  routine.active = formData.get("routineActive") !== "inactive";
  routine.updatedAt = new Date().toISOString();
  return routine;
}

export function createRoutinePlan(state, formData) {
  ensureRoutineBuilderState(state);
  const routine = buildRoutineFromForm(formData, `routine-plan-${Date.now()}`);
  state.routinePlans.unshift(routine);
  state.routineBuilderDraftId = null;
  return routine;
}

export function updateRoutinePlan(state, id, formData) {
  ensureRoutineBuilderState(state);
  const index = state.routinePlans.findIndex((routine) => routine.id === id);
  if (index === -1) {
    return null;
  }

  state.routinePlans[index] = {
    ...state.routinePlans[index],
    ...buildRoutineFromForm(formData, id),
    updatedAt: new Date().toISOString(),
  };
  state.routineBuilderDraftId = null;
  return state.routinePlans[index];
}

export function deleteRoutinePlan(state, id) {
  ensureRoutineBuilderState(state);
  state.routinePlans = state.routinePlans.filter((routine) => routine.id !== id);
  state.routineBuilderDraftId = state.routineBuilderDraftId === id ? null : state.routineBuilderDraftId;

  for (const key of Object.keys(state.routineStepState)) {
    if (key.startsWith(`routine-step-${id}-`)) {
      delete state.routineStepState[key];
    }
  }
}

export function setRoutinePlanActive(state, id, active) {
  ensureRoutineBuilderState(state);
  const routine = state.routinePlans.find((item) => item.id === id);
  if (!routine) {
    return;
  }

  routine.active = Boolean(active);
  routine.updatedAt = new Date().toISOString();
}

export function setRoutineBuilderDraft(state, id) {
  ensureRoutineBuilderState(state);
  state.routineBuilderDraftId = state.routinePlans.some((routine) => routine.id === id) ? id : null;
}

export function clearRoutineBuilderDraft(state) {
  ensureRoutineBuilderState(state);
  state.routineBuilderDraftId = null;
}

export function buildActiveRoutineSteps({ state, isDone, getDayPart }) {
  ensureRoutineBuilderState(state);
  const dayPart = getDayPart();
  const steps = [];

  for (const routine of state.routinePlans) {
    if (!routine.active || !routineAppliesNow(routine, dayPart)) {
      continue;
    }

    routine.steps.forEach((step, index) => {
      const id = getRoutineStepItemId(routine.id, step.id);
      const savedState = state.routineStepState[id] ?? {};
      const stepStartTime = routine.startTime ? addMinutesToTime(routine.startTime, getMinutesBeforeStep(routine.steps, index)) : "";
      const item = {
        id,
        routineId: routine.id,
        stepId: step.id,
        areaId: "routineBuilder",
        category: "Personal",
        workType: "none",
        type: "Routine Step",
        source: "Routine Builder",
        title: `${routine.name}: ${step.title}`,
        routineName: routine.name,
        stepTitle: step.title,
        stepOrder: index + 1,
        priority: routine.type === "morning" ? "High" : "Medium",
        estimatedEffortMinutes: step.estimatedMinutes,
        timingType: stepStartTime ? "scheduled" : "flexible",
        startTime: stepStartTime || undefined,
        time: stepStartTime || undefined,
        preferredWindow: "Today",
        dueDate: "Today",
        reason: stepStartTime ? `Step ${index + 1} of ${routine.name}, scheduled for ${stepStartTime}` : `Step ${index + 1} of ${routine.name}`,
        ...savedState,
      };

      if (!isDone(item)) {
        steps.push(item);
      }
    });
  }

  return steps.sort((left, right) => left.stepOrder - right.stepOrder);
}

export function buildScheduledRoutineSteps({ state, isDone }) {
  ensureRoutineBuilderState(state);
  const steps = [];

  for (const routine of state.routinePlans) {
    if (!routine.active || !routine.startTime) {
      continue;
    }

    routine.steps.forEach((step, index) => {
      const id = getRoutineStepItemId(routine.id, step.id);
      const savedState = state.routineStepState[id] ?? {};
      const stepStartTime = addMinutesToTime(routine.startTime, getMinutesBeforeStep(routine.steps, index));
      const item = buildRoutineStepItem({ routine, step, index, savedState, stepStartTime });

      if (!isDone(item)) {
        steps.push(item);
      }
    });
  }

  return steps.sort((left, right) => getMinutesFromTime(left.startTime) - getMinutesFromTime(right.startTime));
}

export function getRoutinePlanStepLines(routine) {
  return (routine?.steps ?? []).map((step) => `${step.title} - ${step.estimatedMinutes}`).join("\n");
}

function buildRoutineStepItem({ routine, step, index, savedState, stepStartTime }) {
  return {
    id: getRoutineStepItemId(routine.id, step.id),
    routineId: routine.id,
    stepId: step.id,
    areaId: "routineBuilder",
    category: "Personal",
    workType: "none",
    type: "Routine Step",
    source: "Routine Builder",
    title: `${routine.name}: ${step.title}`,
    routineName: routine.name,
    stepTitle: step.title,
    stepOrder: index + 1,
    priority: routine.type === "morning" ? "High" : "Medium",
    estimatedEffortMinutes: step.estimatedMinutes,
    timingType: stepStartTime ? "scheduled" : "flexible",
    startTime: stepStartTime || undefined,
    time: stepStartTime || undefined,
    preferredWindow: "Today",
    dueDate: "Today",
    reason: stepStartTime ? `Step ${index + 1} of ${routine.name}, scheduled for ${stepStartTime}` : `Step ${index + 1} of ${routine.name}`,
    ...savedState,
  };
}

function buildRoutineFromForm(formData, id) {
  const name = String(formData.get("routineName") ?? "").trim() || "Untitled routine";
  const type = normalizeRoutineType(String(formData.get("routineType") ?? "custom"));
  const active = formData.get("routineActive") !== "inactive";
  const steps = parseStepLines(String(formData.get("routineSteps") ?? ""));
  const startTime = normalizeRoutineStartTime(String(formData.get("routineStartTime") ?? ""));
  const alarmPreference = normalizeAlarmPreference(String(formData.get("routineAlarm") ?? "none"));

  return {
    id,
    name,
    type,
    active,
    startTime,
    alarmPreference,
    steps,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function parseStepLines(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^(.*?)\s+-\s+(\d+)$/);
      const title = (match?.[1] ?? line).trim();
      const estimatedMinutes = Number(match?.[2] ?? 5);

      return {
        id: `step-${index + 1}`,
        title,
        order: index + 1,
        estimatedMinutes: Number.isFinite(estimatedMinutes) && estimatedMinutes > 0 ? estimatedMinutes : 5,
      };
    });
}

function normalizeRoutineType(type) {
  if (type === "morning" || type === "afternoon" || type === "evening") {
    return type;
  }

  return "custom";
}

function routineAppliesNow(routine, dayPart) {
  return routine.type === "custom" || routine.type === dayPart;
}

function getRoutineStepItemId(routineId, stepId) {
  return `routine-step-${routineId}-${stepId}`;
}

function getMinutesBeforeStep(steps, index) {
  return steps.slice(0, index).reduce((sum, step) => sum + Number(step.estimatedMinutes ?? 0), 0);
}

function addMinutesToTime(timeText, minutesToAdd) {
  const minutes = getMinutesFromTime(timeText);
  if (minutes === null) {
    return "";
  }
  return formatMinutesAsTime((minutes + minutesToAdd) % 1440);
}

function normalizeRoutineStartTime(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const inputTime = trimmed.match(/^(\d{2}):(\d{2})$/);
  if (inputTime) {
    return formatMinutesAsTime(Number(inputTime[1]) * 60 + Number(inputTime[2]));
  }

  return getMinutesFromTime(trimmed) === null ? "" : trimmed.toUpperCase();
}

function normalizeAlarmPreference(value) {
  return value === "prompt" ? "prompt" : "none";
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

function formatMinutesAsTime(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const minutes = String(normalized % 60).padStart(2, "0");
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
}

function normalizeStepOrder(routine) {
  routine.steps = routine.steps.map((step, index) => ({ ...step, order: index + 1 }));
}

function normalizeRoutineActionTitle(value) {
  const title = String(value ?? "")
    .replace(/^\s*(then|and then|also|and)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!title) {
    return "";
  }
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function inferRoutineActionCategory(title) {
  if (/\b(med|pill|vitamin|supplement|water|blood pressure|health)\b/i.test(title)) return "Health";
  if (/\b(walk|stretch|exercise|workout|training)\b/i.test(title)) return "Fitness";
  if (/\b(work|client|calendar|inbox|focus|equipment|assignment)\b/i.test(title)) return "Work";
  if (/\b(feed|dog|cat|laundry|coffee|home)\b/i.test(title)) return "Home";
  return "Personal";
}

function getDefaultRoutineMinutes(title) {
  if (/\b(med|pill|vitamin|supplement|water)\b/i.test(title)) return 2;
  if (/\b(calendar|priorit|inbox|safety check)\b/i.test(title)) return 5;
  if (/\b(walk|stretch|exercise|workout|training)\b/i.test(title)) return 15;
  return 5;
}
