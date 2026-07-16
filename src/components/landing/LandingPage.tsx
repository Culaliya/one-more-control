import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "OBSERVE",
    copy: "Read the signal without pretending it already explains the mechanism.",
    mark: "◎",
  },
  {
    number: "02",
    title: "PREDICT",
    copy: "Commit to what each hypothesis should produce before spending the budget.",
    mark: "⌁",
  },
  {
    number: "03",
    title: "ELIMINATE",
    copy: "Use the result to kill explanations that can no longer survive.",
    mark: "×",
  },
] as const;

const fingerprintMetrics = [
  { label: "FALSIFICATION FIRST", value: "84", unit: "%", tone: "amber" },
  { label: "REDUNDANCY RATE", value: "12", unit: "%", tone: "cyan" },
  { label: "EVIDENCE EFFICIENCY", value: "2.8", unit: "b/¢", tone: "bone" },
  { label: "CALIBRATION GAP", value: "04", unit: "pts", tone: "red" },
] as const;

export function LandingPage() {
  return (
    <main className="landing-shell min-h-screen overflow-hidden">
      <header className="site-header" aria-label="Primary navigation">
        <Link href="/" className="brand-lockup" aria-label="ONE MORE CONTROL home">
          <span className="brand-pulse" aria-hidden="true" />
          <span>ONE MORE CONTROL</span>
        </Link>
        <nav className="header-nav" aria-label="Landing sections">
          <a href="#cases">CASES</a>
          <a href="#method">METHOD</a>
          <a href="#about">ABOUT</a>
        </nav>
      </header>

      <section className="hero-section" id="cases" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow-row">
            <span className="eyebrow-index">OMC / 01</span>
            <p className="eyebrow">A SCIENTIFIC REASONING GAME</p>
          </div>
          <h1 id="hero-title">
            <span>THREE PLAUSIBLE</span>
            <span>ANSWERS.</span>
            <span className="signal-line">ONE EXPERIMENT</span>
            <span className="signal-line">THAT MATTERS.</span>
          </h1>
          <p className="hero-body">
            Every test costs time, samples, and certainty. You do not win by
            collecting more data. You win by choosing the control that makes
            the wrong mechanisms impossible.
          </p>
          <div className="hero-actions">
            <Link href="/cases/fading-signal" className="button-primary">
              ENTER CASE 01 <span aria-hidden="true">↗</span>
            </Link>
            <a href="#method" className="button-secondary">
              SEE HOW IT WORKS <span aria-hidden="true">↓</span>
            </a>
          </div>
          <p className="hero-microcopy">
            <span className="status-dot" aria-hidden="true" />
            1 playable case · 10–12 minutes · No sign-in
          </p>
        </div>

        <div className="specimen-stage" aria-label="Interactive case preview">
          {/* Decorative chapter art only. It never represents authored evidence. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="specimen-key-art"
            src="/cases/fading-signal/art/case-cover-art.webp"
            alt=""
            width={1672}
            height={941}
            aria-hidden="true"
          />
          <div className="stage-grid" aria-hidden="true" />
          <div className="specimen-coordinate coordinate-top">Y / SIGNAL</div>
          <div className="specimen-coordinate coordinate-side">X / TIME</div>
          <article className="observation-specimen">
            <header>
              <div>
                <p className="micro-label">OBSERVATION 01</p>
                <h2>Fluorescence fell by 62%.</h2>
              </div>
              <span className="live-badge">LIVE SIGNAL</span>
            </header>
            <div className="mini-chart" aria-label="Vehicle signal rises while V-17 signal remains low">
              <div className="chart-axis axis-y" />
              <div className="chart-axis axis-x" />
              <div className="chart-line vehicle-line" />
              <div className="chart-line compound-line" />
              <span className="chart-label label-vehicle">VEHICLE</span>
              <span className="chart-label label-compound">V-17</span>
              <span className="chart-drop">−62%</span>
            </div>
          </article>

          <div className="hypothesis-preview-stack">
            <article className="preview-hypothesis h-one">
              <div className="hypothesis-id"><span>H1</span><i /></div>
              <div><strong>Direct inhibition</strong><small>CATALYSIS CHANGED</small></div>
              <span className="alive-state"><i /> ALIVE</span>
            </article>
            <article className="preview-hypothesis h-two">
              <div className="hypothesis-id"><span>H2</span><i /></div>
              <div><strong>Enzyme loss</strong><small>AMOUNT CHANGED</small></div>
              <span className="alive-state"><i /> ALIVE</span>
            </article>
            <article className="preview-hypothesis h-three">
              <div className="hypothesis-id"><span>H3</span><i /></div>
              <div><strong>Optical interference</strong><small>READOUT CHANGED</small></div>
              <span className="alive-state"><i /> ALIVE</span>
            </article>
          </div>

          <div className="experiment-preview">
            <div className="budget-preview">
              <span>EXPERIMENTAL BUDGET</span>
              <strong>100 <small>UNITS LEFT</small></strong>
            </div>
            <Link
              href="/cases/fading-signal"
              className="preview-experiment-card"
              aria-label="Enter Case 01 from the timing-control preview"
            >
              <span className="micro-label">TIMING CONTROL · COST 15</span>
              <strong>Add compound after the reaction</strong>
              <span className="preview-run">PREVIEW SPLIT <b>↗</b></span>
            </Link>
            <div className="prediction-lines" aria-hidden="true">
              <i className="prediction-line line-one" />
              <i className="prediction-line line-two" />
              <i className="prediction-line line-three" />
            </div>
          </div>
          <p className="specimen-hint">HOVER THE EXPERIMENT TO PREVIEW ITS PREDICTION SPLIT</p>
        </div>
      </section>

      <section className="method-section" id="method" aria-labelledby="method-title">
        <div className="section-kicker"><span>02</span> THE METHOD</div>
        <div className="method-intro">
          <h2 id="method-title">MORE DATA CAN STILL<br />LEAVE YOU <em>WRONG.</em></h2>
          <p>
            The game rewards experiments that separate hypotheses—not
            experiments that merely reproduce the same observation.
          </p>
        </div>
        <div className="method-steps">
          {steps.map((step) => (
            <article key={step.title} className="method-card">
              <div className="method-card-top">
                <span>{step.number}</span>
                <b aria-hidden="true">{step.mark}</b>
              </div>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
              <div className={`method-signal method-${step.number}`} aria-hidden="true">
                <i /><i /><i />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="fingerprint-section" id="about" aria-labelledby="fingerprint-title">
        <div className="fingerprint-copy">
          <div className="section-kicker"><span>03</span> AFTER THE VERDICT</div>
          <h2 id="fingerprint-title">YOUR REASONING<br />LEAVES A <em>FINGERPRINT.</em></h2>
          <p>
            At the end of each case, see where you chased confirmation,
            repeated low-information tests, calibrated uncertainty, or found
            the decisive control.
          </p>
          <div className="fingerprint-legend" aria-label="Fingerprint dimensions">
            <span><i className="legend-amber" /> FALSIFICATION</span>
            <span><i className="legend-cyan" /> EFFICIENCY</span>
            <span><i className="legend-red" /> CALIBRATION</span>
          </div>
        </div>
        <article className="fingerprint-report" aria-label="Sample reasoning fingerprint">
          <header>
            <div>
              <span className="micro-label">REASONING FINGERPRINT / SAMPLE</span>
              <strong>THE FALSIFIER</strong>
            </div>
            <span className="report-score">91<small>/100</small></span>
          </header>
          <div className="fingerprint-radar" aria-hidden="true">
            <div className="radar-ring ring-a" />
            <div className="radar-ring ring-b" />
            <div className="radar-cross cross-a" />
            <div className="radar-cross cross-b" />
            <div className="radar-shape" />
            <span className="radar-node node-a" />
            <span className="radar-node node-b" />
            <span className="radar-node node-c" />
            <span className="radar-node node-d" />
          </div>
          <div className="metric-grid">
            {fingerprintMetrics.map((metric) => (
              <div key={metric.label} className={`sample-metric metric-${metric.tone}`}>
                <span>{metric.label}</span>
                <strong>{metric.value}<small>{metric.unit}</small></strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="final-cta" aria-labelledby="final-title">
        <div className="cta-orbit" aria-hidden="true"><i /><i /><i /></div>
        <p className="micro-label">THE NEXT MOVE IS YOURS</p>
        <h2 id="final-title">DON&apos;T ASK AI<br />FOR THE ANSWER.</h2>
        <p>Ask what evidence would prove it wrong.</p>
        <Link href="/cases/fading-signal" className="button-primary button-large">
          OPEN THE FIRST CASE <span aria-hidden="true">↗</span>
        </Link>
      </section>

      <footer className="site-footer">
        <Link href="/" className="brand-lockup"><span className="brand-pulse" aria-hidden="true" /> ONE MORE CONTROL</Link>
        <p>Synthetic educational scenarios. Not a wet-lab protocol or medical tool. Built with GPT-5.6 and Codex.</p>
        <span>BUILD / 01 · 2026</span>
      </footer>
    </main>
  );
}
