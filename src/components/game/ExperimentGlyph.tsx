import type { ExperimentId } from "@/types/game";

export type FadingSignalExperimentGlyphId =
  | "repeat_fluorescent_assay"
  | "same_channel_dose_response"
  | "soluble_enzyme_abundance"
  | "post_reaction_spike_in"
  | "orthogonal_product_quantification"
  | "substrate_titration_same_readout";

export interface ExperimentGlyphProps {
  experimentId: ExperimentId;
  size?: number;
  className?: string;
  decorative?: boolean;
}

type GlyphDefinition = {
  className: string;
  label: string;
  drawing: React.ReactNode;
};

const sharedStroke = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.6,
} as const;

function definitionFor(experimentId: ExperimentId): GlyphDefinition {
  switch (experimentId) {
    case "repeat_fluorescent_assay":
      return {
        className: "repeat",
        label: "Matched repeat assay microdiagram",
        drawing: (
          <>
            <path d="M16 14a17 17 0 0 1 27-1" {...sharedStroke} opacity=".72" />
            <path d="m44 9-.2 5.5-5.3-1.2" {...sharedStroke} />
            <rect x="9" y="21" width="19" height="15" rx="2" {...sharedStroke} />
            <rect x="36" y="21" width="19" height="15" rx="2" {...sharedStroke} />
            <circle cx="14" cy="26" r="1.4" {...sharedStroke} />
            <circle cx="20" cy="26" r="1.4" {...sharedStroke} />
            <circle cx="14" cy="32" r="1.4" {...sharedStroke} />
            <circle cx="20" cy="32" r="1.4" {...sharedStroke} />
            <circle cx="41" cy="26" r="1.4" {...sharedStroke} />
            <circle cx="47" cy="26" r="1.4" {...sharedStroke} />
            <circle cx="41" cy="32" r="1.4" {...sharedStroke} />
            <circle cx="47" cy="32" r="1.4" {...sharedStroke} />
            <path d="M29.5 28.5h5m-2.5-2.5 2.5 2.5L32 31" {...sharedStroke} opacity=".55" />
          </>
        ),
      };
    case "same_channel_dose_response":
      return {
        className: "dose-response",
        label: "Same-channel dose response microdiagram",
        drawing: (
          <>
            <path d="M12 34V27m9 7V22m9 12V17" {...sharedStroke} />
            <path d="M9 34h6m3 0h6m3 0h6" {...sharedStroke} opacity=".65" />
            <circle cx="12" cy="24" r="2" fill="var(--cyan, #5bd8d0)" opacity=".48" />
            <circle cx="21" cy="18" r="2.6" fill="var(--cyan, #5bd8d0)" opacity=".68" />
            <circle cx="30" cy="12" r="3.2" fill="var(--cyan, #5bd8d0)" opacity=".88" />
            <path d="M34 25h7" {...sharedStroke} />
            <path d="m39 22 3 3-3 3" {...sharedStroke} />
            <rect x="43" y="14" width="12" height="22" rx="3" {...sharedStroke} />
            <circle cx="49" cy="21" r="3" {...sharedStroke} />
            <text
              fill="var(--amber, #ffb53d)"
              fontFamily="monospace"
              fontSize="9"
              fontWeight="700"
              textAnchor="middle"
              x="49"
              y="32"
            >
              ?
            </text>
          </>
        ),
      };
    case "soluble_enzyme_abundance":
      return {
        className: "abundance",
        label: "Soluble enzyme abundance microdiagram",
        drawing: (
          <>
            <path d="M10 12h11l-1 17a4 4 0 0 1-4 3h-1a4 4 0 0 1-4-3Z" {...sharedStroke} />
            <path d="M11 24h9" stroke="var(--cyan, #5bd8d0)" strokeLinecap="round" strokeWidth="2.5" opacity=".72" />
            <path d="M23 22h7m-3-3 3 3-3 3" {...sharedStroke} />
            <circle cx="36" cy="16" r="4.5" {...sharedStroke} />
            <circle cx="36" cy="16" r="1" fill="currentColor" opacity=".62" />
            <path d="M36 15v-2.5m.8 4 2.2 1.3m-3.8-.8-2.2 1.3" {...sharedStroke} opacity=".48" />
            <path d="M36 21v5m0 0h7" {...sharedStroke} />
            <rect x="43" y="17" width="12" height="18" rx="2" {...sharedStroke} />
            <path d="M46 24h6" {...sharedStroke} opacity=".48" />
            <text
              fill="var(--amber, #ffb53d)"
              fontFamily="monospace"
              fontSize="8"
              fontWeight="700"
              textAnchor="middle"
              x="49"
              y="33"
            >
              ?
            </text>
          </>
        ),
      };
    case "post_reaction_spike_in":
      return {
        className: "spike-in",
        label: "Post-reaction spike-in timing microdiagram",
        drawing: (
          <>
            <path d="M9 33h46m-4-3 4 3-4 3" {...sharedStroke} opacity=".62" />
            <circle cx="14" cy="33" r="2" fill="var(--cyan, #5bd8d0)" />
            <path d="M16 33h19" {...sharedStroke} />
            <path d="M35 17v20" {...sharedStroke} strokeDasharray="2.5 3" opacity=".58" />
            <path d="M35 8.5s-3 4.2-3 6.2a3 3 0 1 0 6 0c0-2-3-6.2-3-6.2Z" fill="var(--amber, #ffb53d)" />
            <path d="M37 33h11" {...sharedStroke} strokeDasharray="3 3" />
            <text
              fill="var(--amber, #ffb53d)"
              fontFamily="monospace"
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
              x="50.5"
              y="23"
            >
              ?
            </text>
          </>
        ),
      };
    case "orthogonal_product_quantification":
      return {
        className: "orthogonal",
        label: "Orthogonal product quantification microdiagram",
        drawing: (
          <>
            <circle cx="16" cy="25" r="5" {...sharedStroke} />
            <circle cx="16" cy="25" r="1.8" fill="var(--amber, #ffb53d)" />
            <path d="M21 25h9m0 0 8-10m-8 10 8 10" {...sharedStroke} />
            <rect x="39" y="9" width="15" height="12" rx="2" {...sharedStroke} />
            <circle cx="46.5" cy="15" r="3" {...sharedStroke} stroke="var(--cyan, #5bd8d0)" />
            <rect x="39" y="29" width="15" height="12" rx="2" {...sharedStroke} />
            <path d="M43 35h7m-3.5-3.5v7" {...sharedStroke} stroke="var(--amber, #ffb53d)" />
            <path d="m30 25 3-2v4Z" fill="currentColor" opacity=".72" />
          </>
        ),
      };
    case "substrate_titration_same_readout":
      return {
        className: "substrate-rescue",
        label: "Substrate titration with one readout microdiagram",
        drawing: (
          <>
            <circle cx="11" cy="28" r="2" fill="var(--cyan, #5bd8d0)" opacity=".48" />
            <circle cx="19" cy="25" r="3" fill="var(--cyan, #5bd8d0)" opacity=".68" />
            <circle cx="29" cy="21" r="4" fill="var(--cyan, #5bd8d0)" opacity=".88" />
            <path d="M10 36h21M34 25h6m-3-3 3 3-3 3" {...sharedStroke} opacity=".72" />
            <path d="M44 17c7 2 10 8 10 8s-3 6-10 8c-7-2-10-8-10-8s3-6 10-8Z" {...sharedStroke} />
            <circle cx="44" cy="25" r="3" {...sharedStroke} />
            <text
              fill="var(--amber, #ffb53d)"
              fontFamily="monospace"
              fontSize="9"
              fontWeight="700"
              textAnchor="middle"
              x="55"
              y="15"
            >
              ?
            </text>
          </>
        ),
      };
    default:
      return {
        className: "unknown",
        label: "Experiment control microdiagram",
        drawing: (
          <>
            <circle cx="32" cy="25" r="13" {...sharedStroke} />
            <path d="M20 25h24M32 13v24" {...sharedStroke} opacity=".55" />
            <circle cx="32" cy="25" r="3" fill="var(--amber, #ffb53d)" />
          </>
        ),
      };
  }
}

export function ExperimentGlyph({
  experimentId,
  size = 64,
  className,
  decorative = false,
}: ExperimentGlyphProps) {
  const glyph = definitionFor(experimentId);
  const classes = [
    "experiment-glyph",
    `experiment-glyph--${glyph.className}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : glyph.label}
      className={classes}
      focusable="false"
      height={Math.round(size * 0.75)}
      role={decorative ? undefined : "img"}
      viewBox="0 0 64 48"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {decorative ? null : <title>{glyph.label}</title>}
      <rect
        height="44"
        rx="3"
        width="60"
        x="2"
        y="2"
        {...sharedStroke}
        opacity=".18"
      />
      {glyph.drawing}
    </svg>
  );
}
