const ROTATION_INTERVAL_MS = 5 * 60 * 1000;
const RECENT_LIMIT = 6;

export function ensurePositiveReinforcementState(value = {}) {
  return {
    recentMessageIds: Array.isArray(value.recentMessageIds) ? value.recentMessageIds : [],
    currentByContext: value.currentByContext && typeof value.currentByContext === "object" ? value.currentByContext : {},
  };
}

export function selectPositiveReinforcement(context) {
  const reinforcementState = ensurePositiveReinforcementState(context.reinforcementState);
  const contextName = context.contextName ?? "dashboard";
  const now = context.now ?? new Date();
  const current = reinforcementState.currentByContext[contextName];
  const candidates = buildCandidates(context);

  if (current && !shouldRotate(current, now)) {
    const matching = candidates.find((candidate) => candidate.id === current.messageId);
    if (matching) {
      return { ...matching, rotated: false };
    }
  }

  const selected = pickCandidate(candidates, reinforcementState.recentMessageIds, contextName);
  return { ...selected, rotated: true };
}

export function recordPositiveReinforcementShown(state, contextName, message, now = new Date()) {
  if (!message) {
    return false;
  }

  state.positiveReinforcementState = ensurePositiveReinforcementState(state.positiveReinforcementState);
  const current = state.positiveReinforcementState.currentByContext[contextName];
  if (current?.messageId === message.id && !message.rotated) {
    return false;
  }

  state.positiveReinforcementState.currentByContext[contextName] = {
    messageId: message.id,
    shownAt: now.toISOString(),
  };
  state.positiveReinforcementState.recentMessageIds = [
    message.id,
    ...state.positiveReinforcementState.recentMessageIds.filter((id) => id !== message.id),
  ].slice(0, RECENT_LIMIT);
  return true;
}

function buildCandidates(context) {
  return [
    ...completionCandidates(context),
    ...habitStreakCandidates(context),
    ...goalProgressCandidates(context),
    ...routineCompletionCandidates(context),
    ...recoveryCandidates(context),
    ...moodImprovementCandidates(context),
    ...consistencyCandidates(context),
  ].sort((left, right) => right.weight - left.weight || left.id.localeCompare(right.id));
}

function completionCandidates(context) {
  const completionsToday = getTodaysProgressEntries(context);
  if (completionsToday.length === 0) {
    return [];
  }

  const latest = completionsToday.at(-1);
  return [
    {
      id: `completion-${latest.itemId}`,
      text: `${latest.title} is done. That is real forward motion.`,
      source: "Completed tasks",
      weight: 90,
    },
    {
      id: "completion-count-today",
      text: `${completionsToday.length} completed today. Keep using one next step.`,
      source: "Completed tasks",
      weight: 78,
    },
  ];
}

function habitStreakCandidates(context) {
  return (context.habits?.activeHabits ?? [])
    .filter((habit) => Number(habit.streak?.currentStreak ?? 0) > 0)
    .sort((left, right) => Number(right.streak.currentStreak) - Number(left.streak.currentStreak))
    .slice(0, 2)
    .map((habit, index) => ({
      id: `habit-streak-${habit.id}`,
      text: `${habit.name} has a ${habit.streak.currentStreak}-${habit.streak.unit} streak. Momentum is active.`,
      source: "Habit streaks",
      weight: 84 - index,
    }));
}

function goalProgressCandidates(context) {
  const counts = context.goalProgress?.counts ?? {};
  const strongest = Object.entries(counts)
    .filter(([, count]) => Number(count) > 0)
    .sort((left, right) => Number(right[1]) - Number(left[1]))[0];

  if (!strongest) {
    return [];
  }

  return [
    {
      id: `goal-progress-${strongest[0].toLowerCase()}`,
      text: `${strongest[0]} moved this week. Small completions are adding up.`,
      source: "Goal progress",
      weight: 80,
    },
  ];
}

function routineCompletionCandidates(context) {
  const routineCompletions = getTodaysProgressEntries(context).filter((entry) =>
    ["routines", "routineSteps", "morningRoutine"].includes(entry.collection),
  );

  if (routineCompletions.length === 0) {
    return [];
  }

  return [
    {
      id: "routine-completion-today",
      text: "Routine step complete. The day has more structure now.",
      source: "Routine completion",
      weight: 82,
    },
  ];
}

function recoveryCandidates(context) {
  const todayKey = context.todayKey;
  const recovered = findLastMatching(context.recoveryHistory ?? [], (entry) => entry.event === "done" && isToday(entry.at, todayKey));
  if (!recovered) {
    return [];
  }

  return [
    {
      id: `recovery-${recovered.recoveryId}`,
      text: "You recovered a missed item. That counts more than a perfect streak.",
      source: "Recovery after missed tasks",
      weight: 88,
    },
  ];
}

function moodImprovementCandidates(context) {
  const checkIns = (context.energyMood?.todaysCheckIns ?? []).filter((checkIn) => checkIn.mood);
  if (checkIns.length < 2) {
    return [];
  }

  const first = checkIns[0];
  const latest = checkIns.at(-1);
  if (moodValue(latest.mood) <= moodValue(first.mood)) {
    return [];
  }

  return [
    {
      id: "mood-improved-today",
      text: `Mood moved from ${first.mood} to ${latest.mood}. The support is working.`,
      source: "Mood improvements",
      weight: 86,
    },
  ];
}

function consistencyCandidates(context) {
  const stats = context.todayStats ?? {};
  const learningStats = Object.values(context.learningStats ?? {});
  const hasDeferred = Number(stats.snoozed ?? 0) > 0 || learningStats.some((entry) => Number(entry.snoozeCount ?? 0) > 0 || Number(entry.skipCount ?? 0) > 0);

  if (Number(stats.done ?? 0) > 0 && hasDeferred) {
    return [
      {
        id: "consistency-over-perfection",
        text: "Progress and detours can both exist. Consistency beats perfection.",
        source: "Consistency over perfection",
        weight: 76,
      },
    ];
  }

  if (context.nowRecommendation) {
    return [
      {
        id: "clear-next-step",
        text: "There is one clear next step. That is enough to start.",
        source: "Consistency over perfection",
        weight: 60,
      },
    ];
  }

  return [
    {
      id: "quiet-board",
      text: "The board is quiet. Take the space without inventing extra work.",
      source: "Consistency over perfection",
      weight: 45,
    },
  ];
}

function pickCandidate(candidates, recentMessageIds, contextName) {
  const freshCandidates = candidates.filter((candidate) => !recentMessageIds.includes(candidate.id));
  return (freshCandidates[0] ?? candidates[0]) ?? {
    id: `fallback-${contextName}`,
    text: "One small useful step is enough for right now.",
    source: "Consistency over perfection",
    weight: 1,
  };
}

function getTodaysProgressEntries(context) {
  return (context.progressHistory ?? []).filter((entry) => isToday(entry.completedAt, context.todayKey));
}

function shouldRotate(current, now) {
  const shownAt = new Date(current.shownAt).getTime();
  if (!Number.isFinite(shownAt)) {
    return true;
  }

  return now.getTime() - shownAt >= ROTATION_INTERVAL_MS;
}

function isToday(value, todayKey) {
  if (!value) {
    return false;
  }

  return String(value).slice(0, 10) === todayKey;
}

function moodValue(mood) {
  return {
    low: 0,
    stressed: 1,
    steady: 2,
    good: 3,
  }[mood] ?? 1;
}

function findLastMatching(items, predicate) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) {
      return items[index];
    }
  }

  return null;
}
