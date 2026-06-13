export const MOOD_OPTIONS = ["steady", "low", "stressed", "good"];
export const ENERGY_OPTIONS = ["low", "medium", "high"];

export function ensureEnergyMoodState(state) {
  state.energyMood = state.energyMood ?? {
    checkIns: [],
  };
  state.energyMood.checkIns = Array.isArray(state.energyMood.checkIns) ? state.energyMood.checkIns : [];
}

export function recordEnergyMoodCheckIn(state, formData, now = new Date()) {
  ensureEnergyMoodState(state);
  const checkIn = {
    id: `energy-mood-${now.getTime()}-${state.energyMood.checkIns.length}`,
    mood: normalizeMood(String(formData.get("mood") ?? "steady")),
    energy: normalizeEnergy(String(formData.get("energy") ?? "medium")),
    note: String(formData.get("energyMoodNote") ?? "").trim(),
    createdAt: now.toISOString(),
    date: getDateKey(now),
  };
  state.energyMood.checkIns.push(checkIn);
  state.energyMood.checkIns = state.energyMood.checkIns.slice(-120);
  return checkIn;
}

export function getEnergyMoodData(state, now = new Date()) {
  ensureEnergyMoodState(state);
  const todayKey = getDateKey(now);
  const todaysCheckIns = state.energyMood.checkIns.filter((checkIn) => checkIn.date === todayKey);
  const latestCheckIn = todaysCheckIns.at(-1) ?? state.energyMood.checkIns.at(-1) ?? null;

  return {
    moods: MOOD_OPTIONS,
    energyLevels: ENERGY_OPTIONS,
    latestCheckIn,
    todaysCheckIns,
    summary: buildEnergyMoodSummary(latestCheckIn, todaysCheckIns),
  };
}

export function getEnergyMoodInfluenceForItem(state, item, getEstimatedEffort) {
  const current = getEnergyMoodData(state).latestCheckIn;
  if (!current) {
    return { score: 0, reasons: [] };
  }

  const effort = getEstimatedEffort(item);
  const reasons = [];
  let score = 0;

  if (current.energy === "low") {
    if (effort <= 15 || isRecoveryFriendly(item)) {
      score += 8;
      reasons.push("Low energy support favors a smaller next step");
    } else if (effort > 30) {
      score -= 8;
      reasons.push("Low energy support lowers bigger tasks for now");
    }
  }

  if (current.energy === "high" && effort > 15 && effort <= 45) {
    score += 3;
    reasons.push("Higher energy can support a fuller task");
  }

  if (current.mood === "low" || current.mood === "stressed") {
    if (isRecoveryFriendly(item) || effort <= 15) {
      score += 5;
      reasons.push("Low mood support favors recovery-friendly action");
    } else if (item.priority !== "High" && effort > 30) {
      score -= 5;
      reasons.push("Low mood support avoids a high-friction task");
    }
  }

  return { score, reasons };
}

export function getEnergyMoodContextDetails(state) {
  const current = getEnergyMoodData(state).latestCheckIn;
  if (!current) {
    return [];
  }

  const details = [`Current energy: ${current.energy}.`, `Current mood: ${current.mood}.`];
  if (current.mood === "low" || current.mood === "stressed") {
    details.push("Use gentler wording and a lower-friction next step when possible.");
  }
  return details;
}

function buildEnergyMoodSummary(latestCheckIn, todaysCheckIns) {
  if (!latestCheckIn) {
    return "No mood or energy check-in yet today.";
  }

  const count = todaysCheckIns.length;
  const note = latestCheckIn.note ? ` Note: ${latestCheckIn.note}` : "";
  return `Latest check-in: ${latestCheckIn.mood} mood, ${latestCheckIn.energy} energy. ${count} today.${note}`;
}

function isRecoveryFriendly(item) {
  const text = `${item.title ?? item.name ?? ""} ${item.type ?? ""} ${item.category ?? ""}`.toLowerCase();
  return (
    text.includes("recovery") ||
    text.includes("walk") ||
    text.includes("water") ||
    text.includes("stretch") ||
    text.includes("routine") ||
    text.includes("guidance")
  );
}

function normalizeMood(mood) {
  return MOOD_OPTIONS.includes(mood) ? mood : "steady";
}

function normalizeEnergy(energy) {
  return ENERGY_OPTIONS.includes(energy) ? energy : "medium";
}

function getDateKey(date) {
  const localDate = new Date(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
