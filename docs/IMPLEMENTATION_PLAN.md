# ONE MORE CONTROL — Task 01 Implementation Plan

## Architecture

ONE MORE CONTROL is a Next.js App Router application with a deterministic case engine and a deliberately narrow AI boundary.

- Public case modules contain the brief, hypotheses, experiments, possible outcomes, likelihoods, and authored observation fallback.
- A `server-only` module contains the actual mechanism and outcome mapping.
- Pure functions own normalization, Bayesian updates, KL information gain, belief constraints, budget rules, prediction validation, scoring, and state transitions.
- The browser stores only resumable player state in `localStorage`.
- `POST /api/experiment/run` reconstructs the engine posterior from validated run history before returning an authored outcome.
- `POST /api/ai/observe` reads the local observation PNG, uses GPT-5.6 vision with a strict JSON schema, and returns the authored fallback on any unavailable, refused, invalid, or failed response.
- `POST /api/verdict/submit` validates the locked verdict, recomputes authoritative results, scores the evidence chain, and is the only route that reveals private truth.

## Implemented directory tree

```text
app/
  page.tsx
  layout.tsx
  globals.css
  cases/fading-signal/page.tsx
  api/ai/observe/route.ts
  api/experiment/run/route.ts
  api/verdict/submit/route.ts
src/
  components/
    landing/
    game/
  data/cases/public/fading-signal.ts
  server/cases/fading-signal-engine.ts
  server/cases/private/fading-signal-truth.ts
  lib/ai/{observe,schemas}.ts
  lib/game/{bayes,beliefs,entropy,reducer,scoring,validation}.ts
  types/{api,game}.ts
public/cases/fading-signal/
  initial-observation.png
  outcomes/*.svg
public/{favicon,og,social-card-source}.png
scripts/
  browser-qa.mjs
  generate-case-assets.py
  generate-social-card.py
tests/
artifacts/screenshots/
```

The App Router lives at the repository root because that is the structure used by the initialized vinext/OpenAI Sites scaffold; reusable client code remains under `src/`.

## State machine

```text
briefing -> priors -> lab -> result -> belief_update -> lab
lab -> verdict -> debrief
```

Guards:

- Priors must total 100 and keep every hypothesis at 5 or above.
- Every experiment requires a valid two-group prediction partition.
- An experiment cannot exceed its run limit or make the budget negative.
- A result must receive a player belief update before the next experiment.
- Verdict is unavailable until two results exist.

## API contracts

### `POST /api/ai/observe`

Input: `{ caseId: "fading-signal" }`

Output: schema-validated observation fields plus `source: "gpt-5.6" | "fallback"`.

### `POST /api/experiment/run`

Input: case ID, experiment ID, ordered prior experiment IDs in `runHistory`, and the prediction split.

Output: authored public result, authoritative cost and remaining budget, recomputed prior/posterior, realized information gain, and prediction-quality feedback. No private truth identifier is returned.

### `POST /api/verdict/submit`

Input: ordered experiment IDs, final hypothesis, confidence, two evidence indexes, a falsified alternative, its contradictory evidence index, and optional explanation.

Output: final score, revealed mechanism, authored explanation, optimal path, posterior comparison, and reasoning fingerprint.

## Tests

- Likelihood distributions normalize, every private outcome exists publicly, and public case data contains no truth or reveal fields.
- Bayesian posteriors normalize and KL information gain remains finite and non-negative, including around tiny probabilities.
- The repeat assay stays below 0.02 bits from a neutral prior.
- The 15 + 24 ideal route raises optical interference above 0.99 and costs exactly 39.
- Belief helpers preserve integer points totaling 100 with a minimum of 5.
- Reducer tests prevent negative budget, double spend, and a third repeat; they also enforce the belief-update transition.
- The authored case path reaches debrief without requiring an OpenAI API key.
- Scoring tests cover the full 100-point ideal route, budget-efficiency decay, and deterministic reasoning-fingerprint metrics.

`npm run qa:browser` complements the unit suite by driving the complete decisive route in headless Chrome, failing on relevant browser errors, and capturing desktop/phone/tablet evidence under `artifacts/screenshots/`.

## Risks and mitigations

- **Truth leakage:** private modules import `server-only`; debrief copy and the answer remain off the client bundle.
- **Client-tampered posterior:** the server reconstructs posterior from run history rather than trusting client probabilities.
- **Duplicate run/double spend:** UI pending locks plus pure reducer guards; the API is stateless and returns cost without mutating budget.
- **AI failure or refusal:** short timeout, strict schema validation, and one authored response shape.
- **Rounding drift:** engine probabilities stay normalized floats; player beliefs are validated integer points totaling 100.
- **Responsive complexity:** the lab uses one-column mobile flow and a three-region desktop grid with keyboard-visible controls.
- **Hackathon evidence:** keep dated commits, document the Codex decisions, expose a visible GPT/fallback source badge, and keep the deployed demo usable without sign-in.
