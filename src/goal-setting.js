export const GOAL_CATEGORIES = ["Health", "Fitness", "Work", "Money", "Relationships", "Home", "Personal"];

export function ensureGoalState(state) {
  state.goals = Array.isArray(state.goals) ? state.goals : [];
  state.goalDraftId = state.goalDraftId ?? null;
}

export function getGoalSettingData(state) {
  ensureGoalState(state);
  const activeGoals = state.goals.filter((goal) => goal.status !== "completed");
  const completedGoals = state.goals.filter((goal) => goal.status === "completed");

  return {
    categories: GOAL_CATEGORIES,
    activeGoals,
    completedGoals,
    draftGoal: state.goals.find((goal) => goal.id === state.goalDraftId) ?? null,
    goalsByCategory: getGoalsByCategory(activeGoals),
  };
}

export function createGoal(state, formData) {
  ensureGoalState(state);
  const goal = buildGoalFromForm(formData, `goal-${Date.now()}`);
  state.goals.unshift(goal);
  state.goalDraftId = null;
  return goal;
}

export function updateGoal(state, id, formData) {
  ensureGoalState(state);
  const index = state.goals.findIndex((goal) => goal.id === id);
  if (index === -1) {
    return null;
  }

  const existing = state.goals[index];
  state.goals[index] = {
    ...existing,
    ...buildGoalFromForm(formData, id),
    status: existing.status,
    completedAt: existing.completedAt,
    updatedAt: new Date().toISOString(),
  };
  state.goalDraftId = null;
  return state.goals[index];
}

export function deleteGoal(state, id) {
  ensureGoalState(state);
  state.goals = state.goals.filter((goal) => goal.id !== id);
  state.goalDraftId = state.goalDraftId === id ? null : state.goalDraftId;
}

export function completeGoal(state, id) {
  ensureGoalState(state);
  const goal = state.goals.find((item) => item.id === id);
  if (!goal) {
    return;
  }

  goal.status = "completed";
  goal.completedAt = new Date().toISOString();
  goal.updatedAt = new Date().toISOString();
}

export function reactivateGoal(state, id) {
  ensureGoalState(state);
  const goal = state.goals.find((item) => item.id === id);
  if (!goal) {
    return;
  }

  goal.status = "active";
  delete goal.completedAt;
  goal.updatedAt = new Date().toISOString();
}

export function setGoalDraft(state, id) {
  ensureGoalState(state);
  state.goalDraftId = state.goals.some((goal) => goal.id === id) ? id : null;
}

export function clearGoalDraft(state) {
  ensureGoalState(state);
  state.goalDraftId = null;
}

export function getGoalInfluenceForItem(state, item, inferTimingType) {
  ensureGoalState(state);
  const timingType = item.timingType ?? inferTimingType(item);
  if (timingType === "scheduled") {
    return { score: 0, reasons: [] };
  }

  const itemCategory = normalizeGoalCategory(item.category ?? item.areaId);
  const matchingGoals = state.goals.filter((goal) => goal.status !== "completed" && goal.category === itemCategory);
  if (matchingGoals.length === 0) {
    return { score: 0, reasons: [] };
  }

  const strongestGoal = matchingGoals.sort((left, right) => getPriorityWeight(right.priority) - getPriorityWeight(left.priority))[0];
  const score = Math.min(12, getPriorityWeight(strongestGoal.priority) * 4);
  return {
    score,
    reasons: [`Supports goal: ${strongestGoal.title}`],
  };
}

export function getTopActiveGoals(state, limit = 3) {
  ensureGoalState(state);
  return state.goals
    .filter((goal) => goal.status !== "completed")
    .sort((left, right) => getPriorityWeight(right.priority) - getPriorityWeight(left.priority) || compareDeadline(left.deadline, right.deadline))
    .slice(0, limit);
}

function buildGoalFromForm(formData, id) {
  const title = String(formData.get("goalTitle") ?? "").trim() || "Untitled goal";
  const category = normalizeGoalCategory(String(formData.get("goalCategory") ?? "Personal"));
  const priority = normalizePriority(String(formData.get("goalPriority") ?? "Medium"));
  const deadline = String(formData.get("goalDeadline") ?? "").trim();

  return {
    id,
    title,
    category,
    priority,
    deadline,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function getGoalsByCategory(goals) {
  const grouped = Object.fromEntries(GOAL_CATEGORIES.map((category) => [category, []]));
  for (const goal of goals) {
    const category = normalizeGoalCategory(goal.category);
    grouped[category].push(goal);
  }
  return grouped;
}

function normalizeGoalCategory(category) {
  const value = String(category ?? "").toLowerCase();
  if (value.includes("health")) return "Health";
  if (value.includes("fitness") || value.includes("exercise")) return "Fitness";
  if (value.includes("work") || value.includes("business")) return "Work";
  if (value.includes("money") || value.includes("finance") || value.includes("finances")) return "Money";
  if (value.includes("relationship") || value.includes("family")) return "Relationships";
  if (value.includes("home") || value.includes("house")) return "Home";
  return "Personal";
}

function normalizePriority(priority) {
  if (priority === "High" || priority === "Medium" || priority === "Low") {
    return priority;
  }

  return "Medium";
}

function getPriorityWeight(priority) {
  if (priority === "High") return 3;
  if (priority === "Medium") return 2;
  if (priority === "Low") return 1;
  return 0;
}

function compareDeadline(left, right) {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return String(left).localeCompare(String(right));
}
