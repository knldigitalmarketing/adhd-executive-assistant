import { appState } from "./data.js";
import { interviewSteps, modelDefinitions } from "./models.js";

const app = document.querySelector("#app");

const areaById = new Map(appState.responsibilityAreas.map((area) => [area.id, area]));

function pill(text, tone = "neutral") {
  return `<span class="pill pill-${tone}">${text}</span>`;
}

function areaName(id) {
  return areaById.get(id)?.name ?? id;
}

function renderHeader() {
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">First prototype skeleton</p>
        <h1>ADHD Executive Assistant</h1>
      </div>
      <nav aria-label="Primary">
        <a href="#onboarding">Onboarding</a>
        <a href="#dashboard">Dashboard</a>
        <a href="#timeline">Timeline</a>
        <a href="#focus">Focus</a>
        <a href="#models">Models</a>
      </nav>
    </header>
  `;
}

function renderOnboarding() {
  const snapshot = appState.selectedSnapshot;

  return `
    <section id="onboarding" class="section">
      <div class="section-heading">
        <p class="eyebrow">Onboarding</p>
        <h2>Life snapshot first</h2>
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
              <input type="text" value="${appState.user.firstName}" />
            </label>
            <label>
              <span>Time Zone</span>
              <input type="text" value="${appState.user.timeZone}" />
            </label>
            <label>
              <span>Wake Time</span>
              <input type="time" value="${appState.user.preferredWakeTime}" />
            </label>
            <label>
              <span>Bed Time</span>
              <input type="time" value="${appState.user.preferredBedTime}" />
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
                            <span>${option}</span>
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
            ${appState.profiles
              .map(
                (profile) => `
                  <li>
                    <strong>${profile.name}</strong>
                    <span>${profile.details.join(", ")}</span>
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
  const priorities = appState.actions.filter((action) => action.dueDate === "Today").slice(0, 5);

  return `
    <section id="dashboard" class="section">
      <div class="section-heading">
        <p class="eyebrow">Daily briefing</p>
        <h2>What matters today</h2>
      </div>
      <div class="briefing-grid">
        <article class="panel priority-panel">
          <div class="panel-title">
            <h3>Today's Priorities</h3>
            ${pill(`${priorities.length} items`, "strong")}
          </div>
          <ul class="task-list">
            ${priorities
              .map(
                (action) => `
                  <li>
                    <span class="task-dot"></span>
                    <div>
                      <strong>${action.title}</strong>
                      <span>${areaName(action.areaId)} - ${action.priority} priority</span>
                    </div>
                  </li>
                `,
              )
              .join("")}
          </ul>
        </article>
        <article class="panel">
          <h3>Daily Routine</h3>
          <ul class="compact-list">
            ${appState.routines
              .map(
                (routine) => `
                  <li>
                    <span>${routine.time}</span>
                    <strong>${routine.name}</strong>
                    ${pill(routine.completed ? "Done" : "Open", routine.completed ? "done" : "warn")}
                  </li>
                `,
              )
              .join("")}
          </ul>
        </article>
        <article class="panel">
          <h3>Needs Attention</h3>
          <ul class="compact-list">
            ${appState.obligations
              .map(
                (obligation) => `
                  <li>
                    <span>${obligation.dueDate}</span>
                    <strong>${obligation.name}</strong>
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
            ${appState.waitingOn
              .map(
                (item) => `
                  <li>
                    <span>${areaName(item.areaId)}</span>
                    <strong>${item.title}</strong>
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

function renderResponsibilityEngine() {
  return `
    <section class="section">
      <div class="section-heading">
        <p class="eyebrow">Responsibility engine</p>
        <h2>Balanced life visibility</h2>
      </div>
      <div class="area-grid">
        ${appState.responsibilityAreas
          .map(
            (area) => `
              <article class="area-card">
                <div class="panel-title">
                  <h3>${area.name}</h3>
                  ${pill(area.status, area.status === "Needs attention" ? "warn" : "neutral")}
                </div>
                <p>${area.summary}</p>
                <ul>
                  ${area.actions.map((action) => `<li>${action}</li>`).join("")}
                </ul>
                <footer>Reviewed: ${area.lastReviewedAt}</footer>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderTimeline() {
  return `
    <section id="timeline" class="section timeline-section">
      <div class="section-heading">
        <p class="eyebrow">Today timeline</p>
        <h2>Starts and stops are visible</h2>
      </div>
      <ol class="timeline">
        ${appState.timeline
          .map(
            (event) => `
              <li class="${event.type === "Transition Reminder" ? "transition-event" : ""}">
                <time>${event.time}</time>
                <div>
                  <strong>${event.title}</strong>
                  <span>${event.type} - ${areaName(event.areaId)} - ${event.status}</span>
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
  return `
    <section id="focus" class="section">
      <div class="section-heading">
        <p class="eyebrow">Focus and transitions</p>
        <h2>Stop, switch, begin</h2>
      </div>
      <div class="focus-grid">
        ${appState.focusSessions
          .map(
            (session) => `
              <article class="panel focus-card">
                <div class="panel-title">
                  <h3>${session.name}</h3>
                  ${pill(session.priority, session.priority === "High" ? "warn" : "neutral")}
                </div>
                <dl>
                  <div><dt>Start</dt><dd>${session.startTime}</dd></div>
                  <div><dt>Planned end</dt><dd>${session.plannedEndTime}</dd></div>
                  <div><dt>Warning</dt><dd>${session.transitionWarningTime}</dd></div>
                  <div><dt>Next</dt><dd>${session.nextTask}</dd></div>
                  <div><dt>Flexibility</dt><dd>${session.flexibility}</dd></div>
                </dl>
                <div class="button-row" aria-label="Prototype reminder actions">
                  <button type="button">Done</button>
                  <button type="button">Remind later</button>
                  <button type="button">Adjust</button>
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
        <p class="eyebrow">Foundation</p>
        <h2>Data model skeleton</h2>
      </div>
      <div class="model-grid">
        ${modelDefinitions
          .map(
            (model) => `
              <article class="model-card">
                <h3>${model.name}</h3>
                <p>${model.description}</p>
                <code>${model.fields.join(" - ")}</code>
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
      ${renderOnboarding()}
      ${renderBriefing()}
      ${renderResponsibilityEngine()}
      ${renderTimeline()}
      ${renderFocus()}
      ${renderModels()}
    </main>
  `;
}

renderApp();
