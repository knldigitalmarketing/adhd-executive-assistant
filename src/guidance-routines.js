export function buildGeneratedMorningRoutine({ state, isDone, getDayPart }) {
  const profile = state.interviewProfile ?? {};
  const activeRulesets = new Set(profile.activeRulesets ?? []);
  const routine = [];
  const dayPart = getDayPart();

  if (dayPart !== "morning") {
    return [];
  }

  if (profile.fitness?.goal === "weight_loss" || activeRulesets.has("weight_loss_support")) {
    routine.push(createMorningRoutineItem(state, {
      id: "morning-weight-loss-water",
      title: "Drink water",
      category: "Health",
      priority: "High",
      reason: "Weight Loss morning routine",
    }));
    routine.push(createMorningRoutineItem(state, {
      id: "morning-weight-loss-walk",
      title: "Morning walk",
      category: "Fitness",
      priority: "Medium",
      reason: "Weight Loss morning routine",
    }));
  }

  if (profile.fitness?.goal === "muscle_gain" || activeRulesets.has("muscle_gain_support")) {
    routine.push(createMorningRoutineItem(state, {
      id: "morning-muscle-water",
      title: "Drink water",
      category: "Health",
      priority: "High",
      reason: "Muscle Gain morning routine",
    }));
    routine.push(createMorningRoutineItem(state, {
      id: "morning-muscle-protein",
      title: "Protein intake",
      category: "Health",
      priority: "Medium",
      reason: "Muscle Gain morning routine",
    }));
  }

  if (profile.adhd?.busyFailureMode || activeRulesets.has("time_blindness_support") || activeRulesets.has("decision_paralysis_support")) {
    routine.push(createMorningRoutineItem(state, {
      id: "morning-adhd-planning-review",
      title: "Morning planning review",
      category: "Personal",
      priority: "High",
      reason: "ADHD morning routine",
    }));
  }

  if (profile.work?.workType === "self_employed" || activeRulesets.has("self_employed")) {
    routine.push(createMorningRoutineItem(state, {
      id: "morning-self-employed-revenue",
      title: "Review revenue opportunities",
      category: "Work",
      workType: "revenue",
      priority: "High",
      reason: "Self-employed morning routine",
    }));
  }

  return routine.filter((item) => !isDone(item));
}

export function buildGeneratedGuidance({ state, isDone, getDayPart }) {
  const profile = state.interviewProfile ?? {};
  const activeRulesets = new Set(profile.activeRulesets ?? []);
  const guidance = [];
  const dayPart = getDayPart();

  if (dayPart === "morning" && (profile.adhd?.busyFailureMode || activeRulesets.has("time_blindness_support") || activeRulesets.has("decision_paralysis_support"))) {
    guidance.push(createGuidance(state, {
      id: "guide-adhd-morning-planning",
      title: "Do a quick morning plan",
      category: "Personal",
      priority: "High",
      preferredWindow: "Today",
      reason: "ADHD morning planning guidance",
    }));
  }

  if (activeRulesets.has("time_blindness_support")) {
    guidance.push(createGuidance(state, {
      id: "guide-adhd-transition",
      title: "Check the next transition",
      category: "Personal",
      priority: "Medium",
      preferredWindow: "Today",
      reason: "ADHD transition guidance",
    }));
  }

  if (profile.fitness?.goal === "weight_loss" || activeRulesets.has("weight_loss_support")) {
    guidance.push(createGuidance(state, {
      id: "guide-weight-loss-water",
      title: "Drink water early today",
      category: "Health",
      priority: "Medium",
      preferredWindow: "Today",
      reason: "Weight Loss water guidance",
    }));
    if (dayPart === "morning") {
      guidance.push(createGuidance(state, {
        id: "guide-weight-loss-walk",
        title: "Take a short morning walk",
        category: "Fitness",
        priority: "Medium",
        preferredWindow: "Today",
        reason: "Weight Loss movement guidance",
      }));
    }
  }

  if (profile.fitness?.goal === "muscle_gain" || activeRulesets.has("muscle_gain_support")) {
    guidance.push(createGuidance(state, {
      id: "guide-muscle-protein",
      title: "Plan protein with your next meal",
      category: "Health",
      priority: "Medium",
      preferredWindow: "Today",
      reason: "Muscle Gain protein guidance",
    }));
    guidance.push(createGuidance(state, {
      id: "guide-muscle-recovery",
      title: "Check recovery before training",
      category: "Fitness",
      priority: "Medium",
      preferredWindow: "Today",
      reason: "Muscle Gain recovery guidance",
    }));
  }

  if (profile.work?.workType === "self_employed" || activeRulesets.has("self_employed")) {
    guidance.push(createGuidance(state, {
      id: "guide-self-employed-revenue",
      title: "Review revenue-producing work",
      category: "Work",
      workType: "revenue",
      priority: "High",
      preferredWindow: "Today",
      reason: "Self-employed revenue guidance",
    }));
    guidance.push(createGuidance(state, {
      id: "guide-self-employed-followup",
      title: "Pick one follow-up to send",
      category: "Work",
      workType: "follow_up",
      priority: "Medium",
      preferredWindow: "Today",
      reason: "Self-employed follow-up guidance",
    }));
  }

  return guidance.filter((item) => !isDone(item));
}

export function buildGeneratedRecommendations({ state, isDone }) {
  const profile = state.interviewProfile ?? {};
  const activeRulesets = new Set(profile.activeRulesets ?? []);
  const recommendations = [];

  if (profile.fitness?.goal === "weight_loss" || activeRulesets.has("weight_loss_support")) {
    recommendations.push(createRecommendation(state, {
      id: "rec-weight-loss-water",
      title: "Drink water this morning",
      category: "Health",
      priority: "Medium",
      timingType: "flexible",
      preferredWindow: "Today",
      dueDate: "Today",
      reason: "Weight Loss support",
    }));
    recommendations.push(createRecommendation(state, {
      id: "rec-weight-loss-walk",
      title: "Take a short morning walk",
      category: "Fitness",
      priority: "Medium",
      timingType: "flexible",
      preferredWindow: "Today",
      dueDate: "Today",
      reason: "Weight Loss support",
    }));
  }

  if (profile.fitness?.goal === "muscle_gain" || activeRulesets.has("muscle_gain_support")) {
    recommendations.push(createRecommendation(state, {
      id: "rec-muscle-protein",
      title: "Plan protein with your next meal",
      category: "Health",
      priority: "Medium",
      timingType: "flexible",
      preferredWindow: "Today",
      dueDate: "Today",
      reason: "Muscle Gain support",
    }));
  }

  if (profile.adhd?.busyFailureMode || activeRulesets.has("time_blindness_support") || activeRulesets.has("decision_paralysis_support")) {
    recommendations.push(createRecommendation(state, {
      id: "rec-adhd-morning-plan",
      title: "Review the day before starting",
      category: "Personal",
      priority: "High",
      timingType: "flexible",
      preferredWindow: "Today",
      dueDate: "Today",
      reason: "ADHD support",
    }));
  }

  if (profile.work?.workType === "self_employed" || activeRulesets.has("self_employed")) {
    recommendations.push(createRecommendation(state, {
      id: "rec-self-employed-revenue-review",
      title: "Review one revenue-producing task",
      category: "Work",
      workType: "revenue",
      priority: "High",
      timingType: "flexible",
      preferredWindow: "Today",
      dueDate: "Today",
      reason: "Self-employed support",
    }));
  }

  return recommendations.filter((item) => !isDone(item));
}

function createRecommendation(state, baseRecommendation) {
  const savedState = state.recommendationState?.[baseRecommendation.id] ?? {};
  return {
    areaId: "recommendations",
    estimatedEffortMinutes: 10,
    type: "Recommendation",
    source: "Profile",
    workType: "none",
    ...baseRecommendation,
    ...savedState,
  };
}

function createGuidance(state, baseGuidance) {
  const savedState = state.guidanceState?.[baseGuidance.id] ?? {};
  return {
    areaId: "guidance",
    estimatedEffortMinutes: 10,
    type: "Guidance",
    source: "Ruleset",
    timingType: "flexible",
    dueDate: "Today",
    workType: "none",
    ...baseGuidance,
    ...savedState,
  };
}

function createMorningRoutineItem(state, baseRoutine) {
  const savedState = state.morningRoutineState?.[baseRoutine.id] ?? {};
  return {
    areaId: "morningRoutine",
    estimatedEffortMinutes: 10,
    type: "Morning Routine",
    source: "Ruleset",
    timingType: "flexible",
    dueDate: "Today",
    preferredWindow: "Today",
    workType: "none",
    ...baseRoutine,
    ...savedState,
  };
}
