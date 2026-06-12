export const responsibilityAreas = [
  "Health",
  "Home",
  "Transportation",
  "Family",
  "Pets",
  "Finances",
  "Work",
  "Business",
  "Projects",
  "Education",
  "Community",
  "Other",
];

export const modelDefinitions = [
  {
    name: "User",
    description: "The person using the assistant.",
    fields: ["firstName", "timeZone", "preferredWakeTime", "preferredBedTime", "reminderStyle"],
  },
  {
    name: "Responsibility Area",
    description: "A major area of life that should stay visible.",
    fields: ["id", "name", "status", "lastReviewedAt", "profiles", "actions"],
  },
  {
    name: "Profile",
    description: "Detailed information about a responsibility area.",
    fields: ["id", "areaId", "name", "details", "obligations", "assets"],
  },
  {
    name: "Asset",
    description: "A thing that requires management.",
    fields: ["id", "profileId", "name", "type", "notes"],
  },
  {
    name: "Obligation",
    description: "Something that must be maintained, renewed, monitored, or paid.",
    fields: ["id", "profileId", "name", "dueDate", "cadence", "status", "urgency"],
  },
  {
    name: "Routine",
    description: "A recurring activity.",
    fields: ["id", "name", "time", "areaId", "completed"],
  },
  {
    name: "Action",
    description: "A task requiring user action.",
    fields: ["id", "areaId", "title", "dueDate", "status", "priority"],
  },
  {
    name: "Discovery",
    description: "Something the assistant finds automatically. Prototype uses manual placeholder items only.",
    fields: ["id", "areaId", "title", "source", "status"],
  },
  {
    name: "Timeline Event",
    description: "An item displayed in the user's daily schedule.",
    fields: ["id", "time", "title", "type", "areaId", "status"],
  },
  {
    name: "Transition Reminder",
    description: "A first-class event that helps the user stop, switch, or begin activities.",
    fields: ["id", "time", "message", "focusSessionId", "nextTask"],
  },
];

export const interviewSteps = [
  {
    id: "life-snapshot",
    title: "Life Snapshot",
    goal: "Understand how the user lives.",
    required: true,
    sections: [
      { name: "Home", options: ["Own Home", "Rent", "Live with Family", "Other"] },
      { name: "Work", options: ["Employee", "Self Employed", "Business Owner", "Retired", "Unemployed"] },
      {
        name: "Transportation",
        options: ["Car", "Truck", "Motorcycle", "Bicycle", "E-Bike", "Bus", "Uber/Lyft", "Walking", "Other"],
      },
      { name: "Health", options: ["Medications to Track", "Medical Appointments to Track"] },
      { name: "Family", options: ["Partner", "Children", "Dependents", "Pets"] },
      { name: "Finances", options: ["Bills", "Insurance", "Debt", "Investments"] },
      { name: "Projects", options: ["Personal Projects", "Business Projects"] },
    ],
  },
  {
    id: "complete-profiles",
    title: "Complete Your Profiles",
    goal: "Only ask questions for profiles identified in the life snapshot.",
    required: false,
    sections: [
      { name: "Vehicle Profile", options: ["Year", "Make", "Model", "Mileage"] },
      { name: "Home Profile", options: ["Insurance", "Property Taxes", "HOA", "Mortgage"] },
      { name: "Business Profile", options: ["LLC", "Domains", "Hosting", "Software Subscriptions"] },
      { name: "Pet Profile", options: ["Vet", "Medications", "Food"] },
    ],
  },
  {
    id: "obligation-discovery",
    title: "Obligation Discovery",
    goal: "Use checklists so the user can recognize obligations rather than remember them.",
    required: false,
    sections: [
      {
        name: "Business Owner Checklist",
        options: ["Domains", "Hosting", "Google Workspace", "Accounting Software", "Business Insurance", "Annual Filings"],
      },
    ],
  },
  {
    id: "continuous-learning",
    title: "Continuous Learning",
    goal: "Keep learning through user actions and reminders in this first prototype.",
    required: false,
    sections: [{ name: "Prototype Learning", options: ["Completed actions", "Snoozed reminders", "Profile edits", "Manual notes"] }],
  },
];
