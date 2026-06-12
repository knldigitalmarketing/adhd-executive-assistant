# ADHD Executive Assistant

Interactive local-first MVP based on the repository documentation.

The product is intentionally not a generic reminder app. It is an executive-function assistant that reduces thinking, decision fatigue, and task switching by deciding what the user should do next.

## Current Features

- Documentation-driven app structure and data model foundation.
- Conversational onboarding interview with saved profile answers and active rulesets.
- LocalStorage persistence for app state, interview answers, task state, learning data, focus history, progress history, and reviews.
- Today dashboard with a single Decision Engine recommendation.
- Working Mode with exactly one NOW action and one COMING UP item.
- Time Remaining countdown based on the next upcoming scheduled item.
- Task timing types: scheduled, flexible, and deadline.
- Add Task form with category and work type context.
- Morning Briefing with big things, guidance, scheduled items, potential issues, goal progress, tomorrow planning, recovery suggestions, and morning routine.
- Ruleset effects for time blindness, decision paralysis, short movement blocks, and self-employed work.
- Deterministic personalized recommendations and daily guidance from profile/rulesets.
- Morning Routine generation during morning hours.
- Adaptive recommendation learning from Done, Snooze, Skip, and Dismiss behavior.
- Missed Task Recovery suggestions for repeatedly delayed items.
- Focus Mode for the NOW task with Start, Pause, Resume, End, and End & Mark Done.
- Goal progress tracking by Health, Fitness, Work, Money, Relationships, and Personal.
- End-of-Day Review with carryover creation for tomorrow.
- Tomorrow Planning seeded from End-of-Day Review carryovers.
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
- `src/interview.js` - onboarding interview questions and ruleset activation.
- `src/decision.js` - recommendation scoring and ruleset scoring effects.
- `src/guidance-routines.js` - generated recommendations, guidance, and morning routine items.
- `src/recovery-adaptation.js` - learning stats, adaptive effects, missed detection, and recovery suggestions.
- `src/progress-review.js` - goal progress, End-of-Day Review, carryovers, and Tomorrow Planning.
- `src/models.js` - documentation-driven model summaries.
- `src/styles.css` - application styling.

## Intentionally Not Built Yet

- No AI-generated advice or AI scanning.
- No Gmail integration.
- No Google Calendar or external calendar integration.
- No email, texting, notifications, or voice.
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
- Add more explicit documentation for ruleset behavior and scoring.
- Add optional calendar integration later, after the local-first assistant behavior is stable.
