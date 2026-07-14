# ONE MORE CONTROL

> A scientific reasoning game where you win by choosing the experiment that proves you wrong.

ONE MORE CONTROL is an English-first browser game about experimental design, falsification, and calibrated uncertainty. A player begins with one synthetic observation and three plausible mechanisms, commits to prior beliefs, and spends a limited budget on experiments. Every test requires a prediction before it runs. The goal is not to collect the most data; it is to choose the control that makes the wrong explanations impossible.

**Playable demo:** [one-more-control.culaliya.chatgpt.site](https://one-more-control.culaliya.chatgpt.site)

The current Task 01 vertical slice contains the complete landing experience and one fully playable case, **Case 01 — The Fading Signal**. **Case 02 — The Weak Mutant is planned, but is not implemented in this build.**

## Why this project exists

AI can generate a plausible explanation for almost any result. Science asks a harder question: what evidence would prove that explanation wrong?

ONE MORE CONTROL turns that question into a game loop:

1. **Observe** a synthetic scientific result without treating the observation as its own explanation.
2. **Set priors** across three mechanisms and keep uncertainty visible.
3. **Predict** which hypotheses an experiment should separate before spending budget.
4. **Run** an authored experiment whose result comes from a deterministic case engine.
5. **Update beliefs** separately from the engine's hidden Bayesian posterior.
6. **Submit a mechanism** with an evidence chain and one falsified alternative.
7. **Debrief** with the hidden mechanism, optimal route, score, and reasoning fingerprint.

## Current playable case

### Case 01 — The Fading Signal

A synthetic compound reduces the fluorescent signal from an enzyme assay by 62%. Did the compound inhibit catalysis, reduce the amount of enzyme, or only interfere with the optical readout?

The player has 100 budget units and six possible experiments. The most efficient route costs 39 units and combines a temporal control with an orthogonal measurement. Low-information repetitions remain available on purpose: they produce more data while teaching why they do not necessarily produce more knowledge.

| Case | Status | Scope |
| --- | --- | --- |
| Case 01 — The Fading Signal | Implemented in Task 01 | Complete briefing-to-debrief playable loop |
| Case 02 — The Weak Mutant | Planned | Future data-driven case; not included in this build |

## The AI boundary

GPT-5.6 is intentionally useful without being authoritative.

The current build uses GPT-5.6 through the OpenAI Responses API to interpret the synthetic observation image. Its output is constrained to a strict schema describing the visible signal, compared conditions, visible controls, missing controls, ambiguity, and confidence. It may interpret evidence, but it may not rank hypotheses, reveal the mechanism, give wet-lab instructions, or invent an experimental result.

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
```

- The true mechanism and actual outcome map live only in a server-only module.
- Public case data contains hypotheses, possible outcomes, and likelihood tables, but not the answer.
- The experiment endpoint reconstructs state from validated run history instead of trusting a client-supplied posterior.
- Bayesian updates, KL information gain, scoring, budget rules, and state transitions are deterministic code.
- Player beliefs and engine beliefs remain separate so the debrief can measure calibration.
- If `OPENAI_API_KEY` is absent, the request fails, or structured output is invalid, an authored fallback keeps the entire case playable.

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
- `POST /api/verdict/submit` — authoritative score and debrief reveal

## Local setup

### Requirements

- Node.js `>=22.13.0`
- npm
- An OpenAI API key only if you want to exercise the live GPT-5.6 observation path

### Install and run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by the development server, then visit `/cases/fading-signal` or enter through the landing-page call to action.

The application remains fully playable when `OPENAI_API_KEY` is blank.

### Environment variables

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6
```

`OPENAI_API_KEY` is read only by the server route and must never be exposed to browser code. `OPENAI_MODEL` defaults to `gpt-5.6`.

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

The runner uses headless Google Chrome through the DevTools protocol, completes the 39-unit path, checks for browser runtime errors, and writes evidence to `artifacts/screenshots/`. It captures briefing and debrief views at desktop (`1440×1000`), phone (`393×852`), and tablet (`1024×1366`) widths, plus desktop lab and result views. Set `QA_BASE_URL`, `CHROME_PATH`, or `QA_DEBUG_PORT` to override the defaults when needed.

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
- bounded Socratic questions and a final evidence-chain review;
- an instructor-reviewed case authoring workflow;
- broader scientific domains and classroom accessibility options; and
- an optional uncertainty soundscape, which remains disabled in Task 01.

## License

The project source is available under the [MIT License](./LICENSE). Third-party dependencies and tools remain subject to their respective licenses and terms.
