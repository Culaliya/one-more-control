# Deployment checklist

## Secrets and emergency controls

- [ ] Set `OPENAI_API_KEY` only in the hosting secret manager.
- [ ] Set a strong, unique `OPENAI_SAFETY_PEPPER` only in the hosting secret manager.
- [ ] Set `OPENAI_LIVE_REQUESTS_ENABLED=1` only when live GPT-5.6 review is intended.
- [ ] Verify that removing or changing `OPENAI_LIVE_REQUESTS_ENABLED` from `1` immediately restores authored fallback without breaking play.
- [ ] Confirm no client bundle contains an OpenAI secret, private case truth, or raw request fingerprint.

## Spend and abuse boundaries

- [ ] Configure a deliberately low OpenAI project spend cap and billing notification thresholds before making the site public.
- [ ] Configure a hosting/platform rate limit for both `POST /api/ai/observe` and `POST /api/verdict/submit`.
- [ ] Confirm Cloudflare provides `cf-ray` plus `cf-connecting-ip`; otherwise record that the code-side guard falls back to the HMACed session only.
- [ ] Treat the in-process 40-requests-per-hour ceiling as defense in depth only; it is not shared across instances, regions, or restarts.
- [ ] Confirm exhausted safeguards return authored fallback and HTTP 200 for the AI-enhanced game path.

## Release gates

- [ ] Run `npm ci` in a fresh temporary copy.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run check:client-boundary`.
- [ ] Exercise the complete featured 39-unit route at desktop, phone, and tablet widths.
- [ ] Exercise the alternate 38-unit route and confirm a 100-point score.
- [ ] Verify live and fallback badges in the deployed UI.

## Public submission

- [x] Confirm the production URL opens in a logged-out desktop browser.
- [x] Confirm the production URL opens in a logged-out phone viewport.
- [x] Confirm the public YouTube demo is English, under three minutes (`02:56` in YouTube), and viewable without a YouTube login: `https://youtu.be/XKuX8YIMGdo`.
- [ ] Confirm judges can access the repository.
- [ ] Enter the main Codex `/feedback` Session ID in the submission form.
- [x] Generate the ZIP checksum sidecar with the ZIP basename only.
