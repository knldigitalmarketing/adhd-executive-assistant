const DEFAULT_TARGETS = {
  foodMeals: {
    title: "Food Input",
    inputLabel: "Food you have",
    inputHelp:
      "In this area you input the food you have so the system has an idea of what to suggest. In the future, you will be able to connect shopping data so it can know what is in the house and suggest meals from it. For now, click the voice button and read the items in like speech to text. Say comma between each item, like eggs comma rice comma Greek yogurt.",
    savedLabel: "Saved Foods",
    savedHelp: "These are the foods and meals the prototype knows about right now.",
    placeholder: "Say: eggs comma rice comma Greek yogurt. Or paste: eggs, rice, Greek yogurt.",
  },
  shoppingList: {
    title: "Shopping List",
    inputLabel: "Shopping items",
    inputHelp:
      "Use this area for items you already know you need. Later, the assistant can suggest shopping items when food may be running out or when a meal plan needs something. When speaking, say comma between items.",
    savedLabel: "Saved shopping items",
    savedHelp: "These are manually added shopping items. Suggestions will come later.",
    placeholder: "Say: coffee comma paper towels comma spinach. Or paste: coffee, paper towels, spinach.",
  },
  generalList: {
    title: "List Builder",
    inputLabel: "List items",
    inputHelp:
      "Use this for any list that is not food or shopping: to-do lists, motorcycle parts, 3D printer supplies, camping gear, garden materials, packing lists, project supplies, or anything else. Name the list, choose the list type, then speak, type, or paste items. Say comma between items.",
    savedLabel: "Saved list items",
    savedHelp: "These are grouped by the list name you are working on.",
    placeholder: "Say: tent stakes comma propane comma flashlight. Or paste: tent stakes, propane, flashlight.",
  },
  routineSteps: {
    title: "Step Input Helper",
    inputLabel: "Routine step ideas",
    inputHelp: "This helper is optional. Use it to speak, type, or paste step ideas, then review them before adding them into the main Steps box above. When speaking, say comma between each step so the assistant can separate them.",
    savedLabel: "Routine steps waiting to be added",
    savedHelp: "",
    placeholder: "Say: drink water comma take vitamins comma review the day. Or paste: drink water, take vitamins, review the day.",
  },
};

export function ensureVoiceListEntryState(state) {
  state.voiceListEntry = state.voiceListEntry ?? {};
  state.voiceListEntry.drafts = state.voiceListEntry.drafts ?? {};
  state.voiceListEntry.savedLists = state.voiceListEntry.savedLists ?? {};
  state.voiceListEntry.activeGeneralListName = normalizeListName(state.voiceListEntry.activeGeneralListName || "General List");
  state.voiceListEntry.activeGeneralListType = normalizeListType(state.voiceListEntry.activeGeneralListType || "checklist");
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
    activeListName: state.voiceListEntry.activeGeneralListName,
    activeListType: state.voiceListEntry.activeGeneralListType,
    listTypes: getGeneralListTypes(),
    savedGroups: targetId === "generalList" ? groupGeneralListItems(state.voiceListEntry.savedLists.generalList ?? []) : [],
    speechSupported: isSpeechRecognitionAvailable(),
  };
}

export function setGeneralListName(state, listName) {
  ensureVoiceListEntryState(state);
  state.voiceListEntry.activeGeneralListName = normalizeListName(listName || "General List");
}

export function setGeneralListType(state, listType) {
  ensureVoiceListEntryState(state);
  state.voiceListEntry.activeGeneralListType = normalizeListType(listType || "checklist");
}

export function reviewVoiceListText(state, targetId, text) {
  ensureVoiceListEntryState(state);
  const items = parseVoiceListText(text, targetId).map((item, index) => ({
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
    const activeListName = state.voiceListEntry.activeGeneralListName;
    const activeListType = state.voiceListEntry.activeGeneralListType;
    const seen = new Set(existing.map((item) => getSavedItemKey(targetId, item, item.listName ?? activeListName)));
    const newItems = approvedItems
      .filter((text) => !seen.has(getSavedItemKey(targetId, { text }, activeListName)))
      .map((text, index) => ({
        id: `voice-saved-${targetId}-${Date.now()}-${index}`,
        text,
        listName: targetId === "generalList" ? activeListName : undefined,
        listType: targetId === "generalList" ? activeListType : undefined,
        completed: false,
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

export function setSavedVoiceListItemDone(state, targetId, itemId, done) {
  ensureVoiceListEntryState(state);
  state.voiceListEntry.savedLists[targetId] = (state.voiceListEntry.savedLists[targetId] ?? []).map((item) =>
    item.id === itemId
      ? {
          ...item,
          completed: Boolean(done),
          completedAt: done ? new Date().toISOString() : null,
        }
      : item,
  );
}

export function setSavedVoiceListGroupDone(state, listName, done) {
  ensureVoiceListEntryState(state);
  const normalizedName = normalizeListName(listName);
  state.voiceListEntry.savedLists.generalList = (state.voiceListEntry.savedLists.generalList ?? []).map((item) =>
    normalizeListName(item.listName || "General List") === normalizedName
      ? {
          ...item,
          completed: Boolean(done),
          completedAt: done ? new Date().toISOString() : null,
        }
      : item,
  );
}

export function parseVoiceListText(value, targetId = "") {
  let source = String(value);
  if (targetId === "routineSteps") {
    source = source
      .replace(/^\s*(in the (morning|evening|afternoon)|for (my|the) \w+ routine)\s*,?\s*/i, "")
      .replace(/\s+\band\b\s+(?=(take|drink|feed|check|start|review|open|walk|stretch|exercise|gather|perform|prepare|begin)\b)/gi, ", ");
  }

  return source
    .replace(/\b(add|also add|put|include)\b/gi, "\n")
    .replace(/\b(next item|new item|then)\b/gi, "\n")
    .split(/\n|,|;|\u2022/g)
    .map((item) => targetId === "routineSteps" ? cleanRoutineAction(item) : cleanListItem(item))
    .filter(Boolean)
    .filter(uniqueCaseInsensitive);
}

function cleanRoutineAction(value) {
  return cleanListItem(value)
    .replace(/^\s*i\s+/i, "")
    .replace(/\bmy blood pressure medicine\b/i, "blood pressure medication")
    .replace(/\bmy cholesterol medicine\b/i, "cholesterol medication")
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
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

function normalizeListName(value) {
  const cleaned = String(value ?? "").replace(/\s+/g, " ").trim();
  return cleaned || "General List";
}

function normalizeListType(value) {
  return getGeneralListTypes().some((type) => type.value === value) ? value : "checklist";
}

function getGeneralListTypes() {
  return [
    { value: "todo", label: "To-do list" },
    { value: "supplies", label: "Things to get" },
    { value: "packing", label: "Packing list" },
    { value: "checklist", label: "Checklist" },
    { value: "reference", label: "Reference list" },
  ];
}

function groupGeneralListItems(items) {
  const groups = new Map();
  for (const item of items) {
    const listName = normalizeListName(item.listName || "General List");
    groups.set(listName, [...(groups.get(listName) ?? []), item]);
  }
  return [...groups.entries()].map(([listName, groupItems]) => {
    const completedCount = groupItems.filter((item) => item.completed).length;
    const listType = normalizeListType(groupItems[0]?.listType || inferListTypeFromName(listName));
    return {
      listName,
      listType,
      listTypeLabel: getGeneralListTypes().find((type) => type.value === listType)?.label ?? "Checklist",
      items: groupItems,
      completedCount,
      openCount: groupItems.length - completedCount,
      complete: groupItems.length > 0 && completedCount === groupItems.length,
    };
  });
}

function inferListTypeFromName(listName) {
  const value = String(listName ?? "").toLowerCase();
  if (/\b(to do|todo|task|tasks|action|actions)\b/.test(value)) return "todo";
  if (/\b(parts|supplies|shopping|buy|get|materials)\b/.test(value)) return "supplies";
  if (/\b(pack|packing|camping|trip|travel)\b/.test(value)) return "packing";
  return "checklist";
}

function getSavedItemKey(targetId, item, listName) {
  const text = String(item.text ?? "").toLowerCase();
  return targetId === "generalList" ? `${normalizeListName(listName).toLowerCase()}::${text}` : text;
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
