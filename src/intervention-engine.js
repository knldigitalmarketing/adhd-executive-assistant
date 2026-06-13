const INTERVENTIONS = [
  {
    id: "smaller-first-step",
    trigger: "repeated-deferrals",
    title: "Break it smaller",
    message: "Do only the first visible step. Stop after that if needed.",
    actionLabel: "Tried first step",
    priority: 90,
  },
  {
    id: "five-minute-starter",
    trigger: "snooze-overload",
    title: "Use a 5-minute starter",
    message: "Set a 5-minute container and start without finishing the whole task.",
    actionLabel: "Started 5 minutes",
    priority: 85,
  },
  {
    id: "movement-reset",
    trigger: "overwhelm",
    title: "Take a movement reset",
    message: "Stand up, stretch, or walk for two minutes, then return to the NOW card.",
    actionLabel: "Reset done",
    priority: 80,
  },
  {
    id: "short-recovery-routine",
    trigger: "missed-focus",
    title: "Run a short recovery routine",
    message: "Drink water, clear the next surface, and restart with one tiny action.",
    actionLabel: "Recovered",
    priority: 75,
  },
  {
    id: "lower-resistance-task",
    trigger: "decision-paralysis",
    title: "Switch to lower resistance",
    message: "Pick the easiest open action for one round. Momentum matters more than importance right now.",
    actionLabel: "Switched",
    priority: 70,
  },
  {
    id: "accountability-check-in",
    trigger: "overdue-two-hours",
    title: "Use accountability",
    message: "Send a quick check-in or say the next step out loud before continuing.",
    actionLabel: "Checked in",
    priority: 65,
  },
];

export function buildSmartIntervention(context) {
  const triggers = getActiveTriggers(context);
  const recentIds = new Set(context.interventionState?.recentInterventionIds ?? []);
  const dismissedToday = new Set(context.interventionState?.dismissedToday ?? []);
  const candidates = INTERVENTIONS.map((intervention, index) => ({
    ...intervention,
    score: scoreIntervention(intervention, triggers, recentIds, dismissedToday),
    reason: getTriggerReason(intervention.trigger, triggers),
    index,
  }))
    .filter((intervention) => intervention.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const selected = candidates[0];
  if (!selected) {
    return null;
  }

  return {
    id: selected.id,
    title: selected.title,
    message: selected.message,
    actionLabel: selected.actionLabel,
    trigger: selected.trigger,
    reason: selected.reason,
    score: selected.score,
    generatedAt: new Date().toISOString(),
  };
}

export function ensureInterventionState(interventionState = {}) {
  return {
    recentInterventionIds: Array.isArray(interventionState.recentInterventionIds) ? interventionState.recentInterventionIds : [],
    lastShownByContext: interventionState.lastShownByContext ?? {},
    dismissedToday: Array.isArray(interventionState.dismissedToday) ? interventionState.dismissedToday : [],
    effectiveness: interventionState.effectiveness ?? {},
    history: Array.isArray(interventionState.history) ? interventionState.history : [],
  };
}

export function getCachedIntervention(interventionState, contextName, todayKey) {
  const cached = interventionState?.lastShownByContext?.[contextName];
  if (!cached || cached.date !== todayKey || cached.status !== "shown") {
    return null;
  }

  return INTERVENTIONS.find((intervention) => intervention.id === cached.interventionId) ?? null;
}

export function recordInterventionShown(state, contextName, intervention, todayKey) {
  state.interventionState = ensureInterventionState(state.interventionState);
  const last = state.interventionState.lastShownByContext?.[contextName];

  if (last?.interventionId === intervention.id && last?.date === todayKey && last?.status === "shown") {
    return false;
  }

  state.interventionState.lastShownByContext = {
    ...state.interventionState.lastShownByContext,
    [contextName]: {
      interventionId: intervention.id,
      trigger: intervention.trigger,
      date: todayKey,
      shownAt: new Date().toISOString(),
      status: "shown",
    },
  };
  state.interventionState.recentInterventionIds = [
    intervention.id,
    ...state.interventionState.recentInterventionIds.filter((id) => id !== intervention.id),
  ].slice(0, 6);
  incrementInterventionShownCount(state, intervention.id);
  appendInterventionHistory(state, intervention.id, "shown", contextName, intervention.trigger);
  return true;
}

export function recordInterventionOutcome(state, id, outcome, contextName = "unknown") {
  state.interventionState = ensureInterventionState(state.interventionState);
  const effectiveness = state.interventionState.effectiveness[id] ?? {
    shownCount: 0,
    acceptedCount: 0,
    dismissedCount: 0,
  };

  if (outcome === "accepted") {
    effectiveness.acceptedCount = Number(effectiveness.acceptedCount ?? 0) + 1;
    state.interventionState.dismissedToday = [id, ...state.interventionState.dismissedToday.filter((item) => item !== id)].slice(0, 8);
  }
  if (outcome === "dismissed") {
    effectiveness.dismissedCount = Number(effectiveness.dismissedCount ?? 0) + 1;
    state.interventionState.dismissedToday = [id, ...state.interventionState.dismissedToday.filter((item) => item !== id)].slice(0, 8);
  }

  state.interventionState.effectiveness[id] = effectiveness;
  state.interventionState.lastShownByContext = Object.fromEntries(
    Object.entries(state.interventionState.lastShownByContext ?? {}).map(([key, value]) =>
      value.interventionId === id ? [key, { ...value, status: outcome, completedAt: new Date().toISOString() }] : [key, value],
    ),
  );
  appendInterventionHistory(state, id, outcome, contextName, null);
  state.interventionState.dismissedToday = state.interventionState.dismissedToday.filter((item, index, items) => index === items.indexOf(item));
}

export function incrementInterventionShownCount(state, id) {
  state.interventionState = ensureInterventionState(state.interventionState);
  const effectiveness = state.interventionState.effectiveness[id] ?? {
    shownCount: 0,
    acceptedCount: 0,
    dismissedCount: 0,
  };
  effectiveness.shownCount = Number(effectiveness.shownCount ?? 0) + 1;
  state.interventionState.effectiveness[id] = effectiveness;
}

function getActiveTriggers(context) {
  const statsValues = Object.values(context.learningStats ?? {});
  const taskSnoozes = statsValues.reduce((sum, stats) => sum + Number(stats.snoozeCount ?? 0), 0);
  const repeatedDeferral = statsValues.find((stats) => getDeferralCount(stats) >= 3);
  const missedFocusCount = getMissedFocusCount(context);
  const overdueTwoHours = context.openItems.find((item) => isOverdueByMoreThanTwoHours(item, context.now));
  const overwhelmScore = getOverwhelmScore(context, statsValues);
  const decisionParalysis = isDecisionParalysisDetected(context, statsValues);

  return {
    "snooze-overload": {
      active: taskSnoozes >= 4,
      detail: `${taskSnoozes} task snoozes detected`,
    },
    "missed-focus": {
      active: missedFocusCount >= 3,
      detail: `${missedFocusCount} missed focus sessions detected`,
    },
    "overdue-two-hours": {
      active: Boolean(overdueTwoHours),
      detail: overdueTwoHours ? `${overdueTwoHours.title ?? overdueTwoHours.name} is overdue by more than 2 hours` : "",
    },
    overwhelm: {
      active: overwhelmScore >= 8,
      detail: `Overwhelm score is ${overwhelmScore}`,
    },
    "decision-paralysis": {
      active: decisionParalysis,
      detail: "Decision paralysis pattern detected",
    },
    "repeated-deferrals": {
      active: Boolean(repeatedDeferral),
      detail: repeatedDeferral ? `${repeatedDeferral.title ?? "An item"} has been deferred repeatedly` : "",
    },
  };
}

function scoreIntervention(intervention, triggers, recentIds, dismissedToday) {
  const trigger = triggers[intervention.trigger];
  if (!trigger?.active) {
    return 0;
  }

  let score = intervention.priority;
  if (recentIds.has(intervention.id)) {
    score -= 35;
  }
  if (dismissedToday.has(intervention.id)) {
    score -= 60;
  }
  return score;
}

function getTriggerReason(triggerName, triggers) {
  return triggers[triggerName]?.detail || "Struggle pattern detected";
}

function getDeferralCount(stats = {}) {
  return Number(stats.snoozeCount ?? 0) + Number(stats.skipCount ?? 0) + Number(stats.missedCount ?? 0);
}

function getMissedFocusCount(context) {
  const learningMisses = Object.entries(context.learningStats ?? {})
    .filter(([key]) => key.startsWith("focusSessions:"))
    .reduce((sum, [, stats]) => sum + Number(stats.missedCount ?? 0), 0);
  const historyMisses = (context.focusHistory ?? []).filter((entry) => entry.completedFocus === false && entry.markedDone !== true).length;
  return learningMisses + historyMisses;
}

function isOverdueByMoreThanTwoHours(item, now) {
  const start = parseTodayTime(item.startTime ?? item.time, now);
  if (start && now.getTime() - start.getTime() > 2 * 60 * 60 * 1000) {
    return true;
  }

  const due = item.deadline ?? item.dueDate;
  if (!due || due === "Today" || due === "Tomorrow" || due === "This week") {
    return false;
  }

  const dueDate = new Date(due);
  return !Number.isNaN(dueDate.getTime()) && now.getTime() - dueDate.getTime() > 2 * 60 * 60 * 1000;
}

function getOverwhelmScore(context, statsValues) {
  let score = 0;
  if (context.profile?.adhd?.busyFailureMode === "overwhelmed") {
    score += 4;
  }
  if (context.profile?.adhd?.supportNeeded === "choose") {
    score += 2;
  }
  score += Math.min(context.openItems.length, 6);
  score += Math.min(statsValues.reduce((sum, stats) => sum + getDeferralCount(stats), 0), 6);
  return score;
}

function isDecisionParalysisDetected(context, statsValues) {
  const rulesets = new Set(context.profile?.activeRulesets ?? []);
  const skipDismissCount = statsValues.reduce((sum, stats) => sum + Number(stats.skipCount ?? 0) + Number(stats.dismissCount ?? 0), 0);
  return rulesets.has("decision_paralysis_support") && (context.openItems.length >= 4 || skipDismissCount >= 3 || context.profile?.adhd?.supportNeeded === "choose");
}

function parseTodayTime(timeText, now) {
  const match = String(timeText ?? "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) {
    hours += 12;
  }
  if (period === "AM" && hours === 12) {
    hours = 0;
  }

  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  return target;
}

function appendInterventionHistory(state, interventionId, outcome, contextName, trigger) {
  state.interventionState.history = state.interventionState.history ?? [];
  state.interventionState.history.push({
    id: `intervention-history-${interventionId}-${Date.now()}`,
    interventionId,
    outcome,
    contextName,
    trigger,
    date: new Date().toISOString().slice(0, 10),
    at: new Date().toISOString(),
  });
  state.interventionState.history = state.interventionState.history.slice(-80);
}
