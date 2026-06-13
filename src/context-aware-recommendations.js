export function getContextAwareInfluence(context, candidate) {
  const { item } = candidate;
  const signals = context.getContextSignals();
  const timingType = item.timingType ?? context.inferTimingType(item);

  if (timingType === "scheduled") {
    return { score: 0, reasons: [] };
  }

  const reasons = [];
  let score = 0;

  const timeEffect = getTimeOfDayEffect(signals, item);
  score += timeEffect.score;
  reasons.push(...timeEffect.reasons);

  const dayEffect = getDayOfWeekEffect(signals, item);
  score += dayEffect.score;
  reasons.push(...dayEffect.reasons);

  const workloadEffect = getWorkloadEffect(signals, item, context.getEstimatedEffort(item), timingType);
  score += workloadEffect.score;
  reasons.push(...workloadEffect.reasons);

  const moodEnergyEffect = getMoodEnergyContextEffect(signals, item, context.getEstimatedEffort(item));
  score += moodEnergyEffect.score;
  reasons.push(...moodEnergyEffect.reasons);

  const behaviorEffect = getPastBehaviorEffect(signals, candidate);
  score += behaviorEffect.score;
  reasons.push(...behaviorEffect.reasons);

  const interventionEffect = getInterventionHistoryEffect(signals, item);
  score += interventionEffect.score;
  reasons.push(...interventionEffect.reasons);

  const commitmentEffect = getCommitmentEffect(signals, item);
  score += commitmentEffect.score;
  reasons.push(...commitmentEffect.reasons);

  if (timingType === "deadline" && score < 0) {
    score = Math.max(score, -3);
  }

  return {
    score,
    reasons: reasons.slice(0, 4),
  };
}

export function buildContextSignals({ state, getDayPart, getEnergyMoodData, getLearningStats, getSmartReschedulingSummary, getEstimatedEffort, isDone }) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const workload = getCurrentWorkload(state, getEstimatedEffort, isDone);
  const smartRescheduling = getSmartReschedulingSummary();
  const energyMood = getEnergyMoodData();

  return {
    dayPart: getDayPart(),
    dayOfWeek,
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    workload,
    smartRescheduling,
    energyMood,
    interventionHistory: state.interventionState?.history ?? [],
    interventionEffectiveness: state.interventionState?.effectiveness ?? {},
    learningStats: getLearningStats(),
    activeGoalCategories: new Set((state.goals ?? []).filter((goal) => goal.status !== "completed").map((goal) => normalizeCategory(goal.category))),
    activeHabitCategories: new Set((state.habits ?? []).filter((habit) => habit.active !== false).map((habit) => normalizeCategory(habit.category))),
    activeRoutineNames: (state.routinePlans ?? []).filter((routine) => routine.active !== false).map((routine) => String(routine.name ?? "").toLowerCase()),
    recurringCategories: new Set((state.recurringTasks ?? []).filter((task) => task.active !== false).map((task) => normalizeCategory(task.category))),
  };
}

function getTimeOfDayEffect(signals, item) {
  const text = getText(item);
  const category = normalizeCategory(item.category ?? item.areaId);

  if (signals.dayPart === "morning") {
    if (item.type === "Morning Routine" || text.includes("plan") || text.includes("water") || text.includes("walk")) {
      return { score: 6, reasons: ["Morning context favors setup and launch actions"] };
    }
    if (category === "Work") {
      return { score: 3, reasons: ["Morning context can support focused work"] };
    }
  }

  if (signals.dayPart === "evening") {
    if (text.includes("bed") || text.includes("sleep") || text.includes("review") || category === "Home" || category === "Health") {
      return { score: 6, reasons: ["Evening context favors shutdown and recovery actions"] };
    }
    if (category === "Work" && item.priority !== "High") {
      return { score: -4, reasons: ["Evening context lowers non-urgent work"] };
    }
  }

  return { score: 0, reasons: [] };
}

function getDayOfWeekEffect(signals, item) {
  const category = normalizeCategory(item.category ?? item.areaId);
  if (!signals.isWeekend && category === "Work") {
    return { score: 4, reasons: ["Workday context supports work tasks"] };
  }
  if (signals.isWeekend && ["Home", "Personal", "Fitness", "Relationships"].includes(category)) {
    return { score: 4, reasons: ["Weekend context supports personal-life tasks"] };
  }
  if (signals.isWeekend && category === "Work" && item.priority !== "High") {
    return { score: -3, reasons: ["Weekend context lowers non-urgent work"] };
  }
  return { score: 0, reasons: [] };
}

function getWorkloadEffect(signals, item, effort, timingType) {
  const reasons = [];
  let score = 0;
  const pressure =
    signals.workload.todayItems >= 6 ||
    signals.workload.todayMinutes >= 240 ||
    signals.smartRescheduling.conflicts.length > 0 ||
    signals.smartRescheduling.moved.length > 0;

  if (!pressure) {
    return { score, reasons };
  }

  if (item.priority === "High" || timingType === "deadline") {
    score += 4;
    reasons.push("Heavy workload keeps essential tasks visible");
  } else if (effort <= 15) {
    score += 5;
    reasons.push("Current workload favors a smaller next step");
  } else if (effort > 30 && timingType !== "deadline" && item.priority !== "High") {
    score -= 5;
    reasons.push("Current workload lowers high-friction tasks");
  }
  return { score, reasons };
}

function getMoodEnergyContextEffect(signals, item, effort) {
  const latest = signals.energyMood?.latestCheckIn;
  if (!latest) {
    return { score: 0, reasons: [] };
  }

  const reasons = [];
  let score = 0;
  const recoveryFriendly = isRecoveryFriendly(item);

  if (latest.energy === "low") {
    if (effort <= 15 || recoveryFriendly) {
      score += 4;
      reasons.push("Low energy context favors lower-resistance tasks");
    } else if (effort > 30 && item.priority !== "High") {
      score -= 4;
      reasons.push("Low energy context lowers bigger non-urgent tasks");
    }
  }

  if (latest.mood === "low" || latest.mood === "stressed") {
    if (recoveryFriendly || effort <= 15) {
      score += 4;
      reasons.push("Low mood context favors gentler actions");
    } else if (effort > 30 && item.priority !== "High") {
      score -= 3;
      reasons.push("Low mood context avoids high-friction work");
    }
  }

  return { score, reasons };
}

function getPastBehaviorEffect(signals, candidate) {
  const stats = signals.learningStats?.[`${candidate.collection}:${candidate.item.id}`];
  if (!stats) {
    return { score: 0, reasons: [] };
  }

  if (Number(stats.snoozeCount ?? 0) >= 2 || Number(stats.skipCount ?? 0) >= 2) {
    return { score: -4, reasons: ["Past deferrals lower this task slightly"] };
  }
  if (Number(stats.completionCount ?? 0) >= 2) {
    return { score: 3, reasons: ["Past completions support this kind of action"] };
  }
  return { score: 0, reasons: [] };
}

function getInterventionHistoryEffect(signals, item) {
  const recentInterventions = signals.interventionHistory.slice(-8);
  if (recentInterventions.length === 0) {
    return { score: 0, reasons: [] };
  }

  const recentTriggers = new Set(recentInterventions.map((entry) => entry.trigger).filter(Boolean));
  const text = getText(item);
  const effort = Number(item.estimatedEffortMinutes ?? 30);
  const reasons = [];
  let score = 0;

  if (recentTriggers.has("overwhelm") || recentTriggers.has("decision-paralysis") || recentTriggers.has("repeated-deferrals")) {
    if (effort <= 15 || text.includes("recovery") || text.includes("routine")) {
      score += 4;
      reasons.push("Recent intervention history favors a lower-resistance step");
    } else if (effort > 30 && item.priority !== "High") {
      score -= 4;
      reasons.push("Recent intervention history lowers high-friction tasks");
    }
  }

  if (recentTriggers.has("snooze-overload") && item.priority === "High") {
    score += 3;
    reasons.push("Recent snooze overload keeps important work visible");
  }

  return { score, reasons };
}

function getCommitmentEffect(signals, item) {
  const category = normalizeCategory(item.category ?? item.areaId);
  const reasons = [];
  let score = 0;

  if (signals.activeGoalCategories.has(category)) {
    score += 4;
    reasons.push("Matches an active goal area");
  }
  if (signals.activeHabitCategories.has(category)) {
    score += 3;
    reasons.push("Matches an active habit area");
  }
  if (signals.recurringCategories.has(category)) {
    score += 2;
    reasons.push("Matches a recurring responsibility area");
  }
  if (signals.activeRoutineNames.some((name) => getText(item).includes(name))) {
    score += 3;
    reasons.push("Matches an active routine");
  }

  return { score: Math.min(score, 8), reasons };
}

function getCurrentWorkload(state, getEstimatedEffort, isDone) {
  const todayItems = (state.actions ?? []).filter((item) => !isDone(item) && isTodayItem(item));
  const todayMinutes = todayItems.reduce((sum, item) => sum + getEstimatedEffort(item), 0);
  return {
    todayItems: todayItems.length,
    todayMinutes,
  };
}

function isTodayItem(item) {
  return item.dueDate === "Today" || item.deadline === "Today" || item.preferredWindow === "Today" || Boolean(item.startTime || item.time);
}

function normalizeCategory(category) {
  const value = String(category ?? "").toLowerCase();
  if (value.includes("health")) return "Health";
  if (value.includes("fitness") || value.includes("exercise")) return "Fitness";
  if (value.includes("work") || value.includes("business")) return "Work";
  if (value.includes("money") || value.includes("finance")) return "Money";
  if (value.includes("relationship") || value.includes("family")) return "Relationships";
  if (value.includes("home") || value.includes("house")) return "Home";
  return "Personal";
}

function getText(item) {
  return `${item.title ?? item.name ?? ""} ${item.type ?? ""} ${item.category ?? ""}`.toLowerCase();
}

function isRecoveryFriendly(item) {
  const text = getText(item);
  return (
    text.includes("recovery") ||
    text.includes("walk") ||
    text.includes("water") ||
    text.includes("stretch") ||
    text.includes("routine") ||
    text.includes("guidance") ||
    text.includes("plan")
  );
}
