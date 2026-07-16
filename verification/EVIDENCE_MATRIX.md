# Final evidence matrix — Task 04 truth polish

Updated 2026-07-16 after clean-copy verification and Sites production deployment. `Pass` means the named evidence exists for the final source state. Account-controlled settings remain explicitly unverified.

| Area | Status | Required evidence |
| --- | --- | --- |
| Scientific boundary | Pass | Server-only case truth; 70 passing tests; client-boundary scan passed across 9 text assets |
| Runtime AI grounding | Pass | Observation title grounding and final-review outcome/numeric grounding tests pass; the Task 04 patch does not change either AI route |
| Two decisive routes | Pass | Featured 39-unit route: score 100, budget remaining 61, redundancy 0%; alternate 38-unit route: score 100 |
| Result-information semantics | Pass | Four pure role-classification tests cover neutral repeat, same-channel non-separation, featured order, and reversed featured order |
| Live cost safety | Partial — account controls pending | Request guards, HMACed request key, local process ceiling, kill switch, and authored fallbacks are code-verified; OpenAI project spend cap and hosting edge rate rule remain account-controlled |
| Assets and rights | Pass | `ASSET_PROVENANCE.md`, `THIRD_PARTY_LICENSES/GEIST-OFL-1.1.txt`, complete bundled-asset inventory and hashes |
| Functional readability | Pass | Public desktop, 1024×1366 tablet, and 393×852 phone browser QA passed; minimum functional font size 11 px |
| Clean-copy build | Pass | Fresh `npm ci`; `npm audit` 0 vulnerabilities; lint, typecheck, 11 files / 70 tests, production build, and client-boundary scan all pass |
| Current-source live AI | Pass — replayed for recording | Exactly one observation and one ideal final-review response are documented with sanitized telemetry; the final video replays those validated responses and makes zero new model calls |
| Public deployment | Pass | Sites production version 6 at `https://one-more-control.culaliya.chatgpt.site`; fresh-profile public QA passed on desktop, tablet, and phone |
| Submission video | Pass | Public YouTube URL: `https://youtu.be/XKuX8YIMGdo`; unauthenticated YouTube oEmbed returned HTTP 200 with the correct title and channel on 2026-07-16; YouTube reports `02:56`, HD processing complete, copyright check clear, and published English (United States) captions. Local master: 175.000 s, 1920×1080, 30 fps, H.264 CRF 18, AAC mono, −16.05 LUFS |

Still account-controlled: OpenAI project spend cap, hosting edge rate rule, judge repository access, and the primary Codex `/feedback` Session ID.
