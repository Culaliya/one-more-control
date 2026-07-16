# ONE MORE CONTROL

> A scientific reasoning game where you win by choosing the experiment that proves you wrong.

ONE MORE CONTROL is an English-first browser game about experimental design, falsification, and calibrated uncertainty. A player begins with one synthetic observation and three plausible mechanisms, commits to prior beliefs, and spends a limited budget on experiments. Every test requires a prediction before it runs. The goal is not to collect the most data; it is to choose the control that makes the wrong explanations impossible.

The production competition demo is published at [one-more-control.culaliya.chatgpt.site](https://one-more-control.culaliya.chatgpt.site/) and is intended to work for anyone with the link, without a ChatGPT login. The repository also remains fully playable from a local production build.

The current Task 01 vertical slice contains the complete landing experience and one fully playable case, **Case 01 — The Fading Signal**. **Case 02 — The Weak Mutant is planned, but is not implemented in this build.**

## Why this project exists

AI can generate a plausible explanation for almost any result. Science asks a harder question: what evidence would prove that explanation wrong?

ONE MORE CONTROL turns that question into a game loop:

1. **Observe** a synthetic scientific result without treating the observation as its own explanation.
2. **Set priors** across three mechanisms and keep uncertainty visible.
3. **Predict** whether an experiment should split the hypotheses or leave all three together before spending budget.
4. **Run** an authored experiment whose result comes from a deterministic case engine.
5. **Update beliefs** separately from the engine's hidden Bayesian posterior.
6. **Submit a mechanism** with an evidence chain and one falsified alternative.
7. **Debrief** with the hidden mechanism, featured decisive route, score, and reasoning fingerprint.

## Current playable case

### Case 01 — The Fading Signal

A synthetic compound reduces the fluorescent signal from an enzyme assay by 62%. Did the compound inhibit catalysis, reduce the amount of enzyme, or only interfere with the optical readout?

The player has 100 budget units and six possible experiments. The debrief features a 39-unit temporal-plus-orthogonal route because it communicates the central lesson most clearly. A scientifically valid 38-unit abundance-plus-titration route can also earn 100; `parCost` is therefore a featured full-efficiency benchmark, not the absolute minimum. Low-information repetitions remain available on purpose: they produce more data while teaching why they do not necessarily produce more knowledge.

| Case | Status | Scope |
| --- | --- | --- |
| Case 01 — The Fading Signal | Implemented in Task 01 | Complete briefing-to-debrief playable loop |
| Case 02 — The Weak Mutant | Planned | Future data-driven case; not included in this build |

## The AI boundary

GPT-5.6 is intentionally useful without being authoritative.

The current build uses GPT-5.6 through the OpenAI Responses API twice: once to interpret the synthetic observation image and once to review the player's server-validated reasoning trail at the debrief. Both outputs use strict schemas, token caps, timeouts, in-process caching, request guards, and authored fallbacks. The model may interpret evidence and review reasoning, but it may not rank hypotheses during observation, alter deterministic scores or posteriors, reveal or invent an experimental result, or give wet-lab instructions.

Scientific truth follows a separate path:

```text
Synthetic image + public brief
            |
            v
GPT-5.6 structured observation ----> authored fallback on any failure

Player prediction + experiment choice
            |
            v
Server-only authored truth --------> deterministic result
            |
            v
Pure Bayesian engine --------------> posterior + information gain
            |
            v
Validated player trail + score ----> bounded GPT-5.6 reasoning review
                                      + authored fallback on any failure
```

- The true mechanism and actual outcome map live only in a server-only module.
- Public case data contains hypotheses, possible outcomes, and likelihood tables, but not the answer.
- The experiment endpoint reconstructs state from validated run history instead of trusting a client-supplied posterior.
- The verdict endpoint replays the full player-authored prediction and belief trail against server-only outcomes; client-authored outcomes, costs, and posteriors are rejected.
- Bayesian updates, KL information gain, scoring, budget rules, and state transitions are deterministic code.
- Player beliefs and engine beliefs remain separate so the debrief can measure calibration.
- If the live switch is off, `OPENAI_API_KEY` is absent, a request fails, or structured output is invalid, authored fallbacks keep the entire case playable and the debrief complete.

This separation is the core product decision: **GPT-5.6 may interpret the evidence; it never decides what happened in the experiment.**

## Built with

- Next.js App Router source, built through the vinext/Vite runtime for OpenAI Sites
- TypeScript
- Tailwind CSS
- Official OpenAI JavaScript SDK
- GPT-5.6 via the Responses API and strict structured output
- Pure deterministic probability and scoring utilities
- `localStorage` for anonymous, resumable progress
- Locally generated synthetic scientific visuals

There is no database, account system, analytics SDK, leaderboard, social layer, external CMS, or generic chat interface.

## Routes

- `/` — landing page and product explanation
- `/cases/fading-signal` — complete Case 01
- `POST /api/ai/observe` — GPT-5.6 image interpretation with authored fallback
- `POST /api/experiment/run` — deterministic experiment result and posterior update
- `POST /api/verdict/submit` — authoritative replay, score, debrief reveal, and bounded final reasoning review

## Local setup

### Requirements

- Node.js `>=22.13.0`
- npm `10.9.2` (also pinned in `packageManager`)
- An OpenAI API key only if you want to exercise the two live GPT-5.6 review paths

### Install and run

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open the local URL printed by the development server, then visit `/cases/fading-signal` or enter through the landing-page call to action.

The application remains fully playable when `OPENAI_API_KEY` is blank.

### Environment variables

```bash
OPENAI_API_KEY=
OPENAI_SAFETY_PEPPER=
OPENAI_LIVE_REQUESTS_ENABLED=
```

All three values are server-only and must never be exposed to browser code. Both AI surfaces are pinned to `gpt-5.6`. Live calls occur only when `OPENAI_LIVE_REQUESTS_ENABLED=1`; every other value is an emergency fallback switch that keeps the deterministic game available without contacting OpenAI.

Live server requests also require a server-only `OPENAI_SAFETY_PEPPER`. The
validated session ID is HMAC-derived into a stable, non-reversible
`safety_identifier`; the raw session ID is never sent to OpenAI. Keep the pepper
in a local or hosting secret manager; `.env.example` contains only a blank
placeholder. When Cloudflare supplies its trusted request headers, the
per-session rate key also includes a separate HMAC of the client address. The
raw address is never logged or persisted.

Both jobs use `reasoning: { effort: "low" }`, strict structured output, and
`store: false`. Only schema-valid, semantically valid live results enter the
in-process success cache; failures and authored fallbacks remain retryable.
Player-facing model prose must also stay in Latin-script English, fit within a
160-character UI limit, and end as a complete sentence. Copy that fails this
second semantic gate is replaced by the authored English fallback.

Each route has a per-session fixed-window guard. The server also permits at
most 40 actual OpenAI transport attempts per hour in one Node.js process as a
defense-in-depth ceiling. That ceiling is not distributed across processes or
regions, so production hosting must add a platform-level rate limit and the
OpenAI project should have a deliberately low spend cap. Rate exhaustion always
selects authored fallback instead of returning a gameplay-breaking error.

## Verification

Run all completion gates before shipping:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The equivalent combined command is:

```bash
npm run check
```

The automated checks cover the scientific and gameplay invariants, including:

- normalized likelihoods and Bayesian posteriors;
- finite, non-negative information gain;
- no private truth fields in public case data;
- all authored private outcomes matching declared public outcomes;
- the repeat assay remaining below 0.02 bits from neutral priors;
- the ideal 39-unit path raising the optical-interference posterior above 0.99;
- a first-class no-separation prediction for low-information tests;
- both the featured 39-unit route and alternate 38-unit route scoring 100, while spike-plus-abundance and spike-plus-same-readout routes cannot;
- verdict routes rejecting client-authored outcomes and discontinuous belief histories;
- strict final-review schemas rejecting extra numeric claims and invented controls;
- failed, refused, timed-out, and invalid AI responses remaining retryable in-process;
- mixed-script, overlong, and boundary-truncated AI copy falling back safely;
- exact authored experiment titles being rejected from every observation field;
- final-review prose being rejected for unobserved outcome titles or invented numeric claims;
- successful AI responses using the intended bounded cache policy;
- the model being unable to override deterministic claim support;
- privacy-preserving safety identifiers and explicit low reasoning effort;
- the production client bundle containing no private truth markers;
- budget, single-spend, run-limit, and required-belief-update guards;
- belief rebalancing that preserves integer points, the 100-point total, and the minimum; and
- deterministic scoring, fingerprint metrics, and completion of the authored case path without an OpenAI API key.

For the automated browser pass, keep the development server running in one terminal and start the QA runner in another:

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run qa:browser
```

The runner uses headless Google Chrome through the DevTools protocol, exercises a correct no-separation prediction and then the decisive temporal-plus-orthogonal route, checks keyboard focus, reduced-motion handling, browser runtime errors, and offline AI fallbacks, and writes evidence to `artifacts/screenshots/`. It captures landing, briefing, lab, result, and debrief views across desktop (`1440×1000`), phone (`393×852`), and tablet (`1024×1366`) widths. Set `QA_BASE_URL`, `CHROME_PATH`, or `QA_DEBUG_PORT` to override the defaults when needed.

### Competition recording rehearsal

Generate a clean, timestamped recording pack with one command:

```bash
npm run record:competition
```

The command runs the full completion gate, starts a local production server,
plays the exact 39-unit / 100-point route, verifies reset and accessibility
signals, then closes the server. It writes seven recording-ready frames,
sanitized browser evidence, and a 2:53 shot list under
`artifacts/competition-record/`. The default mode deliberately removes any API
key and uses authored fallbacks, so it makes zero OpenAI calls.

For the final GPT-5.6 recording proof, first provide `OPENAI_API_KEY` through the
current server environment or a secret manager, then explicitly authorize the
two-call recording path:

```bash
RECORD_WITH_LIVE_OPENAI=1 npm run record:competition
```

The script never records narration or uploads to YouTube. The final submission
still needs a clear English audio track and must remain under three minutes.

### Gated live API smoke

After `npm run check`, provide `OPENAI_API_KEY` through the current server
environment or a secret manager, then run:

```bash
LIVE_OPENAI_SMOKE=1 npm run smoke:api:live
```

The command refuses to start without both the explicit live gate and the key.
It launches a production-mode server, establishes no-key deterministic
baselines, makes at most four planned GPT-5.6 calls, then reuses successful
caches for the complete browser path. Sanitized JSON, a redacted production log,
desktop/phone/tablet screenshots, and an acceptance matrix are written beneath a
timestamped `artifacts/api-smoke/` directory. The key and raw environment are
never written to those artifacts.

For manual verification, play once through the inefficient repeat route and once through the 39-unit decisive route. Also inspect the landing page and full game flow at desktop, phone, and tablet widths, with keyboard navigation and reduced motion enabled.

## How Codex contributed

Codex was used in the primary build thread to translate the product blueprint into an implementation plan, establish the AI/truth boundary, implement the responsive interface and state machine, build the deterministic Bayesian engine, create synthetic assets, generate invariant-focused tests, and inspect the complete flow. Product, scientific, engineering, and visual decisions were reviewed in context rather than delegated to model output.

Before submission, the Devpost form must record the `/feedback` Session ID from that primary thread. The corresponding dated repository history distinguishes the Build Week implementation from any later work.

## Scientific-content disclaimer

All scenarios, compounds, measurements, charts, and outcomes in ONE MORE CONTROL are synthetic and simplified for education. The project is not a wet-lab protocol, diagnostic system, medical tool, or source of scientific or clinical advice.

## Roadmap

Task 01 deliberately stops after one polished case. Future work may include:

- **Case 02 — The Weak Mutant**, added through the data-driven case architecture;
- restricted natural-language mapping to existing experiment cards;
- additional bounded Socratic questions;
- an instructor-reviewed case authoring workflow;
- broader scientific domains and classroom accessibility options; and
- an optional uncertainty soundscape, which remains disabled in Task 01.

## License

The project source is available under the [MIT License](./LICENSE). Third-party dependencies and tools remain subject to their respective licenses and terms.
