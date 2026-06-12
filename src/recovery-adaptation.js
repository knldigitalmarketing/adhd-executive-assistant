export function buildGeneratedRecoverySuggestions({ state, getLearningStats, findByCollection, isDone, inferTimingType }) {
  const suggestions = [];

  for (const [key, stats] of Object.entries(getLearningStats())) {
    const avoidanceCount = getAvoidanceCount(stats);
    if (avoidanceCount < 3 || key.startsWith("recoverySuggestions:")) {
      continue;
    }

    const [sourceCollection, sourceId] = key.split(":");
    const sourceItem = findByCollection(sourceCollection, sourceId);
    if (sourceItem && isDone(sourceItem)) {
      continue;
    }

    suggestions.push(createRecoverySuggestion(state, {
      id: `recovery-${sourceCollection}-${sourceId}`,
      sourceCollection,
      sourceId,
      title: buildRecoveryTitle(stats, sourceItem),
      category: sourceItem?.category ?? "Personal",
      workType: sourceItem?.workType ?? "none",
      priority: "Medium",
      reason: buildRecoveryReason(stats),
      recoveryAction: chooseRecoveryAction(stats, sourceItem, inferTimingType),
      avoidanceCount,
    }));
  }

  return suggestions.filter((item) => !isDone(item));
}

export function computeAdaptiveEffect({ collectionName, item, getLearningStats, getCurrentMinuteOfDay }) {
  const stats = getLearningStats()[getLearningKey(collectionName, item.id)];
  if (!stats) {
    return { score: 0, reasons: [] };
  }

  const reasons = [];
  let score = 0;

  if (stats.dismissCount >= 2) {
    const penalty = Math.min(stats.dismissCount * 5, 20);
    score -= penalty;
    reasons.push("Often dismissed, so it is shown less strongly");
  }

  const currentMinute = getCurrentMinuteOfDay();
  const snoozeCount = getWindowCount(stats.snoozeWindows, currentMinute, 60);
  if (snoozeCount >= 2) {
    const penalty = Math.min(4 + snoozeCount * 2, 12);
    score -= penalty;
    reasons.push("Often snoozed around this time");
  }

  if (stats.completionCount >= 2 && Number.isFinite(stats.preferredCompletionMinute)) {
    const distance = getMinuteDistance(currentMinute, stats.preferredCompletionMinute);
    if (distance <= 60) {
      score += Math.min(4 + stats.completionCount * 2, 12);
      reasons.push(`Usually completed around ${formatMinuteOfDay(stats.preferredCompletionMinute)}.`);
    }
  }

  if (getAvoidanceCount(stats) >= 3 && collectionName !== "recoverySuggestions") {
    score -= 25;
    reasons.push("Recovery suggestion available, so this is not being pushed unchanged");
  }

  return { score, reasons };
}

export function recordLearningEvent({ state, collectionName, id, eventName, item, findByCollection, getTodayKey }) {
  state.learningStats = state.learningStats ?? {};

  const trackedItem = item ?? findByCollection(collectionName, id);
  const key = getLearningKey(collectionName, id);
  const now = new Date();
  const minuteOfDay = now.getHours() * 60 + now.getMinutes();
  const existing = state.learningStats[key] ?? createEmptyLearningStats(collectionName, id, trackedItem);
  const next = {
    ...existing,
    collection: collectionName,
    itemId: id,
    title: trackedItem?.title ?? trackedItem?.name ?? existing.title ?? id,
    updatedAt: now.toISOString(),
  };

  if (eventName === "done") {
    next.completionCount = Number(next.completionCount ?? 0) + 1;
    next.completionTimes = appendRecentMinute(next.completionTimes, minuteOfDay);
    next.preferredCompletionTime = formatMinuteOfDay(getAverageMinute(next.completionTimes));
    next.preferredCompletionMinute = getAverageMinute(next.completionTimes);
  }

  if (eventName === "snoozed") {
    next.snoozeCount = Number(next.snoozeCount ?? 0) + 1;
    next.snoozeWindows = appendRecentMinute(next.snoozeWindows, minuteOfDay);
  }

  if (eventName === "dismissed") {
    next.dismissCount = Number(next.dismissCount ?? 0) + 1;
  }

  if (eventName === "skipped") {
    next.skipCount = Number(next.skipCount ?? 0) + 1;
  }

  if (eventName === "missed") {
    next.missedCount = Number(next.missedCount ?? 0) + 1;
    next.lastMissedDate = getTodayKey();
  }

  state.learningStats[key] = next;
}

export function recordMissedItems({ state, isOpen, inferTimingType, getRawMinutesUntilScheduledStart, getLearningStats, getTodayKey, recordItemEvent, saveState }) {
  const missableCollections = [
    ["actions", state.actions],
    ["routines", state.routines],
    ["timeline", state.timeline],
    ["focusSessions", state.focusSessions],
  ];

  let changed = false;
  for (const [collectionName, items] of missableCollections) {
    for (const item of items) {
      if (!isOpen(item) || (item.timingType ?? inferTimingType(item)) !== "scheduled") {
        continue;
      }

      if (getRawMinutesUntilScheduledStart(item) > -30) {
        continue;
      }

      const key = getLearningKey(collectionName, item.id);
      if (getLearningStats()[key]?.lastMissedDate === getTodayKey()) {
        continue;
      }

      recordItemEvent(collectionName, item.id, "missed", item);
      changed = true;
    }
  }

  if (changed) {
    saveState(state);
  }
}

export function recordRecoveryHistoryEntry({ state, id, eventName }) {
  state.recoveryHistory = state.recoveryHistory ?? [];
  state.recoveryHistory.push({
    id: `history-${id}-${Date.now()}`,
    recoveryId: id,
    event: eventName,
    at: new Date().toISOString(),
  });
  state.recoveryHistory = state.recoveryHistory.slice(-50);
}

function createRecoverySuggestion(state, baseSuggestion) {
  const savedState = state.recoveryState?.[baseSuggestion.id] ?? {};
  return {
    areaId: "recovery",
    estimatedEffortMinutes: 10,
    type: "Recovery Suggestion",
    source: "Learning",
    timingType: "flexible",
    dueDate: "Today",
    preferredWindow: "Today",
    workType: "none",
    ...baseSuggestion,
    ...savedState,
  };
}

function createEmptyLearningStats(collectionName, id, item) {
  return {
    collection: collectionName,
    itemId: id,
    title: item?.title ?? item?.name ?? id,
    completionCount: 0,
    snoozeCount: 0,
    dismissCount: 0,
    skipCount: 0,
    missedCount: 0,
    preferredCompletionTime: null,
    preferredCompletionMinute: null,
    completionTimes: [],
    snoozeWindows: [],
  };
}

function getAvoidanceCount(stats = {}) {
  return Number(stats.snoozeCount ?? 0) + Number(stats.skipCount ?? 0) + Number(stats.missedCount ?? 0);
}

function buildRecoveryTitle(stats, sourceItem) {
  return `Recovery: ${sourceItem?.title ?? sourceItem?.name ?? stats.title ?? "stuck task"}`;
}

function buildRecoveryReason(stats) {
  const parts = [];
  if (Number(stats.snoozeCount ?? 0) > 0) {
    parts.push(`${stats.snoozeCount} snoozed`);
  }
  if (Number(stats.skipCount ?? 0) > 0) {
    parts.push(`${stats.skipCount} skipped`);
  }
  if (Number(stats.missedCount ?? 0) > 0) {
    parts.push(`${stats.missedCount} missed`);
  }
  return `Repeatedly delayed: ${parts.join(", ")}`;
}

function chooseRecoveryAction(stats, sourceItem, inferTimingType) {
  if (Number(stats.snoozeCount ?? 0) >= 2 && Number.isFinite(stats.preferredCompletionMinute)) {
    return `Try it near ${formatMinuteOfDay(stats.preferredCompletionMinute)} instead.`;
  }

  if ((sourceItem?.timingType ?? inferTimingType(sourceItem ?? {})) !== "scheduled" && Number(stats.snoozeCount ?? 0) >= 2) {
    return "Schedule it for a specific time.";
  }

  if (Number(stats.skipCount ?? 0) >= 2) {
    return "Do only the first tiny step.";
  }

  if (Number(stats.missedCount ?? 0) >= 2) {
    return "Move it to tomorrow or choose a new time.";
  }

  return "Break it into a smaller first step.";
}

function getLearningKey(collectionName, id) {
  return `${collectionName}:${id}`;
}

function appendRecentMinute(values = [], minuteOfDay) {
  return [...values, minuteOfDay].slice(-10);
}

function getAverageMinute(values = []) {
  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + Number(value), 0) / values.length);
}

function getWindowCount(values = [], targetMinute, windowMinutes) {
  return values.filter((value) => getMinuteDistance(Number(value), targetMinute) <= windowMinutes).length;
}

function getMinuteDistance(left, right) {
  const distance = Math.abs(Number(left) - Number(right));
  return Math.min(distance, 1440 - distance);
}

function formatMinuteOfDay(minuteOfDay) {
  if (!Number.isFinite(minuteOfDay)) {
    return "";
  }

  const normalized = ((Math.round(minuteOfDay) % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}
