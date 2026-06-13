export const HABIT_CATEGORIES = ["Health", "Fitness", "Work", "Money", "Relationships", "Home", "Personal"];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ensureHabitState(state) {
  state.habits = Array.isArray(state.habits) ? state.habits : [];
  state.habitDraftId = state.habitDraftId ?? null;
  state.habitCompletions = state.habitCompletions ?? {};
}

export function getHabitTrackingData(state, today = new Date()) {
  ensureHabitState(state);
  const activeHabits = state.habits.filter((habit) => habit.active !== false);
  const inactiveHabits = state.habits.filter((habit) => habit.active === false);

  return {
    categories: HABIT_CATEGORIES,
    activeHabits,
    inactiveHabits,
    draftHabit: state.habits.find((habit) => habit.id === state.habitDraftId) ?? null,
    dueHabitItems: buildDueHabitItems({ state, today }),
  };
}

export function createHabit(state, formData) {
  ensureHabitState(state);
  const habit = buildHabitFromForm(formData, `habit-${Date.now()}`);
  state.habits.unshift(habit);
  state.habitDraftId = null;
  return habit;
}

export function updateHabit(state, id, formData) {
  ensureHabitState(state);
  const index = state.habits.findIndex((habit) => habit.id === id);
  if (index === -1) {
    return null;
  }

  state.habits[index] = {
    ...state.habits[index],
    ...buildHabitFromForm(formData, id),
    updatedAt: new Date().toISOString(),
  };
  state.habitDraftId = null;
  return state.habits[index];
}

export function deleteHabit(state, id) {
  ensureHabitState(state);
  state.habits = state.habits.filter((habit) => habit.id !== id);
  delete state.habitCompletions[id];
  state.habitDraftId = state.habitDraftId === id ? null : state.habitDraftId;
}

export function setHabitActive(state, id, active) {
  ensureHabitState(state);
  const habit = state.habits.find((item) => item.id === id);
  if (!habit) {
    return;
  }

  habit.active = Boolean(active);
  habit.updatedAt = new Date().toISOString();
}

export function setHabitDraft(state, id) {
  ensureHabitState(state);
  state.habitDraftId = state.habits.some((habit) => habit.id === id) ? id : null;
}

export function clearHabitDraft(state) {
  ensureHabitState(state);
  state.habitDraftId = null;
}

export function completeHabit(state, id, date = new Date()) {
  ensureHabitState(state);
  const habitId = getHabitIdFromItemId(id);
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) {
    return null;
  }

  const dateKey = getDateKey(date);
  state.habitCompletions[habitId] = [...new Set([...(state.habitCompletions[habitId] ?? []), dateKey])].slice(-120);
  return habit;
}

export function buildDueHabitItems({ state, today = new Date() }) {
  ensureHabitState(state);
  return state.habits
    .filter((habit) => habit.active !== false)
    .filter((habit) => isHabitDue(habit, state, today))
    .map((habit) => ({
      id: getHabitItemId(habit.id),
      habitId: habit.id,
      areaId: "habits",
      category: habit.category,
      workType: "none",
      type: "Habit",
      source: "Habit Tracking",
      title: habit.name,
      habitName: habit.name,
      frequencyType: habit.frequencyType,
      priority: "Low",
      estimatedEffortMinutes: 5,
      timingType: "flexible",
      reason: `${habit.frequencyType === "daily" ? "Daily" : "Weekly"} habit`,
    }));
}

export function getHabitInfluenceForItem(state, item, inferTimingType) {
  ensureHabitState(state);
  const timingType = item.timingType ?? inferTimingType(item);
  if (timingType === "scheduled" || item.type === "Habit") {
    return { score: 0, reasons: [] };
  }

  const itemCategory = normalizeHabitCategory(item.category ?? item.areaId);
  const matchingHabits = state.habits.filter((habit) => habit.active !== false && habit.category === itemCategory);
  if (matchingHabits.length === 0) {
    return { score: 0, reasons: [] };
  }

  return {
    score: 4,
    reasons: [`Supports habit area: ${itemCategory}`],
  };
}

export function getHabitCompletionCount(state, habitId, days = 7) {
  ensureHabitState(state);
  const completions = state.habitCompletions[habitId] ?? [];
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return completions.filter((dateKey) => new Date(`${dateKey}T00:00:00`) >= cutoff).length;
}

function buildHabitFromForm(formData, id) {
  const name = String(formData.get("habitName") ?? "").trim() || "Untitled habit";
  const category = normalizeHabitCategory(String(formData.get("habitCategory") ?? "Personal"));
  const frequencyType = normalizeFrequencyType(String(formData.get("habitFrequencyType") ?? "daily"));
  const targetDays = parseTargetDays(String(formData.get("habitTargetDays") ?? ""));
  const weeklyTargetCount = Math.max(1, Number(formData.get("habitWeeklyTargetCount") ?? 1));

  return {
    id,
    name,
    category,
    frequencyType,
    targetDays,
    weeklyTargetCount: Number.isFinite(weeklyTargetCount) ? weeklyTargetCount : 1,
    active: formData.get("habitActive") !== "inactive",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function isHabitDue(habit, state, today) {
  if (habit.frequencyType === "daily") {
    const dayName = DAY_NAMES[today.getDay()];
    const targetDays = habit.targetDays?.length ? habit.targetDays : DAY_NAMES;
    return targetDays.includes(dayName) && !isHabitCompletedOnDate(state, habit.id, getDateKey(today));
  }

  return getHabitCompletionCount(state, habit.id, 7) < Number(habit.weeklyTargetCount ?? 1);
}

function isHabitCompletedOnDate(state, habitId, dateKey) {
  return (state.habitCompletions[habitId] ?? []).includes(dateKey);
}

function parseTargetDays(value) {
  const normalized = value
    .split(",")
    .map((day) => day.trim())
    .filter(Boolean)
    .map((day) => DAY_NAMES.find((name) => name.toLowerCase().startsWith(day.toLowerCase().slice(0, 3))) ?? null)
    .filter(Boolean);

  return [...new Set(normalized)];
}

function normalizeHabitCategory(category) {
  const value = String(category ?? "").toLowerCase();
  if (value.includes("health")) return "Health";
  if (value.includes("fitness") || value.includes("exercise")) return "Fitness";
  if (value.includes("work") || value.includes("business")) return "Work";
  if (value.includes("money") || value.includes("finance") || value.includes("finances")) return "Money";
  if (value.includes("relationship") || value.includes("family")) return "Relationships";
  if (value.includes("home") || value.includes("house")) return "Home";
  return "Personal";
}

function normalizeFrequencyType(frequencyType) {
  return frequencyType === "weekly" ? "weekly" : "daily";
}

function getHabitItemId(habitId) {
  return `habit-item-${habitId}`;
}

function getHabitIdFromItemId(id) {
  return String(id).replace(/^habit-item-/, "");
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}
