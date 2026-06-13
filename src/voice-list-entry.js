const DEFAULT_TARGETS = {
  foodMeals: {
    title: "Food & Meals",
    savedLabel: "Saved foods and meals",
  },
  shoppingList: {
    title: "Shopping List",
    savedLabel: "Saved shopping items",
  },
  routineSteps: {
    title: "Routine Steps",
    savedLabel: "Routine steps waiting to be added",
  },
};

export function ensureVoiceListEntryState(state) {
  state.voiceListEntry = state.voiceListEntry ?? {};
  state.voiceListEntry.drafts = state.voiceListEntry.drafts ?? {};
  state.voiceListEntry.savedLists = state.voiceListEntry.savedLists ?? {};
  for (const targetId of Object.keys(DEFAULT_TARGETS)) {
    state.voiceListEntry.drafts[targetId] = normalizeDraft(state.voiceListEntry.drafts[targetId]);
    state.voiceListEntry.savedLists[targetId] = Array.isArray(state.voiceListEntry.savedLists[targetId]) ? state.voiceListEntry.savedLists[targetId] : [];
  }
}

export function getVoiceListEntryData(state, targetId) {
  ensureVoiceListEntryState(state);
  const target = DEFAULT_TARGETS[targetId] ?? {
    title: "Voice List",
    savedLabel: "Saved items",
  };

  return {
    targetId,
    ...target,
    draft: state.voiceListEntry.drafts[targetId],
    savedItems: state.voiceListEntry.savedLists[targetId] ?? [],
    speechSupported: isSpeechRecognitionAvailable(),
  };
}

export function reviewVoiceListText(state, targetId, text) {
  ensureVoiceListEntryState(state);
  const items = parseVoiceListText(text).map((item, index) => ({
    id: `voice-item-${Date.now()}-${index}`,
    text: item,
  }));
  state.voiceListEntry.drafts[targetId] = {
    rawText: text,
    items,
    updatedAt: new Date().toISOString(),
  };
  return state.voiceListEntry.drafts[targetId];
}

export function updateVoiceListItem(state, targetId, itemId, text) {
  ensureVoiceListEntryState(state);
  const cleanText = cleanListItem(text);
  const draft = state.voiceListEntry.drafts[targetId];
  draft.items = draft.items
    .map((item) => (item.id === itemId ? { ...item, text: cleanText } : item))
    .filter((item) => item.text);
  draft.updatedAt = new Date().toISOString();
  return draft;
}

export function removeVoiceListItem(state, targetId, itemId) {
  ensureVoiceListEntryState(state);
  const draft = state.voiceListEntry.drafts[targetId];
  draft.items = draft.items.filter((item) => item.id !== itemId);
  draft.updatedAt = new Date().toISOString();
  return draft;
}

export function clearVoiceListDraft(state, targetId) {
  ensureVoiceListEntryState(state);
  state.voiceListEntry.drafts[targetId] = normalizeDraft();
}

export function approveVoiceListItems(state, targetId) {
  ensureVoiceListEntryState(state);
  const draft = state.voiceListEntry.drafts[targetId];
  const approvedItems = draft.items.map((item) => cleanListItem(item.text)).filter(Boolean);

  if (targetId !== "routineSteps") {
    const existing = state.voiceListEntry.savedLists[targetId] ?? [];
    const seen = new Set(existing.map((item) => item.text.toLowerCase()));
    const newItems = approvedItems
      .filter((text) => !seen.has(text.toLowerCase()))
      .map((text, index) => ({
        id: `voice-saved-${targetId}-${Date.now()}-${index}`,
        text,
        createdAt: new Date().toISOString(),
      }));
    state.voiceListEntry.savedLists[targetId] = [...existing, ...newItems].slice(-120);
  }

  clearVoiceListDraft(state, targetId);
  return approvedItems;
}

export function deleteSavedVoiceListItem(state, targetId, itemId) {
  ensureVoiceListEntryState(state);
  state.voiceListEntry.savedLists[targetId] = (state.voiceListEntry.savedLists[targetId] ?? []).filter((item) => item.id !== itemId);
}

export function parseVoiceListText(value) {
  return String(value)
    .replace(/\b(add|also add|put|include)\b/gi, "\n")
    .replace(/\b(next item|new item|then)\b/gi, "\n")
    .split(/\n|,|;|\u2022/g)
    .map(cleanListItem)
    .filter(Boolean)
    .filter(uniqueCaseInsensitive);
}

export function isSpeechRecognitionAvailable() {
  return Boolean(getSpeechRecognitionConstructor());
}

export function startVoiceRecognition({ onResult, onError, onEnd } = {}) {
  const Recognition = getSpeechRecognitionConstructor();
  if (!Recognition) {
    onError?.("Speech recognition is not available in this browser.");
    return null;
  }

  const recognition = new Recognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results ?? [])
      .map((result) => result[0]?.transcript ?? "")
      .join(" ")
      .trim();
    onResult?.(transcript);
  };
  recognition.onerror = () => onError?.("Speech recognition stopped. Typed entry still works.");
  recognition.onend = () => onEnd?.();
  recognition.start();
  return recognition;
}

export function formatRoutineStepLines(items) {
  return items.map((item) => `${item} - 5`).join("\n");
}

function normalizeDraft(value = {}) {
  return {
    rawText: typeof value.rawText === "string" ? value.rawText : "",
    items: Array.isArray(value.items)
      ? value.items.map((item, index) => ({ id: item.id ?? `voice-item-existing-${index}`, text: cleanListItem(item.text) })).filter((item) => item.text)
      : [],
    updatedAt: value.updatedAt ?? null,
  };
}

function cleanListItem(value) {
  return String(value)
    .replace(/^\s*[-*\d.)]+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueCaseInsensitive(value, index, items) {
  return items.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index;
}

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}
