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
    dayPart,
  };
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
        timingType: "flexible",
        preferredWindow: "Today",
        dueDate: "Today",
        reason: `Step ${index + 1} of ${routine.name}`,
        ...savedState,
      };

      if (!isDone(item)) {
        steps.push(item);
      }
    });
  }

  return steps.sort((left, right) => left.stepOrder - right.stepOrder);
}

export function getRoutinePlanStepLines(routine) {
  return (routine?.steps ?? []).map((step) => `${step.title} - ${step.estimatedMinutes}`).join("\n");
}

function buildRoutineFromForm(formData, id) {
  const name = String(formData.get("routineName") ?? "").trim() || "Untitled routine";
  const type = normalizeRoutineType(String(formData.get("routineType") ?? "custom"));
  const active = formData.get("routineActive") !== "inactive";
  const steps = parseStepLines(String(formData.get("routineSteps") ?? ""));

  return {
    id,
    name,
    type,
    active,
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
  if (type === "morning" || type === "evening") {
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
