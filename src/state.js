import { appState as defaultState } from "./data.js";
import { clearState, loadState, saveState } from "./storage.js";

let state = loadState(defaultState);

export function getState() {
  return state;
}

export function resetLocalData() {
  clearState();
  state = loadState(defaultState);
}

export function markDone(collectionName, id) {
  const item = findByCollection(collectionName, id);
  if (!item) {
    return;
  }

  item.status = "done";
  item.completed = true;
  item.completedAt = new Date().toISOString();
  delete item.snoozedUntil;
  saveState(state);
}

export function snoozeItem(collectionName, id) {
  const item = findByCollection(collectionName, id);
  if (!item) {
    return;
  }

  item.status = "snoozed";
  item.completed = false;
  item.snoozedUntil = getSnoozeLabel();
  saveState(state);
}

export function addTask(formData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return;
  }

  const areaId = String(formData.get("areaId") ?? "projects");
  state.actions.unshift({
    id: `action-${Date.now()}`,
    areaId,
    title,
    dueDate: String(formData.get("dueDate") ?? "Today"),
    status: "todo",
    priority: String(formData.get("priority") ?? "Medium"),
    createdAt: new Date().toISOString(),
  });
  saveState(state);
}

export function getTodayStats() {
  const items = allCompletableItems();
  return {
    open: items.filter(isOpen).length,
    done: items.filter(isDone).length,
    snoozed: items.filter(isSnoozed).length,
    next: getNextItem(),
  };
}

export function getOpenTodayActions() {
  return state.actions.filter((action) => action.dueDate === "Today" && isOpen(action));
}

export function isDone(item) {
  return item.completed === true || item.status === "done" || item.status === "Done";
}

export function isSnoozed(item) {
  return item.status === "snoozed" || item.status === "Snoozed";
}

export function isOpen(item) {
  return !isDone(item) && !isSnoozed(item);
}

export function statusText(item) {
  if (isDone(item)) {
    return "Done";
  }
  if (isSnoozed(item)) {
    return item.snoozedUntil ? `Snoozed until ${item.snoozedUntil}` : "Snoozed";
  }
  return item.status && item.status !== "todo" ? titleCase(item.status) : "Open";
}

export function statusTone(item) {
  if (isDone(item)) {
    return "done";
  }
  if (isSnoozed(item)) {
    return "snooze";
  }
  return "warn";
}

function allCompletableItems() {
  return [...state.actions, ...state.routines, ...state.timeline];
}

function getNextItem() {
  return getOpenTodayActions()[0] ?? state.routines.filter(isOpen)[0] ?? state.timeline.filter(isOpen)[0] ?? null;
}

function findByCollection(collectionName, id) {
  return state[collectionName]?.find((item) => item.id === id);
}

function getSnoozeLabel() {
  const date = new Date(Date.now() + 30 * 60 * 1000);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function titleCase(value) {
  return String(value)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
