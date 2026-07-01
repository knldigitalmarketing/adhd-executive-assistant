# Life Enablement Assistant

Interactive local-first MVP based on the repository documentation.

The product is intentionally not a generic reminder app. It is a life enablement assistant that clears the path, reduces the pile of small decisions, and helps the user stay on track so they can put more time into the life they actually want to live.

## Current Features

- Documentation-driven app structure and data model foundation.
- Conversational setup interview with saved profile answers and active support modes.
- LocalStorage persistence for app state, interview answers, task state, learning data, focus history, progress history, and reviews.
- Today dashboard with a single Decision Engine recommendation.
- Working Mode with exactly one NOW action and one COMING UP item.
- Time Remaining countdown based on the next upcoming scheduled item.
- Task timing types: scheduled, flexible, and deadline.
- Add Task form with category and work type context.
- Day Glimpse with big things, guidance, scheduled items, potential issues, goal progress, tomorrow planning, recovery suggestions, and morning routine.
- Support mode effects for time awareness, choice support, short movement blocks, and self-employed work.
- Deterministic personalized recommendations and daily guidance from the user profile and support modes.
- Morning Routine generation during morning hours.
- Adaptive recommendation learning from Done, Snooze, Skip, and Dismiss behavior.
- Missed Task Recovery suggestions for repeatedly delayed items.
- Focus Mode for the NOW task with Start, Pause, Resume, End, and End & Mark Done.
- Goal progress tracking by Health, Fitness, Work, Money, Relationships, and Personal.
- End-of-Day Review with carryover creation for tomorrow.
- Tomorrow Planning seeded from End-of-Day Review carryovers.
- Command Center, Hourly View, Life Area Dashboard, Goals, Habits, Routines, Recurring Tasks, and Shop prototype screens.
- Reusable voice-to-list entry for pantry foods, shopping lists, and routine steps when browser speech recognition is available.
- Prototype Test Mode with reset and demo profile loaders.

## How To Run

This prototype is dependency-free and uses static HTML, CSS, JavaScript modules, and browser `localStorage`.

Use any local static server, or run:

```bash
node scripts/serve.mjs
```

Then open:

```text
http://127.0.0.1:4173
```

To reset local prototype data, use the in-app **Test Mode / Prototype Tools** panel.

## File And Module Structure

- `index.html` - static app shell.
- `scripts/serve.mjs` - small local static server.
- `src/main.js` - rendering and event wiring.
- `src/state.js` - app state ownership and public state operations.
- `src/storage.js` - localStorage load, save, clear, and merge logic.
- `src/data.js` - seed state.
- `src/interview.js` - setup interview questions and support mode activation.
- `src/decision.js` - recommendation scoring and support mode scoring effects.
- `src/guidance-routines.js` - generated recommendations, guidance, and morning routine items.
- `src/recovery-adaptation.js` - learning stats, adaptive effects, missed detection, and recovery suggestions.
- `src/progress-review.js` - goal progress, End-of-Day Review, carryovers, and Tomorrow Planning.
- `src/tips.js` - categorized practical strategy library.
- `src/intervention-engine.js` - support shift detection and suggestions.
- `src/routine-builder.js` - custom routine creation and management.
- `src/habit-tracking.js` - habit completion, daily targets, and streaks.
- `src/recurring-task-engine.js` - recurring task state and next occurrence generation.
- `src/voice-list-entry.js` - reusable spoken, typed, or pasted list capture.
- `src/models.js` - documentation-driven model summaries.
- `src/styles.css` - application styling.

## Intentionally Not Built Yet

- No AI-generated advice or AI scanning.
- No Gmail integration.
- No Google Calendar or external calendar integration.
- No email, texting, notifications, or full voice assistant.
- No shopping integrations.
- No payment integrations.
- No accounts, authentication, cloud sync, or backend service.
- No mobile app wrapper.
- No production database.

## Next Roadmap Items

- Add lightweight manual edit controls for existing tasks.
- Add a clearer day rollover model for Today/Tomorrow state.
- Add import/export of local prototype data.
- Add richer test fixtures for demo profiles and rule combinations.
- Add accessibility pass for keyboard flow and screen reader labels.
- Add more explicit documentation for support mode behavior and scoring.
- Add optional calendar integration later, after the local-first assistant behavior is stable.

## Return To These Soon

These are important product directions to revisit after the current routine and first-run setup work is stable.

- Build a visual Time Map so the user can see time at a glance instead of reading a task list.
- Start with Day and Week views before Month and Year views.
- Color-code calendar items by life area: Health, Fitness, Work, Money, Relationships, Home, Personal, urgent, routines, and focus blocks.
- Pull timed tasks, routines, recurring tasks, habits inside routines, deadlines, alarms, missed items, and carryovers into the Time Map.
- Detect crowded time blocks and gently warn when the user is trying to do too much in the same hour.
- Create a clearer "just tell it" capture/notepad doorway:
  - one obvious place to speak, type, or paste anything
  - the assistant decides whether it is a note, task, appointment, habit, routine, list, goal, project, shopping item, or calendar item
  - show a friendly confirmation before saving so the user can correct the type
  - make the capture bar feel inviting and obvious on phone, not like a hidden form
  - preserve raw notes when the assistant is unsure instead of losing the thought
- Add Calendar Handoff V1 before full calendar sync:
  - generate `.ics` files for routines, recurring tasks, and scheduled tasks
  - provide Google Calendar and Outlook web links where possible
  - make clear that the user's phone/calendar controls notification sound, vibration, and alarm behavior
- Calendar Handoff V1 has started with scheduled routines; extend it next to scheduled tasks and recurring tasks.
- Later, consider full Google Calendar, Outlook, and mobile calendar sync only after privacy, permissions, conflicts, edits, and user trust are designed properly.
- Keep in-app alarms for open-app guidance, but use phone calendars/alarms for reliable background wake-up or reminder behavior.
