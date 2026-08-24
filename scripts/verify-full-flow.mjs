import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const pythonCandidates = process.platform === "win32"
  ? [resolve("genlayer/.venv/Scripts/python.exe"), "python.exe", "python"]
  : [resolve("genlayer/.venv/bin/python"), "python3", "python"];
const python = pythonCandidates.find((candidate) =>
  candidate.includes("/") || candidate.includes("\\") ? existsSync(candidate) : true,
);

function run(command, args, cwd = process.cwd()) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false, cwd });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("Running GenLayer registration, resolution, and authenticated bridge request…");
run(python, [
  "-m",
  "pytest",
  "tests/direct/test_proofplay_resolver.py",
  "-q",
  "-k",
  "full_committed_registration_resolution_and_authenticated_bridge_request",
], "genlayer");

console.log("Running Base escrow, callback, settlement, and claim lifecycle…");
run(process.execPath, ["contracts/scripts/full-flow.mjs"]);
console.log("✓ ProofPlay full flow passed");
