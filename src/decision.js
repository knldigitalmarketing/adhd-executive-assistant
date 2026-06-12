export function scoreActionableCandidate(context, candidate) {
  const reasons = [];
  const ruleEffects = [];
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

  const rulesetScore = applyRulesetEffects(context, item, ruleEffects);
  score += rulesetScore;

  const adaptiveEffect = context.getAdaptiveEffect(candidate.collection, item);
  score += adaptiveEffect.score;

  return {
    ...candidate,
    title: item.title ?? item.name,
    areaId: item.areaId,
    effort,
    score,
    reasons,
    ruleEffects,
    why: context.formatWhy(reasons, [...ruleEffects, ...adaptiveEffect.reasons]),
    isSkipped: skipped,
  };
}

function applyRulesetEffects(context, item, ruleEffects) {
  const activeRulesets = new Set(context.state.interviewProfile?.activeRulesets ?? []);
  let score = 0;

  if (activeRulesets.has("time_blindness_support") && (item.timingType ?? context.inferTimingType(item)) === "scheduled") {
    const minutesUntilStart = context.getRawMinutesUntilScheduledStart(item);
    if (minutesUntilStart <= 15) {
      score += 40;
      ruleEffects.push("Time Blindness Support boost");
    } else if (minutesUntilStart <= 30) {
      score += 20;
      ruleEffects.push("Time Blindness Support boost");
    }
  }

  if (activeRulesets.has("decision_paralysis_support")) {
    const effort = context.getEstimatedEffort(item);
    if (effort <= 15) {
      score += 10;
      ruleEffects.push("Decision Paralysis Support favors the simplest action");
    } else if (effort > 30) {
      score -= 10;
      ruleEffects.push("Decision Paralysis Support lowers complex actions");
    }
  }

  if (activeRulesets.has("short_movement_blocks") && context.isMovementTask(item)) {
    score += 10;
    ruleEffects.push("Short Movement Blocks boost");
  }

  if (activeRulesets.has("self_employed")) {
    if (item.category === "Work" && item.workType === "revenue") {
      score += 15;
      ruleEffects.push("Self-employed revenue boost");
    }
    if (item.category === "Work" && (item.workType === "admin" || item.workType === "administrative")) {
      score -= 5;
      ruleEffects.push("Self-employed admin penalty");
    }
  }

  return score;
}
