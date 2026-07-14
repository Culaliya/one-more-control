import type { Metadata } from "next";
import { GameShell } from "@/components/game/GameShell";
import { fadingSignalCase } from "@/data/cases/public/fading-signal";

export const metadata: Metadata = {
  title: "Case 01 — The Fading Signal",
  description:
    "A playable scientific reasoning case about separating chemistry, enzyme abundance, and optical interference.",
};

export default function FadingSignalPage() {
  return <GameShell caseDefinition={fadingSignalCase} />;
}
