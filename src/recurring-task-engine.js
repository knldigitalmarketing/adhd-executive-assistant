export const RECURRENCE_TYPES = ["daily", "weekly", "monthly", "custom"];

export function ensureRecurringTaskState(state) {
  state.recurringTasks = Array.isArray(state.recurringTasks) ? state.recurringTasks : [];
  state.recurringTaskDraftId = state.recurringTaskDraftId ?? null;
  state.recurringTaskCompletions = state.recurringTaskCompletions ?? {};
  state.recurringOccurrenceState = state.recurringOccurrenceState ?? {};
}

export function getRecurringTaskData(state, today = new Date()) {
  ensureRecurringTaskState(state);
  const tasks = normalizeRecurringTasks(state, today);

  return {
    recurrenceTypes: RECURRENCE_TYPES,
    activeTasks: tasks.filter((task) => task.active !== false),
    inactiveTasks: tasks.filter((task) => task.active === false),
    draftTask: tasks.find((task) => task.id === state.recurringTaskDraftId) ?? null,
    dueOccurrences: buildDueRecurringOccurrences({ state, today }),
  };
}

export function createRecurringTask(state, formData) {
  ensureRecurringTaskState(state);
  const task = buildRecurringTaskFromForm(formData, `recurring-${Date.now()}-${state.recurringTasks.length}`);
  state.recurringTasks.unshift(task);
  state.recurringTaskDraftId = null;
  return task;
}

export function updateRecurringTask(state, id, formData) {
  ensureRecurringTaskState(state);
  const index = state.recurringTasks.findIndex((task) => task.id === id);
  if (index === -1) {
    return null;
  }

  state.recurringTasks[index] = {
    ...state.recurringTasks[index],
    ...buildRecurringTaskFromForm(formData, id),
    updatedAt: new Date().toISOString(),
  };
  state.recurringTaskDraftId = null;
  return state.recurringTasks[index];
}

export function deleteRecurringTask(state, id) {
  ensureRecurringTaskState(state);
  state.recurringTasks = state.recurringTasks.filter((task) => task.id !== id);
  delete state.recurringTaskCompletions[id];
  state.recurringTaskDraftId = state.recurringTaskDraftId === id ? null : state.recurringTaskDraftId;
}

export function setRecurringTaskActive(state, id, active) {
  ensureRecurringTaskState(state);
  const task = state.recurringTasks.find((item) => item.id === id);
  if (!task) {
    return;
  }

  task.active = Boolean(active);
  task.updatedAt = new Date().toISOString();
}

export function setRecurringTaskDraft(state, id) {
  ensureRecurringTaskState(state);
  state.recurringTaskDraftId = state.recurringTasks.some((task) => task.id === id) ? id : null;
}

export function clearRecurringTaskDraft(state) {
  ensureRecurringTaskState(state);
  state.recurringTaskDraftId = null;
}

export function completeRecurringOccurrence(state, occurrenceId, completedAt = new Date()) {
  ensureRecurringTaskState(state);
  const { taskId, occurrenceDate } = parseOccurrenceId(occurrenceId);
  const task = state.recurringTasks.find((item) => item.id === taskId);
  if (!task) {
    return null;
  }

  const completion = {
    occurrenceId,
    occurrenceDate,
    completedAt: completedAt.toISOString(),
    title: task.name,
  };
  const existing = state.recurringTaskCompletions[taskId] ?? [];
  state.recurringTaskCompletions[taskId] = [...existing.filter((item) => item.occurrenceId !== occurrenceId), completion].slice(-120);
  delete state.recurringOccurrenceState[occurrenceId];
  task.completionHistory = state.recurringTaskCompletions[taskId];
  task.nextOccurrence = getNextOccurrenceDate(task, occurrenceDate);
  task.updatedAt = new Date().toISOString();
  return task;
}

export function buildDueRecurringOccurrences({ state, today = new Date() }) {
  ensureRecurringTaskState(state);
  normalizeRecurringTasks(state, today);
  const todayKey = getDateKey(today);

  return state.recurringTasks
    .filter((task) => task.active !== false)
    .filter((task) => task.nextOccurrence && task.nextOccurrence <= todayKey)
    .filter((task) => !hasCompletedOccurrence(state, task.id, task.nextOccurrence))
    .map((task) => {
      const item = toOccurrenceItem(state, task);
      return {
        ...item,
        ...state.recurringOccurrenceState[item.id],
      };
    });
}

function normalizeRecurringTasks(state, today) {
  const todayKey = getDateKey(today);
  state.recurringTasks = state.recurringTasks.map((task) => {
    const completions = state.recurringTaskCompletions[task.id] ?? task.completionHistory ?? [];
    const nextOccurrence = task.nextOccurrence || getDateKey(today);
    return {
      ...task,
      recurrenceType: normalizeRecurrenceType(task.recurrenceType),
      nextOccurrence: nextOccurrence > todayKey ? nextOccurrence : getNextOpenOccurrenceDate(state, task, nextOccurrence, todayKey),
      completionHistory: completions,
      active: task.active !== false,
    };
  });
  return state.recurringTasks;
}

function getNextOpenOccurrenceDate(state, task, startDateKey, todayKey) {
  let occurrenceDate = startDateKey;
  let guard = 0;

  while (hasCompletedOccurrence(state, task.id, occurrenceDate) && occurrenceDate <= todayKey && guard < 400) {
    occurrenceDate = getNextOccurrenceDate(task, occurrenceDate);
    guard += 1;
  }

  return occurrenceDate;
}

function toOccurrenceItem(state, task) {
  const occurrenceId = getOccurrenceId(task.id, task.nextOccurrence);
  return {
    id: occurrenceId,
    recurringTaskId: task.id,
    occurrenceDate: task.nextOccurrence,
    areaId: categoryToAreaId(task.category),
    category: task.category,
    workType: task.workType ?? "none",
    type: "Recurring Task",
    source: "Recurring Task Engine",
    title: task.name,
    priority: task.priority ?? "Medium",
    estimatedEffortMinutes: Number(task.estimatedEffortMinutes ?? 15),
    timingType: "flexible",
    dueDate: task.nextOccurrence === getDateKey(new Date()) ? "Today" : task.nextOccurrence,
    reason: `${titleCase(task.recurrenceType)} recurring task`,
    completionCount: (state.recurringTaskCompletions[task.id] ?? []).length,
  };
}

function buildRecurringTaskFromForm(formData, id) {
  const name = String(formData.get("recurringTaskName") ?? "").trim() || "Untitled recurring task";
  const recurrenceType = normalizeRecurrenceType(String(formData.get("recurringTaskType") ?? "daily"));
  const nextOccurrence = normalizeDateInput(String(formData.get("recurringTaskNextOccurrence") ?? "")) || getDateKey(new Date());
  const category = normalizeCategory(String(formData.get("recurringTaskCategory") ?? "Personal"));
  const priority = normalizePriority(String(formData.get("recurringTaskPriority") ?? "Medium"));
  const customSchedule = String(formData.get("recurringTaskCustomSchedule") ?? "").trim();

  return {
    id,
    name,
    recurrenceType,
    customSchedule,
    nextOccurrence,
    category,
    priority,
    active: formData.get("recurringTaskActive") !== "inactive",
    completionHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function getNextOccurrenceDate(task, dateKey) {
  const date = parseDateKey(dateKey);
  const recurrenceType = normalizeRecurrenceType(task.recurrenceType);

  if (recurrenceType === "weekly") {
    date.setDate(date.getDate() + 7);
  } else if (recurrenceType === "monthly") {
    date.setMonth(date.getMonth() + 1);
  } else if (recurrenceType === "custom") {
    date.setDate(date.getDate() + getCustomIntervalDays(task.customSchedule));
  } else {
    date.setDate(date.getDate() + 1);
  }

  return getDateKey(date);
}

function hasCompletedOccurrence(state, taskId, occurrenceDate) {
  return (state.recurringTaskCompletions[taskId] ?? []).some((completion) => completion.occurrenceDate === occurrenceDate);
}

function parseOccurrenceId(occurrenceId) {
  const match = String(occurrenceId).match(/^recurring-occurrence-(.+)-(\d{4}-\d{2}-\d{2})$/);
  return {
    taskId: match?.[1] ?? String(occurrenceId).replace(/^recurring-occurrence-/, ""),
    occurrenceDate: match?.[2] ?? getDateKey(new Date()),
  };
}

function getOccurrenceId(taskId, occurrenceDate) {
  return `recurring-occurrence-${taskId}-${occurrenceDate}`;
}

function getCustomIntervalDays(customSchedule) {
  const match = String(customSchedule ?? "").match(/(\d+)/);
  return Math.max(1, Number(match?.[1] ?? 2));
}

function normalizeRecurrenceType(value) {
  return RECURRENCE_TYPES.includes(value) ? value : "daily";
}

function normalizeDateInput(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.toLowerCase() === "today") {
    return getDateKey(new Date());
  }
  if (trimmed.toLowerCase() === "tomorrow") {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getDateKey(tomorrow);
  }
  const date = new Date(`${trimmed}T00:00:00`);
  return Number.isNaN(date.getTime()) ? getDateKey(new Date()) : getDateKey(date);
}

function normalizeCategory(category) {
  const value = String(category ?? "").toLowerCase();
  if (value.includes("health")) return "Health";
  if (value.includes("fitness")) return "Fitness";
  if (value.includes("work")) return "Work";
  if (value.includes("money")) return "Money";
  if (value.includes("relationship")) return "Relationships";
  if (value.includes("home")) return "Home";
  return "Personal";
}

function normalizePriority(priority) {
  return ["High", "Medium", "Low"].includes(priority) ? priority : "Medium";
}

function categoryToAreaId(category) {
  return String(category ?? "Personal").toLowerCase();
}

function parseDateKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

function getDateKey(date) {
  const localDate = new Date(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function titleCase(value) {
  return String(value)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
