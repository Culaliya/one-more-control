# OpenAI Build Week — Devpost Submission Draft

This is the paste-ready submission packet for **ONE MORE CONTROL**. Replace every bracketed placeholder, run the final checks, and recheck the [Official Rules](https://openai.devpost.com/rules) before submitting.

> **Scope statement:** The competition build contains the landing page and one complete playable case, **Case 01 — The Fading Signal**. Case 02 is planned work and must not be described as implemented.

## Submission fields

### Project title

ONE MORE CONTROL

### Tagline

A scientific reasoning game where you win by choosing the experiment that proves you wrong.

### Category

Education

### Built with

Codex, GPT-5.6, OpenAI Responses API, official OpenAI JavaScript SDK, Next.js, TypeScript, Tailwind CSS

### Project URL

`https://one-more-control.culaliya.chatgpt.site`

### Repository URL

`[ADD PUBLIC MIT-LICENSED REPOSITORY URL]`

If the repository remains private, share it with both `testing@devpost.com` and `build-week-event@openai.com` before submission.

### Public YouTube demo

`[ADD PUBLIC YOUTUBE URL — VIDEO MUST BE UNDER 3:00]`

### Primary Codex `/feedback` Session ID

`[RUN /feedback IN THE PRIMARY BUILD THREAD AND PASTE THE SESSION ID HERE]`

Use the thread where the majority of the core functionality was built, not a planning-only or side thread.

## Paste-ready project story

### Inspiration

AI can produce a plausible explanation for almost any scientific result. But science does not advance by choosing the first explanation that sounds coherent. It advances by keeping multiple mechanisms alive long enough to design the experiment that makes the wrong ones impossible.

Most educational tools reward recall or ask an AI tutor for the answer. We wanted to build the opposite: a game that preserves uncertainty, charges a cost for every experiment, and rewards falsification over confirmation.

### What it does

ONE MORE CONTROL is a browser-based scientific reasoning game. The current submission includes one complete case, The Fading Signal. It begins with a synthetic enzyme-assay observation and three plausible mechanisms: catalytic inhibition, enzyme loss, or optical interference.

Players assign their initial beliefs, spend a limited experimental budget, and predict which hypotheses each test should separate before running it. Experimental outcomes come from a deterministic authored engine, never from a language model. A Bayesian evidence model tracks how much each result changes the hidden posterior while players update their own beliefs separately.

At the end, the player submits a mechanism, cites two results, falsifies an alternative, and receives a reasoning fingerprint showing falsification index, redundancy rate, evidence efficiency, and calibration gap. The featured route combines a temporal control with an orthogonal measurement because that pairing communicates the central lesson most clearly. An alternate 38-unit abundance-plus-titration chain is also scientifically decisive and can earn 100.

### How we built it

We built ONE MORE CONTROL as an English-first responsive Next.js application with TypeScript, Tailwind CSS, and the official OpenAI JavaScript SDK.

GPT-5.6 serves two bounded roles through the Responses API. First, it interprets a locally generated synthetic observation image. A strict structured-output schema limits that response to visible evidence, controls, missing controls, ambiguity, and confidence. Second, after deterministic scoring, it reviews only the server-validated reasoning trail and returns constrained feedback. The model cannot rank the starting hypotheses, reveal the mechanism early, give wet-lab instructions, invent an experiment or outcome, or alter the result trail. If either route is unavailable or fails semantic validation, an authored fallback keeps the game fully playable.

The scientific truth lives in a separate server-only module. The experiment route validates the player's action, returns a pre-authored result, and recomputes the Bayesian posterior from run history rather than trusting the browser. Server code owns claim support, score, posterior, budget, cost, every experimental outcome, and the true mechanism. GPT-5.6 may review observed, server-validated outcomes after scoring, but it cannot create, change, or score a result. Small pure functions handle normalization, KL information gain, scoring, budget rules, and state transitions. Anonymous progress stays in local storage, so the demo needs no account or database.

Codex helped us turn the product blueprint into an implementation plan, establish the AI/truth boundary, build the interface and state machine, implement the deterministic case engine, generate invariant-focused tests, and refine the end-to-end player experience. We kept the product, scientific, engineering, and visual decisions explicit throughout the primary build thread.

### Challenges we ran into

The hardest design problem was deciding what AI should not do. Allowing a model to invent experiments would make the experience flexible but scientifically untrustworthy. We separated interpretation and review from truth: GPT-5.6 can help a player inspect the opening observation and review a completed reasoning trail, while deterministic authored code controls every outcome, numeric update, score, and claim-support decision.

A second challenge was making Bayesian information gain understandable without turning the game into a statistics lecture. We connected the math to visible consequences: a limited budget, prediction splits, hypothesis survival states, and result roles that distinguish low-value repetition from a low-increment but independent confirmation.

We also needed to keep the hidden answer off the client while preserving a smooth anonymous game. Server-only truth, validated run history, and a separate verdict route let the debrief reveal the mechanism without shipping it in the browser bundle.

### Accomplishments that we're proud of

- A complete briefing-to-debrief game loop built around falsification rather than chat.
- Two bounded GPT-5.6 features—observation interpretation and post-score reasoning review—with strict structured output and reliable authored fallbacks.
- Deterministic experimental truth that the language model cannot rewrite.
- A tested Bayesian engine that makes low-information repetition visibly different from decisive controls.
- A reasoning fingerprint that turns scientific habits into player-facing feedback.
- A responsive, anonymous experience that remains playable without an API key.

### What we learned

The most useful educational AI does not always collapse uncertainty. Sometimes its best role is to describe what is actually visible, preserve competing explanations, and leave causal judgment to evidence. We also learned that information gain becomes intuitive when every experiment has a cost and every prediction is made before the result appears.

### What's next

The next authored case is The Weak Mutant, which explores how to distinguish a catalytic defect from low protein abundance or incomplete cofactor loading. It is planned, not part of the current submission build.

After that, we would add restricted natural-language mapping to pre-authored experiment cards, bounded Socratic questions, an instructor-reviewed case editor, more scientific domains, and accessibility options for an optional uncertainty soundscape. The deterministic engine would continue to own every result.

### AI and Codex disclosure

GPT-5.6 is used in two bounded server-side routes. First, it interprets the visible synthetic observation through strict structured output. Second, after deterministic scoring, it reviews only the server-validated reasoning trail. Server code owns every experimental outcome, posterior, cost, score, true mechanism, and claim-support decision; model output that invents an outcome, number, or experiment is rejected in favor of an authored fallback.

Codex was the primary development collaborator for architecture, implementation, tests, visual iteration, truth-boundary hardening, and responsive verification. The submitted `/feedback` Session ID points to the main thread where the majority of the core functionality was built.

### Testing instructions for judges

1. Open `https://one-more-control.culaliya.chatgpt.site`. The production site is public and requires no sign-in.
2. Select **ENTER CASE 01** and choose **ANALYZE THE OBSERVATION**. A visible source indicator identifies the live GPT-5.6 response or the authored fallback.
3. Allocate priors across all three hypotheses and lock them.
4. For the clearest short path, run **Post-reaction spike-in** and then **Orthogonal product quantification**. Complete the prediction gate and belief update after each result.
5. Submit **Optical interference**, select the two resulting evidence cards, identify a falsified alternative, and open the debrief.
6. Use the visible reset control to replay. The full case remains playable if the live model request is temporarily unavailable.

Expected time for the judging path: approximately 4–6 minutes.

## Under-three-minute demo beat sheet

Target runtime: **2:50–2:55**. The Official Rules say the video should be less than three minutes, so do not export a frame at or beyond `03:00`.

| Time | Picture | Voiceover goal |
| --- | --- | --- |
| 0:00–0:12 | Landing hero and the line “ONE EXPERIMENT THAT MATTERS.” | “AI can explain almost any result. ONE MORE CONTROL asks the scientific question that matters more: what experiment would prove that explanation wrong?” |
| 0:12–0:28 | Case 01 brief, synthetic fluorescence chart, three mechanism cards | Explain the 62% signal loss and the three still-plausible mechanisms. State that the current submission contains one complete case. |
| 0:28–0:48 | Trigger **ANALYZE THE OBSERVATION** and show the live `GPT-5.6` source indicator | “GPT-5.6 interprets the visible evidence and missing controls through a strict schema. It cannot rank hypotheses or invent an experimental outcome.” |
| 0:48–1:05 | Allocate and lock priors | Show that the player commits beliefs before seeing more evidence and that player confidence is separate from the engine posterior. |
| 1:05–1:30 | Prediction gate for the post-reaction spike-in, then its authored result | Explain that every test costs budget and requires a falsifiable prediction. Emphasize that the result comes from deterministic server-side truth. |
| 1:30–1:52 | Update beliefs, then show the orthogonal product result | “A different measurement finds normal product. Together, timing and an orthogonal readout make optical interference the surviving mechanism.” |
| 1:52–2:14 | Verdict form followed by debrief and reasoning fingerprint | Show the evidence chain, revealed mechanism, budget efficiency, redundancy, falsification, and calibration feedback. |
| 2:14–2:34 | Debrief reasoning review plus the visible deterministic score and fingerprint | Explain the second bounded GPT-5.6 role: it reviews the validated trail only after server scoring, while server code owns claim support and every number. |
| 2:34–2:47 | Brief view of the primary Codex thread, dated commits, or passing checks with private information cropped | “Codex helped plan the boundary, implement the game and probability engine, generate tests, and refine the complete responsive flow.” |
| 2:47–2:53 | Return to landing hero and title card | Close with: “Do not ask AI for the answer. Ask what evidence would prove it wrong.” |

### Video compliance checklist

- [ ] Final duration is below `03:00`; target `02:50–02:55`.
- [ ] Uploaded to YouTube as **Public**, not Private or Unlisted.
- [ ] Audio clearly explains what was built, how Codex was used, and how GPT-5.6 is integrated.
- [ ] The working product is visibly demonstrated, not represented only by slides.
- [ ] The live GPT-5.6 source indicator and the deterministic authored result are both visible.
- [ ] Narration and on-screen submission material are English, or complete English translations are supplied.
- [ ] No credentials, API keys, private account information, or unrelated notifications are visible.
- [ ] Music, fonts, images, icons, trademarks, and other third-party material are owned, licensed, or omitted.
- [ ] Captions have been reviewed for “Bayesian,” “falsification,” “orthogonal,” “V-17,” “GPT-5.6,” and “Codex.”
- [ ] The YouTube URL works in a logged-out browser window.

## Screenshot checklist

Suggested exports should use crisp 16:9 framing where practical, plus one phone-width proof. Do not imply that Case 02 is already playable.

To regenerate the current QA evidence set, run the app and browser runner in separate terminals:

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run qa:browser
```

This writes desktop briefing, lab, result, and debrief screenshots plus phone- and tablet-width briefing and debrief screenshots to `artifacts/screenshots/`. The live GPT observation, prediction gate, and second-result gallery shots below are separate manual captures because the automated path prioritizes repeatable end-to-end proof.

For a one-command 16:9 competition rehearsal of the exact ideal route, run:

```bash
npm run record:competition
```

This produces the seven numbered frames, sanitized browser result, and 2:53
shot list beneath `artifacts/competition-record/`. It is zero-cost by default.
Use `RECORD_WITH_LIVE_OPENAI=1` only when a server-side key is already available
and two live Responses API calls are intentionally authorized.

- [ ] `01-landing-hero.png` — product name, tagline, primary call to action, and interactive specimen visible without scrolling.
- [ ] `02-gpt-observation.png` — synthetic chart, schema-bound observation card, missing-controls section, and a genuine `GPT-5.6` source indicator.
- [ ] `03-prediction-gate.png` — all three hypothesis identities, two prediction groups, experiment cost, and remaining budget.
- [ ] `04-decisive-timing-result.png` — post-reaction spike-in result, authored result chart, cost, and information gain.
- [ ] `05-orthogonal-result.png` — non-fluorescent product result and belief-update prompt.
- [ ] `06-reasoning-fingerprint.png` — completed debrief with score, featured decisive route, fingerprint, and calibration metrics.
- [ ] `07-responsive-case.png` — phone-width lab view with readable hypothesis status, non-color indicators, and no clipping.

For every selected Devpost image:

- [ ] Crop browser chrome, notifications, local file paths, and debug overlays.
- [ ] Use only the current Case 01 implementation.
- [ ] Avoid showing the private truth before the debrief screenshot.
- [ ] Confirm text remains readable at Devpost gallery size.
- [ ] Add concise English captions and useful alt text.
- [ ] Verify there are no third-party assets without documented permission.

## Final repository checklist

- [ ] Public repository contains the MIT `LICENSE`, or private access is granted to both judging addresses.
- [ ] README includes setup, environment variables, test commands, demo route, AI/truth separation, Codex contribution, and scientific disclaimer.
- [ ] `.env.example` contains only blank `OPENAI_API_KEY`, `OPENAI_SAFETY_PEPPER`, and `OPENAI_LIVE_REQUESTS_ENABLED` values; the pinned model alias remains server code, not an environment override.
- [ ] No `.env.local`, API key, token, credential, private user information, or build secret is committed.
- [ ] The exact GPT-5.6 model integration is visible in code and described in the README.
- [ ] Dated commits and the primary Codex thread show that the work occurred during the Submission Period.
- [ ] `npm run check` and `npm run qa:browser` both pass against a fresh local run.
- [ ] The public demo works without sign-in and remains useful when the AI route falls back.
- [ ] The deployed live GPT-5.6 path has a server-side API key and has been tested once before recording.
- [ ] Testing access remains free and unrestricted through the end of judging.

## Deadline reminders

July dates use Pacific Daylight Time. Taipei is 15 hours ahead.

| Milestone | Official Pacific time | Taipei time |
| --- | --- | --- |
| Codex credit request closes | July 17, 2026 at 12:00 PM PT | July 18, 2026 at 3:00 AM |
| Submission and registration close | July 21, 2026 at 5:00 PM PT | **July 22, 2026 at 8:00 AM** |
| Judging begins | July 22, 2026 at 10:00 AM PT | July 23, 2026 at 1:00 AM |
| Judging ends; keep demo accessible through this point | August 5, 2026 at 5:00 PM PT | **August 6, 2026 at 8:00 AM** |
| Winners announced on or around | August 12, 2026 at 2:00 PM PT | August 13, 2026 at 5:00 AM |

Submit early enough to reopen every URL from a logged-out browser. The Official Rules state that a submission cannot be changed after the Submission Period ends, except for narrow administrator-approved corrections.

## Official sources

- [OpenAI Build Week overview](https://openai.devpost.com/)
- [Official Rules](https://openai.devpost.com/rules)
- [Official FAQ](https://openai.devpost.com/details/faqs)
- [Resources and Codex credit information](https://openai.devpost.com/resources)
- [OpenAI API supported countries and territories](https://developers.openai.com/api/docs/supported-countries)
