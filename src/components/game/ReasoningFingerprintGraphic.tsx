import { useId } from "react";
import type { ReasoningFingerprint } from "@/types/game";

export interface ReasoningFingerprintGraphicProps {
  fingerprint: ReasoningFingerprint;
  score: number;
  className?: string;
  /**
   * Evidence efficiency has no natural upper bound. This explicit display
   * ceiling keeps the radar geometry comparable without changing the exact
   * bits-per-budget-unit value shown beside the axis.
   */
  evidenceEfficiencyScaleBitsPerUnit?: number;
}

interface Point {
  x: number;
  y: number;
}

const CENTER: Point = { x: 210, y: 190 };
const RADIUS = 110;
const DIAGONAL = Math.SQRT1_2;
const AXIS_DIRECTIONS: readonly Point[] = [
  { x: -DIAGONAL, y: -DIAGONAL },
  { x: DIAGONAL, y: -DIAGONAL },
  { x: DIAGONAL, y: DIAGONAL },
  { x: -DIAGONAL, y: DIAGONAL },
];

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, finiteOrZero(value)));
}

function pointOnAxis(direction: Point, value: number): Point {
  const distance = RADIUS * clampUnit(value);
  return {
    x: CENTER.x + direction.x * distance,
    y: CENTER.y + direction.y * distance,
  };
}

function ringPoints(value: number): string {
  return AXIS_DIRECTIONS.map((direction) => {
    const point = pointOnAxis(direction, value);
    return `${point.x},${point.y}`;
  }).join(" ");
}

function polygonPoints(values: readonly number[]): string {
  return AXIS_DIRECTIONS.map((direction, index) => {
    const point = pointOnAxis(direction, values[index] ?? 0);
    return `${point.x},${point.y}`;
  }).join(" ");
}

function percent(value: number): string {
  return `${Math.round(clampUnit(value) * 100)}%`;
}

export function ReasoningFingerprintGraphic({
  fingerprint,
  score,
  className,
  evidenceEfficiencyScaleBitsPerUnit = 0.05,
}: ReasoningFingerprintGraphicProps) {
  const rawId = useId().replaceAll(":", "");
  const titleId = `reasoning-fingerprint-title-${rawId}`;
  const descriptionId = `reasoning-fingerprint-description-${rawId}`;
  const gradientId = `reasoning-fingerprint-gradient-${rawId}`;
  const glowId = `reasoning-fingerprint-glow-${rawId}`;

  const falsification = clampUnit(fingerprint.falsificationIndex);
  const redundancy = clampUnit(fingerprint.redundancyRate);
  const nonRedundancy = 1 - redundancy;
  const safeEfficiency = Math.max(0, finiteOrZero(fingerprint.evidenceEfficiency));
  const efficiencyScale =
    Number.isFinite(evidenceEfficiencyScaleBitsPerUnit) &&
    evidenceEfficiencyScaleBitsPerUnit > 0
      ? evidenceEfficiencyScaleBitsPerUnit
      : 0.05;
  const efficiency = clampUnit(safeEfficiency / efficiencyScale);
  const calibrationGap = Math.min(
    100,
    Math.max(0, finiteOrZero(fingerprint.calibrationGapPercentagePoints)),
  );
  const calibrationCloseness = 1 - calibrationGap / 100;
  const values = [
    falsification,
    nonRedundancy,
    efficiency,
    calibrationCloseness,
  ] as const;
  const contourValues = values.map((value) => value * 0.68);
  const normalizedScore = Math.round(clampUnit(finiteOrZero(score) / 100) * 100);

  const axisEndpoints = AXIS_DIRECTIONS.map((direction) =>
    pointOnAxis(direction, 1),
  );
  const valuePoints = AXIS_DIRECTIONS.map((direction, index) =>
    pointOnAxis(direction, values[index] ?? 0),
  );

  return (
    <svg
      className={["reasoning-fingerprint-graphic", className]
        .filter(Boolean)
        .join(" ")}
      viewBox="0 0 420 380"
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
      focusable="false"
      style={{ display: "block", height: "auto", width: "100%" }}
    >
      <title id={titleId}>Reasoning fingerprint, final score {normalizedScore} out of 100</title>
      <desc id={descriptionId}>
        Falsification {percent(falsification)}. Non-redundancy {percent(nonRedundancy)},
        calculated from a raw redundancy rate of {percent(redundancy)}. Evidence efficiency
        {` ${safeEfficiency.toFixed(3)} bits per budget unit`}, plotted against a disclosed
        {` ${efficiencyScale.toFixed(3)} bits-per-unit display ceiling`}. Calibration gap
        {` ${calibrationGap.toFixed(1)} percentage points`}.
      </desc>

      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--amber, #ffb53d)" stopOpacity="0.82" />
          <stop offset="0.52" stopColor="var(--cyan, #5bd8d0)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--acid-red, #ff615a)" stopOpacity="0.7" />
        </linearGradient>
        <filter id={glowId} x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g aria-hidden="true">
        {[0.25, 0.5, 0.75, 1].map((ring) => (
          <polygon
            key={ring}
            points={ringPoints(ring)}
            fill="none"
            stroke="var(--bone, #f0eadf)"
            strokeOpacity={ring === 1 ? 0.25 : 0.12}
            strokeWidth={ring === 1 ? 1.25 : 1}
            strokeDasharray={ring === 1 ? undefined : "3 5"}
          />
        ))}
        {axisEndpoints.map((point) => (
          <line
            key={`${point.x}-${point.y}`}
            x1={CENTER.x}
            y1={CENTER.y}
            x2={point.x}
            y2={point.y}
            stroke="var(--bone, #f0eadf)"
            strokeOpacity="0.17"
            strokeWidth="1"
          />
        ))}

        <polygon
          points={polygonPoints(values)}
          fill={`url(#${gradientId})`}
          fillOpacity="0.24"
          stroke={`url(#${gradientId})`}
          strokeWidth="2.5"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
        />
        <polygon
          points={polygonPoints(contourValues)}
          fill="none"
          stroke="var(--cyan, #5bd8d0)"
          strokeOpacity="0.4"
          strokeWidth="1"
          strokeDasharray="2 5"
        />

        {valuePoints.map((point, index) => (
          <g key={`${point.x}-${point.y}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill="var(--graphite-950, #080a0a)"
              stroke={
                index === 0
                  ? "var(--amber, #ffb53d)"
                  : index === 1
                    ? "var(--cyan, #5bd8d0)"
                    : index === 2
                      ? "var(--acid-red, #ff615a)"
                      : "var(--bone, #f0eadf)"
              }
              strokeWidth="2.5"
            />
            <circle
              cx={point.x}
              cy={point.y}
              r="1.75"
              fill="var(--bone, #f0eadf)"
            />
          </g>
        ))}

        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r="43"
          fill="var(--graphite-950, #080a0a)"
          fillOpacity="0.94"
          stroke="var(--amber, #ffb53d)"
          strokeOpacity="0.75"
          strokeWidth="1.5"
        />
        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r="49"
          fill="none"
          stroke="var(--amber, #ffb53d)"
          strokeOpacity="0.2"
          strokeWidth="1"
          strokeDasharray="2 5"
        />
      </g>

      <text
        x={CENTER.x}
        y={CENTER.y - 5}
        fill="var(--bone, #f0eadf)"
        fontSize="31"
        fontWeight="800"
        letterSpacing="-1"
        textAnchor="middle"
      >
        {normalizedScore}
      </text>
      <text
        x={CENTER.x}
        y={CENTER.y + 14}
        fill="var(--bone-muted, #aaa79f)"
        fontSize="8"
        fontWeight="700"
        letterSpacing="1.4"
        textAnchor="middle"
      >
        FINAL / 100
      </text>

      <g fill="var(--bone, #f0eadf)" fontSize="10" fontWeight="750" letterSpacing="1.05">
        <text x="20" y="25">FALSIFICATION</text>
        <text x="400" y="25" textAnchor="end">NON-REDUNDANCY</text>
        <text x="400" y="345" textAnchor="end">EVIDENCE EFFICIENCY</text>
        <text x="20" y="345">CALIBRATION</text>
      </g>
      <g fill="var(--bone-muted, #aaa79f)" fontSize="9.5" fontWeight="600">
        <text x="20" y="42">{percent(falsification)}</text>
        <text x="400" y="42" textAnchor="end">
          {percent(nonRedundancy)} · RAW RED. {percent(redundancy)}
        </text>
        <text x="400" y="362" textAnchor="end">
          {safeEfficiency.toFixed(3)} b/u · SCALE {efficiencyScale.toFixed(3)}
        </text>
        <text x="20" y="362">GAP {calibrationGap.toFixed(1)} pts</text>
      </g>
    </svg>
  );
}
