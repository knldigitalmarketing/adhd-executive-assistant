export const ADHD_TIP_LIBRARY = [
  {
    id: "time-buffer",
    category: "Time Blindness",
    text: "Add a 10-minute leaving buffer before anything scheduled. The buffer is part of the task.",
    rulesets: ["time_blindness_support"],
    contexts: ["working", "briefing"],
    timeOfDay: ["morning", "afternoon"],
  },
  {
    id: "time-visible-now",
    category: "Time Blindness",
    text: "Make the next time anchor visible before starting: clock, timer, or the COMING UP item.",
    rulesets: ["time_blindness_support"],
    contexts: ["working"],
  },
  {
    id: "transition-one-step",
    category: "Time Blindness",
    text: "For a transition, name only the first physical move: stand up, close the tab, or put shoes on.",
    rulesets: ["time_blindness_support"],
    contexts: ["working"],
    missed: true,
  },
  {
    id: "starter-step",
    category: "Task Initiation",
    text: "Shrink the task until it can start in two minutes. Starting counts.",
    rulesets: ["one_next_action", "decision_fatigue_reduction"],
    contexts: ["working", "briefing"],
    overwhelm: true,
  },
  {
    id: "open-the-place",
    category: "Task Initiation",
    text: "Open the place where the work happens before deciding how much to do.",
    rulesets: ["one_next_action"],
    contexts: ["working"],
  },
  {
    id: "body-first",
    category: "Task Initiation",
    text: "Move your body first, then negotiate with the task. Momentum is allowed to be tiny.",
    rulesets: ["short_movement_blocks"],
    contexts: ["working", "briefing"],
  },
  {
    id: "one-choice",
    category: "Decision Paralysis",
    text: "Do not compare options right now. Use the selected NOW item as the decision.",
    rulesets: ["decision_paralysis_support", "one_next_action"],
    contexts: ["working"],
  },
  {
    id: "good-enough-pass",
    category: "Decision Paralysis",
    text: "Make a good-enough first pass. Polishing is a separate future task.",
    rulesets: ["decision_paralysis_support"],
    contexts: ["working"],
    overwhelm: true,
  },
  {
    id: "default-option",
    category: "Decision Paralysis",
    text: "When stuck, use the default option that keeps the day moving.",
    rulesets: ["decision_fatigue_reduction"],
    contexts: ["briefing", "working"],
  },
  {
    id: "capture-not-sort",
    category: "Organization",
    text: "Capture loose thoughts in one place. Sorting can wait.",
    rulesets: ["memory_backup"],
    contexts: ["briefing", "dashboard"],
    overwhelm: true,
  },
  {
    id: "reset-surface",
    category: "Organization",
    text: "Clear one small surface before starting. Do not reorganize the whole room.",
    rulesets: ["decision_fatigue_reduction"],
    contexts: ["working"],
  },
  {
    id: "visible-home",
    category: "Organization",
    text: "Give the item a visible home if you need it again today.",
    rulesets: ["memory_backup"],
    contexts: ["briefing"],
    missed: true,
  },
  {
    id: "motivation-after",
    category: "Motivation",
    text: "Motivation can arrive after the first action. Start before it feels convincing.",
    rulesets: ["one_next_action"],
    contexts: ["working"],
    overwhelm: true,
  },
  {
    id: "reward-small",
    category: "Motivation",
    text: "Pair the task with a tiny finish reward: stretch, drink, music, or a clean checkmark.",
    rulesets: ["gentle_escalation"],
    contexts: ["working", "briefing"],
  },
  {
    id: "protect-win",
    category: "Motivation",
    text: "Protect one small win today. A small completed item beats a perfect plan.",
    rulesets: ["decision_fatigue_reduction"],
    contexts: ["briefing"],
  },
  {
    id: "name-the-state",
    category: "Emotional Regulation",
    text: "Name the state before solving it: rushed, stuck, tired, irritated, or overloaded.",
    rulesets: ["gentle_escalation"],
    contexts: ["working", "briefing"],
    overwhelm: true,
  },
  {
    id: "lower-friction",
    category: "Emotional Regulation",
    text: "Lower the friction instead of raising pressure. Smaller is still forward.",
    rulesets: ["gentle_escalation"],
    contexts: ["working"],
    missed: true,
  },
  {
    id: "pause-breath",
    category: "Emotional Regulation",
    text: "Take one slow breath, then choose the next visible action. No full reset required.",
    rulesets: ["gentle_escalation"],
    contexts: ["working"],
    overwhelm: true,
  },
  {
    id: "sleep-evening-anchor",
    category: "Sleep",
    text: "Pick the first bedtime cue early: dim lights, meds, charger, or clothes for tomorrow.",
    rulesets: ["time_blindness_support"],
    contexts: ["briefing", "working"],
    timeOfDay: ["evening"],
  },
  {
    id: "sleep-tomorrow-setup",
    category: "Sleep",
    text: "Set up tomorrow before energy drops: one outfit, one water, one visible first task.",
    rulesets: ["memory_backup"],
    contexts: ["briefing"],
    timeOfDay: ["evening"],
  },
  {
    id: "sleep-no-new-project",
    category: "Sleep",
    text: "If it is late, do not open a new project. Capture it and protect shutdown.",
    rulesets: ["decision_fatigue_reduction"],
    contexts: ["working"],
    timeOfDay: ["evening"],
  },
  {
    id: "fitness-five-minutes",
    category: "Fitness",
    text: "Five minutes of movement is a valid block. Do not wait for the perfect workout window.",
    rulesets: ["short_movement_blocks"],
    contexts: ["briefing", "working"],
  },
  {
    id: "fitness-shoes",
    category: "Fitness",
    text: "Put shoes or workout clothes in sight. Reduce the start cost before motivation is needed.",
    rulesets: ["short_movement_blocks"],
    contexts: ["briefing"],
    timeOfDay: ["morning"],
  },
  {
    id: "fitness-transition",
    category: "Fitness",
    text: "Use movement as a transition reset between tasks, even if it is just standing and stretching.",
    rulesets: ["short_movement_blocks"],
    contexts: ["working"],
    missed: true,
  },
];

const CATEGORY_RULESETS = {
  "Time Blindness": ["time_blindness_support"],
  "Task Initiation": ["one_next_action", "decision_fatigue_reduction"],
  "Decision Paralysis": ["decision_paralysis_support", "decision_fatigue_reduction", "one_next_action"],
  Organization: ["memory_backup"],
  Motivation: ["gentle_escalation", "one_next_action"],
  "Emotional Regulation": ["gentle_escalation"],
  Sleep: ["time_blindness_support", "memory_backup"],
  Fitness: ["short_movement_blocks"],
};

export function getTipCategories() {
  return ["Time Blindness", "Task Initiation", "Decision Paralysis", "Organization", "Motivation", "Emotional Regulation", "Sleep", "Fitness"];
}

export function getTipById(id, context) {
  const tip = ADHD_TIP_LIBRARY.find((item) => item.id === id);
  if (!tip) {
    return null;
  }

  return {
    ...tip,
    reason: getTipReason(tip, context),
  };
}

export function selectAdhdTip(context) {
  const scored = ADHD_TIP_LIBRARY.map((tip, index) => ({
    tip,
    score: scoreTip(tip, context),
    index,
  }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const recent = new Set(context.recentTipIds ?? []);
  const fresh = scored.find(({ tip }) => !recent.has(tip.id));
  const selected = fresh ?? scored[0] ?? { tip: ADHD_TIP_LIBRARY[0], score: 1 };

  return {
    ...selected.tip,
    reason: getTipReason(selected.tip, context),
  };
}

export function recordTipShown(state, contextName, tip) {
  state.tipState = ensureTipState(state.tipState);
  const todayKey = new Date().toISOString().slice(0, 10);
  const last = state.tipState.lastShownByContext?.[contextName];

  if (last?.tipId === tip.id && last?.date === todayKey) {
    return false;
  }

  state.tipState.lastShownByContext = {
    ...state.tipState.lastShownByContext,
    [contextName]: {
      tipId: tip.id,
      date: todayKey,
      shownAt: new Date().toISOString(),
    },
  };
  state.tipState.recentTipIds = [tip.id, ...state.tipState.recentTipIds.filter((id) => id !== tip.id)].slice(0, 8);
  return true;
}

export function ensureTipState(tipState = {}) {
  return {
    recentTipIds: Array.isArray(tipState.recentTipIds) ? tipState.recentTipIds : [],
    lastShownByContext: tipState.lastShownByContext ?? {},
  };
}

function scoreTip(tip, context) {
  let score = 1;
  const activeRulesets = new Set(context.activeRulesets ?? []);

  for (const ruleset of tip.rulesets ?? []) {
    if (activeRulesets.has(ruleset)) {
      score += 20;
    }
  }

  for (const ruleset of CATEGORY_RULESETS[tip.category] ?? []) {
    if (activeRulesets.has(ruleset)) {
      score += 8;
    }
  }

  if (tip.contexts?.includes(context.contextName)) {
    score += 12;
  }
  if (tip.timeOfDay?.includes(context.dayPart)) {
    score += 10;
  }
  if (tip.missed && context.hasMissedTasks) {
    score += 14;
  }
  if (tip.overwhelm && context.hasOverwhelm) {
    score += 14;
  }
  if (context.contextName === "working" && ["Task Initiation", "Decision Paralysis", "Time Blindness"].includes(tip.category)) {
    score += 6;
  }
  if (context.contextName === "briefing" && ["Organization", "Motivation", "Fitness"].includes(tip.category)) {
    score += 5;
  }
  if (context.hasSnoozedItems && ["Task Initiation", "Emotional Regulation"].includes(tip.category)) {
    score += 5;
  }
  if ((context.recentTipIds ?? []).includes(tip.id)) {
    score -= 35;
  }

  return score;
}

function getTipReason(tip, context) {
  if (tip.missed && context.hasMissedTasks) {
    return "Selected because missed or deferred items are visible.";
  }
  if (tip.overwhelm && context.hasOverwhelm) {
    return "Selected because the current profile points to overwhelm support.";
  }
  if (tip.timeOfDay?.includes(context.dayPart)) {
    return `Selected for ${context.dayPart} support.`;
  }
  if (tip.contexts?.includes("working") && context.contextName === "working") {
    return "Selected for Working Mode.";
  }
  return "Selected from active profile rulesets.";
}
