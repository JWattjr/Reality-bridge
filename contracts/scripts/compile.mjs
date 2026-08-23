import { readFileSync } from "node:fs";
import solc from "../../frontend/node_modules/solc/index.js";

const sourcePath = new URL("../src/ProofPlayBaseMarket.sol", import.meta.url);
const source = readFileSync(sourcePath, "utf8");
const input = {
  language: "Solidity",
  sources: {
    "ProofPlayBaseMarket.sol": { content: source },
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    viaIR: true,
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const diagnostics = output.errors ?? [];
for (const diagnostic of diagnostics) {
  const stream = diagnostic.severity === "error" ? process.stderr : process.stdout;
  stream.write(`${diagnostic.formattedMessage}\n`);
}

if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
  process.exit(1);
}

const compiled = output.contracts["ProofPlayBaseMarket.sol"].ProofPlayBaseMarket;
const byteLength = compiled.evm.bytecode.object.length / 2;
console.log(`ProofPlayBaseMarket compiled (${byteLength} byte deployment bytecode, ${compiled.abi.length} ABI entries).`);
