# ONE MORE CONTROL — Project Rules

## Completion gates

- Run lint, unit tests, and the production build before declaring work complete.
- Exercise the main player flow in a browser at desktop, phone, and tablet widths.

## Scientific integrity

- Scientific outcomes must come only from server-side authored case truth.
- Public case data must never contain the true hypothesis or actual outcome mapping.
- AI output must be schema-validated and must have an authored fallback.
- GPT may interpret, map, question, and review; it must never invent experimental outcomes.
- Never silently change scientific case data to make a test pass.

## Engineering conventions

- Prefer small pure functions for probability, information gain, scoring, validation, and state transitions.
- Do not add dependencies unless they clearly reduce complexity.
- No `any` in application code.
- Keep components focused and keep case content in data modules, not JSX.
- Keep API keys and private case truth in server-only modules.
- Persist player progress locally and keep reset behavior visible and deterministic.

## Scope

- Task 01 contains the complete landing page and playable Case 01 only.
- Do not add accounts, a database, analytics, a leaderboard, social features, an external CMS, or a generic chat interface.
- Keep all player-facing copy in English.
- Keep sound disabled for Task 01; preserve a visible `SOUND OFF` control and a TODO for the later soundscape.
