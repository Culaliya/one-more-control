#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const clientDirectory = resolve("dist/client");
const inspectedExtensions = new Set([".css", ".html", ".js", ".json"]);
const forbiddenMarkers = [
  "actualOutcomeByExperiment",
  "THE CHEMISTRY NEVER STOPPED.",
  '"trueHypothesisId":"optical_interference"',
  '"post_reaction_spike_in":"immediate_signal_drop"',
  '"orthogonal_product_assay":"normal_product_amount"',
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? collectFiles(path) : [path];
    }),
  );
  return nested.flat();
}

const files = (await collectFiles(clientDirectory)).filter((file) =>
  inspectedExtensions.has(extname(file)),
);
const leaks = [];

for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const marker of forbiddenMarkers) {
    if (source.includes(marker)) {
      leaks.push(`${file}: ${marker}`);
    }
  }
}

if (leaks.length > 0) {
  throw new Error(`Private case truth leaked into client output:\n${leaks.join("\n")}`);
}

console.log(`Client truth boundary passed across ${files.length} text assets.`);
