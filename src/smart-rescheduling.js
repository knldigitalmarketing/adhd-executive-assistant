const MAX_DAILY_ITEMS = 6;
const MAX_DAILY_MINUTES = 240;

export function ensureSmartReschedulingState(state) {
  state.smartReschedulingState = state.smartReschedulingState ?? {
    history: [],
    lastRunDate: null,
  };
  state.smartReschedulingState.history = Array.isArray(state.smartReschedulingState.history) ? state.smartReschedulingState.history : [];
}

export function runSmartRescheduling(context) {
  const { state, getTodayKey } = context;
  ensureSmartReschedulingState(state);
  const todayKey = getTodayKey();
  const moved = [];
  const load = getDailyLoad(context);
  const conflicts = detectSchedulingConflicts(context);

  for (const task of state.actions ?? []) {
    if (!shouldRescheduleTask(context, task)) {
      continue;
    }

    const existingMove = getMoveForToday(state, task.id, todayKey);
    if (existingMove) {
      moved.push(existingMove);
      continue;
    }

    const targetDay = chooseTargetDay(context, task, load);
    const from = task.dueDate ?? task.deadline ?? task.preferredWindow ?? "Unscheduled";
    const explanation = buildRescheduleExplanation(task, from, targetDay);
    const entry = {
      id: `smart-reschedule-${task.id}-${todayKey}`,
      itemId: task.id,
      title: task.title ?? task.name,
      from,
      to: targetDay,
      reason: explanation,
      createdAt: new Date().toISOString(),
    };

    applyReschedule(task, targetDay, explanation);
    state.smartReschedulingState.history.push(entry);
    moved.push(entry);
    addToLoad(load, targetDay, task);
  }

  state.smartReschedulingState.history = state.smartReschedulingState.history.slice(-120);
  state.smartReschedulingState.lastRunDate = todayKey;
  const todaysMoves = state.smartReschedulingState.history.filter((entry) => entry.id.endsWith(todayKey));
  const reportedMoves = uniqueById([...moved, ...todaysMoves]);

  return {
    moved: reportedMoves,
    conflicts,
    load,
    suggestions: buildReschedulingSuggestions(reportedMoves, conflicts, load),
  };
}

export function getSmartReschedulingData(context) {
  ensureSmartReschedulingState(context.state);
  const todayKey = context.getTodayKey();
  return {
    moved: context.state.smartReschedulingState.history.filter((entry) => entry.id.endsWith(todayKey)).slice(-5),
    conflicts: detectSchedulingConflicts(context),
    load: getDailyLoad(context),
    suggestions: buildReschedulingSuggestions([], detectSchedulingConflicts(context), getDailyLoad(context)),
  };
}

function shouldRescheduleTask(context, task) {
  if (!task || context.isDone(task) || context.isSnoozed(task) || context.isSkipped(task)) {
    return false;
  }
  if ((task.timingType ?? context.inferTimingType(task)) === "scheduled") {
    return false;
  }
  if (task.rescheduledBySmartEngine === context.getTodayKey()) {
    return false;
  }
  return isOverdueTask(task) || isMissedTask(context, task);
}

function chooseTargetDay(context, task, load) {
  if (isHighImportance(task) && hasCapacity(load.today, task)) {
    return "Today";
  }
  if ((task.timingType ?? context.inferTimingType(task)) === "deadline" && hasCapacity(load.today, task)) {
    return "Today";
  }
  if (hasCapacity(load.tomorrow, task)) {
    return "Tomorrow";
  }
  return "This week";
}

function applyReschedule(task, targetDay, explanation) {
  task.originalDueDate = task.originalDueDate ?? task.dueDate ?? task.deadline ?? task.preferredWindow ?? null;
  task.dueDate = targetDay;
  if ((task.timingType ?? "") === "deadline") {
    task.deadline = targetDay;
  } else {
    task.preferredWindow = targetDay;
  }
  task.status = task.status === "missed" ? "todo" : task.status;
  task.rescheduledBySmartEngine = getLocalDateKey(new Date());
  task.rescheduleExplanation = explanation;
}

function buildRescheduleExplanation(task, from, targetDay) {
  if (targetDay === "Today") {
    return `Moved from ${from} to today because it is important and today still has room.`;
  }
  if (targetDay === "Tomorrow") {
    return `Moved from ${from} to tomorrow to avoid overloading today.`;
  }
  return `Kept visible this week because today and tomorrow are already full enough.`;
}

function buildReschedulingSuggestions(moved, conflicts, load) {
  const suggestions = [];
  for (const entry of moved.slice(0, 3)) {
    suggestions.push({
      id: `${entry.id}-suggestion`,
      title: entry.title,
      detail: entry.reason,
    });
  }
  for (const conflict of conflicts.slice(0, 3)) {
    suggestions.push({
      id: `${conflict.id}-suggestion`,
      title: conflict.title,
      detail: `Conflict found. Consider ${conflict.suggestedAlternative}.`,
    });
  }
  if (suggestions.length === 0 && load.today.items >= MAX_DAILY_ITEMS) {
    suggestions.push({
      id: "smart-reschedule-load",
      title: "Today is already fairly full",
      detail: "New missed items will be nudged to tomorrow when possible.",
    });
  }
  return suggestions;
}

function detectSchedulingConflicts(context) {
  const scheduled = [
    ...(context.state.actions ?? []),
    ...(context.state.timeline ?? []),
    ...(context.state.focusSessions ?? []),
    ...(context.state.routines ?? []),
  ]
    .filter((item) => !context.isDone(item))
    .filter((item) => (item.timingType ?? context.inferTimingType(item)) === "scheduled")
    .map((item) => ({
      item,
      start: parseTime(item.startTime ?? item.time),
      duration: context.getEstimatedEffort(item),
    }))
    .filter((entry) => entry.start !== null)
    .sort((left, right) => left.start - right.start);

  const conflicts = [];
  for (let index = 1; index < scheduled.length; index += 1) {
    const previous = scheduled[index - 1];
    const current = scheduled[index];
    if (current.start < previous.start + previous.duration) {
      conflicts.push({
        id: `smart-conflict-${previous.item.id}-${current.item.id}`,
        title: `${previous.item.title ?? previous.item.name} / ${current.item.title ?? current.item.name}`,
        suggestedAlternative: formatMinutesAsTime(previous.start + previous.duration + 15),
      });
    }
  }
  return conflicts;
}

function getDailyLoad(context) {
  const today = { items: 0, minutes: 0 };
  const tomorrow = { items: 0, minutes: 0 };

  for (const task of context.state.actions ?? []) {
    if (context.isDone(task)) {
      continue;
    }
    if (isForDay(task, "Today")) {
      addToLoad({ today, tomorrow }, "Today", task, context);
    }
    if (isForDay(task, "Tomorrow")) {
      addToLoad({ today, tomorrow }, "Tomorrow", task, context);
    }
  }

  for (const item of [...(context.state.routines ?? []), ...(context.state.timeline ?? []), ...(context.state.focusSessions ?? [])]) {
    if (!context.isDone(item) && isForDay(item, "Today")) {
      today.items += 1;
      today.minutes += context.getEstimatedEffort(item);
    }
  }

  return { today, tomorrow };
}

function addToLoad(load, targetDay, task, context = null) {
  const bucket = targetDay === "Today" ? load.today : load.tomorrow;
  bucket.items += 1;
  bucket.minutes += context?.getEstimatedEffort(task) ?? Number(task.estimatedEffortMinutes ?? 15);
}

function hasCapacity(bucket, task) {
  const minutes = Number(task.estimatedEffortMinutes ?? 15);
  return bucket.items < MAX_DAILY_ITEMS && bucket.minutes + minutes <= MAX_DAILY_MINUTES;
}

function getMoveForToday(state, itemId, todayKey) {
  return state.smartReschedulingState.history.find((entry) => entry.itemId === itemId && entry.id.endsWith(todayKey)) ?? null;
}

function uniqueById(items) {
  return items.filter((item, index) => items.findIndex((candidate) => candidate.id === item.id) === index);
}

function isOverdueTask(task) {
  const dueValue = task.deadline ?? task.dueDate;
  if (dueValue === "Overdue") {
    return true;
  }
  if (!dueValue || ["Today", "Tomorrow", "This week"].includes(dueValue)) {
    return false;
  }
  const dueDate = new Date(`${dueValue}T00:00:00`);
  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function isMissedTask(context, task) {
  const stats = context.learningStats?.[`actions:${task.id}`];
  return stats?.lastMissedDate === context.getTodayKey() || task.status === "missed";
}

function isHighImportance(task) {
  return task.priority === "High";
}

function isForDay(task, day) {
  return task.dueDate === day || task.deadline === day || task.preferredWindow === day || (day === "Today" && (task.startTime || task.time));
}

function parseTime(timeText) {
  const match = String(timeText ?? "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return null;
  }
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function formatMinutesAsTime(totalMinutes) {
  const safeMinutes = Math.max(0, totalMinutes % (24 * 60));
  const hours24 = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function getLocalDateKey(date) {
  const localDate = new Date(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
