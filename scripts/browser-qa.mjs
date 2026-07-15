#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3000";
const chromePath = process.env.CHROME_PATH
  ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const debugPort = Number(process.env.QA_DEBUG_PORT ?? 9333);
const profileDir = `/tmp/one-more-control-qa-${process.pid}`;
const screenshotDir = resolve("artifacts/screenshots");
const browserErrors = [];
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
  const result = await command("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  writeFileSync(resolve(screenshotDir, filename), Buffer.from(result.data, "base64"));
}

async function runExperiment(cardText, expectedResultText) {
  await clickCardButton(cardText);
  await waitForText("RUN EXPERIMENT");
  await assignPrediction("Competitive catalytic inhibition", "GROUP A");
  await assignPrediction("Enzyme loss", "GROUP A");
  await assignPrediction("Optical interference", "GROUP B");
  await clickButton("RUN EXPERIMENT");
  try {
    await waitForText(expectedResultText, 20_000);
  } catch (error) {
    const pageText = await evaluate("document.body?.innerText.slice(0, 6000)");
    throw new Error(`${error.message}\nCurrent page text:\n${pageText}`);
  }
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
    `${baseUrl}/cases/fading-signal`,
  ], { stdio: "ignore" });

  await connect(await pollForTarget());
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Log.enable");
  await waitForText("ANALYZE THE OBSERVATION", 20_000);
  await screenshot("case-briefing-iphone.png", 393, 852);
  await screenshot("case-briefing-ipad.png", 1024, 1366);
  await screenshot("case-briefing-desktop.png", 1440, 1000);

  await clickButton("ANALYZE THE OBSERVATION");
  await waitForText("MEET THE HYPOTHESES", 45_000);
  await clickButton("MEET THE HYPOTHESES");
  await waitForText("LOCK MY PRIORS");
  await clickButton("LOCK MY PRIORS");
  await waitForText("EXPERIMENT DECK");
  await screenshot("case-lab-desktop.png", 1440, 1000);
  await screenshot("case-lab-ipad.png", 1024, 1366);
  await screenshot("case-lab-iphone.png", 393, 852);

  await runExperiment("Post-reaction spike-in", "Signal falls immediately");
  await screenshot("case-result-desktop.png", 1440, 1000);
  await screenshot("case-result-ipad.png", 1024, 1366);
  await screenshot("case-result-iphone.png", 393, 852);
  await updateBeliefs(80);

  // Exercise the second experiment and verdict flow at tablet width.
  await screenshot("case-lab-after-one-ipad.png", 1024, 1366);
  await runExperiment("Orthogonal product quantification", "Normal product amount");
  await screenshot("case-result-orthogonal-ipad.png", 1024, 1366);
  await updateBeliefs(90);

  await clickButton("SUBMIT A MECHANISM");
  await waitForText("LOCK VERDICT & REVEAL");
  await clickLabel(".verdict-hypotheses", "Optical interference");
  await setRange(".confidence-control input", 95);
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
  await clickButton("LOCK VERDICT & REVEAL");
  await waitForText("CASE RESOLVED", 20_000);
  await screenshot("case-debrief-desktop.png", 1440, 1000);
  await screenshot("case-debrief-iphone.png", 393, 852);
  await screenshot("case-debrief-ipad.png", 1024, 1366);

  const summary = await evaluate(`(() => {
    const stored = JSON.parse(localStorage.getItem("one-more-control:fading-signal:v1"));
    return {
      phase: stored.session.phase,
      runs: stored.session.runs.map((run) => run.experimentId),
      budgetRemaining: stored.session.budgetRemaining,
      score: stored.debrief.score.total,
      trueHypothesisId: stored.debrief.trueHypothesisId,
      observationSource: stored.observation.source,
    };
  })()`);

  const relevantErrors = browserErrors.filter((message) =>
    !message.includes("favicon") && !message.includes("DevTools"),
  );
  if (relevantErrors.length > 0) {
    throw new Error(`Browser errors detected:\n${relevantErrors.join("\n")}`);
  }

  console.log(JSON.stringify({ ok: true, ...summary }, null, 2));
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
