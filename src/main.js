import { modelDefinitions } from "./models.js";
import {
  activateRoutine,
  addTask,
  answerInterviewQuestion,
  cancelGoalEdit,
  cancelRoutineEdit,
  completeEndOfDayReview,
  completeSmartIntervention,
  completeWeeklyReview,
  deactivateRoutine,
  deleteRoutine,
  deleteGoal,
  dismissRecommendation,
  dismissGuidance,
  dismissMorningRoutine,
  dismissRecoverySuggestion,
  dismissItem,
  dismissSmartIntervention,
  doItNow,
  editRoutine,
  endFocus,
  editInterviewAnswer,
  editGoal,
  getDecisionRecommendation,
  getEndOfDayReviewData,
  getActiveView,
  getFocusModeData,
  getGoalSettingData,
  getInterviewState,
  getLifeAreaDashboardData,
  getMorningBriefingData,
  getOpenTodayActions,
  getRoutineBuilderData,
  getState,
  getTodayStats,
  getWeeklyReviewData,
  getWorkingModeData,
  isDone,
  loadDemo,
  markDone,
  resetLocalData,
  setActiveView,
  skipItem,
  snoozeItem,
  pauseFocus,
  markGoalComplete,
  reactivateCompletedGoal,
  resumeFocus,
  saveGoal,
  saveRoutine,
  startFocus,
  startMyDay,
  statusText,
  statusTone,
} from "./state.js";

const app = document.querySelector("#app");
let workingModeTimer = null;

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

function renderHeader() {
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Interactive local-first MVP</p>
        <h1>ADHD Executive Assistant</h1>
      </div>
      <nav aria-label="Primary">
        <a href="#today">Today</a>
        <a href="#working">Working</a>
        <a href="#review">Review</a>
        <a href="#onboarding">Onboarding</a>
        <a href="#routine-builder">Routines</a>
        <a href="#goal-setting">Goals</a>
        <a href="#life-areas">Life Areas</a>
        <a href="#dashboard">Dashboard</a>
        <a href="#timeline">Timeline</a>
        <a href="#focus">Focus</a>
        <a href="#models">Models</a>
      </nav>
    </header>
  `;
}

function renderTestModePanel() {
  return `
    <aside class="test-mode-panel" aria-label="Prototype Tools">
      <strong>Test Mode / Prototype Tools</strong>
      <div>
        <button type="button" data-action="reset-local-data">Reset App Data</button>
        <button type="button" data-action="load-demo" data-demo-id="adhd-weight-loss">Load ADHD + Weight Loss Demo</button>
        <button type="button" data-action="load-demo" data-demo-id="adhd-muscle-gain">Load ADHD + Muscle Gain Demo</button>
        <button type="button" data-action="load-demo" data-demo-id="self-employed">Load Self Employed Demo</button>
      </div>
    </aside>
  `;
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

  return `
    <section id="today" class="section today-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Today</p>
          <h2>Do this next</h2>
        </div>
        <div class="button-row">
          <button type="button" data-action="start-working">Start My Day</button>
          <button type="button" class="secondary-button" data-action="reset-local-data">Reset local data</button>
        </div>
      </div>
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
      ${renderAddTaskForm()}
    </section>
  `;
}

function renderMorningBriefing() {
  const briefing = getMorningBriefingData();

  return `
    <section id="briefing" class="section briefing-screen">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Morning Briefing</p>
          <h2>Orient the day</h2>
        </div>
        <button type="button" data-action="start-working">Start My Day</button>
      </div>
      ${renderTipCard(briefing.tip)}
      ${renderInterventionCard(briefing.intervention, "briefing")}
      <article class="panel morning-routine-panel">
        <div class="panel-title">
          <h3>Morning Routine</h3>
          ${pill(`${briefing.morningRoutine.length} first-hour`, "strong")}
        </div>
        ${renderMorningRoutineItems(briefing.morningRoutine)}
      </article>
      ${renderRoutineBuilder(briefing.builtRoutines)}
      ${renderGoalSetting(getGoalSettingData(), briefing.goals)}
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
        </div>
        ${pill(`${data.routines.length} saved`, "strong")}
      </div>
      <div class="routine-builder-grid">
        <form class="panel routine-form" data-action="save-routine">
          <input type="hidden" name="routineId" value="${escapeHtml(draft?.id ?? "")}" />
          <div>
            <label for="routine-name">Routine name</label>
            <input id="routine-name" name="routineName" type="text" value="${escapeHtml(draft?.name ?? "")}" placeholder="Morning launch" required />
          </div>
          <div>
            <label for="routine-type">Routine type</label>
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
          <div class="routine-steps-field">
            <label for="routine-steps">Steps</label>
            <textarea id="routine-steps" name="routineSteps" rows="5" placeholder="Drink water - 2&#10;Take meds - 3&#10;Review Today - 5" required>${escapeHtml(getRoutineStepLines(draft))}</textarea>
            <p class="field-help">One step per line. Use: step name - minutes</p>
          </div>
          <div class="button-row">
            <button type="submit">${draft ? "Save Changes" : "Create Routine"}</button>
            ${draft ? `<button type="button" class="secondary-button" data-action="cancel-routine-edit">Cancel</button>` : ""}
          </div>
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
    ["morning", "Morning routine"],
    ["evening", "Evening routine"],
    ["custom", "Custom routine"],
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
        </div>
        ${pill(`${data.activeGoals.length} active`, "strong")}
      </div>
      <div class="goal-setting-grid">
        <form class="panel goal-form" data-action="save-goal">
          <input type="hidden" name="goalId" value="${escapeHtml(draft?.id ?? "")}" />
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
          <button type="button" class="secondary-button" data-action="show-dashboard">Full dashboard</button>
          <button type="button" class="secondary-button" data-action="show-life-areas">Life Areas</button>
          <button type="button" class="secondary-button" data-action="show-review">End-of-Day Review</button>
        </div>
      </div>
      <div class="working-grid">
        ${renderNowCard(working)}
        ${renderComingUpCard(working.comingUp)}
      </div>
      ${renderTipCard(working.tip)}
      ${renderInterventionCard(working.intervention, "working")}
    </section>
  `;
}

function renderTipCard(tip) {
  if (!tip) {
    return "";
  }

  return `
    <aside class="tip-card" aria-label="ADHD Tip">
      <div>
        <p class="eyebrow">ADHD Tip</p>
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
    <aside class="intervention-card" aria-label="Smart Intervention">
      <div>
        <p class="eyebrow">Smart Intervention</p>
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

  return `
    <article class="working-card now-card">
      <p class="eyebrow">Now</p>
      <h3>${escapeHtml(recommendation.title)}</h3>
      ${renderRecommendationExplanation(recommendation)}
      <div class="time-remaining">
        <strong>${escapeHtml(working.timeRemaining)}</strong>
      </div>
      ${renderFocusModeControls(recommendation)}
      <div class="button-row">
        <button type="button" data-action="mark-done" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">Done</button>
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

  return `
    <article class="next-card decision-card">
      <p class="eyebrow">Do This Next</p>
      <h3>${escapeHtml(recommendation.title)}</h3>
      ${renderRecommendationExplanation(recommendation)}
      <dl class="decision-meta">
        <div><dt>Estimated effort</dt><dd>${recommendation.effort} min</dd></div>
        <div><dt>Priority score</dt><dd>${recommendation.score}</dd></div>
      </dl>
      <div class="button-row">
        <button type="button" data-action="do-it-now" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">Do It Now</button>
        <button type="button" data-action="mark-done" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">Done</button>
        <button type="button" data-action="snooze" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">Snooze</button>
        <button type="button" data-action="skip" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">Skip</button>
        ${recommendation.collection === "morningRoutine" ? `<button type="button" data-action="dismiss-morning-routine" data-id="${escapeHtml(recommendation.item.id)}">Dismiss</button>` : ""}
        ${recommendation.collection === "recoverySuggestions" ? `<button type="button" data-action="dismiss-recovery-suggestion" data-id="${escapeHtml(recommendation.item.id)}">Dismiss</button>` : ""}
        ${!["recommendations", "guidance", "morningRoutine", "recoverySuggestions"].includes(recommendation.collection) ? `<button type="button" data-action="dismiss-item" data-collection="${recommendation.collection}" data-id="${escapeHtml(recommendation.item.id)}">Dismiss</button>` : ""}
      </div>
    </article>
  `;
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
          <h4>Rules influencing this recommendation</h4>
          ${renderRuleInfluenceList(explanation.rules)}
        </section>
        ${renderContextInfluences(explanation.context)}
      </div>
    </details>
  `;
}

function renderRuleInfluenceList(rules) {
  if (!rules || rules.length === 0) {
    return `<p>No active ruleset changed the score. Timing, priority, and effort decided this.</p>`;
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
  return `
    <form class="panel add-task-form" data-action="add-task">
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
          <option>9:00 AM</option>
          <option>10:30 AM</option>
          <option>1:00 PM</option>
          <option>3:00 PM</option>
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
        <label for="task-timing">Timing type</label>
        <select id="task-timing" name="timingType">
          <option value="flexible" selected>Flexible</option>
          <option value="scheduled">Scheduled</option>
          <option value="deadline">Deadline</option>
        </select>
      </div>
      <div>
        <label for="task-category">Category</label>
        <select id="task-category" name="category">
          <option selected>Personal</option>
          <option>Health</option>
          <option>Fitness</option>
          <option>Work</option>
          <option>Money</option>
          <option>Relationship</option>
          <option>Errand</option>
        </select>
      </div>
      <div>
        <label for="task-work-type">Work Type</label>
        <select id="task-work-type" name="workType">
          <option selected>None</option>
          <option>Revenue</option>
          <option>Admin</option>
          <option>Follow-up</option>
          <option>Creative</option>
          <option>Maintenance</option>
        </select>
      </div>
      <input type="hidden" name="areaId" value="projects" />
      <button type="submit">Add</button>
    </form>
  `;
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
      <div class="onboarding-grid">
        <article class="panel interview-panel conversation-panel">
          <div class="panel-title">
            <h3>Interview Engine V1</h3>
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
        <p>The assistant has enough information to activate initial rulesets. You can edit any answer from the review panel.</p>
      </div>
    `;
  }

  return `
    <div class="conversation-message">
      <p class="eyebrow">${escapeHtml(titleCase(question.category))}</p>
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
      <h3>Active rulesets</h3>
      <div>
        ${interview.profile.activeRulesets.map((ruleset) => pill(ruleset)).join("")}
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
        <span>${escapeHtml(titleCase(question.category))}</span>
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

function renderApp() {
  const activeView = getActiveView();
  const fullDashboard = `
    ${renderToday()}
    ${renderEndOfDayReview()}
    ${renderOnboarding()}
    ${renderRoutineBuilder()}
    ${renderGoalSetting()}
    ${renderLifeAreaDashboard()}
    ${renderBriefing()}
    ${renderResponsibilityEngine()}
    ${renderTimeline()}
    ${renderFocus()}
    ${renderModels()}
  `;

  app.innerHTML = `
    ${renderHeader()}
    ${renderTestModePanel()}
    <main>
      ${activeView === "briefing" ? renderMorningBriefing() : activeView === "working" ? renderWorkingMode() : activeView === "review" ? renderEndOfDayReview() : activeView === "life-areas" ? renderLifeAreaDashboard() : fullDashboard}
    </main>
  `;
  scheduleWorkingModeRefresh(activeView);
}

function scheduleWorkingModeRefresh(activeView) {
  if (workingModeTimer) {
    clearInterval(workingModeTimer);
    workingModeTimer = null;
  }

  if (activeView !== "working") {
    return;
  }

  const focus = getFocusModeData();
  const refreshMs = focus.status === "running" ? 1000 : 60000;

  workingModeTimer = setInterval(() => {
    if (getActiveView() === "working") {
      renderApp();
    }
  }, refreshMs);
}

app.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const { action, collection, id } = button.dataset;
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
  if (action === "load-demo") {
    loadDemo(button.dataset.demoId);
    renderApp();
  }
  if (action === "start-working") {
    startMyDay();
    renderApp();
  }
  if (action === "show-dashboard") {
    setActiveView("dashboard");
    renderApp();
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
});

app.addEventListener("submit", (event) => {
  const goalForm = event.target.closest("form[data-action='save-goal']");
  if (goalForm) {
    event.preventDefault();
    saveGoal(new FormData(goalForm));
    goalForm.reset();
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
  addTask(new FormData(form));
  form.reset();
  renderApp();
});

renderApp();
