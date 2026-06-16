const DEFAULT_MEDICATION_CATEGORY = "Health";
const REFILL_WARNING_DAYS = 7;

export function ensureMedicationState(state) {
  state.medications = Array.isArray(state.medications) ? state.medications : [];
  state.medicationState = state.medicationState ?? {};
}

export function getMedicationTrackingData(state) {
  ensureMedicationState(state);
  const activeMedications = state.medications.filter((item) => item.active !== false);
  const refillItems = buildMedicationRefillItems({ state });

  return {
    medications: activeMedications,
    refillItems,
    upcomingRefills: activeMedications
      .filter((item) => item.refillDate)
      .map((item) => ({ ...item, daysUntilRefill: getDaysUntilDate(item.refillDate) }))
      .sort((left, right) => Number(left.daysUntilRefill ?? 999) - Number(right.daysUntilRefill ?? 999)),
  };
}

export function saveMedicationGroup(state, formData) {
  ensureMedicationState(state);
  const groupName = String(formData.get("medicationGroupName") ?? "").trim() || "Take morning meds";
  const schedule = String(formData.get("medicationSchedule") ?? "morning");
  const refillDate = String(formData.get("medicationRefillDate") ?? "").trim();
  const names = parseMedicationNames(String(formData.get("medicationNames") ?? ""));
  const createdMedications = [];

  for (const name of names) {
    const existing = state.medications.find((item) => normalizeKey(item.name) === normalizeKey(name));
    if (existing) {
      existing.schedule = schedule;
      existing.refillDate = refillDate || existing.refillDate || "";
      existing.updatedAt = new Date().toISOString();
      createdMedications.push(existing);
      ensureMedicationHabit(state, existing);
      continue;
    }

    const medication = {
      id: `medication-${Date.now()}-${createdMedications.length}`,
      name,
      schedule,
      refillDate,
      dose: "",
      prescriber: "",
      pharmacy: "",
      notes: "",
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.medications.unshift(medication);
    createdMedications.push(medication);
    ensureMedicationHabit(state, medication);
  }

  return {
    groupName,
    createdMedications,
    routineStepLine: `${groupName} - ${Math.max(2, names.length * 1)}`,
  };
}

export function updateMedicationDetails(state, formData) {
  ensureMedicationState(state);
  const id = String(formData.get("medicationId") ?? "").trim();
  const medication = state.medications.find((item) => item.id === id);
  if (!medication) {
    return null;
  }

  const previousRefillDate = medication.refillDate;
  medication.dose = String(formData.get("medicationDose") ?? "").trim();
  medication.prescriber = String(formData.get("medicationPrescriber") ?? "").trim();
  medication.pharmacy = String(formData.get("medicationPharmacy") ?? "").trim();
  medication.refillDate = String(formData.get("medicationRefillDate") ?? "").trim();
  medication.notes = String(formData.get("medicationNotes") ?? "").trim();
  medication.updatedAt = new Date().toISOString();
  if (previousRefillDate !== medication.refillDate) {
    delete state.medicationState[getMedicationRefillId(id)];
  }
  return medication;
}

export function buildMedicationRefillItems({ state }) {
  ensureMedicationState(state);
  const today = startOfDay(new Date());

  return state.medications
    .filter((item) => item.active !== false && item.refillDate)
    .map((item) => {
      const daysUntilRefill = getDaysUntilDate(item.refillDate, today);
      const savedState = state.medicationState[getMedicationRefillId(item.id)] ?? {};
      return {
        id: getMedicationRefillId(item.id),
        medicationId: item.id,
        areaId: "health",
        category: DEFAULT_MEDICATION_CATEGORY,
        workType: "none",
        type: "Medication Refill",
        source: "Medication Tracking",
        title: `Refill ${item.name}`,
        priority: daysUntilRefill <= 2 ? "High" : "Medium",
        estimatedEffortMinutes: 10,
        timingType: "deadline",
        dueDate: item.refillDate,
        deadline: item.refillDate,
        reason: daysUntilRefill <= 0 ? "Refill date has arrived" : `Refill coming up in ${daysUntilRefill} day${daysUntilRefill === 1 ? "" : "s"}`,
        ...savedState,
      };
    })
    .filter((item) => getDaysUntilDate(item.deadline, today) <= REFILL_WARNING_DAYS);
}

export function setMedicationItemState(state, id, values) {
  ensureMedicationState(state);
  state.medicationState[id] = {
    ...state.medicationState[id],
    ...values,
  };
}

function ensureMedicationHabit(state, medication) {
  state.habits = Array.isArray(state.habits) ? state.habits : [];
  const habitName = `Take ${medication.name}`;
  const existingHabit = state.habits.find((habit) => habit.medicationId === medication.id || normalizeKey(habit.name) === normalizeKey(habitName));
  if (existingHabit) {
    existingHabit.medicationId = medication.id;
    existingHabit.category = DEFAULT_MEDICATION_CATEGORY;
    existingHabit.frequencyType = "daily";
    existingHabit.dailyTargetCount = 1;
    existingHabit.hideFromNow = true;
    existingHabit.updatedAt = new Date().toISOString();
    return existingHabit;
  }

  const habit = {
    id: `habit-medication-${medication.id}`,
    medicationId: medication.id,
    name: habitName,
    category: DEFAULT_MEDICATION_CATEGORY,
    frequencyType: "daily",
    targetDays: [],
    dailyTargetCount: 1,
    weeklyTargetCount: 1,
    active: true,
    hideFromNow: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.habits.unshift(habit);
  return habit;
}

function parseMedicationNames(value) {
  return [...new Set(value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean))];
}

function getMedicationRefillId(medicationId) {
  return `medication-refill-${medicationId}`;
}

function getDaysUntilDate(dateValue, today = startOfDay(new Date())) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return 999;
  }
  return Math.ceil((startOfDay(date).getTime() - today.getTime()) / 86400000);
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function normalizeKey(value) {
  return String(value ?? "").trim().toLowerCase();
}
