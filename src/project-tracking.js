export const PROJECT_CATEGORIES = ["Personal", "Home", "Work", "Health", "Money", "Creative", "Repair", "Research"];

export function ensureProjectState(state) {
  state.projects = Array.isArray(state.projects) ? state.projects : [];
  state.projectDraftId = state.projectDraftId ?? null;
}

export function getProjectTrackingData(state) {
  ensureProjectState(state);
  const activeProjects = state.projects.filter((project) => project.status !== "completed");
  const completedProjects = state.projects.filter((project) => project.status === "completed");

  return {
    categories: PROJECT_CATEGORIES,
    activeProjects,
    completedProjects,
    draftProject: state.projects.find((project) => project.id === state.projectDraftId) ?? null,
  };
}

export function createProject(state, formData) {
  ensureProjectState(state);
  const project = buildProjectFromForm(formData, `project-${Date.now()}`);
  state.projects.unshift(project);
  state.projectDraftId = null;
  return project;
}

export function updateProject(state, id, formData) {
  ensureProjectState(state);
  const index = state.projects.findIndex((project) => project.id === id);
  if (index === -1) {
    return null;
  }

  const existing = state.projects[index];
  state.projects[index] = {
    ...existing,
    ...buildProjectFromForm(formData, id),
    status: existing.status,
    completedAt: existing.completedAt,
    updatedAt: new Date().toISOString(),
  };
  state.projectDraftId = null;
  return state.projects[index];
}

export function deleteProject(state, id) {
  ensureProjectState(state);
  state.projects = state.projects.filter((project) => project.id !== id);
  state.projectDraftId = state.projectDraftId === id ? null : state.projectDraftId;
}

export function completeProject(state, id) {
  ensureProjectState(state);
  const project = state.projects.find((item) => item.id === id);
  if (!project) {
    return;
  }

  project.status = "completed";
  project.completedAt = new Date().toISOString();
  project.updatedAt = new Date().toISOString();
}

export function reactivateProject(state, id) {
  ensureProjectState(state);
  const project = state.projects.find((item) => item.id === id);
  if (!project) {
    return;
  }

  project.status = "active";
  delete project.completedAt;
  project.updatedAt = new Date().toISOString();
}

export function setProjectDraft(state, id) {
  ensureProjectState(state);
  state.projectDraftId = state.projects.some((project) => project.id === id) ? id : null;
}

export function clearProjectDraft(state) {
  ensureProjectState(state);
  state.projectDraftId = null;
}

export function getProjectById(state, id) {
  ensureProjectState(state);
  return state.projects.find((project) => project.id === id) ?? null;
}

function buildProjectFromForm(formData, id) {
  const title = String(formData.get("projectTitle") ?? "").trim() || "Untitled project";
  const category = normalizeProjectCategory(String(formData.get("projectCategory") ?? "Personal"));
  const nextStep = String(formData.get("projectNextStep") ?? "").trim();

  return {
    id,
    title,
    category,
    nextStep,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeProjectCategory(category) {
  const value = String(category ?? "").toLowerCase();
  if (value.includes("home") || value.includes("house")) return "Home";
  if (value.includes("work") || value.includes("business")) return "Work";
  if (value.includes("health")) return "Health";
  if (value.includes("money") || value.includes("finance")) return "Money";
  if (value.includes("creative") || value.includes("art") || value.includes("design")) return "Creative";
  if (value.includes("repair") || value.includes("fix")) return "Repair";
  if (value.includes("research") || value.includes("learn")) return "Research";
  return PROJECT_CATEGORIES.includes(category) ? category : "Personal";
}
