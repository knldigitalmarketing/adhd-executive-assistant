import { modelDefinitions } from "./models.js";
import {
  activateRoutine,
  activateHabit,
  activateRecurringTask,
  addTask,
  addHourlyItem,
  answerInterviewQuestion,
  cancelGoalEdit,
  cancelHabitEdit,
  cancelProjectEdit,
  cancelRecurringTaskEdit,
  cancelRoutineEdit,
  clearProfilePhoto,
  completeEndOfDayReview,
  completeSmartIntervention,
  completeWeeklyReview,
  createProjectNextTask,
  deactivateRoutine,
  deactivateHabit,
  deactivateRecurringTask,
  deleteRoutine,
  deleteGoal,
  deleteHabit,
  deleteProject,
  deleteRecurringTask,
  dismissProgressiveStarterAcknowledgement,
  dismissRecommendation,
  dismissGuidance,
  dismissMorningRoutine,
  dismissRecoverySuggestion,
  dismissItem,
  dismissSmartIntervention,
  doItNow,
  editRoutine,
  editRecurringTask,
  editProgressiveStarterAnswer,
  endFocus,
  editInterviewAnswer,
  editGoal,
  editHabit,
  editProject,
  clearAppearanceImage,
  disablePrivacyLock,
  getDecisionRecommendation,
  getAccountSettings,
  getAppearanceSettings,
  getEnergyMoodData,
  getEndOfDayReviewData,
  getActiveView,
  getFocusModeData,
  getGoalSettingData,
  getHabitTrackingData,
  getInterviewState,
  getLifeAreaDashboardData,
  getMorningBriefingData,
  getOpenTodayActions,
  getPositiveReinforcement,
  getProjectTrackingData,
  getRecurringTaskData,
  getRoutineBuilderData,
  getScoredActionableItems,
  getSetupJourneyData,
  getState,
  getSmartReschedulingSummary,
  getTodayStats,
  getVoiceListEntryData,
  getWeeklyReviewData,
  getWorkingModeData,
  isDone,
  isPrivacyLocked,
  loadDemo,
  lockApp,
  markDone,
  markGeneralListDone,
  markSavedVoiceListItemDone,
  resetLocalData,
  resetProgressiveOnboarding,
  reopenGeneralList,
  reopenSavedVoiceListItem,
  setActiveView,
  skipItem,
  skipSetupStep,
  snoozeItem,
  pauseFocus,
  completeProgressiveSetup,
  markGoalComplete,
  markProjectComplete,
  reactivateCompletedGoal,
  reactivateCompletedProject,
  resumeFocus,
  saveAccountProfile,
  saveAppearanceImage,
  saveAppearanceSettings,
  saveGoal,
  saveHabit,
  setGeneralListDetails,
  saveProject,
  saveEnergyMoodCheckIn,
  saveRecurringTask,
  saveRoutine,
  reviewVoiceListText,
  removeVoiceListItem,
  approveVoiceListItems,
  clearVoiceListDraft,
  deleteSavedVoiceListItem,
  updateVoiceListItem,
  startFocus,
  startSetupStep,
  startProgressiveSetup,
  startMyDay,
  statusText,
  statusTone,
  savePrivacyLock,
  saveProfilePhoto,
  unlockApp,
  saveProgressiveHelpArea,
  saveProgressiveName,
} from "./state.js";
import { formatRoutineStepLines, startVoiceRecognition } from "./voice-list-entry.js";

const app = document.querySelector("#app");
let workingModeTimer = null;
let starterAcknowledgementTimer = null;
let quickCaptureDraft = null;
let quickCaptureResult = null;
let quickCaptureText = "";
let quickCaptureCollapsed = false;
let dismissedAssistantNudgeId = "";
const collapsedWindows = new Set();

const navGroups = [
  {
    label: "View",
    items: [
      ["command-center", "Command Center"],
      ["today", "Today"],
      ["working", "Focus View"],
      ["briefing", "Day Glimpse"],
      ["hourly", "Hourly View"],
      ["progress", "Progress"],
    ],
  },
  {
    label: "Quick Add",
    items: [
      ["quick-capture", "Capture"],
      ["lists", "Lists"],
      ["shop", "Food + Pantry"],
    ],
  },
  {
    label: "Teach Assistant",
    items: [
      ["setup", "Guided Setup"],
      ["goals", "Goals"],
      ["projects", "Projects"],
      ["habits", "Habits"],
      ["routines", "Routines"],
      ["recurring-tasks", "Recurring Tasks"],
    ],
  },
  {
    label: "Resources",
    items: [
      ["help", "Help"],
      ["learn", "Learn"],
      ["store", "Shop"],
    ],
  },
  {
    label: "Account",
    items: [
      ["account", "Account"],
      ["settings", "Settings"],
    ],
  },
];

function areaMap() {
  return new Map(getState().responsibilityAreas.map((area) => [area.id, area]));
}

function areaName(id) {
  return areaMap().get(id)?.name ?? titleCase(id);
}

function titleCase(value) {
  return String(value)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function categoryLabel(value) {
  return value === "adhd" ? "Focus & Follow-Through" : titleCase(value);
}

function supportModeLabel(value) {
  return titleCase(String(value).replaceAll("_", "-"));
}

function pluralize(unit, count) {
  return count === 1 ? unit : `${unit}s`;
}

function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pill(text, tone = "neutral") {
  return `<span class="pill pill-${tone}">${escapeHtml(text)}</span>`;
}

function makeFormData(values) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.append(key, value ?? "");
  }
  return formData;
}

function buildQuickCaptureDraft(text) {
  const rawText = String(text ?? "").trim();
  const assistanceIntent = detectAssistanceIntent(rawText);
  const type = classifyQuickCapture(rawText);
  const title = getQuickCaptureDefaultTitle(type, rawText, assistanceIntent);

  return {
    rawText,
    title,
    type,
    assistanceIntent,
    reason: getQuickCaptureReason(type, rawText, assistanceIntent),
    nextStep: getAssistanceNextStep(type, rawText, assistanceIntent),
  };
}

function getQuickCaptureDefaultTitle(type, rawText, assistanceIntent) {
  if (type === "shoppingTool") {
    return "Shopping List";
  }
  if (type === "foodTool") {
    return "Food Input";
  }
  if (type === "listTool") {
    return inferGeneralListName(rawText);
  }
  return cleanCaptureTitle(rawText, assistanceIntent);
}

function classifyQuickCapture(text) {
  const value = text.toLowerCase();
  const assistanceIntent = detectAssistanceIntent(text);

  if (isShoppingListToolIntent(value)) {
    return "shoppingTool";
  }

  if (isFoodInputToolIntent(value)) {
    return "foodTool";
  }

  if (isGeneralListToolIntent(value)) {
    return "listTool";
  }

  if (/\b(routine|steps|morning routine|evening routine|night routine)\b/.test(value)) {
    return "routine";
  }

  if (/\b(every monday|every tuesday|every wednesday|every thursday|every friday|every saturday|every sunday|every week|weekly|monthly|every month|every \d+ days?)\b/.test(value)) {
    return "recurring";
  }

  if (/\b(habit|daily|every day|times a day|per day|each day|each morning|each evening|each night|every morning|every evening|every night|drink water|take meds|take medication|take my|take vitamins|supplement)\b/.test(value)) {
    return "habit";
  }

  if (assistanceIntent && /\b(remember|forget|forgetting|medication|medications|meds|pill|pills|vitamin|vitamins|supplement|supplements)\b/.test(value)) {
    return "habit";
  }

  if (isSafetyCaptureText(value)) {
    return "task";
  }

  if (/\b(food|pantry|foods i have|in the house|fridge|freezer|meal)\b/.test(value)) {
    return "food";
  }

  if (/\b(shopping|shop|buy|grocery|groceries|need to get|pick up)\b/.test(value)) {
    return "shopping";
  }

  if (/\b(goal|want to|i want|improve|lose weight|gain muscle|save money|get healthier|make room for)\b/.test(value)) {
    return "goal";
  }

  if (assistanceIntent) {
    return "goal";
  }

  return "task";
}

function isShoppingListToolIntent(text) {
  return /\b(create|make|start|open|build|set up|put together|work on)\b.*\b(shopping list|grocery list)\b/.test(String(text).toLowerCase());
}

function isFoodInputToolIntent(text) {
  return /\b(open|start|add|enter|input|load|tell you|teach you)\b.*\b(food input|pantry|foods i have|food i have|what food i have)\b/.test(String(text).toLowerCase());
}

function isGeneralListToolIntent(text) {
  const value = String(text).toLowerCase();
  return /\b(create|make|start|open|build|set up|put together|work on)\b.*\blist\b/.test(value);
}

function inferGeneralListName(text) {
  const value = String(text ?? "")
    .replace(/^\s*(i'd like to|i would like to|i want to|can you|could you|please|help me|let's|lets)\s+/i, "")
    .replace(/^\s*(create|make|start|open|build|set up|put together|work on)\s+(a|an|the)?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const listMatch = value.match(/(.+\blist\b)(\s+for\s+.+)?/i);
  if (listMatch) {
    return titleWords(listMatch[0].replace(/^a\s+/i, "").trim());
  }
  return "New List";
}

function inferGeneralListType(text) {
  const value = String(text ?? "").toLowerCase();
  if (/\b(to do|todo|task list|action list|things to do|chores)\b/.test(value)) {
    return "todo";
  }
  if (/\b(pack|packing|camping|trip|travel|bring)\b/.test(value)) {
    return "packing";
  }
  if (/\b(parts|supplies|materials|things to get|need to get|buy|get for|shopping)\b/.test(value)) {
    return "supplies";
  }
  if (/\b(reference|ideas|notes|brainstorm)\b/.test(value)) {
    return "reference";
  }
  return "checklist";
}

function titleWords(value) {
  return String(value ?? "")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function isSafetyCaptureText(text) {
  return /\b(child|children|kid|kids|baby|toddler|school drop-off|school pickup|drop off.*(kid|kids|child|children|school|daycare)|pick up.*(kid|kids|child|children|school|daycare)|car seat|in car|daycare)\b/.test(String(text).toLowerCase());
}

function detectAssistanceIntent(text) {
  const value = String(text).toLowerCase();
  return /\b(i need help|need help|help me|can you help|could you help|i'm trying to|im trying to|i am trying to|how do i|how can i|what's the best way|what is the best way|i want to)\b/.test(value);
}

function getQuickCaptureReason(type, text, assistanceIntent = false) {
  const reasons = {
    task: "This sounds like a one-off thing to get out of your head.",
    goal: "This sounds like a direction you want the assistant to help you move toward.",
    habit: "This sounds like something repeatable that you want to build consistency around.",
    routine: "This sounds like a sequence of steps the assistant can guide you through.",
    recurring: "This sounds like something that should come back automatically.",
    food: "This sounds like food or pantry information the assistant should remember.",
    shopping: "This sounds like something to add to a shopping list.",
    foodTool: "This sounds like you want to open the Food Input tool, not save a task.",
    shoppingTool: "This sounds like you want to open the Shopping List tool, not save a task.",
    listTool: "This sounds like you want to create or open a list, not save a task.",
  };

  if (assistanceIntent && type === "goal") {
    return "You asked for help, so I will save the direction first. Then you can choose one next step when you are ready.";
  }

  if (assistanceIntent && type === "habit") {
    return "You asked for help with remembering or repeating something, so this is probably a habit to track.";
  }

  if (/\btomorrow\b/i.test(text) && type === "task") {
    return "This sounds like a one-off task, probably for tomorrow.";
  }

  if (type === "task" && isSafetyCaptureText(text)) {
    return "This sounds time-sensitive, so I will keep it visible as a high-priority action until you mark it done.";
  }

  return reasons[type] ?? reasons.task;
}

function getAssistanceNextStep(type, text, assistanceIntent = false) {
  if (type === "shoppingTool") {
    return "Next step: open Shopping List, then type, paste, or use voice to add the items you need.";
  }

  if (type === "foodTool") {
    return "Next step: open Food Input, then type, paste, or use voice to add foods you have.";
  }

  if (type === "listTool") {
    return "Next step: open Lists, then type, paste, or use voice to add the items.";
  }

  if (!assistanceIntent) {
    return "";
  }

  const value = String(text).toLowerCase();

  if (type === "habit") {
    if (/\b(medication|medications|meds|pill|pills|amlodipine)\b/.test(value)) {
      return "Next option: open Habits to confirm the daily pattern. Later this can become part of your morning routine.";
    }
    return "Next option: turn this into a simple daily reminder pattern or add it into a routine later.";
  }

  if (/\b(organized|organised|scattered|mess|overwhelmed)\b/.test(value)) {
    return "Next option: create one starter task so the first move is obvious.";
  }

  if (/\b(bill|bills|money|budget|irs|insurance)\b/.test(value)) {
    return "Next option: add one money task or recurring responsibility so it does not stay vague.";
  }

  if (/\b(weight|lose|healthier|fitness|muscle|walk|exercise)\b/.test(value)) {
    return "Next option: add one small habit or routine that supports this goal.";
  }

  if (/\b(research|best way|how do i|how can i)\b/.test(value)) {
    return "Next option: research and planning support can come later. For now, save the direction and add one first step.";
  }

  return "Next option: add one first step, habit, or routine around this when you are ready.";
}

function cleanCaptureTitle(text, assistanceIntent = false) {
  const cleaned = String(text)
    .replace(/^\s*(hey|ok|okay|please)\s+/i, "")
    .replace(/^\s*(add|create|save|remember|remind me to|i need to|i have to|my goal is)\s+/i, "")
    .replace(/^\s*(i need help|need help|help me|can you help me|could you help me|can you help|could you help)\s+(with|to|me with)?\s*/i, "")
    .replace(/^\s*(i'm trying to|im trying to|i am trying to|i want to)\s+/i, "")
    .replace(/^\s*(how do i|how can i|what's the best way to|what is the best way to)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!assistanceIntent) {
    return cleaned;
  }

  return titleCase(cleaned || text);
}

function quickCaptureTypeLabel(type) {
  return {
    task: "Quick Task",
    goal: "Goal",
    habit: "Habit",
    routine: "Routine",
    recurring: "Recurring Task",
    food: "Food + Pantry",
    shopping: "Shopping List",
    foodTool: "Open Food Input",
    shoppingTool: "Open Shopping List",
    listTool: "Open List Builder",
  }[type] ?? "Quick Task";
}

function quickCaptureViewForType(type) {
  return {
    task: "today",
    goal: "goals",
    habit: "habits",
    routine: "routines",
    recurring: "recurring-tasks",
    food: "shop",
    shopping: "shop",
    foodTool: "shop",
    shoppingTool: "shop",
    listTool: "lists",
  }[type] ?? "today";
}

function inferCaptureCategory(text) {
  const value = text.toLowerCase();
  if (/\b(health|doctor|medicine|medication|medications|meds|pill|amlodipine|sleep|water)\b/.test(value)) return "Health";
  if (/\b(fitness|walk|workout|exercise|gym|muscle)\b/.test(value)) return "Fitness";
  if (/\b(work|client|invoice|email|call|meeting|follow up|revenue)\b/.test(value)) return "Work";
  if (/\b(money|bill|irs|insurance|budget|save)\b/.test(value)) return "Money";
  if (/\b(friend|family|wife|husband|relationship|call mom|call dad)\b/.test(value)) return "Relationships";
  if (/\b(home|house|trash|laundry|clean|yard)\b/.test(value)) return "Home";
  return "Personal";
}

function inferCaptureWorkType(text) {
  const value = text.toLowerCase();
  if (/\b(revenue|sale|sales|proposal|invoice|client)\b/.test(value)) return "Revenue";
  if (/\b(admin|paperwork|file|forms|irs|insurance)\b/.test(value)) return "Admin";
  if (/\b(follow up|call back|reply|email)\b/.test(value)) return "Follow-up";
  if (/\b(write|design|brainstorm|create)\b/.test(value)) return "Creative";
  if (/\b(clean|maintenance|repair|organize)\b/.test(value)) return "Maintenance";
  return "None";
}

function inferHabitDailyTarget(text) {
  const value = text.toLowerCase();
  const numericMatch = value.match(/\b(\d+)\s*(times|x)\s*(a|per)?\s*day\b/);
  if (numericMatch) {
    return numericMatch[1];
  }

  const words = { one: 1, once: 1, two: 2, twice: 2, three: 3, four: 4, five: 5, six: 6 };
  for (const [word, count] of Object.entries(words)) {
    if (new RegExp(`\\b${word}\\s*(times)?\\s*(a|per)?\\s*day\\b`).test(value)) {
      return String(count);
    }
  }

  return "1";
}

function saveQuickCaptureDraft(formData) {
  const type = String(formData.get("captureType") ?? "task");
  const title = String(formData.get("captureTitle") ?? "").trim();
  const rawText = String(formData.get("captureRawText") ?? title).trim();
  if (!title) {
    return;
  }

  const category = inferCaptureCategory(rawText);
  const workType = inferCaptureWorkType(rawText);
  const assistanceIntent = detectAssistanceIntent(rawText);
  const safetyTask = type === "task" && isSafetyCaptureText(rawText);
  const result = {
    title,
    type,
    message: `Saved "${title}" as`,
    typeLabel: quickCaptureTypeLabel(type),
    nextStep: getAssistanceNextStep(type, rawText, assistanceIntent),
    view: quickCaptureViewForType(type),
  };

  if (type === "shoppingTool" || type === "foodTool" || type === "listTool") {
    const isListTool = type === "listTool";
    if (isListTool) {
      setGeneralListDetails(title, inferGeneralListType(rawText));
    }
    setActiveView(isListTool ? "lists" : "shop");
    return {
      ...result,
      message: "Opened",
      title: isListTool ? title : type === "shoppingTool" ? "Shopping List" : "Food Input",
      typeLabel: isListTool ? title : type === "shoppingTool" ? "Shopping List" : "Food Input",
      nextStep: getAssistanceNextStep(type, rawText, assistanceIntent),
      actionOnly: true,
      focusTargetId: isListTool ? "generalList" : type === "shoppingTool" ? "shoppingList" : "foodMeals",
      view: isListTool ? "lists" : "shop",
    };
  }

  if (type === "goal") {
    saveGoal(makeFormData({ goalTitle: title, goalCategory: category, goalPriority: "Medium", goalDeadline: "" }));
    return result;
  }

  if (type === "habit") {
    saveHabit(
      makeFormData({
        habitName: title,
        habitCategory: category,
        habitFrequencyType: "daily",
        habitTargetDays: "",
        habitDailyTargetCount: inferHabitDailyTarget(rawText),
        habitWeeklyTargetCount: "1",
        habitActive: "active",
      }),
    );
    return result;
  }

  if (type === "routine") {
    saveRoutine(
      makeFormData({
        routineName: title,
        routineType: /evening|night|bed/i.test(rawText) ? "evening" : "custom",
        routineActive: "active",
        routineSteps: `${title} - 5`,
      }),
    );
    return result;
  }

  if (type === "recurring") {
    saveRecurringTask(
      makeFormData({
        recurringTaskName: title,
        recurringTaskType: /monthly|every month/i.test(rawText) ? "monthly" : /weekly|every monday|every tuesday|every wednesday|every thursday|every friday|every saturday|every sunday|every week/i.test(rawText) ? "weekly" : "daily",
        recurringTaskNextOccurrence: getTodayDateInputValue(),
        recurringTaskCustomSchedule: "",
        recurringTaskCategory: category,
        recurringTaskPriority: "Medium",
        recurringTaskActive: "active",
      }),
    );
    return result;
  }

  if (type === "food" || type === "shopping") {
    const targetId = type === "food" ? "foodMeals" : "shoppingList";
    reviewVoiceListText(targetId, rawText);
    approveVoiceListItems(targetId);
    return result;
  }

  addTask(
    makeFormData({
      title,
      timingType: "flexible",
      when: String(formData.get("captureTaskWhen") ?? (/\btomorrow\b/i.test(rawText) ? "Tomorrow" : "Today")),
      priority: String(formData.get("captureTaskPriority") ?? (safetyTask ? "High" : "Medium")),
      category,
      workType,
      areaId: "projects",
    }),
  );
  if (safetyTask) {
    result.nextStep = "I added this as a high-priority Today task so it can stay visible in Now until you mark it done.";
  } else if (type === "task") {
    result.nextStep = `I added this to ${String(formData.get("captureTaskWhen") ?? "Today")}. Open Today or Command Center to manage it.`;
  }
  return result;
}

function renderHeader() {
  const activeView = getActiveView();

  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Interactive local-first MVP</p>
        <h1>Life Enablement Assistant</h1>
      </div>
      <details class="app-menu">
        <summary aria-label="Open navigation menu">
          <span class="hamburger-icon" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <strong>Menu</strong>
        </summary>
        <nav class="app-nav" aria-label="Primary">
          ${navGroups.map((group) => renderNavGroup(group, activeView)).join("")}
        </nav>
      </details>
    </header>
  `;
}

function renderNavGroup(group, activeView) {
  return `
    <section>
      <h2>${escapeHtml(group.label)}</h2>
      <div>
        ${group.items.map(([view, label]) => renderNavButton(view, label, activeView)).join("")}
      </div>
    </section>
  `;
}

function renderNavButton(view, label, activeView) {
  if (view === "quick-capture") {
    return `
      <button type="button" data-action="focus-quick-capture">
        ${escapeHtml(label)}
      </button>
    `;
  }

  return `
    <button type="button" class="${activeView === view ? "is-active" : ""}" data-action="navigate" data-view="${escapeHtml(view)}" aria-current="${activeView === view ? "page" : "false"}">
      ${escapeHtml(label)}
    </button>
  `;
}

function renderQuickCapture() {
  const collapsed = quickCaptureCollapsed && !quickCaptureDraft;
  return `
    <section class="quick-capture ${collapsed ? "is-collapsed" : ""}" aria-label="Quick Capture">
      <div class="capture-heading">
        <button type="button" class="capture-toggle" data-action="toggle-quick-capture" aria-expanded="${collapsed ? "false" : "true"}" aria-label="${collapsed ? "Open Capture" : "Collapse Capture"}"></button>
        <strong>Capture</strong>
      </div>
      <div class="capture-workspace" ${collapsed ? "hidden" : ""}>
        <p>Speak or type one thing. Review it before it saves.</p>
        <form data-action="review-quick-capture">
          <label class="sr-only" for="quick-capture-text">What do you want to capture?</label>
          <input id="quick-capture-text" name="captureText" type="text" value="${escapeHtml(quickCaptureText)}" placeholder="Example: pay a bill, pick up kid, child is in car for school drop-off" required />
          <div class="capture-actions">
            <button type="button" class="voice-capture-button" data-action="start-quick-capture-voice">Voice</button>
            <button type="submit">Start Adding</button>
          </div>
        </form>
        ${renderQuickCaptureDraft()}
        ${renderQuickCaptureResult()}
      </div>
    </section>
  `;
}

function renderAssistantNudge(activeView) {
  const nudge = getAssistantNudge(activeView);
  if (!nudge) {
    return "";
  }

  return `
    <aside class="assistant-nudge" aria-live="polite">
      <div>
        <p class="eyebrow">Helpful next step</p>
        <strong>${escapeHtml(nudge.title)}</strong>
        <span>${escapeHtml(nudge.message)}</span>
      </div>
      <div class="button-row">
        ${nudge.actions.map((action) => `<button type="button" class="${action.secondary ? "secondary-button" : ""}" data-action="${escapeHtml(action.action)}">${escapeHtml(action.label)}</button>`).join("")}
        <button type="button" class="secondary-button" data-action="dismiss-assistant-nudge" data-id="${escapeHtml(nudge.id)}">Not Now</button>
      </div>
    </aside>
  `;
}

function getAssistantNudge(activeView) {
  if (!new Set(["command-center", "today", "working", "briefing", "dashboard"]).has(activeView)) {
    return null;
  }

  const state = getState();
  const activeHabits = (state.habits ?? []).filter((habit) => habit.active !== false);
  const activeRoutines = (state.routinePlans ?? []).filter((routine) => routine.active !== false);
  const hasMorningRoutine = activeRoutines.some((routine) => String(routine.type ?? "").toLowerCase() === "morning");

  if (activeHabits.length === 0 && dismissedAssistantNudgeId !== "daily-habits") {
    return {
      id: "daily-habits",
      title: "Do you have regular habits you do every day?",
      message: "Things like morning pills, water, stretching, or a short walk can be taught once so your assistant can keep them visible.",
      actions: [
        { label: "Add Daily Habit", action: "show-habits" },
        { label: "Set Up Morning Routine", action: "show-routines", secondary: true },
      ],
    };
  }

  if (activeHabits.length > 0 && !hasMorningRoutine && dismissedAssistantNudgeId !== "morning-routine") {
    return {
      id: "morning-routine",
      title: "Would you like to set up your morning routine?",
      message: "A routine can group habits like medication, movement, water, and planning so the morning has a path instead of a pile of choices.",
      actions: [
        { label: "Set Up Morning Routine", action: "show-routines" },
        { label: "Add Another Habit", action: "show-habits", secondary: true },
      ],
    };
  }

  return null;
}

function renderQuickCaptureDraft() {
  if (!quickCaptureDraft) {
    return "";
  }

  const toolIntent = isCaptureToolType(quickCaptureDraft.type);

  return `
    <form class="capture-review" data-action="save-quick-capture">
      <input type="hidden" name="captureRawText" value="${escapeHtml(quickCaptureDraft.rawText)}" />
      ${quickCaptureDraft.assistanceIntent ? `<p class="capture-intent">You asked for help. I will save the main direction first, then offer one next step.</p>` : ""}
      <p class="capture-heard"><strong>Captured:</strong> ${escapeHtml(quickCaptureDraft.rawText)}</p>
      <div>
        <span>I think this is:</span>
        <select name="captureType" aria-label="Capture type">
          ${["task", "habit", "goal", "routine", "recurring", "food", "shopping", "foodTool", "shoppingTool", "listTool"].map((type) => `<option value="${type}" ${type === quickCaptureDraft.type ? "selected" : ""}>${quickCaptureTypeLabel(type)}</option>`).join("")}
        </select>
      </div>
      <div>
        <label for="capture-title">${toolIntent ? "Open" : "Save as"}</label>
        <input id="capture-title" name="captureTitle" type="text" value="${escapeHtml(quickCaptureDraft.title)}" required />
      </div>
      ${renderQuickCaptureTaskDetails(quickCaptureDraft)}
      <p>${escapeHtml(quickCaptureDraft.reason)}</p>
      ${quickCaptureDraft.nextStep ? `<p class="capture-next-step">${escapeHtml(quickCaptureDraft.nextStep)}</p>` : ""}
      <div class="button-row">
        <button type="submit">${toolIntent ? "Open This" : "Save This"}</button>
        <button type="button" class="secondary-button" data-action="clear-quick-capture">Cancel</button>
      </div>
    </form>
  `;
}

function isCaptureToolType(type) {
  return type === "shoppingTool" || type === "foodTool" || type === "listTool";
}

function renderQuickCaptureTaskDetails(draft) {
  if (draft.type !== "task") {
    return "";
  }

  const safetyTask = isSafetyCaptureText(draft.rawText);
  const selectedWhen = /\btomorrow\b/i.test(draft.rawText) ? "Tomorrow" : "Today";
  const selectedPriority = safetyTask ? "High" : "Medium";

  return `
    <div class="capture-task-details">
      <div>
        <label for="capture-task-when">When?</label>
        <select id="capture-task-when" name="captureTaskWhen">
          ${["Today", "Tomorrow", "This week"].map((value) => `<option value="${value}" ${value === selectedWhen ? "selected" : ""}>${value === "Today" && safetyTask ? "Now / today" : value}</option>`).join("")}
        </select>
      </div>
      <div>
        <label for="capture-task-priority">Importance?</label>
        <select id="capture-task-priority" name="captureTaskPriority">
          ${["High", "Medium", "Low"].map((value) => `<option value="${value}" ${value === selectedPriority ? "selected" : ""}>${value}</option>`).join("")}
        </select>
      </div>
    </div>
  `;
}

function renderQuickCaptureResult() {
  if (!quickCaptureResult) {
    return "";
  }

  return `
    <aside class="capture-result" aria-live="polite">
      <strong>
        ${
          quickCaptureResult.actionOnly
            ? `${escapeHtml(quickCaptureResult.message)} <button type="button" class="inline-nav-link" data-action="navigate" data-view="${escapeHtml(quickCaptureResult.view)}">${escapeHtml(quickCaptureResult.typeLabel)}</button>.`
            : `${escapeHtml(quickCaptureResult.message)} <button type="button" class="inline-nav-link" data-action="navigate" data-view="${escapeHtml(quickCaptureResult.view)}">${escapeHtml(quickCaptureResult.typeLabel)}</button>.`
        }
      </strong>
      ${quickCaptureResult.nextStep ? `<p>${escapeHtml(quickCaptureResult.nextStep)}</p>` : ""}
    </aside>
  `;
}

function scrollCaptureReviewIntoView() {
  queueMicrotask(() => {
    document.querySelector(".capture-review")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

function renderEndOfDayReview() {
  const review = getEndOfDayReviewData();

  return `
    <section id="review" class="section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">End-of-Day Review</p>
          <h2>Close today, set up tomorrow</h2>
        </div>
        ${review.review ? pill("Review complete", "strong") : ""}
      </div>
      <div class="briefing-grid">
        <article class="panel">
          <div class="panel-title">
            <h3>Completed Today</h3>
            ${pill(`${review.completed.length} done`, "strong")}
          </div>
          ${renderReviewList(review.completed, "Nothing has been completed yet today.")}
        </article>
        <article class="panel">
          <div class="panel-title">
            <h3>Missed, Snoozed, or Skipped</h3>
            ${pill(`${review.deferred.length} review`, "warn")}
          </div>
          ${renderCarryoverForm(review)}
        </article>
      </div>
      ${renderWeeklyReview()}
    </section>
  `;
}

function renderWeeklyReview() {
  const review = getWeeklyReviewData();

  return `
    <section class="weekly-review-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Weekly Review</p>
          <h2>Last 7 days</h2>
        </div>
        <div class="button-row">
          ${review.savedReview ? pill("Weekly review saved", "strong") : ""}
          <button type="button" data-action="complete-weekly-review">Save Weekly Review</button>
        </div>
      </div>
      <div class="briefing-grid">
        <article class="panel">
          <div class="panel-title">
            <h3>Top Accomplishments</h3>
            ${pill(`${review.topAccomplishments.length} shown`, "strong")}
          </div>
          ${renderWeeklyList(
            review.topAccomplishments.map((item) => ({ title: item.title, detail: item.goalArea })),
            "No accomplishments logged yet.",
          )}
        </article>
        <article class="panel">
          <div class="panel-title">
            <h3>Missed Items</h3>
            ${pill(`${review.missedItems.length} missed`, "warn")}
          </div>
          ${renderWeeklyList(
            review.missedItems.map((item) => ({ title: item.title, detail: `${item.missedCount} missed` })),
            "No missed items recorded.",
          )}
        </article>
        <article class="panel">
          <div class="panel-title">
            <h3>Focus Sessions</h3>
            ${pill(`${review.focusSessionsCompleted.length} completed`, "strong")}
          </div>
          ${renderWeeklyList(
            review.focusSessionsCompleted.map((item) => ({ title: item.title, detail: `${Math.round((item.completedSeconds ?? 0) / 60)} min` })),
            "No completed focus sessions yet.",
          )}
        </article>
        <article class="panel">
          <h3>Goal Progress</h3>
          ${renderGoalProgress({ counts: review.goalProgress, summary: `${review.completedItems.length} completed in the last 7 days.` })}
        </article>
        <article class="panel">
          <div class="panel-title">
            <h3>Recurring Problem Areas</h3>
            ${pill(`${review.recurringProblems.length} patterns`, "warn")}
          </div>
          ${renderWeeklyList(
            review.recurringProblems.map((item) => ({
              title: item.title,
              detail: `${item.snoozeCount} snoozed - ${item.skipCount} skipped - ${item.dismissCount} dismissed`,
            })),
            "No recurring problem areas yet.",
          )}
        </article>
        <article class="panel">
          <h3>Improvement Suggestions</h3>
          ${renderWeeklyList(
            review.suggestions.map((suggestion) => ({ title: suggestion, detail: "Next week" })),
            "No suggestions yet.",
          )}
        </article>
      </div>
    </section>
  `;
}

function renderWeeklyList(items, emptyText) {
  if (items.length === 0) {
    return `<p class="empty-copy">${escapeHtml(emptyText)}</p>`;
  }

  return `
    <ul class="briefing-list">
      ${items
        .map(
          (item) => `
            <li>
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.detail)}</span>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function renderReviewList(items, emptyText) {
  if (items.length === 0) {
    return `<p class="empty-copy">${escapeHtml(emptyText)}</p>`;
  }

  return `
    <ul class="briefing-list">
      ${items
        .map(
          (entry) => `
            <li>
              <strong>${escapeHtml(entry.title)}</strong>
              <span>${escapeHtml(entry.status)}</span>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function renderCarryoverForm(review) {
  if (review.deferred.length === 0) {
    return `
      <form class="carryover-form" data-action="complete-review">
        <p class="empty-copy">Nothing needs carryover right now.</p>
        <div class="button-row">
          <button type="submit">Complete Review</button>
        </div>
      </form>
    `;
  }

  return `
    <form class="carryover-form" data-action="complete-review">
      <p class="empty-copy">What should carry over tomorrow?</p>
      <ul class="briefing-list">
        ${review.deferred
          .map(
            (entry) => `
              <li>
                <label class="carryover-option">
                  <input type="checkbox" name="carryover" value="${escapeHtml(entry.key)}" />
                  <span>
                    <strong>${escapeHtml(entry.title)}</strong>
                    <small>${escapeHtml(entry.status)}</small>
                  </span>
                </label>
              </li>
            `,
          )
          .join("")}
      </ul>
      <div class="button-row">
        <button type="submit">Complete Review</button>
      </div>
    </form>
  `;
}

function renderToday() {
  const stats = getTodayStats();
  const recommendation = getDecisionRecommendation();
  const reinforcement = getPositiveReinforcement("today");

  return `
    <section id="today" class="section today-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Today</p>
          <h2>Do this next</h2>
        </div>
        <div class="button-row">
          <button type="button" data-action="show-command-center">Command Center</button>
          <button type="button" data-action="start-working">Start My Day</button>
          <button type="button" class="secondary-button" data-action="reset-local-data">Reset local data</button>
        </div>
      </div>
      ${renderTodaySchedule()}
      ${renderQuickCapture()}
      ${renderPositiveReinforcementBanner(reinforcement)}
      ${renderAddTaskForm()}
      <div class="today-grid">
        ${renderDecisionCard(recommendation)}
        <article class="stat-card">
          <strong>${stats.open}</strong>
          <span>Open</span>
        </article>
        <article class="stat-card">
          <strong>${stats.done}</strong>
          <span>Done</span>
        </article>
        <article class="stat-card">
          <strong>${stats.snoozed}</strong>
          <span>Snoozed</span>
        </article>
      </div>
    </section>
  `;
}

function renderTodaySchedule() {
  const scheduledItems = getTodayScheduledItems();

  return `
    <article class="panel today-schedule-panel" data-window-title="Today's Schedule">
      <div class="panel-title">
        <h3>Today's Schedule</h3>
        ${pill(`${scheduledItems.length} scheduled`, scheduledItems.length ? "strong" : "neutral")}
      </div>
      ${
        scheduledItems.length === 0
          ? `<p class="empty-copy">Nothing scheduled yet. Add something below or use Capture.</p>`
          : `<ul class="briefing-list today-schedule-list">${scheduledItems
              .map(
                (item) => `
                  <li class="${isDone(item) ? "is-complete" : ""}">
                    <strong>${escapeHtml(item.title)}</strong>
                    <span>${escapeHtml(item.displayTime)} - ${escapeHtml(item.type ?? "Task")}</span>
                  </li>
                `,
              )
              .join("")}</ul>`
      }
    </article>
  `;
}

function getTodayScheduledItems() {
  const state = getState();
  const timelineItems = (state.timeline ?? []).map((item) => ({
    ...item,
    collection: "timeline",
    displayTime: item.time ?? item.startTime ?? "Today",
  }));
  const actionItems = (state.actions ?? [])
    .filter((item) => (item.timingType ?? "") === "scheduled" || item.startTime || item.time)
    .map((item) => ({
      ...item,
      collection: "actions",
      type: "Task",
      displayTime: item.startTime ?? item.time ?? "Today",
    }));

  return [...timelineItems, ...actionItems]
    .filter((item) => !isDone(item))
    .sort((a, b) => getHourFromTime(a.displayTime) - getHourFromTime(b.displayTime));
}

function renderMorningBriefing() {
  const briefing = getMorningBriefingData();

  return `
    <section id="briefing" class="section briefing-screen">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Day Glimpse</p>
          <h2>See what matters today</h2>
        </div>
        <button type="button" data-action="start-working">Start My Day</button>
      </div>
      ${renderSetupGuide("briefing")}
      ${renderEnergyMoodCheckIn(briefing.energyMood)}
      ${renderTipCard(briefing.tip)}
      ${renderInterventionCard(briefing.intervention, "briefing")}
      ${renderSmartRescheduling(briefing.smartRescheduling)}
      <article class="panel morning-routine-panel">
        <div class="panel-title">
          <h3>Morning Routine</h3>
          ${pill(`${briefing.morningRoutine.length} first-hour`, "strong")}
        </div>
        ${renderMorningRoutineItems(briefing.morningRoutine)}
      </article>
      ${renderRoutineBuilder(briefing.builtRoutines)}
      ${renderGoalSetting(getGoalSettingData(), briefing.goals)}
      ${renderHabitTracking(briefing.habits)}
      ${renderRecurringTasks(briefing.recurringTasks)}
      <article class="panel morning-routine-panel">
        <div class="panel-title">
          <h3>Recovery Suggestions</h3>
          ${pill(`${briefing.recoverySuggestions.length} active`, "strong")}
        </div>
        ${renderRecoverySuggestionItems(briefing.recoverySuggestions)}
      </article>
      <article class="panel morning-routine-panel">
        <div class="panel-title">
          <h3>Goal Progress</h3>
          ${pill(`${briefing.goalProgress.total} this week`, "strong")}
        </div>
        ${renderGoalProgress(briefing.goalProgress)}
      </article>
      <article class="panel morning-routine-panel">
        <div class="panel-title">
          <h3>Tomorrow Planning</h3>
          ${pill(`${briefing.tomorrowPlanning.topPriorities.length} priorities`, "strong")}
        </div>
        ${renderTomorrowPlanning(briefing.tomorrowPlanning)}
      </article>
      <div class="morning-grid">
        <article class="panel">
          <div class="panel-title">
            <h3>Today's Big Things</h3>
            ${pill(`${briefing.bigThings.length} max 3`, "strong")}
          </div>
          ${renderBriefingItems(
            briefing.bigThings.map((item) => ({
              title: item.title,
              detail: `${item.why} Score ${item.score}`,
            })),
            "No major actions are waiting.",
          )}
        </article>
        <article class="panel">
          <h3>Guidance</h3>
          ${renderBriefingItems(
            briefing.guidance.map((item) => ({
              title: item.title,
              detail: item.reason,
            })),
            "No guidance blocks for this profile right now.",
          )}
        </article>
        <article class="panel">
          <h3>Scheduled Today</h3>
          ${renderBriefingItems(
            briefing.scheduledToday.map((item) => ({
              title: item.title ?? item.name,
              detail: item.startTime ?? item.time ?? "Today",
            })),
            "No scheduled items are waiting.",
          )}
        </article>
        <article class="panel">
          <h3>Potential Issues</h3>
          ${renderBriefingItems(briefing.potentialIssues, "No obvious issues found.")}
        </article>
      </div>
    </section>
  `;
}

function renderRoutineBuilder(data = getRoutineBuilderData()) {
  const draft = data.draftRoutine;

  return `
    <section id="routine-builder" class="section routine-builder-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Routine Builder</p>
          <h2>Create steady rails</h2>
          <p class="empty-copy">A routine is a small sequence you want the assistant to guide you through. Build the steps once, then the assistant can bring them forward at the right part of the day.</p>
        </div>
        ${pill(`${data.routines.length} saved`, "strong")}
      </div>
      ${renderSetupGuide("routines")}
      <article class="routine-explainer">
        <div>
          <h3>How Routines Work</h3>
          <p><strong>Steps</strong> is the actual routine that gets saved. Put each action on its own line, like <span>Drink water - 2</span>.</p>
          <p>The number after the dash is the estimated time in minutes. <span>Drink water - 2</span> means that step should take about 2 minutes. Make your best guess to start; you can refine it later.</p>
        </div>
        <div>
          <h3>What The Helper Does</h3>
          <p><strong>Step Input Helper</strong> is optional. It lets you speak, type, or paste ideas first, review them, and then add them into Steps.</p>
        </div>
      </article>
      <div class="routine-builder-grid">
        <form class="panel routine-form" data-action="save-routine">
          <input type="hidden" name="routineId" value="${escapeHtml(draft?.id ?? "")}" />
          <section class="guided-step">
            <div class="guided-step-heading">
              <span>1</span>
              <div>
                <h3>Name This Routine</h3>
                <p>Give it a simple label so the assistant knows what path this is.</p>
              </div>
            </div>
            <label for="routine-name">Routine name</label>
            <input id="routine-name" name="routineName" type="text" value="${escapeHtml(draft?.name ?? "")}" placeholder="Morning launch" required />
          </section>
          <section class="guided-step">
            <div class="guided-step-heading">
              <span>2</span>
              <div>
                <h3>Choose When It Helps</h3>
                <p>Pick the part of the day when this routine should be available.</p>
              </div>
            </div>
            <div class="guided-step-grid">
              <div>
                <label for="routine-type">Type</label>
                <select id="routine-type" name="routineType">
                  ${renderRoutineTypeOptions(draft?.type ?? "morning")}
                </select>
              </div>
              <div>
                <label for="routine-active">Status</label>
                <select id="routine-active" name="routineActive">
                  <option value="active" ${draft?.active === false ? "" : "selected"}>Active</option>
                  <option value="inactive" ${draft?.active === false ? "selected" : ""}>Inactive</option>
                </select>
              </div>
            </div>
          </section>
          <section class="guided-step routine-steps-field">
            <div class="guided-step-heading">
              <span>3</span>
              <div>
                <h3>Add The Steps</h3>
                <p>Add only the next few actions. You can refine this later.</p>
              </div>
            </div>
            <label for="routine-steps">Steps To Save</label>
            <textarea id="routine-steps" name="routineSteps" rows="5" placeholder="Drink water - 2&#10;Take meds - 3&#10;Review Today - 5" required>${escapeHtml(getRoutineStepLines(draft))}</textarea>
            <p class="field-help">This is the routine that will be saved. Add one step per line. Use: step name - minutes.</p>
            <div class="button-row routine-save-row">
              <button type="submit">${draft ? "Save Routine Changes" : "Save Routine"}</button>
              ${draft ? `<button type="button" class="secondary-button" data-action="cancel-routine-edit">Cancel</button>` : ""}
            </div>
            <details class="optional-helper">
              <summary>Need help getting steps in?</summary>
              ${renderVoiceListEntry(getVoiceListEntryData("routineSteps"), { compact: true })}
            </details>
          </section>
        </form>
        <article class="panel routine-list-panel">
          <div class="panel-title">
            <h3>Saved routines</h3>
            ${pill(`${data.activeSteps.length} active steps`, "strong")}
          </div>
          ${renderRoutinePlanList(data.routines)}
        </article>
      </div>
    </section>
  `;
}

function renderRoutineTypeOptions(selectedType) {
  return [
    ["morning", "Morning"],
    ["afternoon", "Afternoon"],
    ["evening", "Evening"],
    ["custom", "Custom"],
  ]
    .map(([value, label]) => `<option value="${value}" ${selectedType === value ? "selected" : ""}>${label}</option>`)
    .join("");
}

function getRoutineStepLines(routine) {
  return (routine?.steps ?? []).map((step) => `${step.title} - ${step.estimatedMinutes}`).join("\n");
}

function renderRoutinePlanList(routines) {
  if (routines.length === 0) {
    return `<p class="empty-copy">No custom routines yet.</p>`;
  }

  return `
    <ul class="routine-plan-list">
      ${routines.map((routine) => renderRoutinePlanItem(routine)).join("")}
    </ul>
  `;
}

function renderRoutinePlanItem(routine) {
  const totalMinutes = routine.steps.reduce((sum, step) => sum + Number(step.estimatedMinutes ?? 0), 0);

  return `
    <li>
      <div>
        <strong>${escapeHtml(routine.name)}</strong>
        <span>${escapeHtml(titleCase(routine.type))} - ${routine.steps.length} steps - ${totalMinutes} min</span>
      </div>
      <div class="item-actions">
        ${pill(routine.active ? "Active" : "Inactive", routine.active ? "strong" : "neutral")}
        <button type="button" data-action="edit-routine" data-id="${escapeHtml(routine.id)}">Edit</button>
        <button type="button" data-action="${routine.active ? "deactivate-routine" : "activate-routine"}" data-id="${escapeHtml(routine.id)}">${routine.active ? "Deactivate" : "Activate"}</button>
        <button type="button" data-action="delete-routine" data-id="${escapeHtml(routine.id)}">Delete</button>
      </div>
      <ol>
        ${routine.steps.map((step) => `<li>${escapeHtml(step.title)} <span>${step.estimatedMinutes} min</span></li>`).join("")}
      </ol>
    </li>
  `;
}

function renderTomorrowPlanning(plan) {
  return `
    <div class="tomorrow-planning-grid">
      <div>
        <h4>Carried over from yesterday</h4>
        ${renderPlanningList(plan.carriedOver, "No carryovers yet.")}
      </div>
      <div>
        <h4>Tomorrow's scheduled items</h4>
        ${renderPlanningList(plan.scheduledTomorrow, "No scheduled items for tomorrow.")}
      </div>
      <div>
        <h4>Tomorrow's top priorities</h4>
        ${renderPlanningList(plan.topPriorities, "No top priorities selected yet.")}
      </div>
    </div>
  `;
}

function renderPlanningList(items, emptyText) {
  if (items.length === 0) {
    return `<p class="empty-copy">${escapeHtml(emptyText)}</p>`;
  }

  return `
    <ul class="briefing-list">
      ${items
        .map(
          ({ item }) => `
            <li>
              <strong>${escapeHtml(item.title ?? item.name)}</strong>
              <span>${escapeHtml(item.startTime ?? item.time ?? item.priority ?? "Tomorrow")}</span>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function renderGoalProgress(progress) {
  return `
    <p class="empty-copy">${escapeHtml(progress.summary)}</p>
    <ul class="goal-progress-list">
      ${Object.entries(progress.counts)
        .map(
          ([area, count]) => `
            <li>
              <span>${escapeHtml(area)}</span>
              <strong>${count}</strong>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function renderGoalSetting(data = getGoalSettingData(), briefingGoals = null) {
  const draft = data.draftGoal;
  const visibleActiveGoals = briefingGoals ?? data.activeGoals.slice(0, 3);

  return `
    <section id="goal-setting" class="section goal-setting-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Goal Setting</p>
          <h2>Choose the direction</h2>
          <p class="empty-copy">Goals tell the assistant what kind of life you are trying to move toward. They help it choose better next steps without making every task feel equally important.</p>
        </div>
        ${pill(`${data.activeGoals.length} active`, "strong")}
      </div>
      ${renderSetupGuide("goals")}
      <div class="goal-setting-grid">
        <form class="panel goal-form" data-action="save-goal">
          <input type="hidden" name="goalId" value="${escapeHtml(draft?.id ?? "")}" />
          <div class="form-intro">
            <h3>${draft ? "Update This Goal" : "Teach One Goal"}</h3>
            <p>Start with one direction that matters. The assistant will use it as a gentle signal, not as a command to overload your day.</p>
          </div>
          <div>
            <label for="goal-title">Goal title</label>
            <input id="goal-title" name="goalTitle" type="text" value="${escapeHtml(draft?.title ?? "")}" placeholder="Improve sleep consistency" required />
          </div>
          <div>
            <label for="goal-category">Goal category</label>
            <select id="goal-category" name="goalCategory">
              ${renderGoalCategoryOptions(data.categories, draft?.category ?? "Personal")}
            </select>
          </div>
          <div>
            <label for="goal-priority">Priority</label>
            <select id="goal-priority" name="goalPriority">
              ${["High", "Medium", "Low"].map((priority) => `<option ${priority === (draft?.priority ?? "Medium") ? "selected" : ""}>${priority}</option>`).join("")}
            </select>
          </div>
          <div>
            <label for="goal-deadline">Deadline</label>
            <input id="goal-deadline" name="goalDeadline" type="text" value="${escapeHtml(draft?.deadline ?? "")}" placeholder="Optional" />
          </div>
          <div class="button-row">
            <button type="submit">${draft ? "Save Goal" : "Create Goal"}</button>
            ${draft ? `<button type="button" class="secondary-button" data-action="cancel-goal-edit">Cancel</button>` : ""}
          </div>
        </form>
        <article class="panel goal-list-panel">
          <div class="panel-title">
            <h3>Active goals</h3>
            ${pill(`${visibleActiveGoals.length} shown`, "strong")}
          </div>
          ${renderGoalList(visibleActiveGoals, false)}
          ${data.completedGoals.length > 0 ? `<h3 class="subsection-title">Completed</h3>${renderGoalList(data.completedGoals.slice(0, 3), true)}` : ""}
        </article>
      </div>
    </section>
  `;
}

function renderGoalCategoryOptions(categories, selectedCategory) {
  return categories.map((category) => `<option ${category === selectedCategory ? "selected" : ""}>${category}</option>`).join("");
}

function renderGoalList(goals, completed) {
  if (goals.length === 0) {
    return `<p class="empty-copy">${completed ? "No completed goals yet." : "No active goals yet."}</p>`;
  }

  return `
    <ul class="goal-list">
      ${goals.map((goal) => renderGoalItem(goal, completed)).join("")}
    </ul>
  `;
}

function renderGoalItem(goal, completed) {
  return `
    <li>
      <div>
        <strong>${escapeHtml(goal.title)}</strong>
        <span>${escapeHtml(goal.category)} - ${escapeHtml(goal.priority)} priority${goal.deadline ? ` - ${escapeHtml(goal.deadline)}` : ""}</span>
      </div>
      <div class="item-actions">
        ${pill(completed ? "Completed" : "Active", completed ? "done" : "strong")}
        ${completed ? `<button type="button" data-action="reactivate-goal" data-id="${escapeHtml(goal.id)}">Reactivate</button>` : `<button type="button" data-action="complete-goal" data-id="${escapeHtml(goal.id)}">Complete</button>`}
        <button type="button" data-action="edit-goal" data-id="${escapeHtml(goal.id)}">Edit</button>
        <button type="button" data-action="delete-goal" data-id="${escapeHtml(goal.id)}">Delete</button>
      </div>
    </li>
  `;
}

function renderProjectTracking(data = getProjectTrackingData()) {
  const draft = data.draftProject;

  return `
    <section id="project-tracking" class="section project-tracking-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Projects</p>
          <h2>Keep big things separated</h2>
          <p class="empty-copy">Projects are containers for work that takes more than one action. Use them for repairs, creative builds, research ideas, home projects, or anything you want to keep from blending into the rest of life.</p>
        </div>
        ${pill(`${data.activeProjects.length} active`, "strong")}
      </div>
      <div class="project-tracking-grid">
        <form class="panel project-form" data-action="save-project">
          <input type="hidden" name="projectId" value="${escapeHtml(draft?.id ?? "")}" />
          <div class="panel-title">
            <h3>${draft ? "Update This Project" : "Create Project"}</h3>
            <p class="empty-copy">Use this for a bigger thing that needs its own list. Example: Motorcycle repair, fairing dragon, wildfire quilt, or the Life Enablement app.</p>
          </div>
          <div>
            <label for="project-title">Project name</label>
            <input id="project-title" name="projectTitle" type="text" value="${escapeHtml(draft?.title ?? "")}" placeholder="What are you working on?" required />
          </div>
          <div>
            <label for="project-category">Project type</label>
            <p class="field-help">What kind of list is this?</p>
            <select id="project-category" name="projectCategory">
              ${data.categories.map((category) => `<option ${category === (draft?.category ?? "Personal") ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label for="project-next-step">Next known step</label>
            <input id="project-next-step" name="projectNextStep" type="text" value="${escapeHtml(draft?.nextStep ?? "")}" placeholder="Optional" />
          </div>
          <div class="button-row">
            <button type="submit">${draft ? "Save Project" : "Create Project"}</button>
            ${draft ? `<button type="button" class="secondary-button" data-action="cancel-project-edit">Cancel</button>` : ""}
          </div>
        </form>
        <article class="panel project-list-panel">
          <div class="panel-title">
            <h3>Active projects</h3>
            ${pill(`${data.activeProjects.length}`, "strong")}
          </div>
          ${renderProjectList(data.activeProjects, false)}
          ${data.completedProjects.length > 0 ? `<h3 class="subsection-title">Completed</h3>${renderProjectList(data.completedProjects.slice(0, 4), true)}` : ""}
        </article>
      </div>
    </section>
  `;
}

function renderProjectList(projects, completed) {
  if (projects.length === 0) {
    return `<p class="empty-copy">${completed ? "No completed projects yet." : "No projects yet."}</p>`;
  }

  return `
    <ul class="project-list">
      ${projects.map((project) => renderProjectItem(project, completed)).join("")}
    </ul>
  `;
}

function renderProjectItem(project, completed) {
  const projectTasks = getState().actions.filter((task) => task.projectId === project.id);
  return `
    <li>
      <div>
        <strong>${escapeHtml(project.title)}</strong>
        <span>${escapeHtml(project.category)}${project.nextStep ? ` - next: ${escapeHtml(project.nextStep)}` : ""}</span>
        ${renderProjectTaskList(projectTasks)}
      </div>
      <div class="item-actions">
        ${pill(completed ? "Completed" : "Active", completed ? "neutral" : "strong")}
        ${!completed && project.nextStep ? `<button type="button" data-action="start-project-next-step" data-id="${escapeHtml(project.id)}">Start Next Step</button>` : ""}
        ${completed ? `<button type="button" data-action="reactivate-project" data-id="${escapeHtml(project.id)}">Reactivate</button>` : `<button type="button" data-action="complete-project" data-id="${escapeHtml(project.id)}">Complete</button>`}
        <button type="button" data-action="edit-project" data-id="${escapeHtml(project.id)}">Edit</button>
        <button type="button" data-action="delete-project" data-id="${escapeHtml(project.id)}">Delete</button>
      </div>
    </li>
  `;
}

function renderProjectTaskList(tasks) {
  if (tasks.length === 0) {
    return "";
  }

  return `
    <ul class="project-task-list">
      ${tasks
        .slice(0, 4)
        .map((task) => `<li>${escapeHtml(task.title)} <span>${escapeHtml(statusText(task))}</span></li>`)
        .join("")}
    </ul>
  `;
}

function renderHabitTracking(data = getHabitTrackingData()) {
  const draft = data.draftHabit;

  return `
    <section id="habit-tracking" class="section habit-tracking-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Habit Tracking</p>
          <h2>Keep the loop visible</h2>
          <p class="empty-copy">Habits are repeatable actions you want the assistant to notice, encourage, and bring forward at the right time.</p>
        </div>
        ${pill(`${data.dueHabitItems.length} due`, "strong")}
      </div>
      ${renderSetupGuide("habits")}
      <article class="habit-explainer">
        <div>
          <h3>Habits Are Repeatable Actions</h3>
          <p>A habit is one thing you want to build consistency around, like drinking water, walking, taking vitamins, or reading before bed.</p>
        </div>
        <div>
          <h3>Routines Are Step-By-Step Paths</h3>
          <p>A routine is a sequence that guides you through part of the day. A habit can be one step inside a routine, but it can also stand on its own.</p>
        </div>
      </article>
      <div class="habit-tracking-grid">
        <form class="panel habit-form" data-action="save-habit">
          <input type="hidden" name="habitId" value="${escapeHtml(draft?.id ?? "")}" />
          <div class="form-intro">
            <h3>${draft ? "Update This Habit" : "Teach One Habit"}</h3>
            <p>Use this for something that repeats. It can happen once a day, several times a day, or a few times per week.</p>
          </div>
          <div>
            <label for="habit-name">Habit name</label>
            <input id="habit-name" name="habitName" type="text" value="${escapeHtml(draft?.name ?? "")}" placeholder="Drink water" required />
          </div>
          <div>
            <label for="habit-category">Habit category</label>
            <select id="habit-category" name="habitCategory">
              ${data.categories.map((category) => `<option ${category === (draft?.category ?? "Personal") ? "selected" : ""}>${category}</option>`).join("")}
            </select>
          </div>
          <div>
            <label for="habit-frequency">Frequency</label>
            <select id="habit-frequency" name="habitFrequencyType">
              <option value="daily" ${draft?.frequencyType === "weekly" ? "" : "selected"}>Daily</option>
              <option value="weekly" ${draft?.frequencyType === "weekly" ? "selected" : ""}>Weekly</option>
            </select>
          </div>
          <div>
            <label for="habit-target-days">Target days</label>
            <input id="habit-target-days" name="habitTargetDays" type="text" value="${escapeHtml((draft?.targetDays ?? []).join(", "))}" placeholder="Mon, Wed, Fri or leave blank" />
          </div>
          <div>
            <label for="habit-daily-target">How many times per day?</label>
            <input id="habit-daily-target" name="habitDailyTargetCount" type="text" value="${escapeHtml(draft?.dailyTargetCount ?? 1)}" />
            <p class="field-help">Use 1 for once-a-day habits like taking a heart pill. Use a higher number for habits you repeat during the day, like drinking water or stretching.</p>
          </div>
          <div>
            <label for="habit-weekly-target">Weekly target count</label>
            <input id="habit-weekly-target" name="habitWeeklyTargetCount" type="text" value="${escapeHtml(draft?.weeklyTargetCount ?? 1)}" />
            <p class="field-help">Use this for weekly habits. Example: Walk 3 times per week.</p>
          </div>
          <div>
            <label for="habit-active">Status</label>
            <select id="habit-active" name="habitActive">
              <option value="active" ${draft?.active === false ? "" : "selected"}>Active</option>
              <option value="inactive" ${draft?.active === false ? "selected" : ""}>Inactive</option>
            </select>
          </div>
          <div class="button-row">
            <button type="submit">${draft ? "Save Habit" : "Create Habit"}</button>
            ${draft ? `<button type="button" class="secondary-button" data-action="cancel-habit-edit">Cancel</button>` : ""}
          </div>
        </form>
        <article class="panel habit-list-panel">
          <div class="panel-title">
            <h3>Habits</h3>
            ${pill(`${data.activeHabits.length} active`, "strong")}
          </div>
          ${renderHabitList(data.activeHabits, false)}
          ${data.inactiveHabits.length > 0 ? `<h3 class="subsection-title">Inactive</h3>${renderHabitList(data.inactiveHabits, true)}` : ""}
        </article>
      </div>
    </section>
  `;
}

function renderHabitList(habits, inactive) {
  if (habits.length === 0) {
    return `<p class="empty-copy">${inactive ? "No inactive habits." : "No active habits yet."}</p>`;
  }

  return `
    <ul class="habit-list">
      ${habits.map((habit) => renderHabitItem(habit)).join("")}
    </ul>
  `;
}

function renderHabitItem(habit) {
  const frequency = getHabitFrequencyLabel(habit);

  return `
    <li>
      <div>
        <strong>${escapeHtml(habit.name)}</strong>
        <span>${escapeHtml(habit.category)} - ${escapeHtml(frequency)}</span>
        ${renderHabitStreak(habit.streak)}
      </div>
      <div class="item-actions">
        ${pill(habit.active === false ? "Inactive" : "Active", habit.active === false ? "neutral" : "strong")}
        <button type="button" data-action="edit-habit" data-id="${escapeHtml(habit.id)}">Edit</button>
        <button type="button" data-action="${habit.active === false ? "activate-habit" : "deactivate-habit"}" data-id="${escapeHtml(habit.id)}">${habit.active === false ? "Activate" : "Deactivate"}</button>
        <button type="button" data-action="delete-habit" data-id="${escapeHtml(habit.id)}">Delete</button>
      </div>
    </li>
  `;
}

function getHabitFrequencyLabel(habit) {
  if (habit.frequencyType === "weekly") {
    return `${habit.weeklyTargetCount}x weekly`;
  }

  const target = Number(habit.dailyTargetCount ?? 1);
  const days = habit.targetDays?.length ? habit.targetDays.join(", ") : "Daily";
  return target > 1 ? `${target}x daily - ${days}` : days;
}

function renderHabitStreak(streak) {
  if (!streak) {
    return "";
  }

  const currentLabel = `${streak.currentStreak} current ${pluralize(streak.unit, streak.currentStreak)}`;
  const bestLabel = `${streak.longestStreak} best ${pluralize(streak.unit, streak.longestStreak)}`;

  return `
    <div class="habit-streak">
      <span>${escapeHtml(currentLabel)}</span>
      <span>${escapeHtml(bestLabel)}</span>
      ${streak.recoveryAvailable ? `<em>${escapeHtml(streak.message)}</em>` : ""}
    </div>
  `;
}

function renderRecurringTasks(data = getRecurringTaskData()) {
  const draft = data.draftTask;

  return `
    <section id="recurring-tasks" class="section recurring-task-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Recurring Tasks</p>
          <h2>Repeat without rethinking</h2>
          <p class="empty-copy">Recurring tasks are responsibilities you set up once so they come back automatically. Use them for repeating life maintenance, bills, chores, wellness tasks, and follow-ups.</p>
        </div>
        ${pill(`${data.dueOccurrences.length} due`, "strong")}
      </div>
      ${renderSetupGuide("recurring-tasks")}
      <div class="recurring-task-grid">
        <form class="panel recurring-task-form" data-action="save-recurring-task">
          <input type="hidden" name="recurringTaskId" value="${escapeHtml(draft?.id ?? "")}" />
          <div class="form-intro">
            <h3>${draft ? "Update This Repeat" : "Teach One Repeat"}</h3>
            <p>Tell the assistant what should come back and when. It will create the next occurrence after you complete it.</p>
          </div>
          <div>
            <label for="recurring-task-name">Task name</label>
            <input id="recurring-task-name" name="recurringTaskName" type="text" value="${escapeHtml(draft?.name ?? "")}" placeholder="Take out trash" required />
          </div>
          <div>
            <label for="recurring-task-type">Recurrence</label>
            <select id="recurring-task-type" name="recurringTaskType">
              ${renderRecurringTypeOptions(draft?.recurrenceType ?? "daily")}
            </select>
          </div>
          <div>
            <label for="recurring-task-next">Next occurrence</label>
            <input id="recurring-task-next" name="recurringTaskNextOccurrence" type="date" value="${escapeHtml(draft?.nextOccurrence ?? getTodayDateInputValue())}" />
          </div>
          <div>
            <label for="recurring-task-custom">Custom schedule</label>
            <input id="recurring-task-custom" name="recurringTaskCustomSchedule" type="text" value="${escapeHtml(draft?.customSchedule ?? "")}" placeholder="Every 3 days" />
          </div>
          <div>
            <label for="recurring-task-category">Category</label>
            <select id="recurring-task-category" name="recurringTaskCategory">
              ${["Personal", "Health", "Fitness", "Work", "Money", "Relationships", "Home"].map((category) => `<option ${category === (draft?.category ?? "Personal") ? "selected" : ""}>${category}</option>`).join("")}
            </select>
          </div>
          <div>
            <label for="recurring-task-priority">Priority</label>
            <select id="recurring-task-priority" name="recurringTaskPriority">
              ${["High", "Medium", "Low"].map((priority) => `<option ${priority === (draft?.priority ?? "Medium") ? "selected" : ""}>${priority}</option>`).join("")}
            </select>
          </div>
          <div>
            <label for="recurring-task-active">Status</label>
            <select id="recurring-task-active" name="recurringTaskActive">
              <option value="active" ${draft?.active === false ? "" : "selected"}>Active</option>
              <option value="inactive" ${draft?.active === false ? "selected" : ""}>Inactive</option>
            </select>
          </div>
          <div class="button-row">
            <button type="submit">${draft ? "Save Recurring Task" : "Create Recurring Task"}</button>
            ${draft ? `<button type="button" class="secondary-button" data-action="cancel-recurring-task-edit">Cancel</button>` : ""}
          </div>
        </form>
        <article class="panel recurring-task-list-panel">
          <div class="panel-title">
            <h3>Active recurring tasks</h3>
            ${pill(`${data.activeTasks.length} active`, "strong")}
          </div>
          ${renderRecurringTaskList(data.activeTasks, false)}
          ${data.inactiveTasks.length > 0 ? `<h3 class="subsection-title">Inactive</h3>${renderRecurringTaskList(data.inactiveTasks, true)}` : ""}
        </article>
      </div>
    </section>
  `;
}

function renderRecurringTypeOptions(selectedType) {
  return [
    ["daily", "Daily"],
    ["twice-weekly", "Bi-weekly (twice a week)"],
    ["weekly", "Weekly"],
    ["monthly", "Monthly"],
    ["custom", "Custom"],
  ]
    .map(([value, label]) => `<option value="${value}" ${selectedType === value ? "selected" : ""}>${label}</option>`)
    .join("");
}

function renderRecurringTaskList(tasks, inactive) {
  if (tasks.length === 0) {
    return `<p class="empty-copy">${inactive ? "No inactive recurring tasks." : "No recurring tasks yet."}</p>`;
  }

  return `
    <ul class="recurring-task-list">
      ${tasks.map((task) => renderRecurringTaskItem(task)).join("")}
    </ul>
  `;
}

function renderRecurringTaskItem(task) {
  const completedCount = task.completionHistory?.length ?? 0;
  const recurrence = getRecurringTypeLabel(task);

  return `
    <li>
      <div>
        <strong>${escapeHtml(task.name)}</strong>
        <span>${escapeHtml(task.category)} - ${escapeHtml(recurrence)} - next ${escapeHtml(task.nextOccurrence)}</span>
        <div class="habit-streak">
          <span>${completedCount} completed</span>
          <span>${escapeHtml(task.priority)} priority</span>
        </div>
      </div>
      <div class="item-actions">
        ${pill(task.active === false ? "Inactive" : "Active", task.active === false ? "neutral" : "strong")}
        <button type="button" data-action="edit-recurring-task" data-id="${escapeHtml(task.id)}">Edit</button>
        <button type="button" data-action="${task.active === false ? "activate-recurring-task" : "deactivate-recurring-task"}" data-id="${escapeHtml(task.id)}">${task.active === false ? "Activate" : "Deactivate"}</button>
        <button type="button" data-action="delete-recurring-task" data-id="${escapeHtml(task.id)}">Delete</button>
      </div>
    </li>
  `;
}

function getRecurringTypeLabel(task) {
  if (task.recurrenceType === "custom" && task.customSchedule) {
    return task.customSchedule;
  }

  if (task.recurrenceType === "twice-weekly") {
    return "Bi-weekly (twice a week)";
  }

  return titleCase(task.recurrenceType);
}

function renderRecoverySuggestionItems(items) {
  if (items.length === 0) {
    return `<p class="empty-copy">No recovery suggestions are needed right now.</p>`;
  }

  return `
    <ul class="briefing-list morning-routine-list">
      ${items
        .map(
          (item) => `
            <li>
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.recoveryAction)}</span>
              </div>
              <div class="item-actions">
                ${pill(statusText(item), statusTone(item))}
                <button type="button" data-action="mark-done" data-collection="recoverySuggestions" data-id="${escapeHtml(item.id)}">Done</button>
                <button type="button" data-action="snooze" data-collection="recoverySuggestions" data-id="${escapeHtml(item.id)}">Snooze</button>
                <button type="button" data-action="dismiss-recovery-suggestion" data-id="${escapeHtml(item.id)}">Dismiss</button>
              </div>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function renderMorningRoutineItems(items) {
  if (items.length === 0) {
    return `<p class="empty-copy">No morning routine items for this profile right now.</p>`;
  }

  return `
    <ul class="briefing-list morning-routine-list">
      ${items
        .map(
          (item) => `
            <li>
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.reason)}</span>
              </div>
              <div class="item-actions">
                ${pill(statusText(item), statusTone(item))}
                <button type="button" data-action="mark-done" data-collection="morningRoutine" data-id="${escapeHtml(item.id)}">Done</button>
                <button type="button" data-action="snooze" data-collection="morningRoutine" data-id="${escapeHtml(item.id)}">Snooze</button>
                <button type="button" data-action="dismiss-morning-routine" data-id="${escapeHtml(item.id)}">Dismiss</button>
              </div>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function renderBriefingItems(items, emptyText) {
  if (items.length === 0) {
    return `<p class="empty-copy">${escapeHtml(emptyText)}</p>`;
  }

  return `
    <ul class="briefing-list">
      ${items
        .map(
          (item) => `
            <li>
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.detail)}</span>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function renderWorkingMode() {
  const working = getWorkingModeData();

  return `
    <section id="working" class="section working-mode">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Working Mode</p>
          <h2>Stay with the next step</h2>
        </div>
        <div class="button-row">
          <button type="button" class="secondary-button" data-action="show-command-center">Command Center</button>
          <button type="button" class="secondary-button" data-action="show-dashboard">Full dashboard</button>
          <button type="button" class="secondary-button" data-action="show-life-areas">Life Areas</button>
          <button type="button" class="secondary-button" data-action="show-review">End-of-Day Review</button>
        </div>
      </div>
      <div class="working-grid">
        ${renderNowCard(working)}
        ${renderComingUpCard(working.comingUp)}
      </div>
      ${renderEnergyMoodCheckIn(getEnergyMoodData())}
      ${renderTipCard(working.tip)}
      ${renderInterventionCard(working.intervention, "working")}
    </section>
  `;
}

function renderCommandCenter() {
  const working = getWorkingModeData();
  const briefing = getMorningBriefingData();
  const stats = getTodayStats();
  const scored = getScoredActionableItems();
  const now = working.now;
  const next = working.comingUp ?? scored.find((candidate) => candidate.item.id !== now?.item.id)?.item ?? null;
  const important = scored.filter((candidate) => candidate.item.id !== now?.item.id).slice(0, 4);
  const energyMood = getEnergyMoodData();
  const smartRescheduling = getSmartReschedulingSummary();
  const reinforcement = getPositiveReinforcement("command-center");

  return `
    <section id="command-center" class="section command-center-mode">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Command Center</p>
          <h2>All-day dashboard</h2>
        </div>
        <div class="button-row">
          <button type="button" data-action="start-working">Working Mode</button>
          <button type="button" class="secondary-button" data-action="show-dashboard">Full dashboard</button>
        </div>
      </div>
      ${renderStarterAcknowledgement()}
      <div class="command-center-grid">
        ${renderCommandNow(now)}
        ${renderCommandNext(next)}
        ${renderCommandMiddlePrompt({ tip: briefing.tip, reinforcement })}
        ${renderCommandToday(important)}
        ${renderCommandStatus({ stats, energyMood, briefing, smartRescheduling })}
        ${renderCommandAlerts({ intervention: working.intervention ?? briefing.intervention, smartRescheduling })}
      </div>
    </section>
  `;
}

function renderStarterAcknowledgement() {
  const progressive = getSetupJourneyData().progressive;
  if (!progressive.completed || progressive.starterAcknowledgementDismissed || !progressive.starterItem) {
    return "";
  }

  return `
    <aside class="starter-acknowledgement" aria-live="polite">
      <div>
        <strong>Saved: ${escapeHtml(progressive.starterItem.title)}</strong>
        <p>${escapeHtml(progressive.starterItem.message)}</p>
        <span>Location: ${escapeHtml(progressive.starterItem.location ?? progressive.starterItem.type)}</span>
      </div>
      <button type="button" class="secondary-button" data-action="dismiss-starter-acknowledgement">Close</button>
    </aside>
  `;
}

function renderProgressView() {
  return `
    <section id="progress" class="section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Progress</p>
          <h2>See what is moving</h2>
        </div>
      </div>
      ${renderLifeAreaDashboard()}
      ${renderEndOfDayReview()}
    </section>
  `;
}

function renderHelpView() {
  return `
    <section id="help" class="section help-view">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Help</p>
          <h2>How to use this assistant</h2>
          <p class="empty-copy">Start small. Add one useful thing, let the assistant help, then teach it more when you are ready.</p>
        </div>
      </div>
      <div class="help-grid">
        <article class="panel">
          <h3>When something pops into your head</h3>
          <p>Use <strong>Quick Add - Capture</strong>. Speak or type one thing, then let the assistant guess where it belongs before saving it.</p>
        </article>
        <article class="panel">
          <h3>When you want to know what to do now</h3>
          <p>Use <strong>View - Command Center</strong> or <strong>View - Focus View</strong>. These are the places for the next action.</p>
        </article>
        <article class="panel">
          <h3>When you want to teach the assistant more</h3>
          <p>Use <strong>Teach Assistant</strong> for goals, habits, routines, and recurring tasks. These make recommendations smarter over time.</p>
        </article>
        <article class="panel">
          <h3>Goals, projects, habits, routines, and repeats</h3>
          <p><strong>Goals</strong> are outcomes you want help moving toward. <strong>Projects</strong> are bigger things with several actions inside them. <strong>Habits</strong> are repeatable actions. <strong>Routines</strong> are ordered steps. <strong>Recurring tasks</strong> are responsibilities that come back automatically.</p>
        </article>
        <article class="panel">
          <h3>When you need an hourly plan</h3>
          <p>Use <strong>View - Hourly View</strong> to add a task, habit, routine, project item, note, or meal directly into a time block. Scheduled tasks from there feed back into Today, Command Center, and Focus View.</p>
        </article>
        <article class="panel">
          <h3>When you are setting up your day</h3>
          <p>Use <strong>View - Day Glimpse</strong>. It shows big things, scheduled items, issues, and the best way to start.</p>
        </article>
        <article class="panel">
          <h3>When food or shopping comes up</h3>
          <p>Use <strong>Quick Add - Food + Pantry</strong>. You can type, paste, or speak items, then approve the cleaned list.</p>
        </article>
        <article class="panel">
          <h3>What is not built yet</h3>
          <p>Real wake-up alarms, phone notifications, calendar sync, email, accounts, and cloud backup are not active yet. This version is local-first.</p>
        </article>
      </div>
    </section>
  `;
}

function renderSetupJourney() {
  const journey = getSetupJourneyData();
  return `
    <section id="setup" class="section setup-view">
      ${renderProgressiveSetup(journey.progressive)}
      ${renderTeachMorePanel(journey)}
    </section>
  `;
}

function renderProgressiveSetup(progressive) {
  if (progressive.completed) {
    return `
      <div class="setup-hero panel">
        <p class="eyebrow">Ready</p>
        <h2>You taught your assistant where to begin.</h2>
        <p>${escapeHtml(progressive.starterItem?.message ?? "I created one useful starting point and brought you to Command Center.")}</p>
        <div class="starter-summary">
          <strong>${escapeHtml(progressive.starterItem?.type ?? "Starter item")}</strong>
          <span>${escapeHtml(progressive.starterItem?.title ?? progressive.firstThing)}</span>
        </div>
        <div class="button-row">
          <button type="button" data-action="show-command-center">Go To Command Center</button>
          <button type="button" class="secondary-button" data-action="show-teach-more">Teach My Assistant More</button>
        </div>
      </div>
    `;
  }

  if (progressive.step === "name") {
    return renderProgressiveNameStep(progressive);
  }

  if (progressive.step === "help") {
    return renderProgressiveHelpStep(progressive);
  }

  if (progressive.step === "detail") {
    return renderProgressiveDetailStep(progressive);
  }

  if (progressive.step === "review") {
    return renderProgressiveReviewStep(progressive);
  }

  return renderLandingIntro();
}

function renderLandingIntro() {
  return `
    <div class="landing-intro panel">
      <div class="video-placeholder">
        <iframe
          src="https://www.youtube.com/embed/dBDXQkTPAUg"
          title="Life Enablement Assistant intro video"
          style="width: 100%; aspect-ratio: 16 / 9; min-height: 320px; border: 0; display: block;"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen>
        </iframe>
      </div>
      <div class="landing-copy">
        <p class="eyebrow">Life Enablement Assistant</p>
        <p>This is a personal assistant for the legwork of life: remembering what matters, reducing small decisions, and helping you start with one useful next step.</p>
        <p>You only need one thing to begin. As the assistant becomes useful, you can teach it more about goals, habits, routines, bills, meals, health details, and the life you want more room for.</p>
        <div class="button-row">
          <button type="button" data-action="start-progressive-setup">Start Building My Assistant</button>
          <button type="button" class="secondary-button" data-action="show-teach-more">Teach My Assistant More</button>
        </div>
      </div>
    </div>
  `;
}

function renderProgressiveNameStep(progressive) {
  return `
    <article class="panel progressive-card">
      <p class="eyebrow">Step 1</p>
      <h2>What should I call you?</h2>
      <p class="empty-copy">This is only used to make the assistant feel more personal in this browser.</p>
      <form class="progressive-form" data-action="save-progressive-name">
        <label for="progressive-name">Name</label>
        <input id="progressive-name" name="progressiveName" type="text" value="${escapeHtml(progressive.name)}" placeholder="Your name" required />
        <button type="submit">Continue</button>
      </form>
    </article>
  `;
}

function renderProgressiveHelpStep(progressive) {
  return `
    <article class="panel progressive-card">
      <p class="eyebrow">Step 2</p>
      <h2>What would you like help with first?</h2>
      <p class="empty-copy">Choose one area. This does not lock you in; it just gives the assistant a useful place to begin.</p>
      <form class="progressive-choice-grid" data-action="save-progressive-help">
        ${progressive.helpAreas
          .map(
            (area) => `
              <label class="choice-card">
                <input type="radio" name="helpArea" value="${escapeHtml(area.id)}" ${progressive.helpArea === area.id ? "checked" : ""} required />
                <span>${escapeHtml(area.label)}</span>
              </label>
            `,
          )
          .join("")}
        <button type="submit">Continue</button>
      </form>
    </article>
  `;
}

function renderProgressiveDetailStep(progressive) {
  return `
    <article class="panel progressive-card">
      <p class="eyebrow">Step 3</p>
      <h2>${escapeHtml(progressive.followUpPrompt)}</h2>
      <p class="empty-copy">${escapeHtml(progressive.helperText)}</p>
      <form class="progressive-form" data-action="complete-progressive-setup">
        <label for="first-thing">One thing to start with</label>
        <input id="first-thing" name="firstThing" type="text" value="${escapeHtml(progressive.firstThing)}" placeholder="Example: pay a bill, pick up kid after school, child is in car for school drop-off" required />
        <label for="more-things">Optional: add more if you already know them</label>
        <textarea id="more-things" name="moreThings" rows="3" placeholder="One per line, or leave this blank">${escapeHtml(progressive.moreThings)}</textarea>
        <p class="field-help">${escapeHtml(progressive.optionalText)}</p>
        <button type="submit">Start With This</button>
      </form>
    </article>
  `;
}

function renderProgressiveReviewStep(progressive) {
  const starterType = progressive.starterItem?.type ?? "Task";

  return `
    <article class="panel progressive-card">
      <p class="eyebrow">Review</p>
      <h2>Does this look right?</h2>
      <p class="empty-copy">Your assistant guessed where this belongs. Change it if the guess is wrong, then save it.</p>
      <form class="progressive-form" data-action="complete-progressive-setup">
        <input type="hidden" name="confirmProgressiveSetup" value="true" />
        <input type="hidden" name="firstThing" value="${escapeHtml(progressive.firstThing)}" />
        <input type="hidden" name="moreThings" value="${escapeHtml(progressive.moreThings)}" />
        <div class="starter-summary">
          <strong>Captured</strong>
          <span>${escapeHtml(progressive.firstThing)}</span>
        </div>
        <div>
          <label for="starter-type">Save this as</label>
          <select id="starter-type" name="starterType">
            ${["Goal", "Habit", "Task"].map((type) => `<option value="${type}" ${type === starterType ? "selected" : ""}>${type}</option>`).join("")}
          </select>
        </div>
        <p class="field-help">${escapeHtml(progressive.starterItem?.message ?? "Choose where this belongs before saving.")}</p>
        <div class="button-row">
          <button type="submit">Save This</button>
          <button type="button" class="secondary-button" data-action="restart-progressive-detail">Edit My Answer</button>
        </div>
      </form>
    </article>
  `;
}

function renderTeachMorePanel(journey) {
  return `
    <details class="teach-more-panel panel" id="teach-more">
      <summary>Teach My Assistant More</summary>
      <div class="teach-more-intro">
        <p>You do not need to complete this now. Add more when you feel ready.</p>
        <p>More detail helps the assistant give better suggestions. Personal information like medications, supplements, bills, meals, and routines can be added later when you are comfortable.</p>
      </div>
      <article>
        <div class="panel-title">
          <div>
            <h3>Optional setup areas</h3>
            <p class="empty-copy">Open one, fill out what you want, or skip it and come back later.</p>
          </div>
          ${pill(`${journey.completeCount}/${journey.totalCount} done`, "strong")}
        </div>
        <div class="setup-step-list">
          ${journey.steps.map(renderSetupStep).join("")}
        </div>
      </article>
      <article class="progressive-prompts">
        <h3>Examples of how your assistant may ask for more later</h3>
        <ul>
          ${journey.progressive.promptExamples.map((example) => `<li>${escapeHtml(example)}</li>`).join("")}
        </ul>
      </article>
    </details>
  `;
}

function renderSetupStep(step) {
  const tone = step.complete ? "strong" : step.skipped ? "warn" : "neutral";
  return `
    <article class="setup-step ${step.complete ? "is-complete" : ""} ${step.skipped ? "is-skipped" : ""}">
      <div>
        <div class="setup-step-heading">
          <h3>${escapeHtml(step.title)}</h3>
          ${pill(step.status, tone)}
        </div>
        <p>${escapeHtml(step.summary)}</p>
        <dl class="setup-step-details">
          <div>
            <dt>What it is</dt>
            <dd>${escapeHtml(step.what)}</dd>
          </div>
          <div>
            <dt>How you use it</dt>
            <dd>${escapeHtml(step.userUse)}</dd>
          </div>
          <div>
            <dt>How the app uses it</dt>
            <dd>${escapeHtml(step.appUse)}</dd>
          </div>
          <div>
            <dt>Big picture</dt>
            <dd>${escapeHtml(step.bigPicture)}</dd>
          </div>
          <div>
            <dt>Day to day</dt>
            <dd>${escapeHtml(step.smallPicture)}</dd>
          </div>
        </dl>
      </div>
      <div class="button-row">
        <button type="button" data-action="start-setup-step" data-step-id="${escapeHtml(step.id)}">${step.complete ? "Review" : "Open Step"}</button>
        ${step.complete ? "" : `<button type="button" class="secondary-button" data-action="skip-setup-step" data-step-id="${escapeHtml(step.id)}">Skip For Now</button>`}
      </div>
    </article>
  `;
}

function renderSetupGuide(stepId) {
  const step = getSetupJourneyData().steps.find((item) => item.id === stepId);
  if (!step) {
    return "";
  }

  return `
    <aside class="setup-guide">
      <div>
        <p class="eyebrow">Setup Stop</p>
        <strong>${escapeHtml(step.title)}</strong>
        <p>${escapeHtml(step.summary)}</p>
        <p class="empty-copy">${escapeHtml(step.appUse)}</p>
      </div>
      <div class="button-row">
        <button type="button" class="secondary-button" data-action="show-setup">Back To Setup</button>
        ${step.complete ? "" : `<button type="button" class="secondary-button" data-action="skip-setup-step" data-step-id="${escapeHtml(step.id)}">Skip This Stop</button>`}
      </div>
    </aside>
  `;
}

function renderPlaceholderView(viewName, title, copy) {
  return `
    <section id="${escapeHtml(viewName)}" class="section placeholder-view">
      <article class="panel">
        <p class="eyebrow">${escapeHtml(title)}</p>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(copy)}</p>
        <p class="empty-copy">This placeholder is intentionally local-only. No integrations, accounts, payments, or shopping flows are active.</p>
      </article>
    </section>
  `;
}

function renderAccountView() {
  const account = getAccountSettings();
  const hasPhoto = Boolean(account.profilePhotoDataUrl);

  return `
    <section id="account" class="section account-view">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Account</p>
          <h2>Your profile and privacy</h2>
          <p class="empty-copy">This prototype stores your information locally in this browser. A full online account system is not active yet.</p>
        </div>
        ${account.privacyLock.enabled ? `<button type="button" data-action="lock-app">Lock App</button>` : ""}
      </div>
      ${renderSetupGuide("account")}
      <div class="account-grid">
        <article class="panel account-profile-panel">
          <div class="profile-photo-preview">
            ${hasPhoto ? `<img src="${escapeHtml(account.profilePhotoDataUrl)}" alt="Profile" />` : `<span>${escapeHtml(getProfileInitial(account.displayName))}</span>`}
          </div>
          <form class="account-form" data-action="save-account-profile">
            <div>
              <label for="account-display-name">Name</label>
              <input id="account-display-name" name="displayName" type="text" value="${escapeHtml(account.displayName)}" placeholder="Your name" />
            </div>
            <button type="submit">Save Profile</button>
          </form>
          <div class="photo-upload">
            <label for="profile-photo">Profile picture</label>
            <input id="profile-photo" type="file" accept="image/*" data-action="upload-profile-photo" />
            ${hasPhoto ? `<button type="button" class="secondary-button" data-action="clear-profile-photo">Remove Picture</button>` : ""}
          </div>
        </article>
        <article class="panel privacy-panel">
          <div class="panel-title">
            <div>
              <h3>Privacy Lock</h3>
              <p class="empty-copy">Blocks casual access on this browser. This is not a full production login or encrypted cloud account.</p>
            </div>
            ${account.privacyLock.enabled ? pill("On", "strong") : pill("Off", "neutral")}
          </div>
          <form class="account-form" data-action="save-privacy-lock">
            <div>
              <label for="privacy-passcode">Set or change passcode</label>
              <input id="privacy-passcode" name="passcode" type="password" minlength="4" autocomplete="new-password" placeholder="At least 4 characters" />
            </div>
            <div>
              <label for="privacy-passcode-confirm">Confirm passcode</label>
              <input id="privacy-passcode-confirm" name="confirmPasscode" type="password" minlength="4" autocomplete="new-password" placeholder="Type it again" />
            </div>
            ${account.unlockError ? `<p class="form-error">${escapeHtml(account.unlockError)}</p>` : ""}
            <div class="button-row">
              <button type="submit">${account.privacyLock.configured ? "Update Lock" : "Turn On Lock"}</button>
              ${account.privacyLock.enabled ? `<button type="button" class="secondary-button" data-action="disable-privacy-lock">Turn Off Lock</button>` : ""}
            </div>
          </form>
          <p class="empty-copy">When the app is locked, the personal dashboard is hidden until the passcode is entered. Closing and reopening the browser will ask again.</p>
        </article>
      </div>
    </section>
  `;
}

function getProfileInitial(displayName) {
  return String(displayName || "You").trim().charAt(0).toUpperCase() || "Y";
}

function renderUnlockScreen() {
  const account = getAccountSettings();
  return `
    <main class="lock-screen">
      <section class="lock-card panel">
        <div class="profile-photo-preview compact">
          ${account.profilePhotoDataUrl ? `<img src="${escapeHtml(account.profilePhotoDataUrl)}" alt="Profile" />` : `<span>${escapeHtml(getProfileInitial(account.displayName))}</span>`}
        </div>
        <p class="eyebrow">Privacy Lock</p>
        <h1>Welcome back${account.displayName ? `, ${escapeHtml(account.displayName)}` : ""}</h1>
        <p>Your Life Enablement Assistant is locked on this browser.</p>
        <form class="account-form" data-action="unlock-app">
          <label for="unlock-passcode">Passcode</label>
          <input id="unlock-passcode" name="passcode" type="password" autocomplete="current-password" autofocus />
          ${account.unlockError ? `<p class="form-error">${escapeHtml(account.unlockError)}</p>` : ""}
          <button type="submit">Unlock</button>
        </form>
        <p class="empty-copy">Prototype note: this is a local privacy lock, not a full online login.</p>
      </section>
    </main>
  `;
}

function renderSettingsView() {
  const appearance = getAppearanceSettings();
  const hasImage = Boolean(appearance.imageDataUrl);

  return `
    <section id="settings" class="section settings-view">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Settings</p>
          <h2>Make the space feel like yours</h2>
          <p class="empty-copy">Choose a calm color or use one of your own photos as the backdrop. The overlay keeps the assistant readable.</p>
        </div>
      </div>
      ${renderSetupGuide("settings")}
      <article class="panel appearance-panel">
        <div class="panel-title">
          <div>
            <h3>Appearance</h3>
            <p class="empty-copy">Photos are saved locally in this browser for prototype testing.</p>
          </div>
          ${hasImage ? pill(appearance.imageName || "Photo selected", "strong") : pill("Color background", "neutral")}
        </div>
        <form class="appearance-form" data-action="save-appearance">
          <fieldset>
            <legend>Background</legend>
            <label class="radio-card">
              <input type="radio" name="backgroundType" value="color" ${appearance.backgroundType === "color" || !hasImage ? "checked" : ""} />
              <span>Color</span>
            </label>
            <label class="radio-card">
              <input type="radio" name="backgroundType" value="image" ${appearance.backgroundType === "image" && hasImage ? "checked" : ""} ${hasImage ? "" : "disabled"} />
              <span>My photo</span>
            </label>
          </fieldset>
          <div>
            <label for="appearance-color">Background color</label>
            <input id="appearance-color" name="backgroundColor" type="color" value="${escapeHtml(appearance.backgroundColor)}" />
          </div>
          <div>
            <label for="appearance-overlay">Photo softness</label>
            <select id="appearance-overlay" name="overlay">
              ${renderOptionList(["light", "medium", "strong"], appearance.overlay, titleCase)}
            </select>
            <p class="empty-copy">Use stronger softness when a photo has bright skies, flowers, or high contrast.</p>
          </div>
          <div class="button-row">
            <button type="submit">Save Appearance</button>
            ${hasImage ? `<button type="button" class="secondary-button" data-action="clear-appearance-image">Remove Photo</button>` : ""}
          </div>
        </form>
        <div class="photo-upload">
          <label for="appearance-image">Use one of my photos</label>
          <input id="appearance-image" type="file" accept="image/*" data-action="upload-appearance-image" />
          <p class="empty-copy">Choose a sunset, flower, or landscape image. Very large photos may need to be resized later for production, but this works for testing.</p>
        </div>
      </article>
      <details class="panel settings-testing-panel">
        <summary>
          <span>
            <strong>Prototype tools</strong>
            <small>Reset onboarding or load sample data for testing.</small>
          </span>
        </summary>
        <div class="prototype-tool-grid">
          <button type="button" class="secondary-button" data-action="reset-progressive-onboarding">Reset Onboarding</button>
          <button type="button" class="secondary-button" data-action="reset-local-data">Reset App Data</button>
          <button type="button" class="secondary-button" data-action="load-demo" data-demo-id="adhd-weight-loss">Load Focus + Weight Loss Demo</button>
          <button type="button" class="secondary-button" data-action="load-demo" data-demo-id="adhd-muscle-gain">Load Focus + Muscle Gain Demo</button>
          <button type="button" class="secondary-button" data-action="load-demo" data-demo-id="self-employed">Load Self Employed Demo</button>
        </div>
      </details>
    </section>
  `;
}

function renderShopView() {
  return `
    <section id="shop" class="section shop-view">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Life Input</p>
          <h2>Food and shopping support</h2>
          <p class="empty-copy">Start by telling the assistant what food you have. This gives it useful context for future meal and shopping suggestions.</p>
        </div>
      </div>
      ${renderSetupGuide("shop")}
      <div class="shop-list-grid">
        ${renderVoiceListEntry(getVoiceListEntryData("foodMeals"))}
        ${renderVoiceListEntry(getVoiceListEntryData("shoppingList"))}
      </div>
      ${renderSavedMealsPanel()}
      <p class="empty-copy">These are local prototype lists only. No shopping, delivery, account, payment, or integration flow is active.</p>
    </section>
  `;
}

function renderListsView() {
  const listData = getVoiceListEntryData("generalList");

  return `
    <section id="lists" class="section lists-view">
      <div class="section-heading">
        <div>
          <p class="eyebrow">List Builder</p>
          <h2>Make any list</h2>
          <p class="empty-copy">Use this for parts, garden supplies, camping gear, 3D printer materials, packing lists, project supplies, or anything that needs a list without becoming a task.</p>
        </div>
      </div>
      <form class="panel general-list-name-form" data-action="set-general-list-name">
        <div>
          <label for="general-list-name">List name</label>
          <input id="general-list-name" name="generalListName" type="text" value="${escapeHtml(listData.activeListName)}" placeholder="Motorcycle parts list" />
          <p class="field-help">Name the list first, choose what kind of list it is, then add items by typing, pasting, or voice.</p>
        </div>
        <div>
          <label for="general-list-type">List type</label>
          <select id="general-list-type" name="generalListType">
            ${listData.listTypes.map((type) => `<option value="${escapeHtml(type.value)}" ${type.value === listData.activeListType ? "selected" : ""}>${escapeHtml(type.label)}</option>`).join("")}
          </select>
        </div>
        <button type="submit">Use This List</button>
      </form>
      ${renderVoiceListEntry(listData)}
    </section>
  `;
}

function renderSavedMealsPanel() {
  const meals = getState().meals ?? [];

  return `
    <article class="panel saved-meals-panel" data-window-title="Meals">
      <div class="panel-title">
        <h3>Meals</h3>
        ${pill(`${meals.length} saved`, meals.length ? "strong" : "neutral")}
      </div>
      ${
        meals.length === 0
          ? `<p class="empty-copy">Meals added from the Hourly View will appear here.</p>`
          : `<ul class="briefing-list">${meals.map((meal) => `<li><strong>${escapeHtml(meal.title)}</strong><span>${escapeHtml(meal.time ?? "Today")}</span></li>`).join("")}</ul>`
      }
    </article>
  `;
}

function renderStoreView() {
  return `
    <section id="store" class="section store-view">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Store</p>
          <h2>Helpful products and resources</h2>
          <p class="empty-copy">This area is for resources that support daily structure, wellness routines, and the kind of steady follow-through this assistant is built around.</p>
        </div>
      </div>
      <div class="store-grid">
        <article class="panel store-feature">
          <p class="eyebrow">Coming later</p>
          <h3>Products and resources</h3>
          <p>Supplements and wellness tools can be part of a bigger support system: routines, hydration, movement, planning, and better daily structure. This area is a placeholder for a future shop link, without turning the assistant itself into a checkout screen.</p>
          <div class="button-row">
            <a class="button-link" href="#">Open Store</a>
          </div>
        </article>
        <article class="panel">
          <h3>How this fits the assistant</h3>
          <p>The assistant can help someone remember routines, notice what is working, and make space for healthier habits. The store is separate: it is where related products and resources can live when someone wants to look deeper.</p>
        </article>
        <article class="panel">
          <h3>Clear and honest wording</h3>
          <p>This area should talk about personal experience, wellness support, and daily routines. It should not claim that products treat, cure, or fix medical conditions.</p>
        </article>
      </div>
      <p class="empty-copy">No payment, account, checkout, or supplement tracking is active inside this prototype. The store link will be connected later.</p>
    </section>
  `;
}

function renderVoiceListEntry(data, options = {}) {
  const modeClass = options.compact ? "voice-list-entry compact" : "voice-list-entry";
  const textareaId = `voice-list-text-${data.targetId}`;

  return `
    <article class="${modeClass}" data-voice-list-target="${escapeHtml(data.targetId)}">
      <div class="panel-title">
        <div>
          <h3>${escapeHtml(data.title)}</h3>
          <p class="empty-copy">${escapeHtml(data.inputHelp)}</p>
        </div>
        ${pill(data.speechSupported ? "Voice ready" : "Typing fallback", data.speechSupported ? "strong" : "neutral")}
      </div>
      <form class="voice-list-form" data-action="review-voice-list" data-target-id="${escapeHtml(data.targetId)}">
        <label for="${escapeHtml(textareaId)}">${escapeHtml(data.inputLabel)}</label>
        <textarea id="${escapeHtml(textareaId)}" name="voiceListText" rows="3" placeholder="${escapeHtml(data.placeholder)}"></textarea>
        <div class="button-row">
          <button type="button" data-action="start-voice-list" data-target-id="${escapeHtml(data.targetId)}" ${data.speechSupported ? "" : "disabled"}>Start Voice</button>
          <button type="submit">Review List</button>
          <button type="button" class="secondary-button" data-action="clear-voice-list" data-target-id="${escapeHtml(data.targetId)}">Clear</button>
        </div>
        <p class="voice-list-speech-note">When speaking, say <strong>comma</strong> between items so each one becomes its own line.</p>
      </form>
      ${renderVoiceListReview(data)}
      ${renderSavedVoiceList(data)}
    </article>
  `;
}

function renderVoiceListReview(data) {
  if (data.draft.items.length === 0) {
    return `
      <div class="voice-list-review">
        <h4>Items for Approval</h4>
        <p class="empty-copy">No items waiting for approval yet. After you speak, type, or paste items, they will appear here for review.</p>
      </div>
    `;
  }

  return `
    <div class="voice-list-review">
      <h4>Items for Approval</h4>
      <p class="empty-copy">Review your data input here. It should include only the names of your items, without extra instructions, commas, or filler words. Edit any line first if needed, then click Submit.</p>
      <ul>
        ${data.draft.items
          .map(
            (item) => `
              <li data-voice-list-item="${escapeHtml(item.id)}">
                <input type="text" value="${escapeHtml(item.text)}" aria-label="Edit ${escapeHtml(item.text)}" />
                <button type="button" class="secondary-button" data-action="remove-voice-list-item" data-target-id="${escapeHtml(data.targetId)}" data-id="${escapeHtml(item.id)}">Remove</button>
              </li>
            `,
          )
          .join("")}
      </ul>
      <div class="button-row">
        <button type="button" data-action="approve-voice-list" data-target-id="${escapeHtml(data.targetId)}">Submit</button>
      </div>
    </div>
  `;
}

function renderSavedVoiceList(data) {
  if (data.targetId === "routineSteps") {
    return "";
  }

  if (data.targetId === "generalList") {
    return renderSavedGeneralLists(data);
  }

  return `
    <div class="saved-voice-list">
      <div class="panel-title">
        <div>
          <h4>${escapeHtml(data.savedLabel)}</h4>
          <p class="empty-copy">${escapeHtml(data.savedHelp)}</p>
        </div>
        ${pill(`${data.savedItems.length} saved`, "strong")}
      </div>
      ${
        data.savedItems.length === 0
          ? `<p class="empty-copy">No saved items yet.</p>`
          : `<ul>${data.savedItems.map((item) => renderSavedVoiceListItem(data.targetId, item)).join("")}</ul>`
      }
    </div>
  `;
}

function renderSavedVoiceListItem(targetId, item) {
  return `
    <li class="${item.completed ? "is-list-item-done" : ""}">
      <span>${escapeHtml(item.text)}</span>
      <div class="item-actions">
        ${
          item.completed
            ? `<button type="button" class="secondary-button" data-action="reopen-saved-voice-list-item" data-target-id="${escapeHtml(targetId)}" data-id="${escapeHtml(item.id)}">Reopen</button>`
            : `<button type="button" data-action="mark-saved-voice-list-item-done" data-target-id="${escapeHtml(targetId)}" data-id="${escapeHtml(item.id)}">Done</button>`
        }
        <button type="button" class="secondary-button" data-action="delete-saved-voice-list-item" data-target-id="${escapeHtml(targetId)}" data-id="${escapeHtml(item.id)}">Remove</button>
      </div>
    </li>
  `;
}

function renderSavedGeneralLists(data) {
  return `
    <div class="saved-voice-list saved-general-lists">
      <div class="panel-title">
        <div>
          <h4>${escapeHtml(data.savedLabel)}</h4>
          <p class="empty-copy">${escapeHtml(data.savedHelp)}</p>
        </div>
        ${pill(`${data.savedItems.length} saved`, "strong")}
      </div>
      ${
        data.savedGroups.length === 0
          ? `<p class="empty-copy">No saved list items yet.</p>`
          : data.savedGroups
              .map(
                (group) => `
                  <section class="saved-list-group">
                    <div class="saved-list-group-heading">
                      <div>
                        <h5>${escapeHtml(group.listName)}</h5>
                        <p>${escapeHtml(getGeneralListProgressText(group))}</p>
                      </div>
                      <div class="item-actions">
                        ${
                          group.complete
                            ? `<button type="button" class="secondary-button" data-action="reopen-general-list" data-list-name="${escapeHtml(group.listName)}">Reopen List</button>`
                            : `<button type="button" data-action="mark-general-list-done" data-list-name="${escapeHtml(group.listName)}">Mark List Done</button>`
                        }
                      </div>
                    </div>
                    <ul>${group.items.map((item) => renderSavedVoiceListItem(data.targetId, item)).join("")}</ul>
                  </section>
                `,
              )
              .join("")
      }
    </div>
  `;
}

function getGeneralListProgressText(group) {
  if (group.complete) {
    return `${group.listTypeLabel} complete.`;
  }

  const noun = {
    todo: "actions",
    supplies: "items to get",
    packing: "items to pack",
    reference: "items",
    checklist: "items",
  }[group.listType] ?? "items";

  return `${group.openCount} ${noun} open, ${group.completedCount} done. Is this list finished yet?`;
}

function renderCommandHeader(label, action, ariaLabel) {
  return `
    <button type="button" class="command-section-link" data-action="${escapeHtml(action)}" aria-label="${escapeHtml(ariaLabel)}">
      ${escapeHtml(label)}
    </button>
  `;
}

function renderCommandNow(recommendation) {
  if (!recommendation) {
    return `
      <article class="panel command-card command-now" data-window-title="Now">
        ${renderCommandHeader("Now", "show-today", "Open Today controls")}
        <h3>Your current thing goes here.</h3>
        <p class="command-helper-copy">This is the one thing your assistant thinks you should be doing now. To enter one, click the <strong>Now</strong> link and add a task in Today.</p>
        <p class="empty-copy">If nothing is truly due right now, this space can stay open.</p>
      </article>
    `;
  }

  const timingClass = getScheduledTimingClass(recommendation);
  return `
    <article class="panel command-card command-now${timingClass}" data-window-title="Now">
      ${renderCommandHeader("Now", "show-today", "Open Today controls")}
      <h3>${escapeHtml(recommendation.title)}</h3>
      <p>${escapeHtml(getShortWhy(recommendation))}</p>
      <div class="command-meta">
        ${pill(`${recommendation.effort} min`, "neutral")}
        ${pill(`Score ${recommendation.score}`, "strong")}
      </div>
      <div class="button-row">
        <button type="button" data-action="do-it-now" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">Start</button>
        <button type="button" data-action="mark-done" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">${escapeHtml(getPrimaryCompletionLabel(recommendation.collection))}</button>
        <button type="button" data-action="snooze" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">Snooze</button>
        <button type="button" data-action="skip" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">Skip</button>
      </div>
    </article>
  `;
}

function renderCommandNext(item) {
  if (!item) {
    return `
      <article class="panel command-card command-next" data-window-title="Next">
        ${renderCommandHeader("Next", "show-dashboard", "Open Day Glimpse")}
        <h3>Your next thing goes here.</h3>
        <p class="command-helper-copy">This is what is coming up after Now. Try it by adding a scheduled task for the next hour in Today or Hourly View.</p>
        <p class="empty-copy">Scheduled items appear here when they have a time.</p>
      </article>
    `;
  }

  return `
    <article class="panel command-card command-next" data-window-title="Next">
      ${renderCommandHeader("Next", "show-dashboard", "Open Day Glimpse")}
      <h3>${escapeHtml(item.title ?? item.name)}</h3>
      <p>${escapeHtml(item.startTime ?? item.time ?? item.dueDate ?? item.deadline ?? item.type ?? "Up next")}</p>
    </article>
  `;
}

function renderCommandToday(items) {
  return `
    <article class="panel command-card command-today" data-window-title="Today">
      <div class="panel-title">
        ${renderCommandHeader("Today", "show-dashboard", "Open Today")}
        ${pill(`${items.length} important`, "strong")}
      </div>
      ${
        items.length === 0
          ? `<div class="command-empty-guide">
              <h3>Important items will show here.</h3>
              <p>This area is for the rest of today: tasks, list follow-up, habits, or routines that matter but are not the one thing in Now.</p>
            </div>`
          : `<ul class="command-list">${items.map((candidate) => renderCommandTodayItem(candidate)).join("")}</ul>`
      }
    </article>
  `;
}

function renderCommandTodayItem(candidate) {
  return `
    <li>
      <div>
        <strong>${escapeHtml(candidate.title)}</strong>
        <span>${escapeHtml(getShortWhy(candidate))}</span>
      </div>
      <div class="item-actions">
        <button type="button" data-action="mark-done" data-collection="${candidate.collection}" data-id="${escapeHtml(candidate.item.id)}">${escapeHtml(getPrimaryCompletionLabel(candidate.collection))}</button>
        <button type="button" data-action="snooze" data-collection="${candidate.collection}" data-id="${escapeHtml(candidate.item.id)}">Snooze</button>
      </div>
    </li>
  `;
}

function renderCommandMiddlePrompt({ tip, reinforcement }) {
  if (tip) {
    return `
      <article class="panel command-middle-prompt" data-window-title="Tip">
        <strong>${escapeHtml(tip.category)}</strong>
        <span>${escapeHtml(tip.text)}</span>
      </article>
    `;
  }

  return `
    <article class="panel command-middle-prompt" data-window-title="Motivation">
      <strong>${escapeHtml(reinforcement.text)}</strong>
      <span>${escapeHtml(reinforcement.source)}</span>
    </article>
  `;
}

function renderCommandStatus({ stats, energyMood, briefing, smartRescheduling }) {
  const latest = energyMood.latestCheckIn;
  const strongestHabit = [...briefing.habits.activeHabits].sort((left, right) => (right.streak?.currentStreak ?? 0) - (left.streak?.currentStreak ?? 0))[0];
  const workload = smartRescheduling.load?.today ?? { items: stats.open, minutes: 0 };

  return `
    <article class="panel command-card command-status-card" data-window-title="Status">
      ${renderCommandHeader("Status", "focus-status-update", "Update Status")}
      ${!latest ? `<p class="command-helper-copy">This shows how you are doing: mood, energy, progress, streaks, and workload. Use the quick status fields below to teach the assistant what kind of support fits right now.</p>` : ""}
      <dl class="command-status">
        <div><dt>Mood</dt><dd>${escapeHtml(latest?.mood ? titleCase(latest.mood) : "Not checked")}</dd></div>
        <div><dt>Energy</dt><dd>${escapeHtml(latest?.energy ? titleCase(latest.energy) : "Not checked")}</dd></div>
        <div><dt>Progress</dt><dd>${stats.done} done / ${stats.open} open</dd></div>
        <div><dt>Streak</dt><dd>${escapeHtml(strongestHabit ? `${strongestHabit.name}: ${strongestHabit.streak.currentStreak}` : "No active streak yet")}</dd></div>
        <div><dt>Workload</dt><dd>${workload.items} items / ${workload.minutes} min</dd></div>
      </dl>
      <form class="command-status-form" data-action="save-energy-mood">
        <div>
          <label for="command-status-mood">Update mood</label>
          <select id="command-status-mood" name="mood">
            ${renderOptionList(energyMood.moods, latest?.mood ?? "steady", titleCase)}
          </select>
        </div>
        <div>
          <label for="command-status-energy">Update energy</label>
          <select id="command-status-energy" name="energy">
            ${renderOptionList(energyMood.energyLevels, latest?.energy ?? "medium", titleCase)}
          </select>
        </div>
        <input type="hidden" name="energyMoodNote" value="" />
        <button type="submit">Update Status</button>
      </form>
    </article>
  `;
}

function renderCommandTip(tip) {
  if (!tip) {
    return "";
  }

  return `
    <article class="panel command-card" data-window-title="Tip">
      ${renderCommandHeader("Tip", "show-learn", "Open Learn")}
      <h3>${escapeHtml(tip.category)}</h3>
      <p>${escapeHtml(tip.text)}</p>
    </article>
  `;
}

function renderCommandAlerts({ intervention, smartRescheduling }) {
  const notices = [
    ...(intervention ? [{ title: intervention.title, detail: intervention.message }] : []),
    ...(smartRescheduling.moved ?? []).slice(0, 2).map((item) => ({ title: item.title, detail: item.reason })),
    ...(smartRescheduling.conflicts ?? []).slice(0, 2).map((item) => ({ title: item.title, detail: `Conflict: try ${item.suggestedAlternative}` })),
  ];

  if (notices.length === 0) {
    return "";
  }

  return `
    <article class="panel command-card command-alerts" data-window-title="Alerts">
      <div class="panel-title">
        ${renderCommandHeader("Alerts", "show-dashboard", "Open Today")}
        ${pill(`${notices.length}`, "warn")}
      </div>
      <ul class="command-list">${notices.map((item) => `<li><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></div></li>`).join("")}</ul>
    </article>
  `;
}

function renderCommandPositiveMessage(message) {
  return `
    <article class="panel command-card command-positive" data-window-title="Motivation">
      ${renderCommandHeader("Motivation", "show-progress", "Open Progress")}
      <h3>${escapeHtml(message.text)}</h3>
      <span>${escapeHtml(message.source)}</span>
    </article>
  `;
}

function renderPositiveReinforcementBanner(message) {
  if (!message) {
    return "";
  }

  return `
    <aside class="positive-reinforcement-banner" aria-label="Positive reinforcement">
      <div>
        <p class="eyebrow">Motivation</p>
        <strong>${escapeHtml(message.text)}</strong>
      </div>
      <span>${escapeHtml(message.source)}</span>
    </aside>
  `;
}

function getShortWhy(recommendation) {
  return String(recommendation.why ?? recommendation.explanation?.whyNow ?? "Best available next step.")
    .split("\n")
    .filter(Boolean)[0] ?? "Best available next step.";
}

function renderTipCard(tip) {
  if (!tip) {
    return "";
  }

  return `
    <aside class="tip-card" aria-label="Helpful Strategy">
      <div>
        <p class="eyebrow">Helpful Strategy</p>
        <strong>${escapeHtml(tip.category)}</strong>
      </div>
      <p>${escapeHtml(tip.text)}</p>
      <span>${escapeHtml(tip.reason)}</span>
    </aside>
  `;
}

function renderInterventionCard(intervention, contextName) {
  if (!intervention) {
    return "";
  }

  return `
    <aside class="intervention-card" aria-label="Support Shift">
      <div>
        <p class="eyebrow">Support Shift</p>
        <strong>${escapeHtml(intervention.title)}</strong>
      </div>
      <div>
        <p>${escapeHtml(intervention.message)}</p>
        <span>${escapeHtml(intervention.reason)}</span>
      </div>
      <div class="button-row">
        <button type="button" data-action="complete-intervention" data-id="${escapeHtml(intervention.id)}" data-context="${escapeHtml(contextName)}">${escapeHtml(intervention.actionLabel ?? "Done")}</button>
        <button type="button" class="secondary-button" data-action="dismiss-intervention" data-id="${escapeHtml(intervention.id)}" data-context="${escapeHtml(contextName)}">Dismiss</button>
      </div>
    </aside>
  `;
}

function renderEnergyMoodCheckIn(data = getEnergyMoodData()) {
  const latest = data.latestCheckIn;

  return `
    <article class="panel energy-mood-panel">
      <div class="panel-title">
        <div>
          <h3>Energy / Mood Check-In</h3>
          <p class="empty-copy">${escapeHtml(data.summary)}</p>
        </div>
        ${latest ? pill(`${titleCase(latest.energy)} energy`, latest.energy === "low" ? "warn" : "strong") : pill("Quick check", "neutral")}
      </div>
      <form class="energy-mood-form" data-action="save-energy-mood">
        <div>
          <label for="energy-mood-mood">Mood</label>
          <select id="energy-mood-mood" name="mood">
            ${renderOptionList(data.moods, latest?.mood ?? "steady", titleCase)}
          </select>
        </div>
        <div>
          <label for="energy-mood-energy">Energy</label>
          <select id="energy-mood-energy" name="energy">
            ${renderOptionList(data.energyLevels, latest?.energy ?? "medium", titleCase)}
          </select>
        </div>
        <div>
          <label for="energy-mood-note">Optional note</label>
          <input id="energy-mood-note" name="energyMoodNote" type="text" placeholder="Short context, if useful" />
        </div>
        <button type="submit">Save Check-In</button>
      </form>
    </article>
  `;
}

function renderOptionList(options, selectedValue, labelFormatter = (value) => value) {
  return options.map((option) => `<option value="${escapeHtml(option)}" ${option === selectedValue ? "selected" : ""}>${escapeHtml(labelFormatter(option))}</option>`).join("");
}

function renderSmartRescheduling(summary) {
  if (!summary || (summary.moved.length === 0 && summary.conflicts.length === 0 && summary.suggestions.length === 0)) {
    return "";
  }

  return `
    <article class="panel smart-rescheduling-panel">
      <div class="panel-title">
        <h3>Smart Rescheduling</h3>
        ${pill(`${summary.moved.length} adjusted`, summary.moved.length > 0 ? "strong" : "neutral")}
      </div>
      <div class="smart-rescheduling-grid">
        <div>
          <h4>Adjusted today</h4>
          ${renderSmartReschedulingList(
            summary.moved.map((item) => ({ title: item.title, detail: item.reason })),
            "No tasks needed automatic moving.",
          )}
        </div>
        <div>
          <h4>Conflicts</h4>
          ${renderSmartReschedulingList(
            summary.conflicts.map((item) => ({ title: item.title, detail: `Try ${item.suggestedAlternative}` })),
            "No schedule conflicts detected.",
          )}
        </div>
        <div>
          <h4>Load check</h4>
          ${renderSmartReschedulingList(summary.suggestions, "Today looks workable.")}
        </div>
      </div>
    </article>
  `;
}

function renderSmartReschedulingList(items, emptyText) {
  if (!items || items.length === 0) {
    return `<p class="empty-copy">${escapeHtml(emptyText)}</p>`;
  }

  return `
    <ul class="briefing-list">
      ${items
        .map(
          (item) => `
            <li>
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.detail)}</span>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function renderNowCard(working) {
  const recommendation = working.now;
  if (!recommendation) {
    return `
      <article class="working-card now-card">
        <p class="eyebrow">Now</p>
        <h3>Nothing actionable is waiting.</h3>
        <p>Your visible items are complete.</p>
      </article>
    `;
  }

  const timingClass = getScheduledTimingClass(recommendation);
  return `
    <article class="working-card now-card${timingClass}">
      <p class="eyebrow">Now</p>
      <h3>${escapeHtml(recommendation.title)}</h3>
      ${renderRecommendationExplanation(recommendation)}
      <div class="time-remaining">
        <strong>${escapeHtml(working.timeRemaining)}</strong>
      </div>
      ${renderFocusModeControls(recommendation)}
      <div class="button-row">
        <button type="button" data-action="mark-done" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">${escapeHtml(getPrimaryCompletionLabel(recommendation.collection))}</button>
        <button type="button" data-action="snooze" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">Snooze</button>
        <button type="button" data-action="skip" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">Skip</button>
        ${recommendation.collection === "recommendations" ? `<button type="button" data-action="dismiss-recommendation" data-id="${escapeHtml(recommendation.item.id)}">Dismiss</button>` : ""}
        ${recommendation.collection === "guidance" ? `<button type="button" data-action="dismiss-guidance" data-id="${escapeHtml(recommendation.item.id)}">Dismiss</button>` : ""}
        ${recommendation.collection === "morningRoutine" ? `<button type="button" data-action="dismiss-morning-routine" data-id="${escapeHtml(recommendation.item.id)}">Dismiss</button>` : ""}
        ${recommendation.collection === "recoverySuggestions" ? `<button type="button" data-action="dismiss-recovery-suggestion" data-id="${escapeHtml(recommendation.item.id)}">Dismiss</button>` : ""}
        ${!["recommendations", "guidance", "morningRoutine", "recoverySuggestions"].includes(recommendation.collection) ? `<button type="button" data-action="dismiss-item" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">Dismiss</button>` : ""}
      </div>
    </article>
  `;
}

function renderFocusModeControls(recommendation) {
  const focus = getFocusModeData();
  const isThisNow = focus.collection === recommendation.collection && focus.itemId === recommendation.item.id;

  if (focus.status === "running" && isThisNow) {
    return `
      <div class="focus-mode-panel">
        <span>Focus Mode</span>
        <strong>${escapeHtml(focus.timeRemaining)}</strong>
        <div class="button-row">
          <button type="button" data-action="pause-focus">Pause Focus</button>
          <button type="button" data-action="end-focus">End Focus</button>
          <button type="button" data-action="end-focus-done">End & Mark Done</button>
        </div>
      </div>
    `;
  }

  if (focus.status === "paused" && isThisNow) {
    return `
      <div class="focus-mode-panel">
        <span>Focus Mode paused</span>
        <strong>${escapeHtml(focus.timeRemaining)}</strong>
        <div class="button-row">
          <button type="button" data-action="resume-focus">Start Focus</button>
          <button type="button" data-action="end-focus">End Focus</button>
          <button type="button" data-action="end-focus-done">End & Mark Done</button>
        </div>
      </div>
    `;
  }

  if (focus.status !== "idle") {
    return `
      <div class="focus-mode-panel">
        <span>Focus Mode active</span>
        <strong>${escapeHtml(focus.title)} - ${escapeHtml(focus.timeRemaining)}</strong>
        <div class="button-row">
          ${focus.status === "running" ? `<button type="button" data-action="pause-focus">Pause Focus</button>` : `<button type="button" data-action="resume-focus">Start Focus</button>`}
          <button type="button" data-action="end-focus">End Focus</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="focus-mode-panel">
      <span>Focus Mode</span>
      <strong>25:00</strong>
      <div class="button-row">
        <button type="button" data-action="start-focus" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">Start Focus</button>
      </div>
    </div>
  `;
}

function renderComingUpCard(item) {
  if (!item) {
    return `
      <article class="working-card coming-card">
        <p class="eyebrow">Coming Up</p>
        <h3>No scheduled item is waiting.</h3>
        <p>The timeline has no open upcoming item.</p>
      </article>
    `;
  }

  return `
    <article class="working-card coming-card">
      <p class="eyebrow">Coming Up</p>
      <h3>${escapeHtml(item.title ?? item.name)}</h3>
      <p>${escapeHtml(item.startTime ?? item.time ?? item.plannedEndTime ?? "Later today")} - ${escapeHtml(item.type ?? item.timingType ?? "Upcoming")}</p>
    </article>
  `;
}

function renderDecisionCard(recommendation) {
  if (!recommendation) {
    return `
      <article class="next-card decision-card">
        <p class="eyebrow">Do This Next</p>
        <h3>Nothing actionable is waiting.</h3>
        <p>Your visible items are complete.</p>
      </article>
    `;
  }

  const timingClass = getScheduledTimingClass(recommendation);
  return `
    <article class="next-card decision-card${timingClass}">
      <p class="eyebrow">Do This Next</p>
      <h3>${escapeHtml(recommendation.title)}</h3>
      ${renderRecommendationExplanation(recommendation)}
      <dl class="decision-meta">
        <div><dt>Estimated effort</dt><dd>${recommendation.effort} min</dd></div>
        <div><dt>Priority score</dt><dd>${recommendation.score}</dd></div>
      </dl>
      <div class="button-row">
        <button type="button" data-action="do-it-now" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">Do It Now</button>
        <button type="button" data-action="mark-done" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">${escapeHtml(getPrimaryCompletionLabel(recommendation.collection))}</button>
        <button type="button" data-action="snooze" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">Snooze</button>
        <button type="button" data-action="skip" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">Skip</button>
        ${recommendation.collection === "morningRoutine" ? `<button type="button" data-action="dismiss-morning-routine" data-id="${escapeHtml(recommendation.item.id)}">Dismiss</button>` : ""}
        ${recommendation.collection === "recoverySuggestions" ? `<button type="button" data-action="dismiss-recovery-suggestion" data-id="${escapeHtml(recommendation.item.id)}">Dismiss</button>` : ""}
        ${!["recommendations", "guidance", "morningRoutine", "recoverySuggestions"].includes(recommendation.collection) ? `<button type="button" data-action="dismiss-item" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">Dismiss</button>` : ""}
      </div>
    </article>
  `;
}

function getPrimaryCompletionLabel(collection) {
  return collection === "habitItems" ? "Add One" : "Done";
}

function getScheduledTimingClass(recommendation) {
  const item = recommendation?.item ?? recommendation;
  if (!item || item.priority !== "High") {
    return "";
  }

  const timingType = item.timingType ?? (item.startTime || item.time ? "scheduled" : "flexible");
  if (timingType !== "scheduled") {
    return "";
  }

  const minutesUntil = getMinutesUntilDisplayTime(item.startTime ?? item.time);
  if (minutesUntil === null) {
    return "";
  }

  if (minutesUntil <= 0) {
    return " is-starting-now";
  }
  if (minutesUntil <= 0.5) {
    return " is-final-countdown";
  }
  if (minutesUntil <= 5) {
    return " is-starting-soon";
  }
  return "";
}

function getMinutesUntilDisplayTime(timeText) {
  const match = String(timeText ?? "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) {
    hours += 12;
  }
  if (period === "AM" && hours === 12) {
    hours = 0;
  }

  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  return (target.getTime() - Date.now()) / 60000;
}

function renderRecommendationExplanation(recommendation) {
  const explanation = recommendation.explanation;
  if (!explanation) {
    return renderWhyList(recommendation.why);
  }

  return `
    <details class="recommendation-explanation">
      <summary>Why this recommendation?</summary>
      <div class="explanation-grid">
        <section>
          <h4>Why this?</h4>
          <p>${escapeHtml(explanation.whyThis)}</p>
        </section>
        <section>
          <h4>Why now?</h4>
          <p>${escapeHtml(explanation.whyNow)}</p>
        </section>
        <section>
          <h4>Support modes influencing this recommendation</h4>
          ${renderRuleInfluenceList(explanation.rules)}
        </section>
        ${renderContextInfluences(explanation.context)}
      </div>
    </details>
  `;
}

function renderRuleInfluenceList(rules) {
  if (!rules || rules.length === 0) {
    return `<p>No active support mode changed the score. Timing, priority, and effort decided this.</p>`;
  }

  return `
    <ul>
      ${rules.map((rule) => `<li><strong>${escapeHtml(rule.name)}</strong><span>${escapeHtml(rule.effect)}</span></li>`).join("")}
    </ul>
  `;
}

function renderContextInfluences(contextDetails) {
  if (!contextDetails || contextDetails.length === 0) {
    return "";
  }

  return `
    <section>
      <h4>Context</h4>
      <ul>
        ${contextDetails.map((detail) => `<li><span>${escapeHtml(detail)}</span></li>`).join("")}
      </ul>
    </section>
  `;
}

function renderWhyList(why) {
  const reasons = String(why)
    .split("\n")
    .map((reason) => reason.trim())
    .filter(Boolean);

  if (reasons.length === 0) {
    return "";
  }

  return `
    <ul class="why-list">
      ${reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
    </ul>
  `;
}

function renderAddTaskForm() {
  const projects = getProjectTrackingData().activeProjects;
  return `
    <form class="panel add-task-form add-task-priority-medium" data-action="add-task">
      <div>
        <label for="task-title">What?</label>
        <input id="task-title" name="title" type="text" placeholder="What needs action?" required />
      </div>
      <div>
        <label for="task-when">When?</label>
        <select id="task-when" name="when">
          <option selected>Today</option>
          <option>Tomorrow</option>
          <option>This week</option>
        </select>
      </div>
      <div>
        <label for="task-priority">Importance?</label>
        <select id="task-priority" name="priority">
          <option>High</option>
          <option selected>Medium</option>
          <option>Low</option>
        </select>
      </div>
      <div>
        <label for="task-timing">Timing?</label>
        <select id="task-timing" name="timingType">
          <option value="flexible" selected>Flexible</option>
          <option value="scheduled">Scheduled</option>
          <option value="deadline">Deadline</option>
        </select>
      </div>
      <div class="scheduled-time-field" hidden>
        <label for="task-scheduled-time">Time?</label>
        <input id="task-scheduled-time" name="scheduledTime" type="time" />
      </div>
      ${
        projects.length
          ? `<div>
              <label for="task-project">Project?</label>
              <select id="task-project" name="projectId">
                <option value="">No project</option>
                ${projects.map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.title)}</option>`).join("")}
              </select>
            </div>`
          : `<input type="hidden" name="projectId" value="" />`
      }
      <input type="hidden" name="category" value="Personal" />
      <input type="hidden" name="workType" value="None" />
      <input type="hidden" name="areaId" value="projects" />
      <button type="submit">Add</button>
    </form>
  `;
}

function updateAddTaskFormUi(form) {
  if (!form) {
    return;
  }

  const priority = String(form.querySelector("#task-priority")?.value ?? "Medium").toLowerCase();
  form.classList.toggle("add-task-priority-high", priority === "high");
  form.classList.toggle("add-task-priority-medium", priority === "medium");
  form.classList.toggle("add-task-priority-low", priority === "low");

  const isScheduled = form.querySelector("#task-timing")?.value === "scheduled";
  const timeField = form.querySelector(".scheduled-time-field");
  const timeInput = form.querySelector("#task-scheduled-time");
  if (timeField) {
    timeField.hidden = !isScheduled;
  }
  if (timeInput) {
    timeInput.required = isScheduled;
  }
}

function formatTimeInputForTask(value) {
  const match = String(value ?? "").match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return "";
  }

  const hours24 = Number(match[1]);
  const minutes = match[2];
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
}

function renderOnboarding() {
  const interview = getInterviewState();
  const question = interview.currentQuestion;

  return `
    <section id="onboarding" class="section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Onboarding</p>
          <h2>Life snapshot first</h2>
        </div>
        <button type="button" data-action="start-working">Start My Day</button>
      </div>
      ${renderSetupGuide("interview")}
      <div class="onboarding-grid">
        <article class="panel interview-panel conversation-panel">
          <div class="panel-title">
            <h3>Setup Conversation</h3>
            ${pill(`${interview.progress.answered}/${interview.progress.total} answered`, "strong")}
          </div>
          ${renderInterviewQuestion(question, interview.completed)}
        </article>
        <aside class="panel profile-panel">
          <h3>Saved profile</h3>
          <p>Answers are saved locally. You can leave and resume from the current question.</p>
          ${renderSavedProfile(interview)}
        </aside>
      </div>
    </section>
  `;
}

function renderInterviewQuestion(question, completed) {
  if (completed || !question) {
    return `
      <div class="conversation-message">
        <p class="eyebrow">Setup paused at useful</p>
        <h3>Interview complete for V1.</h3>
        <p>The assistant has enough information to activate your initial support modes. You can edit any answer from the review panel.</p>
      </div>
    `;
  }

  return `
    <div class="conversation-message">
      <p class="eyebrow">${escapeHtml(categoryLabel(question.category))}</p>
      <h3>${escapeHtml(question.prompt)}</h3>
    </div>
    <div class="answer-options">
      ${question.options
        .map(
          (option) => `
            <button type="button" data-action="answer-interview" data-question-id="${question.id}" data-answer="${option.value}">
              ${escapeHtml(option.label)}
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderSavedProfile(interview) {
  return `
    <div class="review-list">
      ${interview.answeredQuestions.map((question) => renderAnsweredQuestion(question, interview.profile)).join("") || "<p>No answers yet.</p>"}
    </div>
    <div class="ruleset-list">
      <h3>Active support modes</h3>
      <div>
        ${interview.profile.activeRulesets.map((ruleset) => pill(supportModeLabel(ruleset))).join("")}
      </div>
    </div>
  `;
}

function renderAnsweredQuestion(question, profile) {
  const value = profile[question.category]?.[question.field];
  const option = question.options.find((item) => item.value === value);

  return `
    <article class="review-item">
      <div>
        <span>${escapeHtml(categoryLabel(question.category))}</span>
        <strong>${escapeHtml(question.prompt)}</strong>
        <p>${escapeHtml(option?.label ?? value)}</p>
      </div>
      <button type="button" data-action="edit-interview" data-question-id="${question.id}">Edit</button>
    </article>
  `;
}

function renderBriefing() {
  const state = getState();
  const priorities = getOpenTodayActions().slice(0, 5);

  return `
    <section id="dashboard" class="section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Daily briefing</p>
          <h2>What matters today</h2>
        </div>
      </div>
      <div class="briefing-grid">
        <article class="panel priority-panel">
          <div class="panel-title">
            <h3>Today's Priorities</h3>
            ${pill(`${priorities.length} open`, "strong")}
          </div>
          <ul class="task-list">
            ${priorities.map((action) => renderActionItem(action)).join("") || renderEmptyItem("No open priorities for today.")}
          </ul>
        </article>
        <article class="panel">
          <h3>Daily Routine</h3>
          <ul class="compact-list">
            ${state.routines.map((routine) => renderRoutineItem(routine)).join("")}
          </ul>
        </article>
        <article class="panel">
          <h3>Needs Attention</h3>
          <ul class="compact-list">
            ${state.obligations
              .map(
                (obligation) => `
                  <li>
                    <span>${escapeHtml(obligation.dueDate)}</span>
                    <strong>${escapeHtml(obligation.name)}</strong>
                    ${pill(obligation.status, "warn")}
                  </li>
                `,
              )
              .join("")}
          </ul>
        </article>
        <article class="panel">
          <h3>Waiting On</h3>
          <ul class="compact-list">
            ${state.waitingOn
              .map(
                (item) => `
                  <li>
                    <span>${escapeHtml(areaName(item.areaId))}</span>
                    <strong>${escapeHtml(item.title)}</strong>
                    ${pill(item.owner)}
                  </li>
                `,
              )
              .join("")}
          </ul>
        </article>
      </div>
    </section>
  `;
}

function renderLifeAreaDashboard() {
  const areas = getLifeAreaDashboardData();

  return `
    <section id="life-areas" class="section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Life Area Dashboard</p>
          <h2>Weekly balance</h2>
        </div>
      </div>
      <div class="life-area-grid">
        ${areas.map((area) => renderLifeAreaCard(area)).join("")}
      </div>
    </section>
  `;
}

function renderLifeAreaCard(area) {
  return `
    <article class="panel life-area-card">
      <div class="panel-title">
        <h3>${escapeHtml(area.area)}</h3>
        ${pill(`${area.progressPercentage}%`, area.overdueCount > 0 ? "warn" : "strong")}
      </div>
      <dl class="life-area-metrics">
        <div>
          <dt>Weekly completions</dt>
          <dd>${area.weeklyCompletionCount}</dd>
        </div>
        <div>
          <dt>Active tasks</dt>
          <dd>${area.activeTaskCount}</dd>
        </div>
        <div>
          <dt>Overdue</dt>
          <dd>${area.overdueCount}</dd>
        </div>
        <div>
          <dt>Progress</dt>
          <dd>${area.progressPercentage}%</dd>
        </div>
      </dl>
      <div class="life-area-lists">
        <div>
          <h4>Active</h4>
          ${renderLifeAreaList(area.activeTasks, "No active items.")}
        </div>
        <div>
          <h4>Overdue</h4>
          ${renderLifeAreaList(area.overdueItems, "No overdue items.")}
        </div>
        <div>
          <h4>Goals</h4>
          ${renderLifeAreaGoalList(area.activeGoals, "No active goals.")}
        </div>
        <div>
          <h4>Habits</h4>
          ${renderLifeAreaHabitList(area.activeHabits, "No active habits.")}
        </div>
      </div>
    </article>
  `;
}

function renderLifeAreaList(items, emptyText) {
  if (items.length === 0) {
    return `<p class="empty-copy">${escapeHtml(emptyText)}</p>`;
  }

  return `
    <ul class="briefing-list life-area-list">
      ${items
        .map(
          (item) => `
            <li>
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.status)} - ${escapeHtml(item.priority)} priority</span>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function renderLifeAreaGoalList(goals, emptyText) {
  if (!goals || goals.length === 0) {
    return `<p class="empty-copy">${escapeHtml(emptyText)}</p>`;
  }

  return `
    <ul class="briefing-list life-area-list">
      ${goals
        .map(
          (goal) => `
            <li>
              <strong>${escapeHtml(goal.title)}</strong>
              <span>${escapeHtml(goal.priority)} priority${goal.deadline ? ` - ${escapeHtml(goal.deadline)}` : ""}</span>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function renderLifeAreaHabitList(habits, emptyText) {
  if (!habits || habits.length === 0) {
    return `<p class="empty-copy">${escapeHtml(emptyText)}</p>`;
  }

  return `
    <ul class="briefing-list life-area-list">
      ${habits
        .map(
          (habit) => `
            <li>
              <strong>${escapeHtml(habit.title)}</strong>
              <span>${escapeHtml(getLifeAreaHabitDetail(habit))}</span>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function getLifeAreaHabitDetail(habit) {
  const frequency = titleCase(habit.frequencyType);
  if (!habit.streak) {
    return frequency;
  }

  const streakText = `${habit.streak.currentStreak} current ${pluralize(habit.streak.unit, habit.streak.currentStreak)}`;
  return habit.streak.recoveryAvailable ? `${frequency} - ${streakText} - recovery available` : `${frequency} - ${streakText}`;
}

function renderActionItem(action) {
  return `
    <li class="${isDone(action) ? "is-complete" : ""}">
      <span class="task-dot"></span>
      <div>
        <strong>${escapeHtml(action.title)}</strong>
        <span>${escapeHtml(renderTaskContext(action))}</span>
      </div>
      <div class="item-actions">
        ${pill(statusText(action), statusTone(action))}
        ${renderActionButtons("actions", action)}
      </div>
    </li>
  `;
}

function renderTaskContext(task) {
  const parts = [task.category ?? areaName(task.areaId), `${task.priority} priority`];
  if (task.category === "Work" && task.workType && task.workType !== "none") {
    parts.push(titleCase(task.workType.replaceAll("_", "-")));
  }

  return parts.join(" - ");
}

function renderRoutineItem(routine) {
  return `
    <li class="${isDone(routine) ? "is-complete" : ""}">
      <span>${escapeHtml(routine.time)}</span>
      <strong>${escapeHtml(routine.name)}</strong>
      <div class="item-actions">
        ${pill(statusText(routine), statusTone(routine))}
        ${renderActionButtons("routines", routine)}
      </div>
    </li>
  `;
}

function renderEmptyItem(text) {
  return `<li class="empty-item"><span></span><div><strong>${escapeHtml(text)}</strong></div></li>`;
}

function renderActionButtons(collectionName, item) {
  if (isDone(item)) {
    return "";
  }

  return `
    <button type="button" data-action="mark-done" data-collection="${collectionName}" data-id="${escapeHtml(item.id)}">Done</button>
    <button type="button" data-action="snooze" data-collection="${collectionName}" data-id="${escapeHtml(item.id)}">Remind later</button>
    <button type="button" data-action="dismiss-item" data-collection="${collectionName}" data-id="${escapeHtml(item.id)}">Dismiss</button>
  `;
}

function renderResponsibilityEngine() {
  const state = getState();

  return `
    <section class="section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Responsibility engine</p>
          <h2>Balanced life visibility</h2>
        </div>
      </div>
      <div class="area-grid">
        ${state.responsibilityAreas
          .map(
            (area) => `
              <article class="area-card">
                <div class="panel-title">
                  <h3>${escapeHtml(area.name)}</h3>
                  ${pill(area.status, area.status === "Needs attention" ? "warn" : "neutral")}
                </div>
                <p>${escapeHtml(area.summary)}</p>
                <ul>
                  ${area.actions.map((action) => `<li>${escapeHtml(action)}</li>`).join("")}
                </ul>
                <footer>Reviewed: ${escapeHtml(area.lastReviewedAt)}</footer>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderTimeline() {
  const state = getState();

  return `
    <section id="timeline" class="section timeline-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Today timeline</p>
          <h2>Starts and stops are visible</h2>
        </div>
      </div>
      <ol class="timeline">
        ${state.timeline
          .map(
            (event) => `
              <li class="${event.type === "Transition Reminder" ? "transition-event" : ""} ${isDone(event) ? "is-complete" : ""}">
                <time>${escapeHtml(event.time)}</time>
                <div>
                  <strong>${escapeHtml(event.title)}</strong>
                  <span>${escapeHtml(event.type)} - ${escapeHtml(areaName(event.areaId))} - ${escapeHtml(statusText(event))}</span>
                </div>
                <div class="item-actions">
                  ${renderActionButtons("timeline", event)}
                </div>
              </li>
            `,
          )
          .join("")}
      </ol>
    </section>
  `;
}

function renderHourlyView() {
  const hours = buildHourlyViewItems();

  return `
    <section id="hourly-view" class="section hourly-view-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Hourly View</p>
          <h2>Your day by the hour</h2>
          <p class="empty-copy">Open an hour to see what is happening there. This is the third display after the day glimpse and focused working screen.</p>
        </div>
      </div>
      <div class="hourly-list">
        ${hours.map((hour) => renderHourBlock(hour)).join("")}
      </div>
    </section>
  `;
}

function buildHourlyViewItems() {
  const state = getState();
  const timelineEvents = state.timeline.map((event) => ({
    ...event,
    collection: "timeline",
    displayTime: event.time ?? event.startTime ?? "Today",
    hour: getHourFromTime(event.time ?? event.startTime),
  }));
  const scheduledTasks = state.actions
    .filter((event) => (event.timingType ?? "") === "scheduled" || event.startTime || event.time)
    .map((event) => ({
      ...event,
      collection: "actions",
      type: "Task",
      displayTime: event.startTime ?? event.time ?? "Today",
      hour: getHourFromTime(event.startTime ?? event.time),
    }));
  const events = [...timelineEvents, ...scheduledTasks];

  return Array.from({ length: 16 }, (_, index) => {
    const hour = index + 6;
    return {
      hour,
      label: formatHourLabel(hour),
      events: events.filter((event) => event.hour === hour),
    };
  });
}

function renderHourBlock(hour) {
  const open = hour.events.length > 0 ? "open" : "";
  return `
    <details class="hour-block" ${open}>
      <summary>
        <span>${escapeHtml(hour.label)}</span>
        ${pill(`${hour.events.length} item${hour.events.length === 1 ? "" : "s"}`, hour.events.length ? "strong" : "neutral")}
      </summary>
      ${
        hour.events.length === 0
          ? `<p class="empty-copy">Nothing scheduled for this hour.</p>`
          : `<ul>${hour.events.map((event) => renderHourlyEvent(event)).join("")}</ul>`
      }
      ${renderHourlyAddForm(hour)}
    </details>
  `;
}

function renderHourlyAddForm(hour) {
  return `
    <form class="hourly-add-form" data-action="add-hourly-item">
      <input type="hidden" name="hourlyTime" value="${escapeHtml(hour.label)}" />
      <select name="hourlyType" aria-label="Item type">
        <option value="task">Task</option>
        <option value="habit">Habit</option>
        <option value="routine">Routine</option>
        <option value="project">Project</option>
        <option value="note">Note</option>
        <option value="meal">Meal</option>
      </select>
      <input name="hourlyTitle" type="text" placeholder="Add to ${escapeHtml(hour.label)}" required />
      <button type="submit">Add</button>
    </form>
  `;
}

function renderHourlyEvent(event) {
  return `
    <li class="${isDone(event) ? "is-complete" : ""}">
      <time>${escapeHtml(event.displayTime)}</time>
      <div>
        <strong>${escapeHtml(event.title)}</strong>
        <span>${escapeHtml(event.type)} - ${escapeHtml(areaName(event.areaId))} - ${escapeHtml(statusText(event))}</span>
      </div>
      <div class="item-actions">
        ${renderActionButtons(event.collection ?? "timeline", event)}
      </div>
    </li>
  `;
}

function getHourFromTime(value) {
  const match = String(value ?? "").match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) {
    return -1;
  }

  let hour = Number(match[1]);
  const period = match[3]?.toUpperCase();
  if (period === "PM" && hour !== 12) {
    hour += 12;
  }
  if (period === "AM" && hour === 12) {
    hour = 0;
  }
  return hour;
}

function formatHourLabel(hour) {
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:00 ${period}`;
}

function renderFocus() {
  const state = getState();

  return `
    <section id="focus" class="section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Focus and transitions</p>
          <h2>Stop, switch, begin</h2>
        </div>
      </div>
      <div class="focus-grid">
        ${state.focusSessions
          .map(
            (session) => `
              <article class="panel focus-card ${isDone(session) ? "is-complete" : ""}">
                <div class="panel-title">
                  <h3>${escapeHtml(session.name)}</h3>
                  ${pill(statusText(session), statusTone(session))}
                </div>
                <dl>
                  <div><dt>Start</dt><dd>${escapeHtml(session.startTime)}</dd></div>
                  <div><dt>Planned end</dt><dd>${escapeHtml(session.plannedEndTime)}</dd></div>
                  <div><dt>Warning</dt><dd>${escapeHtml(session.transitionWarningTime)}</dd></div>
                  <div><dt>Next</dt><dd>${escapeHtml(session.nextTask)}</dd></div>
                  <div><dt>Flexibility</dt><dd>${escapeHtml(session.flexibility)}</dd></div>
                </dl>
                <div class="button-row" aria-label="Prototype reminder actions">
                  ${renderActionButtons("focusSessions", session)}
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderModels() {
  return `
    <section id="models" class="section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Foundation</p>
          <h2>Data model skeleton</h2>
        </div>
      </div>
      <div class="model-grid">
        ${modelDefinitions
          .map(
            (model) => `
              <article class="model-card">
                <h3>${escapeHtml(model.name)}</h3>
                <p>${escapeHtml(model.description)}</p>
                <code>${escapeHtml(model.fields.join(" - "))}</code>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function applyAppearance() {
  const appearance = getAppearanceSettings();
  document.body.classList.toggle("has-photo-bg", appearance.backgroundType === "image" && Boolean(appearance.imageDataUrl));
  document.body.dataset.overlay = appearance.overlay;
  document.body.style.setProperty("--app-bg-color", appearance.backgroundColor);
  if (appearance.imageDataUrl) {
    document.body.style.setProperty("--app-bg-image", `url("${cssEscapeUrl(appearance.imageDataUrl)}")`);
  } else {
    document.body.style.removeProperty("--app-bg-image");
  }
}

function cssEscapeUrl(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function renderApp() {
  const activeView = getActiveView();
  applyAppearance();
  if (isPrivacyLocked()) {
    app.innerHTML = renderUnlockScreen();
    scheduleWorkingModeRefresh("locked");
    return;
  }

  const fullDashboard = `
    ${renderToday()}
    ${renderEndOfDayReview()}
    ${renderOnboarding()}
    ${renderRoutineBuilder()}
    ${renderGoalSetting()}
    ${renderProjectTracking()}
    ${renderHabitTracking()}
    ${renderRecurringTasks()}
    ${renderLifeAreaDashboard()}
    ${renderBriefing()}
    ${renderResponsibilityEngine()}
    ${renderTimeline()}
    ${renderFocus()}
    ${renderModels()}
  `;

  app.innerHTML = `
    ${renderHeader()}
    <main>
      ${shouldShowQuickCapture(activeView) ? renderQuickCapture() : ""}
      ${shouldShowQuickCapture(activeView) ? renderAssistantNudge(activeView) : ""}
      ${renderActiveView(activeView, fullDashboard)}
    </main>
  `;
  enhanceCollapsibleWindows();
  scheduleWorkingModeRefresh(activeView);
  scheduleStarterAcknowledgementDismiss(activeView);
}

function scheduleStarterAcknowledgementDismiss(activeView) {
  if (starterAcknowledgementTimer) {
    clearTimeout(starterAcknowledgementTimer);
    starterAcknowledgementTimer = null;
  }

  const progressive = getSetupJourneyData().progressive;
  if (activeView !== "command-center" || !progressive.completed || progressive.starterAcknowledgementDismissed || !progressive.starterItem) {
    return;
  }

  starterAcknowledgementTimer = setTimeout(() => {
    dismissProgressiveStarterAcknowledgement();
    renderApp();
  }, 7000);
}

function shouldShowQuickCapture(activeView) {
  return new Set(["command-center", "working", "hourly", "briefing", "dashboard", "lists"]).has(activeView);
}

function enhanceCollapsibleWindows() {
  const activeView = getActiveView();
  const collapseEnabledViews = new Set(["command-center", "today", "working", "briefing", "progress", "review", "life-areas"]);
  if (!collapseEnabledViews.has(activeView)) {
    return;
  }

  const windows = Array.from(
    document.querySelectorAll(
      "main [data-window-title], main .working-card, main .command-card, main .tip-card, main .intervention-card, main .priority-panel, main .morning-routine-panel, main .life-area-card",
    ),
  ).filter((element) => !element.closest(".quick-capture") && !element.classList.contains("lock-card"));

  windows.forEach((element, index) => {
    const title = getWindowTitle(element);
    if (!title) {
      return;
    }

    const sectionId = element.closest("section")?.id ?? "main";
    const collapseId = `${sectionId}-${index}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    element.dataset.collapseId = collapseId;
    element.classList.add("collapsible-window");
    element.classList.toggle("is-window-collapsed", collapsedWindows.has(collapseId));

    if (element.querySelector(":scope > .window-collapse-bar")) {
      return;
    }

    const bar = document.createElement("div");
    bar.className = "window-collapse-bar";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "window-collapse-toggle";
    button.dataset.action = "toggle-window-collapse";
    button.dataset.collapseId = collapseId;
    button.setAttribute("aria-label", `${collapsedWindows.has(collapseId) ? "Open" : "Collapse"} ${title}`);
    button.setAttribute("aria-expanded", collapsedWindows.has(collapseId) ? "false" : "true");

    const titleNode = document.createElement("strong");
    titleNode.textContent = title;

    bar.append(button, titleNode);
    element.prepend(bar);
  });
}

function getWindowTitle(element) {
  return (
    element.dataset.windowTitle ||
    element.querySelector(":scope > .panel-title h3")?.textContent?.trim() ||
    element.querySelector(":scope h3")?.textContent?.trim() ||
    element.querySelector(":scope h2")?.textContent?.trim() ||
    element.querySelector(":scope .eyebrow")?.textContent?.trim() ||
    ""
  );
}

function renderActiveView(activeView, fullDashboard) {
  const views = {
    setup: renderSetupJourney,
    briefing: renderMorningBriefing,
    "command-center": renderCommandCenter,
    today: renderToday,
    working: renderWorkingMode,
    hourly: renderHourlyView,
    goals: renderGoalSetting,
    projects: renderProjectTracking,
    habits: renderHabitTracking,
    routines: renderRoutineBuilder,
    "recurring-tasks": renderRecurringTasks,
    progress: renderProgressView,
    review: renderEndOfDayReview,
    "life-areas": renderLifeAreaDashboard,
    help: renderHelpView,
    learn: () => renderPlaceholderView("learn", "Learn", "Helpful strategies and life enablement learning content will live here later."),
    lists: renderListsView,
    shop: renderShopView,
    store: renderStoreView,
    account: renderAccountView,
    settings: renderSettingsView,
    dashboard: () => fullDashboard,
  };

  return (views[activeView] ?? views["command-center"])();
}

function scheduleWorkingModeRefresh(activeView) {
  if (workingModeTimer) {
    clearInterval(workingModeTimer);
    workingModeTimer = null;
  }

  if (!["working", "command-center", "today"].includes(activeView)) {
    return;
  }

  workingModeTimer = setInterval(() => {
    if (["working", "command-center", "today"].includes(getActiveView())) {
      renderApp();
    }
  }, 1000);
}

app.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const { action, collection, id } = button.dataset;
  if (action === "navigate") {
    setActiveView(button.dataset.view);
    renderApp();
  }
  if (action === "focus-quick-capture") {
    quickCaptureCollapsed = false;
    document.querySelector(".app-menu")?.removeAttribute("open");
    renderApp();
    document.querySelector("#quick-capture-text")?.focus();
  }
  if (action === "toggle-quick-capture") {
    quickCaptureCollapsed = !quickCaptureCollapsed;
    renderApp();
  }
  if (action === "toggle-window-collapse") {
    const collapseId = button.dataset.collapseId;
    if (collapsedWindows.has(collapseId)) {
      collapsedWindows.delete(collapseId);
    } else {
      collapsedWindows.add(collapseId);
    }
    renderApp();
  }
  if (action === "start-quick-capture-voice") {
    quickCaptureCollapsed = false;
    startQuickCaptureVoice(button);
  }
  if (action === "clear-quick-capture") {
    quickCaptureDraft = null;
    quickCaptureResult = null;
    quickCaptureText = "";
    renderApp();
  }
  if (action === "dismiss-starter-acknowledgement") {
    dismissProgressiveStarterAcknowledgement();
    renderApp();
  }
  if (action === "show-setup") {
    setActiveView("setup");
    renderApp();
  }
  if (action === "show-teach-more") {
    setActiveView("setup");
    renderApp();
    queueMicrotask(() => document.querySelector("#teach-more")?.setAttribute("open", ""));
  }
  if (action === "restart-progressive-detail") {
    editProgressiveStarterAnswer();
    renderApp();
  }
  if (action === "start-progressive-setup") {
    startProgressiveSetup();
    renderApp();
  }
  if (action === "start-setup-step") {
    startSetupStep(button.dataset.stepId);
    renderApp();
  }
  if (action === "skip-setup-step") {
    skipSetupStep(button.dataset.stepId);
    setActiveView("setup");
    renderApp();
  }
  if (action === "mark-done") {
    markDone(collection, id);
    renderApp();
  }
  if (action === "do-it-now") {
    doItNow(collection, id);
    renderApp();
  }
  if (action === "snooze") {
    snoozeItem(collection, id);
    renderApp();
  }
  if (action === "skip") {
    skipItem(collection, id);
    renderApp();
  }
  if (action === "start-focus") {
    startFocus(collection, id);
    renderApp();
  }
  if (action === "pause-focus") {
    pauseFocus();
    renderApp();
  }
  if (action === "resume-focus") {
    resumeFocus();
    renderApp();
  }
  if (action === "end-focus") {
    endFocus(false);
    renderApp();
  }
  if (action === "end-focus-done") {
    endFocus(true);
    renderApp();
  }
  if (action === "dismiss-recommendation") {
    dismissRecommendation(id);
    renderApp();
  }
  if (action === "dismiss-guidance") {
    dismissGuidance(id);
    renderApp();
  }
  if (action === "dismiss-morning-routine") {
    dismissMorningRoutine(id);
    renderApp();
  }
  if (action === "dismiss-recovery-suggestion") {
    dismissRecoverySuggestion(id);
    renderApp();
  }
  if (action === "complete-intervention") {
    completeSmartIntervention(id, button.dataset.context);
    renderApp();
  }
  if (action === "dismiss-intervention") {
    dismissSmartIntervention(id, button.dataset.context);
    renderApp();
  }
  if (action === "dismiss-item") {
    dismissItem(collection, id);
    renderApp();
  }
  if (action === "reset-local-data") {
    resetLocalData();
    renderApp();
  }
  if (action === "reset-progressive-onboarding") {
    resetProgressiveOnboarding();
    renderApp();
  }
  if (action === "load-demo") {
    loadDemo(button.dataset.demoId);
    renderApp();
  }
  if (action === "start-working") {
    startMyDay();
    renderApp();
  }
  if (action === "show-command-center") {
    setActiveView("command-center");
    renderApp();
  }
  if (action === "show-today") {
    setActiveView("today");
    renderApp();
  }
  if (action === "show-dashboard") {
    setActiveView("dashboard");
    renderApp();
  }
  if (action === "show-learn") {
    setActiveView("learn");
    renderApp();
  }
  if (action === "show-progress") {
    setActiveView("progress");
    renderApp();
  }
  if (action === "show-habits") {
    setActiveView("habits");
    renderApp();
  }
  if (action === "show-routines") {
    setActiveView("routines");
    renderApp();
  }
  if (action === "dismiss-assistant-nudge") {
    dismissedAssistantNudgeId = id;
    renderApp();
  }
  if (action === "focus-status-update") {
    document.querySelector("#command-status-mood")?.focus();
  }
  if (action === "show-review") {
    setActiveView("review");
    renderApp();
  }
  if (action === "show-life-areas") {
    setActiveView("life-areas");
    renderApp();
  }
  if (action === "complete-weekly-review") {
    completeWeeklyReview();
    renderApp();
  }
  if (action === "answer-interview") {
    answerInterviewQuestion(button.dataset.questionId, button.dataset.answer);
    renderApp();
  }
  if (action === "edit-interview") {
    editInterviewAnswer(button.dataset.questionId);
    renderApp();
  }
  if (action === "edit-routine") {
    editRoutine(id);
    renderApp();
  }
  if (action === "cancel-routine-edit") {
    cancelRoutineEdit();
    renderApp();
  }
  if (action === "delete-routine") {
    deleteRoutine(id);
    renderApp();
  }
  if (action === "activate-routine") {
    activateRoutine(id);
    renderApp();
  }
  if (action === "deactivate-routine") {
    deactivateRoutine(id);
    renderApp();
  }
  if (action === "edit-goal") {
    editGoal(id);
    renderApp();
  }
  if (action === "cancel-goal-edit") {
    cancelGoalEdit();
    renderApp();
  }
  if (action === "delete-goal") {
    deleteGoal(id);
    renderApp();
  }
  if (action === "complete-goal") {
    markGoalComplete(id);
    renderApp();
  }
  if (action === "reactivate-goal") {
    reactivateCompletedGoal(id);
    renderApp();
  }
  if (action === "edit-project") {
    editProject(id);
    renderApp();
  }
  if (action === "cancel-project-edit") {
    cancelProjectEdit();
    renderApp();
  }
  if (action === "delete-project") {
    deleteProject(id);
    renderApp();
  }
  if (action === "complete-project") {
    markProjectComplete(id);
    renderApp();
  }
  if (action === "reactivate-project") {
    reactivateCompletedProject(id);
    renderApp();
  }
  if (action === "start-project-next-step") {
    createProjectNextTask(id);
    setActiveView("today");
    renderApp();
  }
  if (action === "edit-habit") {
    editHabit(id);
    renderApp();
  }
  if (action === "cancel-habit-edit") {
    cancelHabitEdit();
    renderApp();
  }
  if (action === "delete-habit") {
    deleteHabit(id);
    renderApp();
  }
  if (action === "activate-habit") {
    activateHabit(id);
    renderApp();
  }
  if (action === "deactivate-habit") {
    deactivateHabit(id);
    renderApp();
  }
  if (action === "edit-recurring-task") {
    editRecurringTask(id);
    renderApp();
  }
  if (action === "cancel-recurring-task-edit") {
    cancelRecurringTaskEdit();
    renderApp();
  }
  if (action === "delete-recurring-task") {
    deleteRecurringTask(id);
    renderApp();
  }
  if (action === "activate-recurring-task") {
    activateRecurringTask(id);
    renderApp();
  }
  if (action === "deactivate-recurring-task") {
    deactivateRecurringTask(id);
    renderApp();
  }
  if (action === "start-voice-list") {
    startVoiceListCapture(button.dataset.targetId, button);
  }
  if (action === "clear-voice-list") {
    clearVoiceListDraft(button.dataset.targetId);
    renderApp();
  }
  if (action === "remove-voice-list-item") {
    removeVoiceListItem(button.dataset.targetId, id);
    renderApp();
  }
  if (action === "approve-voice-list") {
    approveVoiceListFromDom(button.dataset.targetId, button);
  }
  if (action === "mark-saved-voice-list-item-done") {
    markSavedVoiceListItemDone(button.dataset.targetId, id);
    renderApp();
  }
  if (action === "reopen-saved-voice-list-item") {
    reopenSavedVoiceListItem(button.dataset.targetId, id);
    renderApp();
  }
  if (action === "mark-general-list-done") {
    markGeneralListDone(button.dataset.listName);
    renderApp();
  }
  if (action === "reopen-general-list") {
    reopenGeneralList(button.dataset.listName);
    renderApp();
  }
  if (action === "delete-saved-voice-list-item") {
    deleteSavedVoiceListItem(button.dataset.targetId, id);
    renderApp();
  }
  if (action === "clear-appearance-image") {
    clearAppearanceImage();
    renderApp();
  }
  if (action === "clear-profile-photo") {
    clearProfilePhoto();
    renderApp();
  }
  if (action === "disable-privacy-lock") {
    disablePrivacyLock();
    renderApp();
  }
  if (action === "lock-app") {
    lockApp();
    renderApp();
  }
});

app.addEventListener("submit", async (event) => {
  const progressiveNameForm = event.target.closest("form[data-action='save-progressive-name']");
  if (progressiveNameForm) {
    event.preventDefault();
    saveProgressiveName(new FormData(progressiveNameForm));
    renderApp();
    return;
  }

  const progressiveHelpForm = event.target.closest("form[data-action='save-progressive-help']");
  if (progressiveHelpForm) {
    event.preventDefault();
    saveProgressiveHelpArea(new FormData(progressiveHelpForm));
    renderApp();
    return;
  }

  const progressiveDetailForm = event.target.closest("form[data-action='complete-progressive-setup']");
  if (progressiveDetailForm) {
    event.preventDefault();
    completeProgressiveSetup(new FormData(progressiveDetailForm));
    renderApp();
    return;
  }

  const unlockForm = event.target.closest("form[data-action='unlock-app']");
  if (unlockForm) {
    event.preventDefault();
    await unlockApp(new FormData(unlockForm));
    renderApp();
    return;
  }

  const accountForm = event.target.closest("form[data-action='save-account-profile']");
  if (accountForm) {
    event.preventDefault();
    saveAccountProfile(new FormData(accountForm));
    renderApp();
    return;
  }

  const privacyLockForm = event.target.closest("form[data-action='save-privacy-lock']");
  if (privacyLockForm) {
    event.preventDefault();
    await savePrivacyLock(new FormData(privacyLockForm));
    privacyLockForm.reset();
    renderApp();
    return;
  }

  const appearanceForm = event.target.closest("form[data-action='save-appearance']");
  if (appearanceForm) {
    event.preventDefault();
    saveAppearanceSettings(new FormData(appearanceForm));
    renderApp();
    return;
  }

  const quickCaptureForm = event.target.closest("form[data-action='review-quick-capture']");
  if (quickCaptureForm) {
    event.preventDefault();
    quickCaptureText = String(new FormData(quickCaptureForm).get("captureText") ?? "").trim();
    quickCaptureDraft = buildQuickCaptureDraft(quickCaptureText);
    quickCaptureResult = null;
    quickCaptureCollapsed = false;
    renderApp();
    scrollCaptureReviewIntoView();
    return;
  }

  const saveQuickCaptureForm = event.target.closest("form[data-action='save-quick-capture']");
  if (saveQuickCaptureForm) {
    event.preventDefault();
    quickCaptureResult = saveQuickCaptureDraft(new FormData(saveQuickCaptureForm));
    quickCaptureDraft = null;
    quickCaptureText = "";
    quickCaptureCollapsed = false;
    renderApp();
    focusVoiceListTarget(quickCaptureResult?.focusTargetId);
    return;
  }

  const voiceListForm = event.target.closest("form[data-action='review-voice-list']");
  if (voiceListForm) {
    event.preventDefault();
    reviewVoiceListText(voiceListForm.dataset.targetId, new FormData(voiceListForm).get("voiceListText"));
    voiceListForm.reset();
    renderApp();
    return;
  }

  const generalListNameForm = event.target.closest("form[data-action='set-general-list-name']");
  if (generalListNameForm) {
    event.preventDefault();
    const formData = new FormData(generalListNameForm);
    setGeneralListDetails(formData.get("generalListName"), formData.get("generalListType"));
    renderApp();
    focusVoiceListTarget("generalList");
    return;
  }

  const energyMoodForm = event.target.closest("form[data-action='save-energy-mood']");
  if (energyMoodForm) {
    event.preventDefault();
    saveEnergyMoodCheckIn(new FormData(energyMoodForm));
    energyMoodForm.reset();
    renderApp();
    return;
  }

  const recurringTaskForm = event.target.closest("form[data-action='save-recurring-task']");
  if (recurringTaskForm) {
    event.preventDefault();
    saveRecurringTask(new FormData(recurringTaskForm));
    recurringTaskForm.reset();
    renderApp();
    return;
  }

  const habitForm = event.target.closest("form[data-action='save-habit']");
  if (habitForm) {
    event.preventDefault();
    saveHabit(new FormData(habitForm));
    habitForm.reset();
    renderApp();
    return;
  }

  const goalForm = event.target.closest("form[data-action='save-goal']");
  if (goalForm) {
    event.preventDefault();
    saveGoal(new FormData(goalForm));
    goalForm.reset();
    renderApp();
    return;
  }

  const projectForm = event.target.closest("form[data-action='save-project']");
  if (projectForm) {
    event.preventDefault();
    saveProject(new FormData(projectForm));
    projectForm.reset();
    renderApp();
    return;
  }

  const routineForm = event.target.closest("form[data-action='save-routine']");
  if (routineForm) {
    event.preventDefault();
    saveRoutine(new FormData(routineForm));
    routineForm.reset();
    renderApp();
    return;
  }

  const hourlyForm = event.target.closest("form[data-action='add-hourly-item']");
  if (hourlyForm) {
    event.preventDefault();
    addHourlyItem(new FormData(hourlyForm));
    hourlyForm.reset();
    renderApp();
    return;
  }

  const reviewForm = event.target.closest("form[data-action='complete-review']");
  if (reviewForm) {
    event.preventDefault();
    completeEndOfDayReview(new FormData(reviewForm).getAll("carryover"));
    renderApp();
    return;
  }

  const form = event.target.closest("form[data-action='add-task']");
  if (!form) {
    return;
  }

  event.preventDefault();
  const formData = new FormData(form);
  if (formData.get("timingType") === "scheduled") {
    formData.set("when", formatTimeInputForTask(formData.get("scheduledTime")) || "Today");
  }
  addTask(formData);
  form.reset();
  updateAddTaskFormUi(form);
  renderApp();
});

app.addEventListener("change", (event) => {
  const addTaskInput = event.target.closest(".add-task-form select, .add-task-form input");
  if (addTaskInput) {
    updateAddTaskFormUi(addTaskInput.closest(".add-task-form"));
  }

  const profileInput = event.target.closest("input[data-action='upload-profile-photo']");
  if (profileInput && profileInput.files?.[0]) {
    const file = profileInput.files[0];
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      saveProfilePhoto(String(reader.result ?? ""), file.name);
      renderApp();
    });
    reader.readAsDataURL(file);
    return;
  }

  const input = event.target.closest("input[data-action='upload-appearance-image']");
  if (!input || !input.files?.[0]) {
    return;
  }

  const file = input.files[0];
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    saveAppearanceImage(String(reader.result ?? ""), file.name);
    renderApp();
  });
  reader.readAsDataURL(file);
});

function startVoiceListCapture(targetId, button) {
  button.textContent = "Listening...";
  button.disabled = true;
  startVoiceRecognition({
    onResult: (transcript) => {
      reviewVoiceListText(targetId, transcript);
      renderApp();
    },
    onError: () => {
      button.textContent = "Start Voice";
      button.disabled = false;
    },
    onEnd: () => {
      button.textContent = "Start Voice";
      button.disabled = false;
    },
  });
}

function startQuickCaptureVoice(button) {
  const originalText = button.textContent;
  button.textContent = "Listening...";
  button.disabled = true;
  startVoiceRecognition({
    onResult: (transcript) => {
      quickCaptureText = transcript;
      quickCaptureDraft = buildQuickCaptureDraft(transcript);
      quickCaptureResult = null;
      quickCaptureCollapsed = false;
      renderApp();
      scrollCaptureReviewIntoView();
    },
    onError: () => {
      button.textContent = originalText;
      button.disabled = false;
    },
    onEnd: () => {
      button.textContent = originalText;
      button.disabled = false;
    },
  });
}

function approveVoiceListFromDom(targetId, button) {
  const component = button.closest("[data-voice-list-target]");
  const itemRows = Array.from(component?.querySelectorAll("[data-voice-list-item]") ?? []);
  for (const row of itemRows) {
    updateVoiceListItem(targetId, row.dataset.voiceListItem, row.querySelector("input")?.value ?? "");
  }

  const approvedItems = approveVoiceListItems(targetId);
  if (targetId === "routineSteps") {
    appendApprovedRoutineSteps(approvedItems, component);
    return;
  }

  renderApp();
}

function appendApprovedRoutineSteps(items, component) {
  const textarea = document.querySelector("#routine-steps");
  const lines = formatRoutineStepLines(items);
  if (textarea && lines) {
    textarea.value = [textarea.value.trim(), lines].filter(Boolean).join("\n");
  }

  const review = component?.querySelector(".voice-list-review");
  if (review) {
    review.innerHTML = `<p class="empty-copy">Approved items were added to the routine steps.</p>`;
  }
}

function focusVoiceListTarget(targetId) {
  if (!targetId) {
    return;
  }

  queueMicrotask(() => {
    const textarea = document.querySelector(`#voice-list-text-${targetId}`);
    textarea?.focus();
    textarea?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

renderApp();
