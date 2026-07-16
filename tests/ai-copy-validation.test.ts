import { describe, expect, it } from "vitest";
import {
  isCompletePlayerFacingSentence,
  isSafePlayerFacingLabel,
} from "../src/server/ai/player-facing-copy";

describe("AI player-facing copy guard", () => {
  it("accepts concise English sentences and labels", () => {
    expect(
      isCompletePlayerFacingSentence(
        "The orthogonal result independently supports the conclusion.",
      ),
    ).toBe(true);
    expect(isSafePlayerFacingLabel("Matched temperature")).toBe(true);
  });

  it("rejects a mixed-script sentence", () => {
    expect(
      isCompletePlayerFacingSentence(
        "The orthogonal result independently支持 the conclusion.",
      ),
    ).toBe(false);
  });

  it("rejects an incomplete boundary-truncated sentence", () => {
    expect(
      isCompletePlayerFacingSentence(
        "The immediate signal loss prompted a strong, justified",
      ),
    ).toBe(false);
  });

  it("rejects narrative copy over the 160-character UI limit", () => {
    expect(isCompletePlayerFacingSentence(`${"Evidence ".repeat(21)}.`)).toBe(
      false,
    );
  });
});
