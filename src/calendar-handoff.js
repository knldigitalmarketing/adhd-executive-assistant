export function buildRoutineCalendarEvent(routine, date = new Date()) {
  if (!routine?.startTime) {
    return null;
  }

  const start = parseLocalTimeOnDate(routine.startTime, date);
  if (!start) {
    return null;
  }

  const durationMinutes = Math.max(1, Math.round((routine.steps ?? []).reduce((sum, step) => sum + Number(step.estimatedMinutes ?? 0), 0)));
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const stepList = (routine.steps ?? []).map((step, index) => `${index + 1}. ${step.title}`).join("\n");

  return {
    id: routine.id,
    title: getRoutineCalendarTitle(routine),
    start,
    end,
    description: [
      "Life Enablement Assistant routine.",
      "",
      stepList ? `Steps:\n${stepList}` : "",
      "",
      "Your phone or calendar controls notification sound, vibration, and alarm behavior.",
    ].filter(Boolean).join("\n"),
  };
}

function getRoutineCalendarTitle(routine) {
  return String(routine.type ?? "").toLowerCase() === "morning"
    ? `Wake up / Start ${routine.name}`
    : routine.name;
}

export function downloadCalendarEvent(event) {
  if (!event || typeof document === "undefined") {
    return;
  }

  const blob = new Blob([buildIcsEvent(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(event.title)}.ics`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function getGoogleCalendarUrl(event) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatGoogleDate(event.start)}/${formatGoogleDate(event.end)}`,
    details: event.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function getOutlookCalendarUrl(event) {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.start.toISOString(),
    enddt: event.end.toISOString(),
    body: event.description,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function buildIcsEvent(event) {
  const now = new Date();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Life Enablement Assistant//Calendar Handoff V1//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(event.id || cryptoRandomId())}@life-enablement-assistant`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART:${formatIcsDate(event.start)}`,
    `DTEND:${formatIcsDate(event.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function parseLocalTimeOnDate(timeText, date) {
  const match = String(timeText ?? "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (period === "PM" && hours !== 12) {
    hours += 12;
  }
  if (period === "AM" && hours === 12) {
    hours = 0;
  }

  const local = new Date(date);
  local.setHours(hours, minutes, 0, 0);
  return local;
}

function formatIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function formatGoogleDate(date) {
  return formatIcsDate(date);
}

function escapeIcsText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function slugify(value) {
  return String(value ?? "calendar-event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "calendar-event";
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
