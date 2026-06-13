export function scoreActionableCandidate(context, candidate) {
  const reasons = [];
  const ruleEffects = [];
  const contributingRulesets = [];
  const { item } = candidate;
  let score = 0;

  if (context.isOverdue(item)) {
    score += 100;
    reasons.push("overdue");
  }

  if (context.isDueToday(item)) {
    score += 50;
    reasons.push("due today");
  }

  if (item.type === "Recommendation") {
    reasons.push(item.reason ?? "profile recommendation");
  }

  if (item.type === "Guidance") {
    reasons.push(item.reason ?? "ruleset guidance");
  }

  if (item.type === "Morning Routine") {
    reasons.push(item.reason ?? "morning routine");
  }

  if (item.type === "Recovery Suggestion") {
    reasons.push(item.reason ?? "recovery suggestion");
    reasons.push(item.recoveryAction ?? "try a smaller recovery step");
  }

  if (item.type === "Recurring Task") {
    reasons.push(item.reason ?? "recurring task due");
  }

  const deadlineUrgency = context.getDeadlineUrgencyScore(item);
  if (deadlineUrgency > 0) {
    score += deadlineUrgency;
    reasons.push("deadline approaching");
  }

  if (item.priority === "High") {
    score += 25;
    reasons.push("high priority");
  }

  if (item.priority === "High" && context.isHealthTask(item)) {
    score += 5;
    reasons.push("health importance boost");
  }

  if (item.priority === "Medium") {
    score += 10;
    reasons.push("medium priority");
  }

  const effort = context.getEstimatedEffort(item);
  if (effort <= 15) {
    score += 15;
    reasons.push("quick to finish");
  } else if (effort <= 30) {
    score += 10;
    reasons.push("manageable effort");
  }

  if (context.isSnoozed(item)) {
    score -= 20;
    reasons.push("currently snoozed");
  }

  const skipped = context.isSkipped(item);
  if (skipped) {
    score -= 30;
    reasons.push("recently skipped");
  }

  const rulesetScore = applyRulesetEffects(context, item, ruleEffects, contributingRulesets);
  score += rulesetScore;

  const adaptiveEffect = context.getAdaptiveEffect(candidate.collection, item);
  score += adaptiveEffect.score;
  const goalInfluence = context.getGoalInfluence(item);
  score += goalInfluence.score;
  const habitInfluence = context.getHabitInfluence(item);
  score += habitInfluence.score;
  const why = context.formatWhy(reasons, [...ruleEffects, ...adaptiveEffect.reasons, ...goalInfluence.reasons, ...habitInfluence.reasons]);

  return {
    ...candidate,
    title: item.title ?? item.name,
    areaId: item.areaId,
    effort,
    score,
    reasons,
    ruleEffects,
    contributingRulesets,
    goalInfluence,
    habitInfluence,
    explanation: buildRecommendationExplanation(context, candidate, item, reasons, ruleEffects, [...adaptiveEffect.reasons, ...goalInfluence.reasons, ...habitInfluence.reasons], contributingRulesets),
    why,
    isSkipped: skipped,
  };
}

function applyRulesetEffects(context, item, ruleEffects, contributingRulesets) {
  const activeRulesets = new Set(context.state.interviewProfile?.activeRulesets ?? []);
  let score = 0;

  if (activeRulesets.has("time_blindness_support") && (item.timingType ?? context.inferTimingType(item)) === "scheduled") {
    const minutesUntilStart = context.getRawMinutesUntilScheduledStart(item);
    if (minutesUntilStart <= 15) {
      score += 40;
      ruleEffects.push("Time Blindness Support boost");
      contributingRulesets.push("time_blindness_support");
    } else if (minutesUntilStart <= 30) {
      score += 20;
      ruleEffects.push("Time Blindness Support boost");
      contributingRulesets.push("time_blindness_support");
    }
  }

  if (activeRulesets.has("decision_paralysis_support")) {
    const effort = context.getEstimatedEffort(item);
    if (effort <= 15) {
      score += 10;
      ruleEffects.push("Decision Paralysis Support favors the simplest action");
      contributingRulesets.push("decision_paralysis_support");
    } else if (effort > 30) {
      score -= 10;
      ruleEffects.push("Decision Paralysis Support lowers complex actions");
      contributingRulesets.push("decision_paralysis_support");
    }
  }

  if (activeRulesets.has("short_movement_blocks") && context.isMovementTask(item)) {
    score += 10;
    ruleEffects.push("Short Movement Blocks boost");
    contributingRulesets.push("short_movement_blocks");
  }

  if (activeRulesets.has("self_employed")) {
    if (item.category === "Work" && item.workType === "revenue") {
      score += 15;
      ruleEffects.push("Self-employed revenue boost");
      contributingRulesets.push("self_employed");
    }
    if (item.category === "Work" && (item.workType === "admin" || item.workType === "administrative")) {
      score -= 5;
      ruleEffects.push("Self-employed admin penalty");
      contributingRulesets.push("self_employed");
    }
  }

  return score;
}

function buildRecommendationExplanation(context, candidate, item, reasons, ruleEffects, adaptiveReasons, contributingRulesets) {
  return {
    whyThis: getWhyThis(candidate, item),
    whyNow: getWhyNow(context, item, reasons),
    rules: getRulesExplanation(contributingRulesets, ruleEffects),
    context: getContextExplanation(context, adaptiveReasons),
  };
}

function getWhyThis(candidate, item) {
  if (item.type === "Recovery Suggestion") {
    return "This helps unstick a task that has been delayed repeatedly.";
  }
  if (item.type === "Morning Routine") {
    return "This protects the first part of the day with a clear next step.";
  }
  if (item.type === "Guidance") {
    return "This supports an active profile rule without adding a new project.";
  }
  if (item.type === "Recommendation") {
    return "This is a profile-based support item that can help today go smoother.";
  }
  if (item.type === "Recurring Task") {
    return "This is a recurring responsibility that is due and ready to handle once.";
  }
  if (candidate.collection === "timeline" || candidate.collection === "focusSessions") {
    return "This is tied to today’s schedule, so it needs attention before it slips.";
  }
  return "This is the strongest available next action based on priority, timing, and effort.";
}

function getWhyNow(context, item, reasons) {
  if (context.isOverdue(item)) {
    return "It is overdue, so the assistant is surfacing it before it creates more drag.";
  }
  if ((item.timingType ?? context.inferTimingType(item)) === "scheduled") {
    const minutesUntilStart = context.getRawMinutesUntilScheduledStart(item);
    if (minutesUntilStart <= 0) {
      return "Its scheduled time has arrived.";
    }
    if (minutesUntilStart <= 15) {
      return "Its scheduled start is close.";
    }
    if (minutesUntilStart <= 30) {
      return "It is coming up soon enough to prepare now.";
    }
  }
  if (context.hasMissedTasks()) {
    return "There are missed or deferred items today, so the assistant is reducing drift.";
  }
  if (context.hasOverwhelm()) {
    return "The current profile suggests overwhelm risk, so a clear next step is better than more choices.";
  }
  if (context.getFocusStatus() === "running") {
    return "Focus Mode is active, so the assistant is keeping the next action narrow.";
  }
  if (reasons.includes("due today")) {
    return "It is due today and still open.";
  }
  if (context.getActiveMode() === "working") {
    return "Working Mode needs one clear action right now.";
  }
  return `It fits the current ${context.getDayPart()} context and visible workload.`;
}

function getRulesExplanation(contributingRulesets, ruleEffects) {
  const labels = {
    time_blindness_support: "Time Blindness Support",
    decision_paralysis_support: "Decision Paralysis Support",
    short_movement_blocks: "Short Movement Blocks",
    self_employed: "Self-employed",
  };
  const effectsByRuleset = new Map();

  contributingRulesets.forEach((ruleset, index) => {
    const label = labels[ruleset] ?? ruleset;
    if (!effectsByRuleset.has(label)) {
      effectsByRuleset.set(label, ruleEffects[index] ?? "Adjusted recommendation score");
    }
  });

  return [...effectsByRuleset.entries()].map(([name, effect]) => ({ name, effect }));
}

function getContextExplanation(context, adaptiveReasons) {
  const details = [];
  if (context.hasMissedTasks()) {
    details.push("Missed/deferred items are visible today.");
  }
  if (context.hasOverwhelm()) {
    details.push("Overwhelm support is active.");
  }
  if (context.getFocusStatus() === "running") {
    details.push("Focus Mode is running.");
  }
  details.push(...adaptiveReasons);
  return details.slice(0, 3);
}
