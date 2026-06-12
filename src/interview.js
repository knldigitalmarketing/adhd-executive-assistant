export const interviewQuestions = [
  {
    id: "adhd-primary",
    category: "adhd",
    field: "busyFailureMode",
    prompt: "When life gets busy, what tends to go wrong first?",
    options: [
      { value: "forget", label: "I forget things", rulesets: ["memory_backup", "visible_obligations"] },
      { value: "procrastinate", label: "I procrastinate", rulesets: ["procrastination_breakdown", "starter_steps"] },
      { value: "overwhelmed", label: "I get overwhelmed", rulesets: ["overwhelm_protection", "priority_compression"] },
      { value: "time", label: "I lose track of time", rulesets: ["time_blindness_support", "transition_warnings"] },
    ],
  },
  {
    id: "adhd-support",
    category: "adhd",
    field: "supportNeeded",
    prompt: "What should I help with most?",
    options: [
      { value: "start", label: "Starting tasks", rulesets: ["procrastination_breakdown", "starter_steps"] },
      { value: "stop", label: "Stopping or switching tasks", rulesets: ["task_switching_support", "transition_warnings"] },
      { value: "remember", label: "Remembering tasks", rulesets: ["memory_backup", "recurring_checkins"] },
      { value: "choose", label: "Choosing what matters", rulesets: ["one_next_action", "decision_fatigue_reduction"] },
    ],
  },
  {
    id: "fitness-primary",
    category: "fitness",
    field: "wantsSupport",
    prompt: "Do you want help staying consistent with movement or exercise?",
    options: [
      { value: "yes", label: "Yes", rulesets: ["movement_routine"] },
      { value: "no", label: "Not right now", rulesets: [] },
    ],
  },
  {
    id: "fitness-barrier",
    category: "fitness",
    field: "barrier",
    prompt: "What usually gets in the way of movement?",
    onlyIf: { field: "wantsSupport", value: "yes" },
    options: [
      { value: "energy", label: "Energy", rulesets: ["energy_aware_movement"] },
      { value: "time", label: "Time", rulesets: ["short_movement_blocks"] },
      { value: "pain", label: "Pain or recovery", rulesets: ["recovery_awareness"] },
      { value: "forget", label: "Forgetting", rulesets: ["movement_reminders"] },
    ],
  },
  {
    id: "health-primary",
    category: "health",
    field: "wantsSupport",
    prompt: "Are there health routines or medical responsibilities you want me to keep visible?",
    options: [
      { value: "yes", label: "Yes", rulesets: ["health_visibility"] },
      { value: "no", label: "Not right now", rulesets: [] },
    ],
  },
  {
    id: "health-track",
    category: "health",
    field: "trackFirst",
    prompt: "What health item should I track first?",
    onlyIf: { field: "wantsSupport", value: "yes" },
    options: [
      { value: "medications", label: "Medications", rulesets: ["medication_visibility"] },
      { value: "appointments", label: "Appointments", rulesets: ["appointment_preparation"] },
      { value: "refills", label: "Refills", rulesets: ["refill_tracking"] },
      { value: "followups", label: "Provider follow-ups", rulesets: ["health_followup"] },
    ],
  },
  {
    id: "work-primary",
    category: "work",
    field: "wantsSupport",
    prompt: "Should I help protect work responsibilities?",
    options: [
      { value: "yes", label: "Yes", rulesets: ["workday_priorities"] },
      { value: "no", label: "Not right now", rulesets: [] },
    ],
  },
  {
    id: "work-help",
    category: "work",
    field: "helpFirst",
    prompt: "What work problem should I help with first?",
    onlyIf: { field: "wantsSupport", value: "yes" },
    options: [
      { value: "deadlines", label: "Deadlines", rulesets: ["deadline_visibility"] },
      { value: "focus", label: "Focus time", rulesets: ["deep_work_blocks"] },
      { value: "messages", label: "Messages", rulesets: ["communication_followup"] },
      { value: "priorities", label: "Unclear priorities", rulesets: ["priority_compression"] },
    ],
  },
  {
    id: "money-primary",
    category: "money",
    field: "wantsSupport",
    prompt: "Should I help keep bills, renewals, and money obligations from sneaking up?",
    options: [
      { value: "yes", label: "Yes", rulesets: ["bill_visibility"] },
      { value: "no", label: "Not right now", rulesets: [] },
    ],
  },
  {
    id: "money-track",
    category: "money",
    field: "trackFirst",
    prompt: "What money item should I track first?",
    onlyIf: { field: "wantsSupport", value: "yes" },
    options: [
      { value: "bills", label: "Bills", rulesets: ["bill_visibility", "due_date_escalation"] },
      { value: "insurance", label: "Insurance renewals", rulesets: ["renewal_tracking"] },
      { value: "subscriptions", label: "Subscriptions", rulesets: ["subscription_review"] },
      { value: "income", label: "Income timing", rulesets: ["cashflow_awareness"] },
    ],
  },
  {
    id: "relationships-primary",
    category: "relationships",
    field: "wantsSupport",
    prompt: "Do you want help remembering people, follow-ups, or important dates?",
    options: [
      { value: "yes", label: "Yes", rulesets: ["important_people_visibility"] },
      { value: "no", label: "Not right now", rulesets: [] },
    ],
  },
  {
    id: "relationships-miss",
    category: "relationships",
    field: "missedMost",
    prompt: "What relationship item do you most often miss?",
    onlyIf: { field: "wantsSupport", value: "yes" },
    options: [
      { value: "replies", label: "Replies", rulesets: ["followup_prompts"] },
      { value: "plans", label: "Plans or dates", rulesets: ["event_and_date_memory"] },
      { value: "checkins", label: "Check-ins", rulesets: ["recurring_connection_prompts"] },
      { value: "repair", label: "Emotional follow-through", rulesets: ["gentle_relationship_repair"] },
    ],
  },
];

export const coreRulesets = [
  "one_next_action",
  "decision_fatigue_reduction",
  "memory_backup",
  "progressive_profile",
  "gentle_escalation",
];

export const interviewCategories = ["adhd", "fitness", "health", "work", "money", "relationships"];

export function getVisibleQuestions(profile) {
  return interviewQuestions.filter((question) => shouldShowQuestion(question, profile));
}

export function getQuestionById(questionId) {
  return interviewQuestions.find((question) => question.id === questionId);
}

export function getNextQuestionId(profile, currentQuestionId) {
  const visibleQuestions = getVisibleQuestions(profile);
  const currentIndex = visibleQuestions.findIndex((question) => question.id === currentQuestionId);
  return visibleQuestions[currentIndex + 1]?.id ?? null;
}

export function getFirstUnansweredQuestionId(profile) {
  return getVisibleQuestions(profile).find((question) => !profile[question.category]?.[question.field])?.id ?? null;
}

export function buildProfileWithRulesets(profile) {
  const nextProfile = ensureProfileShape(profile);
  const activeRulesets = new Set(coreRulesets);

  for (const question of getVisibleQuestions(nextProfile)) {
    const answer = nextProfile[question.category]?.[question.field];
    const option = question.options.find((item) => item.value === answer);
    for (const ruleset of option?.rulesets ?? []) {
      activeRulesets.add(ruleset);
    }
  }

  return {
    ...nextProfile,
    activeRulesets: [...activeRulesets],
  };
}

export function pruneHiddenAnswers(profile) {
  const nextProfile = ensureProfileShape(profile);
  const visibleQuestionIds = new Set(getVisibleQuestions(nextProfile).map((question) => question.id));

  for (const question of interviewQuestions) {
    if (!visibleQuestionIds.has(question.id)) {
      delete nextProfile[question.category][question.field];
    }
  }

  return nextProfile;
}

export function ensureProfileShape(profile = {}) {
  return {
    adhd: profile.adhd ?? {},
    fitness: profile.fitness ?? {},
    health: profile.health ?? {},
    work: profile.work ?? {},
    money: profile.money ?? {},
    relationships: profile.relationships ?? {},
    activeRulesets: profile.activeRulesets ?? [...coreRulesets],
  };
}

function shouldShowQuestion(question, profile) {
  if (!question.onlyIf) {
    return true;
  }

  return profile[question.category]?.[question.onlyIf.field] === question.onlyIf.value;
}
