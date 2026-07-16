# Asset provenance

Audit date: 2026-07-16

This inventory covers every bundled visual/font asset plus the two source-code glyph systems requested for the competition review. The scientific charts and outcome illustrations are synthetic; no stock photography, copied paper figures, brand marks, or third-party source images are bundled.

## Bundled font assets

| Path | Creator / generating tool | Status and transformation | Rights / license | Evidence and residual risk |
| --- | --- | --- | --- | --- |
| `public/fonts/geist-latin.woff2` | Vercel with basement.studio; fetched by `next/font/google`, then copied from vinext's local generated font cache | Third-party Geist variable Latin subset; no manual visual modification | SIL Open Font License 1.1; bundled notice at `THIRD_PARTY_LICENSES/GEIST-OFL-1.1.txt` | SHA-256 `9b6f5ff45b278c744b5f379a2c4ecbaf858a842b8eaf82ac8d21b699ca16c608`. Low risk while license notice remains bundled. |
| `public/fonts/geist-mono-latin.woff2` | Vercel with basement.studio; fetched by `next/font/google`, then copied from vinext's local generated font cache | Third-party Geist Mono variable Latin subset; no manual visual modification | SIL Open Font License 1.1; bundled notice at `THIRD_PARTY_LICENSES/GEIST-OFL-1.1.txt` | SHA-256 `5f3d6ad60f29d6cb708414ec6887163d63bf197377ef5417d2483ff31ace6c3b`. Low risk while license notice remains bundled. |
| `public/fonts/geist-mono-symbols.woff2` | Vercel with basement.studio; fetched by `next/font/google`, then copied from vinext's local generated font cache | Third-party Geist Mono symbols subset; no manual visual modification | SIL Open Font License 1.1; bundled notice at `THIRD_PARTY_LICENSES/GEIST-OFL-1.1.txt` | SHA-256 `d67e4a94ba498635f764ddca7d1ec4271f5642f032eb24b426764480f66f8497`. Low risk while license notice remains bundled. |

The license notice was verified against [Vercel's official `vercel/geist-font` license](https://github.com/vercel/geist-font/blob/main/LICENSE.txt) on 2026-07-16. The local files came from the project's own `next/font/google` / vinext cache, not an unknown download.

## Generated editorial art and derivatives

| Path | Creator / generating tool | Status and transformation | Rights / license | Evidence and residual risk |
| --- | --- | --- | --- | --- |
| `public/social-card-source.png` | OpenAI image generation, prompted in the primary Codex build session | Project-generated source art. Its only reference was a screenshot of this project's own landing page; no third-party reference image. | Generated for this project under the applicable OpenAI service terms; not offered as a separately licensed stock asset. | SHA-256 `82941b558945d7cfb1a9a67791e5925c1ad1fce93ab8323b0db8117363de3377`. Low-to-medium generative-image residual risk; prompt explicitly excluded logos, people, text, watermarks, and stock-photo imagery. |
| `public/og.png` | `scripts/generate-social-card.py` using Pillow | Deterministic 1200×630 derivative of `public/social-card-source.png`, with project-authored typography and geometry. System Arial/Menlo are rasterized but not redistributed as font files. | Project-generated derivative; source status as above. | SHA-256 `2af111c3cd6ec65a53cbbb08e5a3661badcfd2abfd8ad39ccefcd120261da636`. Low risk. |
| `evidence/generated-source/case-cover-art-source.png` | OpenAI image generation, prompted in the primary Codex build session | Project-generated chapter-cover source. Visual-style reference was `public/social-card-source.png`, itself project-generated. | Generated for this project under the applicable OpenAI service terms; not offered as a separately licensed stock asset. | SHA-256 `4274abcfbd7c5ee49737c57454f90418329cdaa9ca1ff69d5d88e44bf4ecdcc9`. Low-to-medium generative-image residual risk; prompt excluded people, text, logos, UI copies, and answer disclosure. |
| `public/cases/fading-signal/art/case-cover-art.webp` | Local `cwebp` conversion | Quality-86 WebP derivative of the preceding source PNG. | Same rights status as its generated source. | SHA-256 `56e66de2678baf51fc8c121f85e934ec1a18e0ddcab276fcf92822f0e1b5e09f`. Low risk. |
| `evidence/generated-source/resolution-field-source.png` | OpenAI image generation, prompted in the primary Codex build session | Project-generated debrief source. Its only visual reference was the preceding project-generated chapter cover. | Generated for this project under the applicable OpenAI service terms; not offered as a separately licensed stock asset. | SHA-256 `198a2bc71d914784981fd67dceecccfe9ebdbd16b2742e6fdc2d67954e8d6b55`. Low-to-medium generative-image residual risk; prompt required equal-weight mechanisms and prohibited answer symbols. |
| `public/cases/fading-signal/art/resolution-field.webp` | Local `cwebp` conversion | Quality-86 WebP derivative of the preceding source PNG. | Same rights status as its generated source. | SHA-256 `7925df5d41251031b17ba5be09f712a7c778fb3730f222b803af2ab87d44ec80`. Low risk. |

The two PNGs under `artifacts/generated-source/` are working-copy duplicates of the canonical evidence files above and are not required runtime assets.

## Deterministic scientific charts and icon

All assets in this section were authored locally by `scripts/generate-case-assets.py` using Pillow or generated SVG markup. The script uses only project-authored synthetic numbers, labels, paths, colors, and primitive geometry. System font files may be used to rasterize text into PNG output, but those system font binaries are not bundled. Every possible counterfactual outcome has an illustration, so asset presence does not reveal private case truth.

| Path | Status | SHA-256 | Rights / risk |
| --- | --- | --- | --- |
| `public/cases/fading-signal/initial-observation.png` | Original project-generated synthetic observation chart | `e698a8ca6bb3bea2980ec39d97af42f682a386594baec31903454692dd52573e` | Project-authored; low risk. |
| `public/favicon.png` | Original project-generated signal-mark icon | `8cf9b2d4820593eed8d1968163320c6f350f9f823df031cc8ec38554f8df04e4` | Project-authored; low risk. |
| `public/cases/fading-signal/outcomes/abundance_reduced.svg` | Original project-generated counterfactual chart | `fb81ad26b626df74e4c5af846687e9be08a7a74d62bc84801612b626896999fe` | Project-authored; low risk. |
| `public/cases/fading-signal/outcomes/abundance_unchanged.svg` | Original project-generated authored/counterfactual chart set | `77b561ba850f633a98712c3823700e8b815f443bdf41dbaef48996780484985d` | Project-authored; low risk. |
| `public/cases/fading-signal/outcomes/dose_dependent_signal_drop.svg` | Original project-generated authored/counterfactual chart set | `ca048684ba1af982eed4dbe8c3ae49637114f0583b6d8f5ca854359c3b785dd3` | Project-authored; low risk. |
| `public/cases/fading-signal/outcomes/immediate_signal_drop.svg` | Original project-generated authored/counterfactual chart set | `986b4d8bdc4efa0330e358b3ea88db9c0109619ff95c9b54685832ea4cd027ce` | Project-authored; low risk. |
| `public/cases/fading-signal/outcomes/low_product_amount.svg` | Original project-generated counterfactual chart | `5539325abbb6a035728ff3c95bdaba061b69b4322192b1e9ee35b286853e4d6e` | Project-authored; low risk. |
| `public/cases/fading-signal/outcomes/low_signal_reproduced.svg` | Original project-generated authored/counterfactual chart set | `b3fcfe44755fc7e37147b999471f853ff9adde8f214d82417d8c58118c30ec8f` | Project-authored; low risk. |
| `public/cases/fading-signal/outcomes/no_apparent_rescue.svg` | Original project-generated authored/counterfactual chart set | `5f2ee244a68700e744c23847319b2e91d1a690e540f4bf173103f3b8ae7a9978` | Project-authored; low risk. |
| `public/cases/fading-signal/outcomes/no_dose_response.svg` | Original project-generated counterfactual chart | `67cc592c854759637cd88852fc619fc2c7a4bb1f46fa88a5d0872570ee576c67` | Project-authored; low risk. |
| `public/cases/fading-signal/outcomes/no_immediate_change.svg` | Original project-generated counterfactual chart | `7c08f6586f5bb1b46ab51afee246254af9a6b19604fbca43f3342da8f72e7831` | Project-authored; low risk. |
| `public/cases/fading-signal/outcomes/normal_product_amount.svg` | Original project-generated authored/counterfactual chart set | `f6393bcfc0c547bc0e65fb47660039fa1ad4ac075184b82e25831252b1d8e0e8` | Project-authored; low risk. |
| `public/cases/fading-signal/outcomes/partial_rescue.svg` | Original project-generated counterfactual chart | `445ca0c14c19129eac13163393b646b9fe5a597b3a711317540467cf02585f0c` | Project-authored; low risk. |
| `public/cases/fading-signal/outcomes/signal_not_reproduced.svg` | Original project-generated counterfactual chart | `0ec3ab57222b6e1e922d31294e05fa92fed2c34af1fe3cbb23cc169d18ad8374` | Project-authored; low risk. |

## Code-drawn glyphs and fingerprint graphic

| Path | Creator / method | Status | Rights / risk |
| --- | --- | --- | --- |
| `src/components/game/ExperimentGlyph.tsx` | Codex-assisted local implementation from project requirements; hand-authored React SVG primitives | Original project source; not a copied icon set | Covered by the repository source license; low risk. |
| `src/components/game/ReasoningFingerprintGraphic.tsx` | Codex-assisted local implementation from project metrics; hand-authored React SVG geometry | Original project source; not a copied chart template | Covered by the repository source license; low risk. |

## Release rule

Do not add a new image, font, audio file, icon library, or copied figure to `public/` without adding its path, creator/source, transformation history, rights basis, and residual-risk note here. Do not label Assets as Pass in `verification/EVIDENCE_MATRIX.md` unless this inventory and the bundled license files remain in the release package.
