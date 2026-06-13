export const HABIT_CATEGORIES = ["Health", "Fitness", "Work", "Money", "Relationships", "Home", "Personal"];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ensureHabitState(state) {
  state.habits = Array.isArray(state.habits) ? state.habits : [];
  state.habitDraftId = state.habitDraftId ?? null;
  state.habitCompletions = state.habitCompletions ?? {};
}

export function getHabitTrackingData(state, today = new Date()) {
  ensureHabitState(state);
  const habitsWithStreaks = state.habits.map((habit) => withHabitStreak(state, habit, today));
  const activeHabits = habitsWithStreaks.filter((habit) => habit.active !== false);
  const inactiveHabits = habitsWithStreaks.filter((habit) => habit.active === false);

  return {
    categories: HABIT_CATEGORIES,
    activeHabits,
    inactiveHabits,
    draftHabit: habitsWithStreaks.find((habit) => habit.id === state.habitDraftId) ?? null,
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
      streak: getHabitStreak(state, habit, today),
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

export function getHabitStreak(state, habit, today = new Date()) {
  ensureHabitState(state);
  if (!habit) {
    return getEmptyStreak();
  }

  return habit.frequencyType === "weekly" ? getWeeklyHabitStreak(state, habit, today) : getDailyHabitStreak(state, habit, today);
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

function withHabitStreak(state, habit, today) {
  return {
    ...habit,
    streak: getHabitStreak(state, habit, today),
  };
}

function getDailyHabitStreak(state, habit, today) {
  const completionSet = new Set(state.habitCompletions[habit.id] ?? []);
  const applicableDateKeys = getApplicableDailyDateKeys(habit, today, 120);
  const latestCompletedIndex = applicableDateKeys.findIndex((dateKey) => completionSet.has(dateKey));
  const longestStreak = getLongestSequentialCompletionRun(applicableDateKeys, completionSet);

  if (latestCompletedIndex === -1 || latestCompletedIndex > 2) {
    return {
      currentStreak: 0,
      longestStreak,
      unit: "day",
      recoveryAvailable: false,
      status: "Fresh start available",
      message: "A fresh start is available today.",
    };
  }

  const currentStreak = countSequentialCompletions(applicableDateKeys.slice(latestCompletedIndex), completionSet);
  const recoveryAvailable = latestCompletedIndex > 0;

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    unit: "day",
    recoveryAvailable,
    status: recoveryAvailable ? "Recovery available" : "On track",
    message: recoveryAvailable ? "One missed day is recoverable. A small check-in keeps momentum alive." : "Momentum is active.",
  };
}

function getWeeklyHabitStreak(state, habit, today) {
  const weeklyTarget = Math.max(1, Number(habit.weeklyTargetCount ?? 1));
  const weekKeys = getRecentWeekKeys(today, 26);
  const completionsByWeek = getCompletionsByWeek(state.habitCompletions[habit.id] ?? []);
  const metWeekSet = new Set(weekKeys.filter((weekKey) => (completionsByWeek.get(weekKey) ?? 0) >= weeklyTarget));
  const latestMetWeekIndex = weekKeys.findIndex((weekKey) => metWeekSet.has(weekKey));
  const longestStreak = getLongestSequentialCompletionRun(weekKeys, metWeekSet);

  if (latestMetWeekIndex === -1 || latestMetWeekIndex > 1) {
    return {
      currentStreak: 0,
      longestStreak,
      unit: "week",
      recoveryAvailable: false,
      status: "Fresh start available",
      message: "This week can still become a clean restart.",
    };
  }

  const currentStreak = countSequentialCompletions(weekKeys.slice(latestMetWeekIndex), metWeekSet);
  const recoveryAvailable = latestMetWeekIndex === 1 || !metWeekSet.has(weekKeys[0]);

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    unit: "week",
    recoveryAvailable,
    status: recoveryAvailable ? "Week still open" : "On track",
    message: recoveryAvailable ? "This week is still open. One steady check-in can protect momentum." : "Momentum is active.",
  };
}

function getApplicableDailyDateKeys(habit, today, days) {
  const date = startOfDay(today);
  const targetDays = habit.targetDays?.length ? habit.targetDays : DAY_NAMES;
  const dateKeys = [];

  for (let index = 0; index < days; index += 1) {
    const candidate = new Date(date);
    candidate.setDate(date.getDate() - index);
    if (targetDays.includes(DAY_NAMES[candidate.getDay()])) {
      dateKeys.push(getDateKey(candidate));
    }
  }

  return dateKeys;
}

function countSequentialCompletions(dateKeys, completionSet) {
  let count = 0;
  for (const dateKey of dateKeys) {
    if (!completionSet.has(dateKey)) {
      break;
    }
    count += 1;
  }
  return count;
}

function getLongestSequentialCompletionRun(dateKeys, completionSet) {
  let longest = 0;
  let current = 0;

  for (const dateKey of [...dateKeys].reverse()) {
    if (completionSet.has(dateKey)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

function getRecentWeekKeys(today, weeks) {
  const currentWeekStart = getWeekStartDate(today);
  return Array.from({ length: weeks }, (_, index) => {
    const week = new Date(currentWeekStart);
    week.setDate(currentWeekStart.getDate() - index * 7);
    return getDateKey(week);
  });
}

function getCompletionsByWeek(completions) {
  const counts = new Map();
  for (const dateKey of completions) {
    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    const weekKey = getDateKey(getWeekStartDate(date));
    counts.set(weekKey, (counts.get(weekKey) ?? 0) + 1);
  }
  return counts;
}

function getWeekStartDate(date) {
  const weekStart = startOfDay(date);
  const daysSinceMonday = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);
  return weekStart;
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getEmptyStreak() {
  return {
    currentStreak: 0,
    longestStreak: 0,
    unit: "day",
    recoveryAvailable: false,
    status: "Fresh start available",
    message: "A fresh start is available today.",
  };
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
  const localDate = new Date(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
