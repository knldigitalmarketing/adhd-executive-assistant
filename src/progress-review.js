export function buildGoalProgressSummary({ state, getTodayKey }) {
  const areas = ["Health", "Fitness", "Work", "Money", "Relationships", "Personal"];
  const weekStart = getWeekStartDate(new Date());
  const counts = Object.fromEntries(areas.map((area) => [area, 0]));

  for (const entry of state.progressHistory ?? []) {
    const completedAt = new Date(entry.completedAt);
    if (Number.isNaN(completedAt.getTime()) || completedAt < weekStart) {
      continue;
    }

    if (counts[entry.goalArea] !== undefined) {
      counts[entry.goalArea] += 1;
    }
  }

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const strongestArea = areas.reduce((best, area) => (counts[area] > counts[best] ? area : best), areas[0]);

  return {
    counts,
    total,
    weekStart: weekStart.toISOString().slice(0, 10),
    summary:
      total === 0
        ? "No completions logged yet this week."
        : `${total} completion${total === 1 ? "" : "s"} logged this week. Strongest area: ${strongestArea}.`,
  };
}

export function buildTomorrowPlanningData({ state, isDone, inferTimingType, getRawMinutesUntilScheduledStart, getEstimatedEffort, getPriorityWeight }) {
  const tomorrowItems = getTomorrowItems(state).filter(({ item }) => !isDone(item));
  const carriedOver = tomorrowItems.filter(({ item }) => item.source === "End-of-Day Review");
  const scheduledTomorrow = tomorrowItems
    .filter(({ item }) => (item.timingType ?? inferTimingType(item)) === "scheduled")
    .sort((left, right) => getRawMinutesUntilScheduledStart(left.item) - getRawMinutesUntilScheduledStart(right.item));
  const topPriorities = tomorrowItems
    .filter(({ item }) => (item.timingType ?? inferTimingType(item)) !== "scheduled")
    .sort((left, right) => getPriorityWeight(right.item.priority) - getPriorityWeight(left.item.priority) || getEstimatedEffort(left.item) - getEstimatedEffort(right.item))
    .slice(0, 3);

  return {
    carriedOver,
    scheduledTomorrow,
    topPriorities,
  };
}

export function buildEndOfDayReviewData(context) {
  const todayKey = context.getTodayKey();
  const completed = getCompletedTodayItems(context);
  const deferred = getDeferredTodayItems(context);

  return {
    date: todayKey,
    completed,
    deferred,
    review: context.state.endOfDayReviews?.[todayKey] ?? null,
  };
}

export function completeEndOfDayReviewFromCarryoverIds(context, carryoverIds = []) {
  const { state, getTodayKey, saveState } = context;
  const todayKey = getTodayKey();
  const deferredItems = getDeferredTodayItems(context);
  const carryoverSet = new Set(carryoverIds);
  const createdCarryovers = [];

  for (const entry of deferredItems) {
    if (!carryoverSet.has(entry.key)) {
      continue;
    }

    const item = entry.item;
    const carryover = {
      id: `carryover-${Date.now()}-${createdCarryovers.length}`,
      areaId: item.areaId ?? "projects",
      title: item.title ?? item.name,
      category: item.category ?? getGoalAreaForItem(item),
      workType: item.workType ?? "none",
      timingType: "flexible",
      preferredWindow: "Tomorrow",
      dueDate: "Tomorrow",
      status: "todo",
      priority: item.priority ?? "Medium",
      estimatedEffortMinutes: Number(item.estimatedEffortMinutes ?? 15),
      source: "End-of-Day Review",
      carriedFrom: entry.key,
      createdAt: new Date().toISOString(),
    };
    state.actions.unshift(carryover);
    createdCarryovers.push(carryover.id);
  }

  state.endOfDayReviews = state.endOfDayReviews ?? {};
  state.endOfDayReviews[todayKey] = {
    completedAt: new Date().toISOString(),
    completedCount: getCompletedTodayItems(context).length,
    deferredCount: deferredItems.length,
    carryoverIds: createdCarryovers,
  };
  saveState(state);
}

export function recordGoalProgressEntry({ state, collectionName, id, item }) {
  const trackedItem = item;
  state.progressHistory = state.progressHistory ?? [];
  state.progressHistory.push({
    id: `progress-${collectionName}-${id}-${Date.now()}`,
    collection: collectionName,
    itemId: id,
    title: trackedItem?.title ?? trackedItem?.name ?? id,
    goalArea: getGoalAreaForItem(trackedItem),
    completedAt: new Date().toISOString(),
  });
  state.progressHistory = state.progressHistory.slice(-250);
}

export function getGoalAreaForItem(item = {}) {
  const raw = String(item.category ?? item.areaId ?? "").toLowerCase();
  const title = String(item.title ?? item.name ?? "").toLowerCase();

  if (raw.includes("health") || title.includes("medication") || title.includes("doctor")) {
    return "Health";
  }
  if (raw.includes("fitness") || title.includes("exercise") || title.includes("walk") || title.includes("workout")) {
    return "Fitness";
  }
  if (raw.includes("work") || raw.includes("business") || title.includes("client") || title.includes("revenue")) {
    return "Work";
  }
  if (raw.includes("money") || raw.includes("finance") || raw.includes("finances") || title.includes("bill") || title.includes("invoice")) {
    return "Money";
  }
  if (raw.includes("relationship") || raw.includes("family")) {
    return "Relationships";
  }

  return "Personal";
}

function getReviewableEntries({ state, getGeneratedRecommendations, getGeneratedGuidance, getGeneratedMorningRoutine, getGeneratedRecoverySuggestions, statusText }) {
  return [
    ...state.actions.map((item) => ({ collection: "actions", item })),
    ...state.routines.map((item) => ({ collection: "routines", item })),
    ...state.timeline.map((item) => ({ collection: "timeline", item })),
    ...state.focusSessions.map((item) => ({ collection: "focusSessions", item })),
    ...getGeneratedRecommendations().map((item) => ({ collection: "recommendations", item })),
    ...getGeneratedGuidance().map((item) => ({ collection: "guidance", item })),
    ...getGeneratedMorningRoutine().map((item) => ({ collection: "morningRoutine", item })),
    ...getGeneratedRecoverySuggestions().map((item) => ({ collection: "recoverySuggestions", item })),
  ].map((entry) => ({
    ...entry,
    key: `${entry.collection}:${entry.item.id}`,
    title: entry.item.title ?? entry.item.name,
    status: statusText(entry.item),
  }));
}

function getTomorrowItems(state) {
  return [
    ...state.actions.map((item) => ({ collection: "actions", item })),
    ...state.routines.map((item) => ({ collection: "routines", item })),
    ...state.timeline.map((item) => ({ collection: "timeline", item })),
    ...state.focusSessions.map((item) => ({ collection: "focusSessions", item })),
  ].filter(({ item }) => isTomorrowItem(item));
}

function isTomorrowItem(item) {
  return item.dueDate === "Tomorrow" || item.deadline === "Tomorrow" || item.preferredWindow === "Tomorrow";
}

function getCompletedTodayItems(context) {
  return [
    ...getReviewableEntries(context).filter(({ item }) => context.isDone(item) && isToday(item.completedAt, context.getTodayKey)),
    ...(context.state.progressHistory ?? [])
      .filter((entry) => isToday(entry.completedAt, context.getTodayKey))
      .map((entry) => ({
        collection: entry.collection,
        key: `${entry.collection}:${entry.itemId}`,
        title: entry.title,
        status: "Done",
        item: {
          id: entry.itemId,
          title: entry.title,
          category: entry.goalArea,
          completedAt: entry.completedAt,
        },
      })),
  ].filter(uniqueByKey);
}

function getDeferredTodayItems(context) {
  const learnedMisses = Object.entries(context.getLearningStats())
    .filter(([, stats]) => stats.lastMissedDate === context.getTodayKey())
    .map(([key, stats]) => {
      const [collection, id] = key.split(":");
      return {
        collection,
        key,
        title: stats.title ?? id,
        status: "Missed",
        item: context.findByCollection(collection, id) ?? {
          id,
          title: stats.title ?? id,
          category: "Personal",
          priority: "Medium",
          estimatedEffortMinutes: 15,
        },
      };
    });

  return [
    ...getReviewableEntries(context).filter(({ item }) => context.isSnoozed(item) || context.isSkipped(item)),
    ...learnedMisses,
  ].filter(uniqueByKey);
}

function uniqueByKey(entry, index, entries) {
  return entries.findIndex((candidate) => candidate.key === entry.key) === index;
}

function isToday(value, getTodayKey) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === getTodayKey();
}

function getWeekStartDate(date) {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  const daysSinceMonday = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);
  return weekStart;
}
