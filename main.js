import { interviewSteps, modelDefinitions, responsibilityAreas } from "./models.js";
import {
  addTask,
  getOpenTodayActions,
  getState,
  getTodayStats,
  isDone,
  markDone,
  resetLocalData,
  snoozeItem,
  statusText,
  statusTone,
} from "./state.js";

const app = document.querySelector("#app");

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
        <a href="#onboarding">Onboarding</a>
        <a href="#dashboard">Dashboard</a>
        <a href="#timeline">Timeline</a>
        <a href="#focus">Focus</a>
        <a href="#models">Models</a>
      </nav>
    </header>
  `;
}

function renderToday() {
  const stats = getTodayStats();
  const next = stats.next;

  return `
    <section id="today" class="section today-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Today</p>
          <h2>Do this next</h2>
        </div>
        <button type="button" class="secondary-button" data-action="reset-local-data">Reset local data</button>
      </div>
      <div class="today-grid">
        <article class="next-card">
          <p class="eyebrow">Executive-function cue</p>
          ${
            next
              ? `
                <h3>${escapeHtml(next.title ?? next.name)}</h3>
                <p>${escapeHtml(areaName(next.areaId))} - ${escapeHtml(next.priority ?? next.type ?? "Daily item")}</p>
              `
              : `
                <h3>Nothing urgent is open.</h3>
                <p>Your visible items are done or snoozed. Check the timeline when you are ready.</p>
              `
          }
        </article>
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

function renderAddTaskForm() {
  const options = responsibilityAreas
    .filter((area) => area !== "Other")
    .map((area) => {
      const areaId = area.toLowerCase().replaceAll(" ", "-");
      return `<option value="${areaId}">${area}</option>`;
    })
    .join("");

  return `
    <form class="panel add-task-form" data-action="add-task">
      <div>
        <label for="task-title">Add Task</label>
        <input id="task-title" name="title" type="text" placeholder="What needs action?" required />
      </div>
      <div>
        <label for="task-area">Area</label>
        <select id="task-area" name="areaId">${options}</select>
      </div>
      <div>
        <label for="task-priority">Priority</label>
        <select id="task-priority" name="priority">
          <option>High</option>
          <option selected>Medium</option>
          <option>Low</option>
        </select>
      </div>
      <div>
        <label for="task-due">Due</label>
        <select id="task-due" name="dueDate">
          <option selected>Today</option>
          <option>Tomorrow</option>
          <option>This week</option>
        </select>
      </div>
      <button type="submit">Add</button>
    </form>
  `;
}

function renderOnboarding() {
  const state = getState();
  const snapshot = state.selectedSnapshot;

  return `
    <section id="onboarding" class="section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Onboarding</p>
          <h2>Life snapshot first</h2>
        </div>
      </div>
      <div class="onboarding-grid">
        <article class="panel interview-panel">
          <div class="panel-title">
            <h3>${interviewSteps[0].title}</h3>
            ${pill("Required", "strong")}
          </div>
          <p>${interviewSteps[0].goal}</p>
          <div class="basic-info">
            <label>
              <span>First Name</span>
              <input type="text" value="${escapeHtml(state.user.firstName)}" />
            </label>
            <label>
              <span>Time Zone</span>
              <input type="text" value="${escapeHtml(state.user.timeZone)}" />
            </label>
            <label>
              <span>Wake Time</span>
              <input type="time" value="${escapeHtml(state.user.preferredWakeTime)}" />
            </label>
            <label>
              <span>Bed Time</span>
              <input type="time" value="${escapeHtml(state.user.preferredBedTime)}" />
            </label>
          </div>
          <div class="checklist-grid">
            ${interviewSteps[0].sections
              .map(
                (section) => `
                  <fieldset>
                    <legend>${section.name}</legend>
                    ${section.options
                      .map((option) => {
                        const checked = snapshot[section.name]?.includes(option) ? "checked" : "";
                        return `
                          <label>
                            <input type="checkbox" ${checked} />
                            <span>${escapeHtml(option)}</span>
                          </label>
                        `;
                      })
                      .join("")}
                  </fieldset>
                `,
              )
              .join("")}
          </div>
        </article>
        <aside class="panel profile-panel">
          <h3>Profiles created from snapshot</h3>
          <p>Setup can be incomplete and still useful. Details are collected progressively.</p>
          <ul class="profile-list">
            ${state.profiles
              .map(
                (profile) => `
                  <li>
                    <strong>${escapeHtml(profile.name)}</strong>
                    <span>${escapeHtml(profile.details.join(", "))}</span>
                  </li>
                `,
              )
              .join("")}
          </ul>
          <div class="adhd-profile">
            <h3>ADHD profile prompts</h3>
            <ul>
              <li>What are the biggest things you forget?</li>
              <li>What causes the most stress?</li>
              <li>What tasks do you procrastinate most?</li>
              <li>How often should reminders be sent?</li>
              <li>What type of reminders work best?</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
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

function renderActionItem(action) {
  return `
    <li class="${isDone(action) ? "is-complete" : ""}">
      <span class="task-dot"></span>
      <div>
        <strong>${escapeHtml(action.title)}</strong>
        <span>${escapeHtml(areaName(action.areaId))} - ${escapeHtml(action.priority)} priority</span>
      </div>
      <div class="item-actions">
        ${pill(statusText(action), statusTone(action))}
        ${renderActionButtons("actions", action)}
      </div>
    </li>
  `;
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
  app.innerHTML = `
    ${renderHeader()}
    <main>
      ${renderToday()}
      ${renderOnboarding()}
      ${renderBriefing()}
      ${renderResponsibilityEngine()}
      ${renderTimeline()}
      ${renderFocus()}
      ${renderModels()}
    </main>
  `;
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
  if (action === "snooze") {
    snoozeItem(collection, id);
    renderApp();
  }
  if (action === "reset-local-data") {
    resetLocalData();
    renderApp();
  }
});

app.addEventListener("submit", (event) => {
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
