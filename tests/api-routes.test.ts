import { afterEach, describe, expect, it } from "vitest";
import { POST as observeCase } from "../app/api/ai/observe/route";
import { POST as runExperiment } from "../app/api/experiment/run/route";
import { POST as submitVerdict } from "../app/api/verdict/submit/route";

const splitPrediction = {
  mode: "split" as const,
  splitGroups: [
    ["competitive_inhibition", "enzyme_loss"],
    ["optical_interference"],
  ] as const,
};

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const idealTrail = [
  {
    experimentId: "post_reaction_spike_in",
    prediction: splitPrediction,
    playerBeliefsBefore: {
      competitive_inhibition: 34,
      enzyme_loss: 33,
      optical_interference: 33,
    },
    playerBeliefsAfter: {
      competitive_inhibition: 5,
      enzyme_loss: 5,
      optical_interference: 90,
    },
    createdAt: "2026-07-15T00:00:00.000Z",
  },
  {
    experimentId: "orthogonal_product_quantification",
    prediction: splitPrediction,
    playerBeliefsBefore: {
      competitive_inhibition: 5,
      enzyme_loss: 5,
      optical_interference: 90,
    },
    playerBeliefsAfter: {
      competitive_inhibition: 5,
      enzyme_loss: 5,
      optical_interference: 90,
    },
    createdAt: "2026-07-15T00:01:00.000Z",
  },
] as const;

const verdict = {
  hypothesisId: "optical_interference",
  confidence: 99,
  evidenceRunIndexes: [0, 1],
  falsifiedHypothesisId: "competitive_inhibition",
  falsifyingEvidenceRunIndex: 0,
} as const;

afterEach(() => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_SAFETY_PEPPER;
  delete process.env.OPENAI_LIVE_REQUESTS_ENABLED;
});

describe("server-authored API boundaries", () => {
  it("keeps observation fallback playable and explicitly non-cacheable", async () => {
    const response = await observeCase(
      jsonRequest("http://localhost/api/ai/observe", {
        caseId: "fading-signal",
        sessionId: "api-test-observation-session",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(payload.source).toBe("fallback");
  });

  it("accepts a correct no-separation prediction for a low-information repeat", async () => {
    const response = await runExperiment(
      jsonRequest("http://localhost/api/experiment/run", {
        caseId: "fading-signal",
        experimentId: "repeat_fluorescent_assay",
        runHistory: [],
        prediction: {
          mode: "no_separation",
          hypothesisIds: [
            "competitive_inhibition",
            "enzyme_loss",
            "optical_interference",
          ],
        },
      }),
    );
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.predictionUseful).toBe(true);
    expect(payload.predictionMessage).toContain("all three mechanisms");
  });

  it("scores the server-replayed player trail and returns an authored fallback review", async () => {
    delete process.env.OPENAI_API_KEY;
    const response = await submitVerdict(
      jsonRequest("http://localhost/api/verdict/submit", {
        caseId: "fading-signal",
        sessionId: "api-test-ideal-session",
        runHistory: idealTrail,
        verdict,
      }),
    );
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.score.total).toBe(100);
    expect(payload.fingerprint.predictionAccuracy).toBe(1);
    expect(payload.fingerprint.redundancyRate).toBe(0);
    expect(payload.reasoningReview.source).toBe("fallback");
    expect(payload.reasoningReview.evidencePlayerUnderused).toBeNull();
    expect(payload.reasoningReview.oneMoreControl).toBe(
      "Measure soluble enzyme abundance",
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects client-authored outcome fields instead of trusting them", async () => {
    const tamperedTrail = idealTrail.map((entry, index) =>
      index === 0 ? { ...entry, outcomeId: "no_immediate_change" } : entry,
    );
    const response = await submitVerdict(
      jsonRequest("http://localhost/api/verdict/submit", {
        caseId: "fading-signal",
        sessionId: "api-test-tamper-session",
        runHistory: tamperedTrail,
        verdict,
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects a discontinuous player belief trail", async () => {
    const discontinuousTrail = [
      idealTrail[0],
      {
        ...idealTrail[1],
        playerBeliefsBefore: {
          competitive_inhibition: 34,
          enzyme_loss: 33,
          optical_interference: 33,
        },
      },
    ];
    const response = await submitVerdict(
      jsonRequest("http://localhost/api/verdict/submit", {
        caseId: "fading-signal",
        sessionId: "api-test-continuity-session",
        runHistory: discontinuousTrail,
        verdict,
      }),
    );
    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error).toContain("not continuous");
  });

  it("keeps deterministic scoring unchanged after the model request guard is exhausted", async () => {
    delete process.env.OPENAI_API_KEY;
    const sessionId = "api-test-rate-guard-session";
    const responses = [];
    for (let index = 0; index < 3; index += 1) {
      responses.push(
        await submitVerdict(
          jsonRequest("http://localhost/api/verdict/submit", {
            caseId: "fading-signal",
            sessionId,
            runHistory: idealTrail,
            verdict,
          }),
        ),
      );
    }
    const payloads = await Promise.all(
      responses.map((response) => response.json()),
    );

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(payloads.map((payload) => payload.score.total)).toEqual([
      100, 100, 100,
    ]);
    expect(payloads.map((payload) => payload.trueHypothesisId)).toEqual([
      "optical_interference",
      "optical_interference",
      "optical_interference",
    ]);
    expect(payloads.every((payload) => payload.reasoningReview.source === "fallback")).toBe(
      true,
    );
  });
});
