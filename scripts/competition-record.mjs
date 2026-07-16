#!/usr/bin/env node

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const live = process.env.RECORD_WITH_LIVE_OPENAI === "1";
if (live && !process.env.OPENAI_API_KEY) {
  console.error(
    "BLOCKED: RECORD_WITH_LIVE_OPENAI=1 requires OPENAI_API_KEY. No calls were made.",
  );
  process.exit(2);
}

const port = Number(process.env.OMC_RECORD_PORT ?? 3427);
const debugPort = Number(process.env.OMC_RECORD_DEBUG_PORT ?? 9347);
const baseUrl = `http://127.0.0.1:${port}`;
const timestamp = new Date()
  .toISOString()
  .replace(/:/g, "")
  .replace(/\.\d{3}Z$/, "Z");
const artifactDir = resolve("artifacts", "competition-record", timestamp);
const summaryPath = resolve(artifactDir, "SUMMARY.md");
const browserResultPath = resolve(artifactDir, "browser-qa.sanitized.json");
const telemetryPath = resolve(artifactDir, "live-ai-telemetry.sanitized.json");
const shotListPath = resolve(artifactDir, "SHOT_LIST.md");
let server;
let serverOutput = "";

mkdirSync(artifactDir, { recursive: true });

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function redact(value) {
  let output = String(value);
  const key = process.env.OPENAI_API_KEY;
  if (key) output = output.split(key).join("[REDACTED_API_KEY]");
  return output
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "[REDACTED_API_KEY]")
    .replace(/\bresp_[A-Za-z0-9_-]+\b/g, "[REDACTED_RESPONSE_ID]");
}

async function runVisible(command, args, env = process.env) {
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    });
    child.once("error", rejectRun);
    child.once("exit", (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${command} exited with code ${code ?? "unknown"}.`));
    });
  });
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  server.kill("SIGTERM");
  await Promise.race([
    new Promise((resolveExit) => server.once("exit", resolveExit)),
    delay(5_000),
  ]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null) {
      throw new Error(`Production server exited early.\n${redact(serverOutput)}`);
    }
    try {
      const response = await fetch(baseUrl, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) return;
    } catch {
      // Production server is still starting.
    }
    await delay(100);
  }
  throw new Error("Production server did not become ready.");
}

async function startServer() {
  const env = {
    ...process.env,
    PORT: String(port),
    OPENAI_SMOKE_OBSERVABILITY: live ? "1" : "0",
  };
  if (live) {
    env.OPENAI_SAFETY_PEPPER = randomBytes(32).toString("hex");
    env.OPENAI_LIVE_REQUESTS_ENABLED = "1";
  } else {
    delete env.OPENAI_API_KEY;
    delete env.OPENAI_SAFETY_PEPPER;
    delete env.OPENAI_LIVE_REQUESTS_ENABLED;
  }
  server = spawn(
    process.execPath,
    [
      "node_modules/vinext/dist/cli.js",
      "start",
      "--port",
      String(port),
      "--hostname",
      "127.0.0.1",
    ],
    {
      cwd: process.cwd(),
      env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  await waitForServer();
}

async function runBrowser() {
  const env = {
    ...process.env,
    QA_BASE_URL: baseUrl,
    QA_DEBUG_PORT: String(debugPort),
    QA_SCREENSHOT_DIR: artifactDir,
    QA_COMPETITION_RECORD: "1",
    QA_LIVE_SMOKE: live ? "1" : "0",
  };
  delete env.OPENAI_API_KEY;
  delete env.OPENAI_SAFETY_PEPPER;
  delete env.OPENAI_LIVE_REQUESTS_ENABLED;

  return new Promise((resolveRun, rejectRun) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(process.execPath, ["scripts/browser-qa.mjs"], {
      cwd: process.cwd(),
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    const timeout = setTimeout(() => child.kill("SIGKILL"), 180_000);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        rejectRun(new Error(`Browser rehearsal failed.\n${redact(stderr || stdout)}`));
        return;
      }
      try {
        resolveRun(JSON.parse(stdout.trim()));
      } catch {
        rejectRun(new Error(`Browser result was invalid.\n${redact(stdout)}`));
      }
    });
  });
}

function collectSanitizedTelemetry() {
  const entries = serverOutput
    .split(/\r?\n/)
    .filter((line) => line.startsWith("OMC_AI_SMOKE "))
    .map((line) => JSON.parse(line.slice("OMC_AI_SMOKE ".length)));
  if (live) {
    const routes = entries.map((entry) => entry.route).sort();
    if (
      entries.length !== 2 ||
      routes.join(",") !== "/api/ai/observe,/api/verdict/submit" ||
      entries.some(
        (entry) =>
          entry.source !== "gpt-5.6" ||
          entry.schemaValidation !== true ||
          entry.semanticInvariant !== true ||
          typeof entry.openAiResponseIdHash !== "string" ||
          "openAiResponseId" in entry,
      )
    ) {
      throw new Error(
        `Expected exactly two sanitized successful live telemetry entries; received ${JSON.stringify(entries)}`,
      );
    }
  } else if (entries.length !== 0) {
    throw new Error("Fallback rehearsal unexpectedly emitted live telemetry.");
  }
  return entries;
}

function assertResult(result) {
  const expectedSource = live ? "gpt-5.6" : "fallback";
  const exactPath =
    result.runs?.join(",") ===
    "post_reaction_spike_in,orthogonal_product_quantification";
  if (
    result.ok !== true ||
    result.competitionRecord !== true ||
    result.idealRoute !== true ||
    result.score !== 100 ||
    result.budgetRemaining !== 61 ||
    result.trueHypothesisId !== "optical_interference" ||
    result.observationSource !== expectedSource ||
    result.reasoningReviewSource !== expectedSource ||
    result.resetVerified !== true ||
    result.keyboardFocus !== true ||
    result.reducedMotion !== true ||
    !exactPath
  ) {
    throw new Error(`Competition record invariants failed: ${JSON.stringify(result)}`);
  }
}

function writeShotList() {
  const observationShot = live
    ? "02-gpt-observation.png"
    : "02-observation-fallback.png";
  writeFileSync(
    shotListPath,
    `# ONE MORE CONTROL — Under-Three-Minute Recording Shot List

Target runtime: **2:53**. Keep the final YouTube video public and below 3:00.

| Time | Evidence frame | Recording beat |
|---|---|---|
| 0:00–0:12 | \`01-landing-hero.png\` | Hook: one experiment that can prove an explanation wrong. |
| 0:12–0:30 | \`${observationShot}\` | Show the synthetic chart and the visible GPT-5.6 or fallback source badge. |
| 0:30–0:52 | \`03-prediction-gate.png\` | Commit the split prediction before revealing the authored outcome. |
| 0:52–1:20 | \`04-decisive-timing-result.png\` | Show the post-reaction timing control and its budget cost. |
| 1:20–1:47 | \`05-orthogonal-result.png\` | Show normal product through an independent measurement dimension. |
| 1:47–2:18 | \`06-reasoning-fingerprint.png\` | Reveal the 100-point debrief, falsification, calibration, and reasoning review. |
| 2:18–2:35 | \`07-responsive-case.png\` | Prove the same complete case works at phone width. |
| 2:35–2:47 | terminal / architecture crop | Explain Codex collaboration, passing checks, GPT interpretation, and server-owned truth. |
| 2:47–2:53 | \`01-landing-hero.png\` | Close: ask what evidence would prove the explanation wrong. |

## Source honesty

${live
  ? "This pack used live GPT-5.6 for the observation and final review."
  : "This zero-cost rehearsal used authored fallbacks. Replace shot 02 with a gated live pack before the final competition recording if the GPT-5.6 badge must be shown."}

Official rules: https://openai.devpost.com/rules
`,
  );
}

function writeSummary(result, telemetry) {
  writeFileSync(
    summaryPath,
    `# ONE MORE CONTROL — Competition Recording Pack

- Timestamp: ${timestamp}
- Status: **PASS**
- Mode: ${live ? "LIVE GPT-5.6" : "ZERO-COST AUTHORED FALLBACK REHEARSAL"}
- Additional Responses API calls: ${live ? "2 planned" : "0"}
- Sanitized telemetry entries: ${telemetry.length}
- Ideal path: Post-reaction spike-in -> Orthogonal product quantification
- Budget remaining: ${result.budgetRemaining}
- Score: ${result.score}
- Authored truth: Optical interference
- Observation source: ${result.observationSource}
- Final review source: ${result.reasoningReviewSource}
- Keyboard focus: PASS
- Reduced motion: PASS
- Reset: PASS
- Production server after script: stopped by cleanup
- Recording frames: 7

The pack is a deterministic recording rehearsal and evidence generator. It does
not record narration, upload to YouTube, or expose an API key.
`,
  );
}

try {
  console.log("[1/3] Running the full completion gate...");
  await runVisible("npm", ["run", "check"]);
  if (!existsSync(resolve("dist", "server", "index.js"))) {
    throw new Error("Production build output is missing after npm run check.");
  }

  console.log("[2/3] Starting a local production server...");
  await startServer();
  console.log("[3/3] Capturing the ideal 39-unit / 100-point route...");
  const result = await runBrowser();
  assertResult(result);
  await delay(100);
  const telemetry = collectSanitizedTelemetry();
  writeFileSync(browserResultPath, `${JSON.stringify(result, null, 2)}\n`);
  writeFileSync(telemetryPath, `${JSON.stringify(telemetry, null, 2)}\n`);
  writeShotList();
  writeSummary(result, telemetry);
  console.log(`PASS: competition recording pack written to ${artifactDir}`);
} catch (error) {
  const message = redact(error instanceof Error ? error.stack ?? error.message : error);
  writeFileSync(
    summaryPath,
    `# ONE MORE CONTROL — Competition Recording Pack\n\n- Status: **FAIL**\n\n\`\`\`text\n${message}\n\`\`\`\n`,
  );
  console.error(message);
  process.exitCode = 1;
} finally {
  await stopServer();
}
