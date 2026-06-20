import { modelDefinitions } from "./models.js";
import {
  activateRoutine,
  activateHabit,
  activateRecurringTask,
  addTask,
  addHourlyItem,
  addWaterBreakTemplate,
  answerInterviewQuestion,
  cancelGoalEdit,
  cancelHabitEdit,
  cancelProjectEdit,
  cancelRecurringTaskEdit,
  cancelRoutineEdit,
  clearProfilePhoto,
  closeActiveRoutine,
  completeEndOfDayReview,
  completeSmartIntervention,
  completeWeeklyReview,
  createRoutineFromTemplate,
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
  getMedicationTrackingData,
  getOpenTodayActions,
  getPositiveReinforcement,
  getProjectTrackingData,
  getRecurringTaskData,
  getRoutineBuilderData,
  getActiveRoutineGuidance,
  getRoutineGuidanceSettings,
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
  removeRoutineAction,
  reopenGeneralList,
  reopenSavedVoiceListItem,
  setActiveView,
  skipItem,
  skipActiveRoutineStep,
  skipSetupStep,
  snoozeItem,
  pauseFocus,
  pauseActiveRoutine,
  completeProgressiveSetup,
  completeActiveRoutineStep,
  markGoalComplete,
  markProjectComplete,
  moveRoutineAction,
  moveRoutineActionToIndex,
  reactivateCompletedGoal,
  reactivateCompletedProject,
  resumeFocus,
  resumeActiveRoutine,
  saveAccountProfile,
  saveAppearanceImage,
  saveAppearanceSettings,
  saveGoal,
  saveHabit,
  saveMedicationDetails,
  saveMedicationGroup,
  setGeneralListDetails,
  saveProject,
  saveEnergyMoodCheckIn,
  saveRecurringTask,
  saveRoutine,
  saveRoutineSchedule,
  saveRoutineGuidanceSettings,
  addRoutineActions,
  addMedicationGroupToRoutine as linkMedicationGroupToRoutine,
  reviewVoiceListText,
  removeVoiceListItem,
  approveVoiceListItems,
  clearVoiceListDraft,
  deleteSavedVoiceListItem,
  updateVoiceListItem,
  startFocus,
  startActiveRoutine,
  startSetupStep,
  startProgressiveSetup,
  startMyDay,
  statusText,
  statusTone,
  markActiveRoutinePrompted,
  shouldRemindActiveRoutine,
  savePrivacyLock,
  saveProfilePhoto,
  unlockApp,
  saveProgressiveHelpArea,
  saveProgressiveName,
} from "./state.js";
import { formatRoutineStepLines, startVoiceRecognition } from "./voice-list-entry.js";

const app = document.querySelector("#app");
let workingModeTimer = null;
let routineGuidanceTimer = null;
let routineVoiceRecognition = null;
let starterAcknowledgementTimer = null;
let quickCaptureDraft = null;
let quickCaptureResult = null;
let quickCaptureText = "";
let quickCaptureCollapsed = false;
let dismissedAssistantNudgeId = "";
let dismissedCommandSetupPromptId = "";
let walkthroughActive = false;
let walkthroughStepIndex = 0;
let draggedRoutineStepId = "";
const collapsedWindows = new Set();
const WALKTHROUGH_STORAGE_KEY = "life-enablement-assistant:walkthrough-v1";

const walkthroughSteps = [
  {
    id: "command-center",
    view: "command-center",
    target: "[data-walkthrough='command-center']",
    title: "Command Center",
    message: "This is the main daily view. It shows what to focus on now, what is coming next, today's overview, current status, helpful tips, alerts, and encouragement.",
  },
  {
    id: "now",
    view: "command-center",
    target: "[data-walkthrough='now']",
    title: "Now",
    message: "Now is the single best thing to focus on at the moment. It helps reduce decision overload and keeps you from managing too many things at once.",
  },
  {
    id: "next",
    view: "command-center",
    target: "[data-walkthrough='next']",
    title: "Next",
    message: "Next shows what is coming up after the current item, so you can feel oriented without planning the whole day manually.",
  },
  {
    id: "today",
    view: "command-center",
    target: "[data-walkthrough='today']",
    title: "Today",
    message: "Today gives a broader look at the day's tasks, schedule, routines, habits, and important items.",
  },
  {
    id: "status",
    view: "command-center",
    target: "[data-walkthrough='status']",
    title: "Status",
    message: "Status lets you quickly update mood, energy, or current state so recommendations can become more realistic.",
  },
  {
    id: "capture",
    view: "command-center",
    target: "[data-walkthrough='capture']",
    title: "Start Adding",
    message: "Use Capture to quickly add anything: task, goal, habit, routine, recurring task, shopping item, or note. The app helps classify it before saving.",
  },
  { id: "goals", view: "goals", target: "[data-walkthrough='goals']", title: "Goals", message: "Goals are larger outcomes you are working toward over time." },
  { id: "habits", view: "habits", target: "[data-walkthrough='habits']", title: "Habits", message: "Habits are repeated behaviors you want to build or maintain." },
  { id: "routines", view: "routines", target: "[data-walkthrough='routines']", title: "Routines", message: "Routines are step-by-step flows like morning, evening, work startup, or shutdown routines." },
  { id: "recurring", view: "recurring-tasks", target: "[data-walkthrough='recurring-tasks']", title: "Recurring Tasks", message: "Recurring Tasks are things that come back on a schedule, like trash day, bills, medication refills, cleaning, or admin work." },
  { id: "working", view: "working", target: "[data-walkthrough='working']", title: "Working Mode", message: "Working Mode is a stripped-down focus view for when you want less clutter and only need what to do now and what is next." },
  { id: "briefing", view: "briefing", target: "[data-walkthrough='briefing']", title: "Morning Briefing", message: "Morning Briefing helps you start the day by showing big things, scheduled items, possible issues, and suggested focus." },
  { id: "progress", view: "progress", target: "[data-walkthrough='progress']", title: "Progress / Life Areas", message: "Progress helps you see patterns, streaks, completed items, and how different life areas are doing." },
  { id: "learn", view: "learn", target: "[data-walkthrough='learn']", title: "Learn", message: "Learn contains helpful tips, guidance, and strategies for daily follow-through." },
  { id: "shop", view: "shop", target: "[data-walkthrough='shop']", title: "Shop", message: "Shop can eventually help manage useful items, shopping reminders, or recommended tools. For now, it is a simple prototype area." },
  { id: "help", view: "help", target: "[data-walkthrough='help']", title: "Help", message: "Help explains how to use the app in normal daily life. You can restart this walkthrough from here later." },
];

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

function getWalkthroughStatus() {
  try {
    return JSON.parse(window.localStorage.getItem(WALKTHROUGH_STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveWalkthroughStatus(values) {
  window.localStorage.setItem(WALKTHROUGH_STORAGE_KEY, JSON.stringify({
    ...getWalkthroughStatus(),
    ...values,
    updatedAt: new Date().toISOString(),
  }));
}

function startWalkthrough(index = 0) {
  walkthroughActive = true;
  walkthroughStepIndex = Math.max(0, Math.min(index, walkthroughSteps.length - 1));
  setActiveView(walkthroughSteps[walkthroughStepIndex].view);
  renderApp();
}

function finishWalkthrough(status = "completed") {
  walkthroughActive = false;
  saveWalkthroughStatus({
    completed: status === "completed",
    skipped: status === "skipped",
    lastStepId: walkthroughSteps[walkthroughStepIndex]?.id ?? "",
  });
  renderApp();
}

function moveWalkthrough(delta) {
  walkthroughStepIndex = Math.max(0, Math.min(walkthroughStepIndex + delta, walkthroughSteps.length - 1));
  setActiveView(walkthroughSteps[walkthroughStepIndex].view);
  renderApp();
}

function renderWalkthroughOverlay() {
  if (!walkthroughActive) {
    return "";
  }

  const step = walkthroughSteps[walkthroughStepIndex];
  const isFirst = walkthroughStepIndex === 0;
  const isLast = walkthroughStepIndex === walkthroughSteps.length - 1;
  return `
    <div class="walkthrough-layer" role="dialog" aria-modal="true" aria-label="App walkthrough">
      <article class="walkthrough-bubble">
        <p class="eyebrow">Walkthrough ${walkthroughStepIndex + 1} of ${walkthroughSteps.length}</p>
        <h3>${escapeHtml(step.title)}</h3>
        <p>${escapeHtml(step.message)}</p>
        <div class="walkthrough-controls">
          <button type="button" class="secondary-button" data-action="walkthrough-back" ${isFirst ? "disabled" : ""}>Back</button>
          <button type="button" class="secondary-button" data-action="walkthrough-skip">Skip</button>
          <button type="button" data-action="${isLast ? "walkthrough-finish" : "walkthrough-next"}">${isLast ? "Finish" : "Next"}</button>
        </div>
      </article>
    </div>
  `;
}

function syncWalkthroughTarget() {
  document.querySelectorAll(".walkthrough-target").forEach((element) => element.classList.remove("walkthrough-target"));
  if (!walkthroughActive) {
    return;
  }

  const step = walkthroughSteps[walkthroughStepIndex];
  const target = document.querySelector(step.target);
  if (target) {
    target.classList.add("walkthrough-target");
    target.scrollIntoView({ block: "center" });
  }
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
    const templateId = /morning/i.test(rawText)
      ? "morning"
      : /lunch/i.test(rawText)
        ? "lunch"
        : /dinner/i.test(rawText)
          ? "dinner"
          : /evening|night|bed/i.test(rawText)
            ? "evening"
            : /shutdown/i.test(rawText)
              ? "work-shutdown"
              : /work|startup|start work/i.test(rawText)
                ? "work-start"
                : "custom";
    const routine = createRoutineFromTemplate(templateId, templateId === "custom" ? title : "");
    setActiveView("routines");
    return {
      ...result,
      message: "Created",
      title: routine.name,
      typeLabel: "Routine",
      view: "routines",
      nextStep: `Great. I've created your ${routine.name}. Now let's add the specific things you normally want to do as part of it.`,
    };
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
    <section class="quick-capture ${collapsed ? "is-collapsed" : ""}" aria-label="Quick Capture" data-walkthrough="capture">
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
  if (activeView === "command-center") {
    return "";
  }

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
  if (!new Set(["command-center", "today", "working", "briefing", "dashboard", "hourly"]).has(activeView)) {
    return null;
  }

  const state = getState();
  const activeHabits = (state.habits ?? []).filter((habit) => habit.active !== false);
  const activeRoutines = (state.routinePlans ?? []).filter((routine) => routine.active !== false);
  const hasMorningRoutine = activeRoutines.some((routine) => String(routine.type ?? "").toLowerCase() === "morning");
  const hasTimedMorningRoutine = activeRoutines.some((routine) => String(routine.type ?? "").toLowerCase() === "morning" && routine.startTime);
  const activeRecurringTasks = (state.recurringTasks ?? []).filter((task) => task.active !== false);
  const hasTimedRecurringTask = activeRecurringTasks.some((task) => task.scheduledTime);
  const hasHourlyItems = (state.timeline ?? []).some((item) => item.startTime || item.time)
    || (state.actions ?? []).some((item) => item.startTime || item.time)
    || activeRoutines.some((routine) => routine.startTime)
    || hasTimedRecurringTask;

  if (!hasMorningRoutine && dismissedAssistantNudgeId !== "first-morning-routine") {
    return {
      id: "first-morning-routine",
      title: "Start by building one morning path.",
      message: "Add the first few things you want guided: water, meds, coffee, movement, or a quick look at your day. Give it a start time so it lands in Hourly View.",
      actions: [
        { label: "Set Up Morning Routine", action: "show-routines" },
        { label: "Add Daily Habit", action: "show-habits", secondary: true },
      ],
    };
  }

  if (hasMorningRoutine && !hasTimedMorningRoutine && dismissedAssistantNudgeId !== "time-morning-routine") {
    return {
      id: "time-morning-routine",
      title: "Put your morning routine on the day.",
      message: "A routine becomes much more useful when it has a start time. Then each step can show up in the hour it belongs.",
      actions: [
        { label: "Add Start Time", action: "show-routines" },
        { label: "See Hourly View", action: "show-hourly", secondary: true },
      ],
    };
  }

  if (activeRecurringTasks.length === 0 && dismissedAssistantNudgeId !== "first-recurring-task") {
    return {
      id: "first-recurring-task",
      title: "Add one responsibility that comes back.",
      message: "Use recurring tasks for things like trash night, bills, water breaks, refills, or weekly check-ins. If it has a time, it will land in Hourly View.",
      actions: [
        { label: "Add Recurring Task", action: "show-recurring-tasks" },
        { label: "Try Water Breaks", action: "add-water-break-template", secondary: true },
      ],
    };
  }

  if (!hasHourlyItems && dismissedAssistantNudgeId !== "see-hourly-day") {
    return {
      id: "see-hourly-day",
      title: "Want to see your day by the hour?",
      message: "Timed routines, recurring tasks, and scheduled tasks stack here so you can spot busy hours before they run you over.",
      actions: [
        { label: "Open Hourly View", action: "show-hourly" },
        { label: "Add Timed Repeat", action: "show-recurring-tasks", secondary: true },
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
    <section id="briefing" class="section briefing-screen" data-walkthrough="briefing">
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
      ${renderMedicationBriefingPanel(briefing.medications)}
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

function renderMedicationBriefingPanel(data) {
  if (!data || data.medications.length === 0) {
    return "";
  }

  const upcoming = data.upcomingRefills.filter((item) => Number(item.daysUntilRefill ?? 999) <= 14).slice(0, 4);
  return `
    <article class="panel morning-routine-panel">
      <div class="panel-title">
        <h3>Meds, Pills, Supplements</h3>
        ${pill(`${data.medications.length} tracked`, "strong")}
      </div>
      ${
        upcoming.length
          ? renderBriefingItems(upcoming.map((item) => ({
              title: item.name,
              detail: item.daysUntilRefill <= 0 ? "Refill date is here" : `Refill in ${item.daysUntilRefill} day${item.daysUntilRefill === 1 ? "" : "s"}`,
            })), "No refill dates are coming up.")
          : `<p class="empty-copy">Saved for routine support. Add refill dates when you want the assistant to help prevent running out.</p>`
      }
    </article>
  `;
}

function renderRoutineBuilder(data = getRoutineBuilderData()) {
  const draft = data.draftRoutine;

  return `
    <section id="routine-builder" class="section routine-builder-section" data-walkthrough="routines">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Routine Builder</p>
          <h2>Build a path through part of your day</h2>
          <p class="empty-copy">Choose the routine first. Then tell the assistant what you normally do. Each action stays trackable, reusable, and easy to rearrange.</p>
        </div>
        ${pill(`${data.routines.length} saved`, "strong")}
      </div>
      ${renderSetupGuide("routines")}
      ${draft ? renderRoutineConversation(draft) : renderRoutineTemplates(data.templates)}
      <article class="panel routine-list-panel">
        <div class="panel-title">
          <h3>Your routines</h3>
          ${pill(`${data.activeSteps.length} active actions`, "strong")}
        </div>
        ${renderRoutinePlanList(data.routines)}
        ${renderMedicationTrackingList(getMedicationTrackingData())}
      </article>
    </section>
  `;
}

function renderRoutineTemplates(templates) {
  return `
    <article class="panel routine-template-panel">
      <div>
        <p class="eyebrow">Choose a starting container</p>
        <h3>Which routine do you want to build?</h3>
        <p>Choosing one creates it immediately. You can add actions next and schedule it after the structure feels right.</p>
      </div>
      <div class="routine-template-grid">
        ${templates.map((template) => `<button type="button" class="routine-template-button" data-action="create-routine-template" data-template-id="${escapeHtml(template.id)}">${escapeHtml(template.name)}</button>`).join("")}
        <button type="button" class="routine-template-button secondary-button" data-action="create-custom-routine">Custom Routine</button>
      </div>
    </article>
  `;
}

function renderRoutineConversation(routine) {
  return `
    <div class="routine-conversation">
      <article class="panel routine-created-message">
        <p class="eyebrow">Routine created</p>
        <h3>Great. I've created your ${escapeHtml(routine.name)}.</h3>
        <p>Now add the specific things you normally want to do as part of it. Speak naturally, review the separated actions, then submit them.</p>
      </article>
      <article class="panel routine-action-capture">
        <div class="panel-title">
          <div>
            <h3>What do you usually want to do?</h3>
            <p class="empty-copy">Be specific when you can. Say “Take amlodipine” instead of “Take pills,” or “Walk 15 minutes” instead of “Exercise.”</p>
          </div>
          ${pill(`${routine.steps.length} added`, "strong")}
        </div>
        ${renderVoiceListEntry(getVoiceListEntryData("routineSteps"))}
        <details class="optional-helper">
          <summary>Add medications or supplements separately</summary>
          ${renderMedicationRoutineHelper(getMedicationTrackingData())}
        </details>
        ${renderWorkRoutineSuggestions(routine)}
      </article>
      <article class="panel routine-order-panel">
        <div class="panel-title">
          <div>
            <h3>Put the actions in order</h3>
            <p class="empty-copy">Drag them on a computer, or use the arrow buttons on your phone.</p>
          </div>
        </div>
        ${renderRoutineActionOrder(routine)}
      </article>
      ${routine.steps.length ? renderRoutineScheduleAfterStructure(routine) : ""}
      <div class="button-row routine-builder-footer">
        <button type="button" class="secondary-button" data-action="finish-routine-building">Done For Now</button>
        <button type="button" class="danger-button" data-action="delete-current-routine" data-id="${escapeHtml(routine.id)}">Delete This Routine</button>
      </div>
    </div>
  `;
}

function renderRoutineActionOrder(routine) {
  if (routine.steps.length === 0) {
    return `<p class="empty-copy">No actions yet. Speak, type, or paste the things you normally do, then review and submit them above.</p>`;
  }

  return `
    <ol class="routine-action-order" data-routine-id="${escapeHtml(routine.id)}">
      ${routine.steps.map((step, index) => `
        <li draggable="true" data-routine-step-id="${escapeHtml(step.id)}" data-step-index="${index}">
          <span class="drag-handle" aria-hidden="true">::</span>
          <div class="routine-order-content">
            <strong>${escapeHtml(step.title)}</strong>
            <span>${step.estimatedMinutes} min${step.habitId ? " - tracked action" : step.groupType === "medications" ? " - medication group" : ""}</span>
            ${renderRoutineStepChildren(step)}
          </div>
          <div class="item-actions">
            <button type="button" class="secondary-button" data-action="move-routine-action" data-direction="up" data-routine-id="${escapeHtml(routine.id)}" data-id="${escapeHtml(step.id)}" aria-label="Move ${escapeHtml(step.title)} up">↑</button>
            <button type="button" class="secondary-button" data-action="move-routine-action" data-direction="down" data-routine-id="${escapeHtml(routine.id)}" data-id="${escapeHtml(step.id)}" aria-label="Move ${escapeHtml(step.title)} down">↓</button>
            <button type="button" class="secondary-button" data-action="remove-routine-action" data-routine-id="${escapeHtml(routine.id)}" data-id="${escapeHtml(step.id)}">Remove</button>
          </div>
        </li>
      `).join("")}
    </ol>
  `;
}

function renderRoutineStepChildren(step) {
  if (step.groupType !== "medications") {
    return "";
  }
  const medications = getMedicationTrackingData().medications.filter(
    (medication) => medication.schedule === (step.schedule ?? "morning"),
  ).sort((left, right) => String(left.createdAt ?? "").localeCompare(String(right.createdAt ?? "")) || left.name.localeCompare(right.name));
  return medications.length
    ? `<ul class="routine-builder-children">${medications.map((medication) => `<li>${escapeHtml(medication.name)}${medication.dose ? ` - ${escapeHtml(medication.dose)}` : ""}</li>`).join("")}</ul>`
    : `<p class="field-help">No active medications are assigned to this time yet.</p>`;
}

function renderRoutineScheduleAfterStructure(routine) {
  return `
    <form class="panel routine-schedule-form" data-action="save-routine-schedule">
      <input type="hidden" name="routineId" value="${escapeHtml(routine.id)}" />
      <div>
        <p class="eyebrow">Structure first, schedule second</p>
        <h3>When should ${escapeHtml(routine.name)} begin?</h3>
        <p class="empty-copy">You can leave this blank for now. Add a time when you want the routine and its actions placed into Hourly View.</p>
      </div>
      <div class="guided-step-grid">
        <div>
          <label for="routine-start-time">Start time</label>
          <input id="routine-start-time" name="routineStartTime" type="time" value="${escapeHtml(getRoutineStartTimeInputValue(routine.startTime))}" />
        </div>
        <div>
          <label for="routine-alarm">Alarm-style prompt</label>
          <select id="routine-alarm" name="routineAlarm">
            <option value="none" ${routine.alarmPreference === "prompt" ? "" : "selected"}>No prompt</option>
            <option value="prompt" ${routine.alarmPreference === "prompt" ? "selected" : ""}>Yes, prompt me in the app</option>
          </select>
        </div>
        <div>
          <label for="routine-active">Status</label>
          <select id="routine-active" name="routineActive">
            <option value="active" ${routine.active === false ? "" : "selected"}>Active</option>
            <option value="inactive" ${routine.active === false ? "selected" : ""}>Inactive</option>
          </select>
        </div>
      </div>
      <button type="submit">Save Routine Timing</button>
    </form>
  `;
}

function renderWorkRoutineSuggestions(routine) {
  if (!/work/i.test(routine.name)) {
    return "";
  }
  return `
    <details class="work-routine-suggestions">
      <summary>Want suggestions based on your work?</summary>
      <p>Choose the closest fit. You can remove anything that does not belong.</p>
      <div class="button-row">
        <button type="button" class="secondary-button" data-action="add-work-routine-suggestions" data-work-type="office" data-routine-id="${escapeHtml(routine.id)}">Office / Computer</button>
        <button type="button" class="secondary-button" data-action="add-work-routine-suggestions" data-work-type="field" data-routine-id="${escapeHtml(routine.id)}">Physical / Field</button>
        <button type="button" class="secondary-button" data-action="add-work-routine-suggestions" data-work-type="self-employed" data-routine-id="${escapeHtml(routine.id)}">Self-Employed</button>
      </div>
    </details>
  `;
}

function getWorkRoutineSuggestions(workType) {
  if (workType === "field") {
    return ["Gather equipment", "Perform safety check", "Review first assignment", "Prepare workspace", "Start first task"];
  }
  if (workType === "self-employed") {
    return ["Check revenue opportunities", "Review client work", "Review urgent communications", "Identify today's most important task", "Begin first work block"];
  }
  return ["Check calendar", "Review priorities", "Open work tools", "Review inbox", "Start first focus session"];
}

function handleRoutineStepCompletion(routineId, stepId) {
  const before = getActiveRoutineGuidance(routineId);
  const completedTitle = before?.steps.find((step) => step.id === stepId)?.title ?? "Step";
  const after = completeActiveRoutineStep(routineId, stepId);
  playRoutineChime();
  if (after?.currentStep) {
    announceRoutineMessage(`Done. Next: ${after.currentStep.title}.`, after.settings.autoReadNextStep || after.settings.voiceGuidance);
  } else {
    announceRoutineMessage(`${completedTitle} done. ${after?.routine.name ?? "Routine"} complete.`, after?.settings.voiceGuidance);
  }
  renderApp();
}

function handleRoutineStepSkip(routineId, stepId) {
  const settings = getRoutineGuidanceSettings();
  if (settings.confirmBeforeSkip && !window.confirm("Skip this step for today?")) {
    return;
  }
  const after = skipActiveRoutineStep(routineId, stepId);
  playRoutineChime();
  if (after?.currentStep) {
    announceRoutineMessage(`Okay. Next: ${after.currentStep.title}.`, after.settings.autoReadNextStep || after.settings.voiceGuidance);
  }
  renderApp();
}

function announceRoutineMessage(message, speak = true) {
  if (!speak || !("speechSynthesis" in window)) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function announceCurrentRoutineStep(prefix = "Next") {
  const guidance = getActiveRoutineGuidance();
  if (!guidance?.currentStep) {
    return;
  }
  announceRoutineMessage(`${prefix}: ${guidance.currentStep.title}.`, true);
  markActiveRoutinePrompted();
}

function playRoutineChime() {
  if (!getRoutineGuidanceSettings().chimes) {
    return;
  }
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return;
    }
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.3);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.32);
    oscillator.addEventListener("ended", () => context.close());
  } catch {
    // Browsers may block audio until the user has interacted with the page.
  }
}

function listenForRoutineCommand() {
  if (routineVoiceRecognition) {
    return;
  }
  const status = document.querySelector("[data-routine-voice-status]");
  if (status) {
    status.textContent = "Listening for Done, Skip, Next, Repeat, Pause, or Resume...";
  }
  routineVoiceRecognition = startVoiceRecognition({
    onResult: (transcript) => handleRoutineVoiceCommand(transcript),
    onError: (message) => {
      if (status) status.textContent = message;
    },
    onEnd: () => {
      routineVoiceRecognition = null;
    },
  });
}

function handleRoutineVoiceCommand(transcript) {
  const command = String(transcript ?? "").trim().toLowerCase();
  const guidance = getActiveRoutineGuidance();
  const status = document.querySelector("[data-routine-voice-status]");
  if (!guidance) {
    if (status) status.textContent = "No active routine found.";
    return;
  }
  if (/^(done|mark done|finished|finish)$/.test(command) && guidance.currentStep) {
    handleRoutineStepCompletion(guidance.routine.id, guidance.currentStep.id);
    return;
  }
  if (/^(skip|next)$/.test(command) && guidance.currentStep) {
    handleRoutineStepSkip(guidance.routine.id, guidance.currentStep.id);
    return;
  }
  if (/^(repeat|say again|read again)$/.test(command)) {
    announceCurrentRoutineStep("Current step");
    if (status) status.textContent = `Heard "${transcript}".`;
    return;
  }
  if (/^(pause|pause routine)$/.test(command)) {
    pauseActiveRoutine();
    renderApp();
    return;
  }
  if (/^(resume|resume routine|continue)$/.test(command)) {
    resumeActiveRoutine();
    announceCurrentRoutineStep("Resuming");
    renderApp();
    return;
  }
  if (status) {
    status.textContent = `I heard "${transcript}". Try Done, Skip, Next, Repeat, Pause routine, or Resume routine.`;
  }
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

function getRoutineStartTimeInputValue(value) {
  const match = String(value ?? "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return "";
  }

  let hours = Number(match[1]);
  const minutes = match[2];
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) {
    hours += 12;
  }
  if (period === "AM" && hours === 12) {
    hours = 0;
  }
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function renderMedicationRoutineHelper(data) {
  return `
    <div class="medication-routine-helper">
      <div>
        <h4>Meds, Pills, Or Supplements</h4>
        <p>If this routine includes taking medication, pills, or supplements, add the individual items here. The assistant will save them quietly for tracking and place one calm grouped step in your routine.</p>
      </div>
      <div class="guided-step-grid">
        <div>
          <label for="medication-group-name">Routine step name</label>
          <input id="medication-group-name" type="text" value="Take morning meds" />
        </div>
        <div>
          <label for="medication-schedule">When</label>
          <select id="medication-schedule">
            <option value="morning" selected>Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>
      <label for="medication-names">Which ones?</label>
      <textarea id="medication-names" rows="3" placeholder="Amlodipine&#10;Atorvastatin&#10;Vitamin D"></textarea>
      <div class="guided-step-grid">
        <div>
          <label for="medication-refill-date">Next refill date <span class="optional-label">optional</span></label>
          <input id="medication-refill-date" type="date" />
        </div>
        <div class="medication-helper-actions">
          <button type="button" data-action="add-medication-group-to-routine">Add To Routine</button>
        </div>
      </div>
      <p class="field-help">Start with the names and refill date if you know it. Later, you can add strength, doctor, pharmacy, and notes when that becomes useful.</p>
      <p class="field-help" data-medication-helper-message>${data.medications.length ? `${data.medications.length} medication or supplement item${data.medications.length === 1 ? "" : "s"} saved.` : ""}</p>
    </div>
  `;
}

function renderMedicationTrackingList(data) {
  if (data.medications.length === 0) {
    return `
      <div class="medication-tracking-list">
        <h3>Medication Tracking</h3>
        <p class="empty-copy">No medication or supplement items saved yet. Add them while building a routine.</p>
      </div>
    `;
  }

  return `
    <div class="medication-tracking-list">
      <h3>Medication Tracking</h3>
      <p class="empty-copy">These details are optional. Add more only when you want the assistant to help with refills and follow-through.</p>
      <ul>
        ${data.medications.map((item) => renderMedicationTrackingItem(item)).join("")}
      </ul>
    </div>
  `;
}

function renderMedicationTrackingItem(item) {
  return `
    <li>
      <details>
        <summary>
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(titleCase(item.schedule ?? "custom"))}${item.refillDate ? ` - refill ${escapeHtml(item.refillDate)}` : ""}</span>
        </summary>
        <form class="medication-detail-form" data-action="save-medication-details">
          <input type="hidden" name="medicationId" value="${escapeHtml(item.id)}" />
          <div class="guided-step-grid">
            <div>
              <label for="dose-${escapeHtml(item.id)}">Strength / dose</label>
              <input id="dose-${escapeHtml(item.id)}" name="medicationDose" type="text" value="${escapeHtml(item.dose ?? "")}" placeholder="Optional" />
            </div>
            <div>
              <label for="refill-${escapeHtml(item.id)}">Next refill</label>
              <input id="refill-${escapeHtml(item.id)}" name="medicationRefillDate" type="date" value="${escapeHtml(item.refillDate ?? "")}" />
            </div>
          </div>
          <div class="guided-step-grid">
            <div>
              <label for="prescriber-${escapeHtml(item.id)}">Doctor / prescriber</label>
              <input id="prescriber-${escapeHtml(item.id)}" name="medicationPrescriber" type="text" value="${escapeHtml(item.prescriber ?? "")}" placeholder="Optional" />
            </div>
            <div>
              <label for="pharmacy-${escapeHtml(item.id)}">Pharmacy</label>
              <input id="pharmacy-${escapeHtml(item.id)}" name="medicationPharmacy" type="text" value="${escapeHtml(item.pharmacy ?? "")}" placeholder="Optional" />
            </div>
            <div>
              <label for="medication-active-${escapeHtml(item.id)}">Status</label>
              <select id="medication-active-${escapeHtml(item.id)}" name="medicationActive">
                <option value="active" ${item.active === false ? "" : "selected"}>Active</option>
                <option value="inactive" ${item.active === false ? "selected" : ""}>No longer taking</option>
              </select>
            </div>
          </div>
          <label for="notes-${escapeHtml(item.id)}">Notes</label>
          <textarea id="notes-${escapeHtml(item.id)}" name="medicationNotes" rows="2" placeholder="Optional">${escapeHtml(item.notes ?? "")}</textarea>
          <button type="submit">Save Details</button>
        </form>
      </details>
    </li>
  `;
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
        <span>${escapeHtml(titleCase(routine.type))} - ${routine.steps.length} steps - ${totalMinutes} min${routine.startTime ? ` - starts ${escapeHtml(routine.startTime)}` : ""}${routine.alarmPreference === "prompt" ? " - in-app prompt" : ""}</span>
      </div>
      <div class="item-actions">
        ${pill(routine.active ? "Active" : "Inactive", routine.active ? "strong" : "neutral")}
        <button type="button" data-action="edit-routine" data-id="${escapeHtml(routine.id)}">Open Routine</button>
        <button type="button" data-action="${routine.active ? "deactivate-routine" : "activate-routine"}" data-id="${escapeHtml(routine.id)}">${routine.active ? "Deactivate" : "Activate"}</button>
        <button type="button" class="danger-button" data-action="delete-routine" data-id="${escapeHtml(routine.id)}">Delete Routine</button>
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
    <section id="goal-setting" class="section goal-setting-section" data-walkthrough="goals">
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
    <section id="habit-tracking" class="section habit-tracking-section" data-walkthrough="habits">
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
    <section id="recurring-tasks" class="section recurring-task-section" data-walkthrough="recurring-tasks">
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
          <div class="template-callout">
            <div>
              <strong>Example: daily water rhythm</strong>
              <p>Add simple water breaks across the day so they appear in Hourly View beside your projects, calls, and routines.</p>
            </div>
            <button type="button" class="secondary-button" data-action="add-water-break-template">Add Water Breaks</button>
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
            <label for="recurring-task-time">Time <span class="optional-label">optional</span></label>
            <input id="recurring-task-time" name="recurringTaskScheduledTime" type="time" value="${escapeHtml(getRoutineStartTimeInputValue(draft?.scheduledTime))}" />
            <p class="field-help">Add a time when this belongs in a specific hour. Leave blank if it can float during the day.</p>
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
        <span>${escapeHtml(task.category)} - ${escapeHtml(recurrence)} - next ${escapeHtml(task.nextOccurrence)}${task.scheduledTime ? ` at ${escapeHtml(task.scheduledTime)}` : ""}</span>
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
    <section id="working" class="section working-mode" data-walkthrough="working">
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
    <section id="command-center" class="section command-center-mode" data-walkthrough="command-center">
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
      ${renderCommandSetupPrompt()}
      <div class="command-center-grid">
        ${renderCommandNow(now, working.activeRoutine)}
        ${renderCommandNext(next)}
        ${renderCommandMiddlePrompt({ tip: briefing.tip, reinforcement })}
        ${renderCommandToday(important)}
        ${renderCommandStatus({ stats, energyMood, briefing, smartRescheduling })}
        ${renderCommandAlerts({ intervention: working.intervention ?? briefing.intervention, smartRescheduling })}
      </div>
    </section>
  `;
}

function renderCommandSetupPrompt() {
  const state = getState();
  const activeRoutines = (state.routinePlans ?? []).filter((routine) => routine.active !== false);
  const activeRecurringTasks = (state.recurringTasks ?? []).filter((task) => task.active !== false);
  const hasTimedMorningRoutine = activeRoutines.some((routine) => routine.type === "morning" && routine.startTime);
  const hasTimedRecurringTask = activeRecurringTasks.some((task) => task.scheduledTime);
  const promptId = "command-first-use-guide";

  if (dismissedCommandSetupPromptId === promptId) {
    return "";
  }

  const guidance = getCommandSetupGuidance({ hasTimedMorningRoutine, hasTimedRecurringTask });

  return `
    <article class="command-setup-prompt">
      <div>
        <p class="eyebrow">${escapeHtml(guidance.eyebrow)}</p>
        <strong>${escapeHtml(guidance.title)}</strong>
        <span>${escapeHtml(guidance.message)}</span>
      </div>
      <div class="button-row">
        <button type="button" data-action="${escapeHtml(guidance.primaryAction)}">${escapeHtml(guidance.primaryLabel)}</button>
        <button type="button" class="secondary-button" data-action="show-hourly">See Hourly View</button>
        <button type="button" class="secondary-button" data-action="dismiss-command-setup-prompt" data-id="${escapeHtml(promptId)}">Not Now</button>
      </div>
    </article>
  `;
}

function getCommandSetupGuidance({ hasTimedMorningRoutine, hasTimedRecurringTask }) {
  if (!hasTimedMorningRoutine) {
    return {
      eyebrow: "First useful setup",
      title: "Teach your assistant one thing it can guide today.",
      message: "Start with a timed morning routine so your day has a path. Add water, meds, coffee, movement, or a quick review of today.",
      primaryLabel: "Set Morning Routine",
      primaryAction: "show-routines",
    };
  }

  if (!hasTimedRecurringTask) {
    return {
      eyebrow: "Next useful setup",
      title: "Add one responsibility that comes back.",
      message: "Use this for trash night, bills, water breaks, refills, or weekly check-ins. If it has a time, it lands in Hourly View.",
      primaryLabel: "Add Timed Repeat",
      primaryAction: "show-recurring-tasks",
    };
  }

  return {
    eyebrow: "Structure is started",
    title: "Your assistant has something real to guide.",
    message: "Open Hourly View to see timed routines, recurring tasks, and scheduled items together. Add more when you are ready.",
    primaryLabel: "Open Hourly View",
    primaryAction: "show-hourly",
  };
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
    <section id="progress" class="section" data-walkthrough="progress">
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
  const walkthroughStatus = getWalkthroughStatus();
  return `
    <section id="help" class="section help-view" data-walkthrough="help">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Help</p>
          <h2>How to Use Life Enablement Assistant Each Day</h2>
          <p class="empty-copy">Life Enablement Assistant is meant to be left open during the day as a simple guide. You do not have to perfectly organize your life before using it. Start small, check in, and let the app help you decide what matters next.</p>
        </div>
        <button type="button" data-action="start-walkthrough">${walkthroughStatus.completed || walkthroughStatus.skipped ? "Restart Walkthrough" : "Start Walkthrough"}</button>
      </div>
      <div class="help-daily-guide">
        ${renderHelpGuideCard("1", "Start with the Command Center", "Open the Command Center first. Look at Now. Do the one thing shown there if it makes sense. Check Next only when you need to know what is coming.")}
        ${renderHelpGuideCard("2", "Add things quickly", "Use Start Adding whenever something pops into your head. Type naturally, like: Call insurance tomorrow, Take trash out every Monday, Drink water three times a day, Lose 20 pounds, or Add eggs to shopping.")}
        ${renderHelpGuideCard("3", "Update your Status", "If your mood, energy, or focus changes, update Status. This helps the app make gentler or more realistic recommendations.")}
        ${renderHelpGuideCard("4", "Use Working Mode when overwhelmed", "Working Mode removes extra clutter. Use it when you only want to know what to do now and what is next.")}
        ${renderHelpGuideCard("5", "Check the Morning Briefing", "Use Morning Briefing near the start of the day. It helps you see big things, scheduled items, deadlines, and possible problems.")}
        ${renderHelpGuideCard("6", "Build habits and routines slowly", "Do not try to build a perfect system all at once. Add one or two habits or routines first. Let the app help you repeat them.")}
        ${renderHelpGuideCard("7", "End of day", "Review what got done. Move or reschedule anything unfinished. Let tomorrow start cleaner.")}
        ${renderHelpGuideCard("8", "The main idea", "You are not supposed to remember everything or decide everything manually. Life Enablement Assistant is here to reduce decisions, keep important things visible, and help you keep moving.")}
      </div>
    </section>
  `;
}

function renderHelpGuideCard(number, title, copy) {
  return `
    <article class="panel help-guide-card">
      <span>${escapeHtml(number)}</span>
      <div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(copy)}</p>
      </div>
    </article>
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
    <section id="${escapeHtml(viewName)}" class="section placeholder-view" data-walkthrough="${escapeHtml(viewName)}">
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
  const routineGuidance = getRoutineGuidanceSettings();
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
      <article class="panel routine-guidance-settings">
        <div class="panel-title">
          <div>
            <h3>Routine Guidance</h3>
            <p class="empty-copy">Choose how actively the assistant should keep you moving through a routine.</p>
          </div>
          ${pill(routineGuidance.voiceGuidance ? "Voice on" : routineGuidance.chimes ? "Chime on" : "Silent", "neutral")}
        </div>
        <form class="routine-guidance-settings-form" data-action="save-routine-guidance-settings">
          <label class="setting-toggle">
            <input type="checkbox" name="routineVoiceGuidance" ${routineGuidance.voiceGuidance ? "checked" : ""} />
            <span><strong>Voice guidance</strong><small>Speak the current or next routine step.</small></span>
          </label>
          <label class="setting-toggle">
            <input type="checkbox" name="routineChimes" ${routineGuidance.chimes ? "checked" : ""} />
            <span><strong>Chimes</strong><small>Play a gentle sound after progress and reminders.</small></span>
          </label>
          <label class="setting-toggle">
            <input type="checkbox" name="routineAutoRead" ${routineGuidance.autoReadNextStep ? "checked" : ""} />
            <span><strong>Auto-read next step</strong><small>Read the next action after Done or Skip.</small></span>
          </label>
          <label class="setting-toggle">
            <input type="checkbox" name="routineConfirmSkip" ${routineGuidance.confirmBeforeSkip ? "checked" : ""} />
            <span><strong>Confirm before skipping</strong><small>Ask before moving past a routine action.</small></span>
          </label>
          <div>
            <label for="routine-reminder-interval">Reminder interval while active</label>
            <select id="routine-reminder-interval" name="routineReminderInterval">
              ${[1, 3, 5, 10, 15, 30].map((minutes) => `<option value="${minutes}" ${routineGuidance.reminderIntervalMinutes === minutes ? "selected" : ""}>${minutes} minute${minutes === 1 ? "" : "s"}</option>`).join("")}
            </select>
          </div>
          <button type="submit">Save Routine Guidance</button>
        </form>
        <p class="empty-copy">Audio works while the app is open. Phone background alarms and notifications still require a later installed-app version.</p>
      </article>
      <details class="panel settings-testing-panel">
        <summary>
          <span>
            <strong>Prototype tools</strong>
            <small>Reset onboarding or load sample data for testing.</small>
          </span>
        </summary>
        <div class="prototype-tool-grid">
          <button type="button" class="secondary-button" data-action="start-walkthrough">Start Walkthrough</button>
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
    <section id="shop" class="section shop-view" data-walkthrough="shop">
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

function renderCommandNow(recommendation, activeRoutine = null) {
  if (activeRoutine) {
    return renderActiveRoutineCard(activeRoutine, "command");
  }

  if (!recommendation) {
    return `
      <article class="panel command-card command-now" data-window-title="Now" data-walkthrough="now">
        ${renderCommandHeader("Now", "show-today", "Open Today controls")}
        <h3>Your current thing goes here.</h3>
        <p class="command-helper-copy">This is the one thing your assistant thinks you should be doing now. To enter one, click the <strong>Now</strong> link and add a task in Today.</p>
        <p class="empty-copy">If nothing is truly due right now, this space can stay open.</p>
      </article>
    `;
  }

  const timingClass = getScheduledTimingClass(recommendation);
  return `
    <article class="panel command-card command-now${timingClass}" data-window-title="Now" data-walkthrough="now">
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
      <article class="panel command-card command-next" data-window-title="Next" data-walkthrough="next">
        ${renderCommandHeader("Next", "show-dashboard", "Open Day Glimpse")}
        <h3>Your next thing goes here.</h3>
        <p class="command-helper-copy">This is what is coming up after Now. Try it by adding a scheduled task for the next hour in Today or Hourly View.</p>
        <p class="empty-copy">Scheduled items appear here when they have a time.</p>
      </article>
    `;
  }

  return `
    <article class="panel command-card command-next" data-window-title="Next" data-walkthrough="next">
      ${renderCommandHeader("Next", "show-dashboard", "Open Day Glimpse")}
      <h3>${escapeHtml(item.title ?? item.name)}</h3>
      <p>${escapeHtml(item.startTime ?? item.time ?? item.dueDate ?? item.deadline ?? item.type ?? "Up next")}</p>
    </article>
  `;
}

function renderCommandToday(items) {
  return `
    <article class="panel command-card command-today" data-window-title="Today" data-walkthrough="today">
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
    <article class="panel command-card command-status-card" data-window-title="Status" data-walkthrough="status">
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

function renderActiveRoutineCard(guidance, context = "working", timeRemaining = "") {
  const current = guidance.currentStep;
  const isPaused = guidance.status === "paused";
  const isReady = guidance.status === "ready";
  const isComplete = guidance.status === "complete";
  const cardClass = context === "command"
    ? "panel command-card command-now active-routine-card"
    : "working-card now-card active-routine-card";

  return `
    <article class="${cardClass}" data-window-title="Now">
      <div class="active-routine-heading">
        <div>
          <p class="eyebrow">Now - Active Routine</p>
          <h3>${escapeHtml(guidance.routine.name)}</h3>
        </div>
        ${pill(isComplete ? "Complete" : isPaused ? "Paused" : `${guidance.handledCount}/${guidance.totalCount}`, isComplete ? "done" : "strong")}
      </div>
      <div class="routine-progress-track" aria-label="${guidance.progressPercent}% complete">
        <span style="width: ${guidance.progressPercent}%"></span>
      </div>
      ${
        isComplete
          ? `<div class="routine-current-step routine-complete-message"><strong>Routine complete.</strong><span>You moved through the whole path.</span></div>`
          : `<div class="routine-current-step">
              <span>${isPaused ? "Paused on" : isReady ? "First step" : "Current step"}</span>
              <strong>${escapeHtml(current?.title ?? "No remaining step")}</strong>
              <small>${guidance.remainingCount} remaining</small>
            </div>`
      }
      ${timeRemaining ? `<div class="time-remaining"><strong>${escapeHtml(timeRemaining)}</strong></div>` : ""}
      <div class="button-row active-routine-controls">
        ${
          isComplete
            ? `<button type="button" data-action="close-active-routine">Close Routine</button>`
            : isReady
              ? `<button type="button" data-action="start-active-routine" data-routine-id="${escapeHtml(guidance.routine.id)}">Start Routine</button>`
              : isPaused
                ? `<button type="button" data-action="resume-active-routine">Resume</button>`
                : `<button type="button" data-action="complete-active-routine-step" data-routine-id="${escapeHtml(guidance.routine.id)}" data-step-id="${escapeHtml(current?.id ?? "")}">Done</button>
                   <button type="button" class="secondary-button" data-action="skip-active-routine-step" data-routine-id="${escapeHtml(guidance.routine.id)}" data-step-id="${escapeHtml(current?.id ?? "")}">Skip</button>
                   <button type="button" class="secondary-button" data-action="pause-active-routine">Pause</button>`
        }
        ${!isComplete && current ? `<button type="button" class="secondary-button" data-action="repeat-active-routine-step">Read Step</button>` : ""}
        ${!isComplete ? `<button type="button" class="secondary-button" data-action="listen-active-routine">Voice Command</button>` : ""}
      </div>
      <ol class="active-routine-list">
        ${guidance.steps.map((step) => renderActiveRoutineListStep(guidance.routine.id, step, current)).join("")}
      </ol>
      <p class="routine-voice-status" data-routine-voice-status>${isPaused ? "Routine paused." : "Say Done, Skip, Next, Repeat, Pause routine, or Resume routine."}</p>
    </article>
  `;
}

function renderActiveRoutineListStep(routineId, step, current) {
  if (step.children?.length) {
    return `
      <li class="routine-group ${step.completed ? "is-complete" : ""}">
        <div class="routine-group-title">
          <span class="routine-group-marker" aria-hidden="true">${step.completed ? "&#10003;" : ""}</span>
          <strong>${escapeHtml(step.title)}</strong>
        </div>
        <ul>
          ${step.children.map((child) => renderActiveRoutineChild(routineId, child, current)).join("")}
        </ul>
      </li>
    `;
  }
  return renderActiveRoutineChild(routineId, step, current, true);
}

function renderActiveRoutineChild(routineId, step, current, topLevel = false) {
  return `
    <li class="${topLevel ? "routine-top-level-action" : ""} ${step.completed ? "is-complete" : ""} ${step.skipped ? "is-skipped" : ""} ${current?.id === step.id ? "is-current" : ""}">
      <button type="button" class="routine-check-button" data-action="toggle-active-routine-step" data-routine-id="${escapeHtml(routineId)}" data-step-id="${escapeHtml(step.id)}" aria-label="${step.completed ? "Completed" : "Mark done"}: ${escapeHtml(step.title)}" ${step.completed ? "disabled" : ""}>
        <span aria-hidden="true">${step.completed ? "&#10003;" : step.skipped ? "&#8212;" : ""}</span>
      </button>
      <span>${escapeHtml(step.displayTitle ?? step.title)}</span>
    </li>
  `;
}

function renderNowCard(working) {
  const recommendation = working.now;
  if (working.activeRoutine) {
    return renderActiveRoutineCard(working.activeRoutine, "working", working.timeRemaining);
  }

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
  const routineStepEvents = getRoutineBuilderData().scheduledSteps
    .filter((event) => event.timingType === "scheduled" && event.startTime)
    .map((event) => ({
      ...event,
      collection: "routineSteps",
      type: "Routine Step",
      displayTime: event.startTime,
      hour: getHourFromTime(event.startTime),
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
  const recurringEvents = getRecurringTaskData().dueOccurrences
    .filter((event) => event.timingType === "scheduled" && event.startTime)
    .map((event) => ({
      ...event,
      collection: "recurringOccurrences",
      type: "Recurring Task",
      displayTime: event.startTime,
      hour: getHourFromTime(event.startTime),
    }));
  const events = [...timelineEvents, ...routineStepEvents, ...recurringEvents, ...scheduledTasks];

  return Array.from({ length: 16 }, (_, index) => {
    const hour = index + 6;
    return {
      hour,
      label: formatHourLabel(hour),
      events: events.filter((event) => event.hour === hour),
      loadMinutes: events.filter((event) => event.hour === hour).reduce((sum, event) => sum + Number(event.estimatedEffortMinutes ?? 15), 0),
    };
  });
}

function renderHourBlock(hour) {
  const open = hour.events.length > 0 ? "open" : "";
  const isHeavy = hour.loadMinutes > 60 || hour.events.length >= 4;
  return `
    <details class="hour-block ${isHeavy ? "is-heavy" : ""}" ${open}>
      <summary>
        <span>${escapeHtml(hour.label)}</span>
        ${pill(`${hour.events.length} item${hour.events.length === 1 ? "" : "s"}`, hour.events.length ? "strong" : "neutral")}
      </summary>
      ${isHeavy ? `<p class="hour-warning">This hour may be overloaded. Consider moving one item so the hour has breathing room.</p>` : ""}
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
    ${renderWalkthroughOverlay()}
  `;
  enhanceCollapsibleWindows();
  syncWalkthroughTarget();
  scheduleWorkingModeRefresh(activeView);
  scheduleRoutineGuidanceReminder();
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
    if (["working", "command-center", "today"].includes(getActiveView()) && !shouldPauseAutomaticRefresh()) {
      renderApp();
    }
  }, 1000);
}

function scheduleRoutineGuidanceReminder() {
  if (routineGuidanceTimer) {
    return;
  }

  routineGuidanceTimer = setInterval(() => {
    if (!shouldRemindActiveRoutine()) {
      return;
    }
    const guidance = getActiveRoutineGuidance();
    if (!guidance?.currentStep) {
      return;
    }
    playRoutineChime();
    announceRoutineMessage(`Still on ${guidance.routine.name}. Next step: ${guidance.currentStep.title}.`, guidance.settings.voiceGuidance);
    markActiveRoutinePrompted();
  }, 15000);
}

function shouldPauseAutomaticRefresh() {
  if (walkthroughActive || routineVoiceRecognition || document.querySelector(".app-menu[open]")) {
    return true;
  }

  const activeElement = document.activeElement;
  return Boolean(
    activeElement
    && activeElement !== document.body
    && activeElement.matches("input, textarea, select, button, summary, [contenteditable='true']"),
  );
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
  if (action === "start-walkthrough") {
    startWalkthrough();
  }
  if (action === "create-routine-template") {
    createRoutineFromTemplate(button.dataset.templateId);
    renderApp();
  }
  if (action === "create-custom-routine") {
    const name = window.prompt("What should this routine be called?", "Custom Routine");
    if (name?.trim()) {
      createRoutineFromTemplate("custom", name.trim());
      renderApp();
    }
  }
  if (action === "start-active-routine") {
    const guidance = startActiveRoutine(button.dataset.routineId);
    playRoutineChime();
    if (guidance?.currentStep) {
      announceRoutineMessage(`${guidance.routine.name}. First: ${guidance.currentStep.title}.`, guidance.settings.voiceGuidance || guidance.settings.autoReadNextStep);
    }
    renderApp();
  }
  if (action === "close-active-routine") {
    closeActiveRoutine();
    renderApp();
  }
  if (action === "complete-active-routine-step" || action === "toggle-active-routine-step") {
    handleRoutineStepCompletion(button.dataset.routineId, button.dataset.stepId);
  }
  if (action === "skip-active-routine-step") {
    handleRoutineStepSkip(button.dataset.routineId, button.dataset.stepId);
  }
  if (action === "pause-active-routine") {
    pauseActiveRoutine();
    renderApp();
  }
  if (action === "resume-active-routine") {
    resumeActiveRoutine();
    announceCurrentRoutineStep("Resuming");
    renderApp();
  }
  if (action === "repeat-active-routine-step") {
    announceCurrentRoutineStep("Current step");
  }
  if (action === "listen-active-routine") {
    listenForRoutineCommand();
  }
  if (action === "finish-routine-building") {
    cancelRoutineEdit();
    renderApp();
  }
  if (action === "delete-current-routine") {
    if (window.confirm("Delete this routine? Its linked habits and medication records will remain available.")) {
      deleteRoutine(id);
      renderApp();
    }
  }
  if (action === "move-routine-action") {
    moveRoutineAction(button.dataset.routineId, id, button.dataset.direction);
    renderApp();
  }
  if (action === "remove-routine-action") {
    removeRoutineAction(button.dataset.routineId, id);
    renderApp();
  }
  if (action === "add-work-routine-suggestions") {
    addRoutineActions(button.dataset.routineId, getWorkRoutineSuggestions(button.dataset.workType));
    renderApp();
  }
  if (action === "walkthrough-next") {
    moveWalkthrough(1);
  }
  if (action === "walkthrough-back") {
    moveWalkthrough(-1);
  }
  if (action === "walkthrough-skip") {
    finishWalkthrough("skipped");
  }
  if (action === "walkthrough-finish") {
    finishWalkthrough("completed");
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
  if (action === "add-water-break-template") {
    addWaterBreakTemplate();
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
  if (action === "show-recurring-tasks") {
    setActiveView("recurring-tasks");
    renderApp();
  }
  if (action === "show-hourly") {
    setActiveView("hourly");
    renderApp();
  }
  if (action === "add-medication-group-to-routine") {
    addMedicationGroupToRoutine();
  }
  if (action === "dismiss-assistant-nudge") {
    dismissedAssistantNudgeId = id;
    renderApp();
  }
  if (action === "dismiss-command-setup-prompt") {
    dismissedCommandSetupPromptId = id;
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
    if (window.confirm("Delete this routine? Its linked habits and medication records will remain available.")) {
      deleteRoutine(id);
      renderApp();
    }
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

  const routineGuidanceSettingsForm = event.target.closest("form[data-action='save-routine-guidance-settings']");
  if (routineGuidanceSettingsForm) {
    event.preventDefault();
    saveRoutineGuidanceSettings(new FormData(routineGuidanceSettingsForm));
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

  const routineScheduleForm = event.target.closest("form[data-action='save-routine-schedule']");
  if (routineScheduleForm) {
    event.preventDefault();
    const formData = new FormData(routineScheduleForm);
    saveRoutineSchedule(String(formData.get("routineId") ?? ""), formData);
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

  const medicationDetailsForm = event.target.closest("form[data-action='save-medication-details']");
  if (medicationDetailsForm) {
    event.preventDefault();
    saveMedicationDetails(new FormData(medicationDetailsForm));
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

app.addEventListener("dragstart", (event) => {
  const step = event.target.closest("[data-routine-step-id]");
  if (!step) {
    return;
  }
  draggedRoutineStepId = step.dataset.routineStepId;
  event.dataTransfer?.setData("text/plain", draggedRoutineStepId);
  event.dataTransfer?.setDragImage(step, 20, 20);
});

app.addEventListener("dragover", (event) => {
  if (event.target.closest("[data-routine-step-id]")) {
    event.preventDefault();
  }
});

app.addEventListener("drop", (event) => {
  const target = event.target.closest("[data-routine-step-id]");
  const list = target?.closest("[data-routine-id]");
  if (!target || !list || !draggedRoutineStepId) {
    return;
  }
  event.preventDefault();
  moveRoutineActionToIndex(list.dataset.routineId, draggedRoutineStepId, Number(target.dataset.stepIndex));
  draggedRoutineStepId = "";
  renderApp();
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
    const routineId = getRoutineBuilderData().draftRoutine?.id;
    if (routineId) {
      addRoutineActions(routineId, approvedItems);
      renderApp();
    } else {
      appendApprovedRoutineSteps(approvedItems, component);
    }
    return;
  }

  renderApp();
}

function addMedicationGroupToRoutine() {
  const namesField = document.querySelector("#medication-names");
  const groupNameField = document.querySelector("#medication-group-name");
  const scheduleField = document.querySelector("#medication-schedule");
  const refillDateField = document.querySelector("#medication-refill-date");
  const message = document.querySelector("[data-medication-helper-message]");
  const names = String(namesField?.value ?? "").trim();

  if (!names) {
    if (message) {
      message.textContent = "Add at least one medication, pill, or supplement first.";
    }
    namesField?.focus();
    return;
  }

  const result = saveMedicationGroup(makeFormData({
    medicationGroupName: groupNameField?.value || "Take morning meds",
    medicationSchedule: scheduleField?.value || "morning",
    medicationRefillDate: refillDateField?.value || "",
    medicationNames: names,
  }));

  const routineId = getRoutineBuilderData().draftRoutine?.id;
  if (routineId) {
    linkMedicationGroupToRoutine(
      routineId,
      groupNameField?.value || `Take ${scheduleField?.value || "morning"} medications`,
      scheduleField?.value || "morning",
    );
  } else {
    appendRoutineStepLine(result.routineStepLine);
  }
  namesField.value = "";
  if (message) {
    message.textContent = `Saved and added ${result.createdMedications.length} specific medication or supplement action${result.createdMedications.length === 1 ? "" : "s"}.`;
  }
  renderApp();
}

function appendRoutineStepLine(line) {
  const textarea = document.querySelector("#routine-steps");
  if (!textarea || !line) {
    return;
  }

  const lines = textarea.value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!lines.some((item) => item.toLowerCase() === line.toLowerCase())) {
    lines.push(line);
  }
  textarea.value = lines.join("\n");
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
