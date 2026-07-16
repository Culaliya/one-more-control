#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3000";
const chromePath = process.env.CHROME_PATH
  ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const debugPort = Number(process.env.QA_DEBUG_PORT ?? 9333);
const profileDir = `/tmp/one-more-control-qa-${process.pid}`;
const screenshotDir = resolve(
  process.env.QA_SCREENSHOT_DIR ?? "artifacts/screenshots",
);
const liveSmoke = process.env.QA_LIVE_SMOKE === "1";
const competitionRecord = process.env.QA_COMPETITION_RECORD === "1";
const idealRoute = liveSmoke || competitionRecord;
const replayLiveDir = process.env.QA_REPLAY_LIVE_DIR;
const replayLiveResponses = replayLiveDir
  ? {
      observation: JSON.parse(
        readFileSync(resolve(replayLiveDir, "observation.sanitized.json"), "utf8"),
      ).response,
      verdict: JSON.parse(
        readFileSync(resolve(replayLiveDir, "ideal-review.sanitized.json"), "utf8"),
      ).response,
    }
  : null;
const browserErrors = [];
const functionalTextSelectors = [
  ".source-live",
  ".source-fallback",
  ".observation-interpretation dt",
  ".observation-interpretation dd",
  ".hypothesis-status",
  ".belief-meter b",
  ".belief-total span",
  ".belief-total small",
  ".slider-limits",
  ".lab-progress",
  ".canvas-status",
  ".experiment-card-heading small",
  ".experiment-card-heading > b",
  ".experiment-meta",
  ".experiment-list article > p",
  ".experiment-list article > button",
  ".prediction-mode-picker legend",
  ".prediction-mode-picker button span",
  ".rationale-field > span",
  ".rationale-field small",
  ".result-facts dt",
  ".result-facts dd",
  ".information-callout > span",
  ".information-callout > p",
  ".bits-explainer",
  ".verdict-step-label strong",
  ".verdict-hypothesis > b",
  ".verdict-hypothesis > strong",
  ".verdict-hypothesis > i",
  ".evidence-picker label > span",
  ".evidence-picker label strong",
  ".evidence-picker label small",
  ".falsification-grid legend",
  ".falsification-grid label span",
  ".falsification-grid label strong",
  ".score-breakdown-card dt",
  ".score-breakdown-card dd small",
  ".confidence-comparison span",
  ".featured-path-card > header > strong",
  ".featured-path-steps small",
  ".featured-path-steps p",
  ".reasoning-fingerprint > header > p",
  ".fingerprint-metrics span",
  ".fingerprint-metrics p",
  ".reasoning-review-card header > strong",
  ".reasoning-review-card dt",
  ".reasoning-review-card dd",
  ".one-more-control-card > span",
  ".one-more-control-card p",
];
let minimumFunctionalFontSize = Number.POSITIVE_INFINITY;
let chrome;
let socket;
let nextCommandId = 1;
const pendingCommands = new Map();

const delay = (milliseconds) => new Promise((resolveDelay) => {
  setTimeout(resolveDelay, milliseconds);
});

async function pollForTarget() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome is still starting.
    }
    await delay(100);
  }
  throw new Error("Chrome DevTools target did not become available.");
}

async function connect(webSocketUrl) {
  socket = new WebSocket(webSocketUrl);
  await new Promise((resolveConnection, rejectConnection) => {
    const timeout = setTimeout(
      () => rejectConnection(new Error("Chrome DevTools connection timed out.")),
      10_000,
    );
    socket.addEventListener("open", () => {
      clearTimeout(timeout);
      resolveConnection();
    }, { once: true });
    socket.addEventListener("error", () => {
      clearTimeout(timeout);
      rejectConnection(new Error("Chrome DevTools connection failed."));
    }, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const pending = pendingCommands.get(message.id);
      if (!pending) return;
      pendingCommands.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result ?? {});
      return;
    }

    if (message.method === "Runtime.exceptionThrown") {
      browserErrors.push(message.params?.exceptionDetails?.text ?? "Runtime exception");
    }
    if (
      message.method === "Log.entryAdded"
      && ["error", "warning"].includes(message.params?.entry?.level)
    ) {
      browserErrors.push(
        `${message.params.entry.level}: ${message.params.entry.text}${message.params.entry.url ? ` (${message.params.entry.url})` : ""}`,
      );
    }
  });
}

function command(method, params = {}) {
  return new Promise((resolveCommand, rejectCommand) => {
    const id = nextCommandId++;
    const timeout = setTimeout(() => {
      pendingCommands.delete(id);
      rejectCommand(new Error(`Chrome command timed out: ${method}`));
    }, 20_000);
    pendingCommands.set(id, {
      resolve: (result) => {
        clearTimeout(timeout);
        resolveCommand(result);
      },
      reject: (error) => {
        clearTimeout(timeout);
        rejectCommand(error);
      },
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Page evaluation failed.");
  }
  return result.result?.value;
}

async function waitFor(expression, label, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

async function waitForText(text, timeout) {
  await waitFor(
    `document.body?.innerText.toUpperCase().includes(${JSON.stringify(text.toUpperCase())})`,
    JSON.stringify(text),
    timeout,
  );
}

async function assertFunctionalText(stage) {
  const result = await evaluate(`(() => {
    const selectors = ${JSON.stringify(functionalTextSelectors)};
    const failures = [];
    let minimum = Number.POSITIVE_INFINITY;
    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (
          rect.width <= 0 ||
          rect.height <= 0 ||
          style.visibility === "hidden" ||
          style.display === "none" ||
          !element.textContent?.trim()
        ) continue;
        const size = Number.parseFloat(style.fontSize);
        minimum = Math.min(minimum, size);
        if (!Number.isFinite(size) || size < 10.95) {
          failures.push({ selector, size, text: element.textContent.trim().slice(0, 80) });
        }
      }
    }
    return { minimum, failures };
  })()`);
  if (result.failures.length > 0) {
    throw new Error(
      `Functional text below 11px at ${stage}: ${JSON.stringify(result.failures)}`,
    );
  }
  if (Number.isFinite(result.minimum)) {
    minimumFunctionalFontSize = Math.min(
      minimumFunctionalFontSize,
      result.minimum,
    );
  }
}

async function assertNoHorizontalOverflow(stage) {
  const overflow = await evaluate(`(() => {
    const root = document.documentElement;
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      overflow: root.scrollWidth - root.clientWidth,
    };
  })()`);
  if (overflow.overflow > 1) {
    throw new Error(
      `Horizontal overflow at ${stage}: ${JSON.stringify(overflow)}`,
    );
  }
}

function replayFetchSource() {
  if (!replayLiveResponses) return "true";
  const serialized = JSON.stringify(replayLiveResponses);
  return `(() => {
    const replay = ${serialized};
    const originalFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = async (input, init) => {
      const rawUrl = typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
      const pathname = new URL(rawUrl, location.href).pathname;
      const payload = pathname === "/api/ai/observe"
        ? replay.observation
        : pathname === "/api/verdict/submit"
          ? replay.verdict
          : null;
      if (!payload) return originalFetch(input, init);
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    globalThis.__omcReplayLiveResponses = true;
    return true;
  })()`;
}

async function clickButton(text) {
  const clicked = await evaluate(`(() => {
    const button = [...document.querySelectorAll("button")]
      .find((item) => item.textContent?.includes(${JSON.stringify(text)}));
    if (!button || button.disabled) return false;
    button.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Enabled button not found: ${text}`);
}

async function clickLink(text) {
  const clicked = await evaluate(`(() => {
    const link = [...document.querySelectorAll("a")]
      .find((item) => item.textContent?.includes(${JSON.stringify(text)}));
    if (!link) return false;
    link.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Link not found: ${text}`);
}

async function clickCardButton(cardText) {
  const clicked = await evaluate(`(() => {
    const card = [...document.querySelectorAll(".experiment-list article")]
      .find((item) => item.textContent?.includes(${JSON.stringify(cardText)}));
    const button = card?.querySelector("button");
    if (!button || button.disabled) return false;
    button.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Experiment card not available: ${cardText}`);
}

async function assignPrediction(hypothesisText, groupText) {
  const clicked = await evaluate(`(() => {
    const row = [...document.querySelectorAll(".prediction-hypothesis")]
      .find((item) => item.textContent?.includes(${JSON.stringify(hypothesisText)}));
    const button = [...(row?.querySelectorAll("button") ?? [])]
      .find((item) => item.textContent?.includes(${JSON.stringify(groupText)}));
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Prediction control missing: ${hypothesisText} / ${groupText}`);
}

async function clickLabel(containerSelector, labelText) {
  const clicked = await evaluate(`(() => {
    const container = document.querySelector(${JSON.stringify(containerSelector)});
    const label = [...(container?.querySelectorAll("label") ?? [])]
      .find((item) => item.textContent?.includes(${JSON.stringify(labelText)}));
    if (!label) return false;
    label.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Label not found: ${containerSelector} / ${labelText}`);
}

async function setRange(selector, value) {
  const changed = await evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    if (!(input instanceof HTMLInputElement)) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter.call(input, ${JSON.stringify(String(value))});
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
  if (!changed) throw new Error(`Range not found: ${selector}`);
}

async function screenshot(filename, width, height) {
  await command("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 700,
    screenWidth: width,
    screenHeight: height,
  });
  await evaluate("window.scrollTo(0, 0); true");
  // Allow finite reveal transitions to settle before visual evidence is captured.
  await delay(1_700);
  await assertFunctionalText(filename);
  await assertNoHorizontalOverflow(filename);
  const result = await command("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  writeFileSync(resolve(screenshotDir, filename), Buffer.from(result.data, "base64"));
}

async function screenshotSection(filename, width, height, selector) {
  await command("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 700,
    screenWidth: width,
    screenHeight: height,
  });
  const found = await evaluate(`(() => {
    const target = document.querySelector(${JSON.stringify(selector)});
    if (!target) return false;
    const scrollRoot = document.scrollingElement;
    if (!scrollRoot) return false;
    scrollRoot.style.scrollBehavior = "auto";
    scrollRoot.scrollLeft = 0;
    scrollRoot.scrollTop = target.getBoundingClientRect().top + scrollRoot.scrollTop - 76;
    return true;
  })()`);
  if (!found) throw new Error(`Screenshot section not found: ${selector}`);
  await delay(900);
  await assertFunctionalText(filename);
  await assertNoHorizontalOverflow(filename);
  const result = await command("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  writeFileSync(resolve(screenshotDir, filename), Buffer.from(result.data, "base64"));
}

async function runExperiment(
  cardText,
  expectedResultText,
  { captureCompetitionPrediction = false } = {},
) {
  await clickCardButton(cardText);
  await waitForText("RUN EXPERIMENT");
  await assignPrediction("Competitive catalytic inhibition", "GROUP A");
  await assignPrediction("Enzyme loss", "GROUP A");
  await assignPrediction("Optical interference", "GROUP B");
  if (captureCompetitionPrediction) {
    await screenshotSection(
      "03-prediction-gate.png",
      1440,
      810,
      ".prediction-experiment-summary",
    );
  }
  await clickButton("RUN EXPERIMENT");
  try {
    await waitForText(expectedResultText, 20_000);
  } catch (error) {
    const pageText = await evaluate("document.body?.innerText.slice(0, 6000)");
    throw new Error(`${error.message}\nCurrent page text:\n${pageText}`);
  }
}

async function runNoSeparationExperiment(cardText, expectedResultText) {
  await clickCardButton(cardText);
  await waitForText("NO SEPARATION");
  await clickButton("NO SEPARATION");
  await screenshotSection(
    "case-prediction-no-separation-iphone.png",
    393,
    852,
    ".prediction-mode-picker",
  );
  await clickButton("RUN EXPERIMENT");
  await waitForText(expectedResultText, 20_000);
  await waitForText("CORRECT: NO SEPARATION", 20_000);
}

async function updateBeliefs(value) {
  await clickButton("UPDATE MY BELIEFS");
  await waitForText("COMMIT UPDATE & RETURN TO LAB");
  await setRange("#belief-optical_interference", value);
  await clickButton("COMMIT UPDATE & RETURN TO LAB");
  await waitForText("EXPERIMENT DECK");
}

async function run() {
  mkdirSync(screenshotDir, { recursive: true });
  rmSync(profileDir, { recursive: true, force: true });

  chrome = spawn(chromePath, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "--no-first-run",
    "--remote-allow-origins=*",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    "--window-size=1440,1000",
    `${baseUrl}/`,
  ], { stdio: "ignore" });

  await connect(await pollForTarget());
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Log.enable");
  if (replayLiveResponses) {
    const source = replayFetchSource();
    await command("Page.addScriptToEvaluateOnNewDocument", { source });
    await evaluate(source);
  }
  await waitForText("1 PLAYABLE CASE", 20_000);
  await command("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  const reducedMotion = await evaluate(
    'matchMedia("(prefers-reduced-motion: reduce)").matches',
  );
  if (!reducedMotion) throw new Error("Reduced-motion emulation was not honored.");
  await command("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
  });
  await command("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
  });
  const keyboardFocus = await evaluate(`(() => {
    const active = document.activeElement;
    if (!active?.matches("a, button, input, textarea, select")) return false;
    const style = getComputedStyle(active);
    return style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0;
  })()`);
  if (!keyboardFocus) throw new Error("Keyboard focus indicator was not visible.");
  await evaluate("document.activeElement?.blur(); true");
  await command("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  await screenshot("landing-iphone.png", 393, 852);
  await screenshot("landing-ipad.png", 1024, 1366);
  await screenshot("landing-desktop.png", 1440, 1000);
  if (competitionRecord) {
    await screenshot("01-landing-hero.png", 1440, 810);
  }
  await clickLink("ENTER CASE 01");
  await waitForText("ANALYZE THE OBSERVATION", 20_000);
  await screenshot("case-briefing-iphone.png", 393, 852);
  await screenshot("case-briefing-ipad.png", 1024, 1366);
  await screenshot("case-briefing-desktop.png", 1440, 1000);

  await clickButton("ANALYZE THE OBSERVATION");
  await waitForText("MEET THE HYPOTHESES", 45_000);
  if (liveSmoke) {
    await waitForText("GPT-5.6 VISION", 45_000);
    await screenshotSection(
      "observation-live-gpt-5.6.png",
      1440,
      1000,
      ".observation-interpretation",
    );
  }
  if (competitionRecord) {
    await screenshotSection(
      liveSmoke ? "02-gpt-observation.png" : "02-observation-fallback.png",
      1440,
      810,
      ".observation-interpretation",
    );
  }
  await clickButton("MEET THE HYPOTHESES");
  await waitForText("LOCK MY PRIORS");
  await assertFunctionalText("priors");
  await clickButton("LOCK MY PRIORS");
  await waitForText("EXPERIMENT DECK");
  await screenshot("case-lab-desktop.png", 1440, 1000);
  await screenshot("case-lab-ipad.png", 1024, 1366);
  await screenshot("case-lab-iphone.png", 393, 852);
  if (competitionRecord) {
    await screenshot("07-responsive-case.png", 393, 852);
  }

  if (!idealRoute) {
    await runNoSeparationExperiment("Repeat the fluorescent assay", "Low signal reproduced");
    await screenshot("case-result-no-separation-iphone.png", 393, 852);
    await screenshotSection(
      "case-result-no-separation-detail-iphone.png",
      393,
      852,
      ".result-facts",
    );
    await updateBeliefs(33);
  }

  await runExperiment(
    "Post-reaction spike-in",
    "Signal falls immediately",
    { captureCompetitionPrediction: competitionRecord },
  );
  if (competitionRecord) {
    await screenshot("04-decisive-timing-result.png", 1440, 810);
  }
  await screenshot("case-result-desktop.png", 1440, 1000);
  await screenshot("case-result-ipad.png", 1024, 1366);
  await screenshot("case-result-iphone.png", 393, 852);
  await updateBeliefs(idealRoute ? 90 : 80);

  // Exercise the second experiment and verdict flow at tablet width.
  await screenshot("case-lab-after-one-ipad.png", 1024, 1366);
  await runExperiment("Orthogonal product quantification", "Normal product amount");
  if (competitionRecord) {
    await screenshot("05-orthogonal-result.png", 1440, 810);
  }
  await screenshot("case-result-orthogonal-ipad.png", 1024, 1366);
  await updateBeliefs(90);

  await clickButton("SUBMIT A MECHANISM");
  await waitForText("LOCK VERDICT & REVEAL");
  await clickLabel(".verdict-hypotheses", "Optical interference");
  await setRange(".confidence-control input", idealRoute ? 99 : 95);
  await clickLabel(".evidence-picker", "Signal falls immediately");
  await clickLabel(".evidence-picker", "Normal product amount");
  await clickLabel(".falsification-grid fieldset:first-child", "Competitive catalytic inhibition");
  await waitFor(
    "document.querySelectorAll('.falsification-grid fieldset:nth-child(2) label').length > 0",
    "falsifying evidence choices",
  );
  const falsifyingEvidenceSelected = await evaluate(`(() => {
    const label = document.querySelector(".falsification-grid fieldset:nth-child(2) label");
    if (!label) return false;
    label.click();
    return true;
  })()`);
  if (!falsifyingEvidenceSelected) throw new Error("Falsifying evidence was not selectable.");
  await screenshot("case-verdict-iphone.png", 393, 852);
  await screenshot("case-verdict-ipad.png", 1024, 1366);
  await screenshot("case-verdict-desktop.png", 1440, 1000);
  await clickButton("LOCK VERDICT & REVEAL");
  await waitForText("CASE RESOLVED", 20_000);
  if (liveSmoke) await waitForText("GPT-5.6 · STRICT SCHEMA", 20_000);
  if (competitionRecord && !liveSmoke) {
    await waitForText("AUTHORED FALLBACK", 20_000);
  }
  await screenshot("case-debrief-desktop.png", 1440, 1000);
  await screenshot("case-debrief-iphone.png", 393, 852);
  await screenshot("case-debrief-ipad.png", 1024, 1366);
  await screenshotSection(
    "case-debrief-reasoning-review-iphone.png",
    393,
    852,
    ".reasoning-review-card",
  );
  await screenshotSection(
    "case-debrief-reasoning-review-desktop.png",
    1440,
    1000,
    ".reasoning-review-card",
  );
  await screenshotSection(
    "case-debrief-reasoning-review-ipad.png",
    1024,
    1366,
    ".reasoning-review-card",
  );
  if (competitionRecord) {
    await screenshot("06-reasoning-fingerprint.png", 1440, 810);
  }
  if (liveSmoke) {
    await screenshotSection(
      "final-review-live-gpt-5.6.png",
      1440,
      1000,
      ".reasoning-review-card",
    );
  }

  const summary = await evaluate(`(() => {
    const stored = JSON.parse(localStorage.getItem("one-more-control:fading-signal:v2"));
    return {
      phase: stored.session.phase,
      runs: stored.session.runs.map((run) => run.experimentId),
      budgetRemaining: stored.session.budgetRemaining,
      score: stored.debrief.score.total,
      trueHypothesisId: stored.debrief.trueHypothesisId,
      observationSource: stored.observation.source,
      reasoningReviewSource: stored.debrief.reasoningReview.source,
      predictionAccuracy: stored.debrief.fingerprint.predictionAccuracy,
    };
  })()`);

  let resetVerified = false;
  if (idealRoute) {
    const expectedSource = liveSmoke ? "gpt-5.6" : "fallback";
    if (
      summary.observationSource !== expectedSource
      || summary.reasoningReviewSource !== expectedSource
      || summary.score !== 100
      || summary.trueHypothesisId !== "optical_interference"
      || summary.budgetRemaining !== 61
      || summary.runs.join(",") !== "post_reaction_spike_in,orthogonal_product_quantification"
    ) {
      throw new Error(`Ideal-route browser invariants failed: ${JSON.stringify(summary)}`);
    }
    await clickButton("RESET");
    await waitForText("ANALYZE THE OBSERVATION", 20_000);
    await waitFor(
      `(() => {
        const stored = JSON.parse(localStorage.getItem("one-more-control:fading-signal:v2"));
        return stored?.session?.phase === "briefing"
          && stored.session.runs.length === 0
          && stored.observation === null
          && stored.debrief === null;
      })()`,
      "clean reset state",
    );
    resetVerified = true;
  }

  const relevantErrors = browserErrors.filter((message) =>
    !message.includes("favicon") && !message.includes("DevTools"),
  );
  if (relevantErrors.length > 0) {
    throw new Error(`Browser errors detected:\n${relevantErrors.join("\n")}`);
  }

  console.log(JSON.stringify({
    ok: true,
    keyboardFocus,
    reducedMotion,
    liveSmoke,
    competitionRecord,
    idealRoute,
    replayedLiveResponses: Boolean(replayLiveResponses),
    resetVerified,
    minimumFunctionalFontSize: Number.isFinite(minimumFunctionalFontSize)
      ? minimumFunctionalFontSize
      : null,
    ...summary,
  }, null, 2));
}

try {
  await run();
} catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  if (chrome && !chrome.killed) chrome.kill("SIGTERM");
  await delay(150);
  rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
