import type { ObservationResponse } from "@/lib/ai/schemas";
import type { PublicCaseDefinition } from "@/types/game";

export function BriefingPanel({
  caseDefinition,
  observation,
  isAnalyzing,
  error,
  onAnalyze,
  onContinue,
}: {
  caseDefinition: PublicCaseDefinition;
  observation: ObservationResponse | null;
  isAnalyzing: boolean;
  error?: string;
  onAnalyze: () => Promise<void>;
  onContinue: () => void;
}) {
  return (
    <section className="briefing-panel" aria-labelledby="case-title">
      <header className="case-intro">
        <div>
          <p className="stage-label">INTRODUCTORY CASE · 10–12 MINUTES</p>
          <h1 id="case-title">{caseDefinition.title}</h1>
        </div>
        <div className="case-index-mark" aria-hidden="true">01</div>
      </header>

      <div className="briefing-grid">
        <div className="briefing-observation">
          <figure>
            {/* vinext serves public case assets directly; avoiding its optional image
                optimizer keeps the local and hosted runtime independent of ASSETS. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={caseDefinition.observationAsset.src}
              alt={caseDefinition.observationAsset.alt}
              width={1200}
              height={760}
            />
            <figcaption>
              <span>SYNTHETIC OBSERVATION</span>
              <span>VEHICLE / V-17 · MATCHED CONDITIONS</span>
            </figcaption>
          </figure>
        </div>

        <div className="briefing-copy">
          <div className="case-question">
            <span className="micro-label">THE OBSERVATION</span>
            <p>{caseDefinition.brief}</p>
            <h2>{caseDefinition.question}</h2>
          </div>
          <div className="knowledge-grid">
            <article>
              <span>✓</span>
              <div><h3>WHAT WE KNOW</h3><ul>
                <li>Fluorescence slope fell by 62%.</li>
                <li>Plate and temperature are matched.</li>
                <li>Enzyme batch and substrate are matched.</li>
              </ul></div>
            </article>
            <article>
              <span>?</span>
              <div><h3>WHAT WE DO NOT KNOW</h3><ul>
                <li>Whether less product formed.</li>
                <li>Whether soluble enzyme was lost.</li>
                <li>Whether V-17 changed only the readout.</li>
              </ul></div>
            </article>
          </div>

          {!observation ? (
            <div className="analyze-action">
              <div>
                <span className="ai-boundary-mark" aria-hidden="true">✦</span>
                <p><strong>GPT-5.6 OBSERVATION LENS</strong><small>Describes visible evidence. Never chooses the mechanism.</small></p>
              </div>
              {error ? <p className="form-error" role="alert">{error}</p> : null}
              <button
                className="button-primary game-primary-button"
                type="button"
                disabled={isAnalyzing}
                onClick={onAnalyze}
              >
                {isAnalyzing ? "ANALYZING VISIBLE EVIDENCE…" : "ANALYZE THE OBSERVATION"}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          ) : (
            <article className="observation-interpretation" aria-live="polite">
              <header>
                <div><span aria-hidden="true">✦</span><strong>OBSERVATION INTERPRETATION</strong></div>
                <span className={observation.source === "gpt-5.6" ? "source-live" : "source-fallback"}>
                  {observation.source === "gpt-5.6" ? "GPT-5.6 VISION" : "OFFLINE FALLBACK"}
                </span>
              </header>
              <p>{observation.observation}</p>
              <dl>
                <div><dt>MEASURED SIGNAL</dt><dd>{observation.measuredSignal}</dd></div>
                <div><dt>VISIBLE CONTROLS</dt><dd>{observation.visibleControls.join(" · ")}</dd></div>
                <div><dt>MISSING CONTROLS</dt><dd>{observation.missingControls.join(" · ")}</dd></div>
                <div><dt>AMBIGUITY</dt><dd>{observation.ambiguity}</dd></div>
              </dl>
              <div className="interpretation-footer">
                <small>DESCRIPTION CONFIDENCE {Math.round(observation.confidence * 100)}%</small>
                <button className="button-primary game-primary-button" type="button" onClick={onContinue}>
                  MEET THE HYPOTHESES <span aria-hidden="true">→</span>
                </button>
              </div>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
