import fs from "node:fs";
import solc from "solc";
import { ContractFactory, JsonRpcProvider, Wallet, formatEther } from "ethers";

const env = readEnv(".env");
const privateKey = env.ZERO_G_PRIVATE_KEY;
const rpcUrl = env.ZERO_G_RPC_URL || "https://evmrpc.0g.ai";
const chainId = Number(env.ZERO_G_CHAIN_ID || 16661);

if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
  throw new Error("ZERO_G_PRIVATE_KEY must be set to a 0x-prefixed private key in .env");
}

const sourcePath = "contracts/ProofRegistry.sol";
const source = fs.readFileSync(sourcePath, "utf8");
const input = {
  language: "Solidity",
  sources: {
    [sourcePath]: {
      content: source,
    },
  },
  settings: {
    viaIR: true,
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = output.errors?.filter((item) => item.severity === "error") ?? [];

if (errors.length > 0) {
  throw new Error(errors.map((item) => item.formattedMessage).join("\n"));
}

const compiled = output.contracts[sourcePath].ProofRegistry;
const abi = compiled.abi;
const bytecode = `0x${compiled.evm.bytecode.object}`;
const provider = new JsonRpcProvider(rpcUrl, chainId);
const wallet = new Wallet(privateKey, provider);
const balance = await provider.getBalance(wallet.address);

console.log(`Deployer: ${wallet.address}`);
console.log(`Balance: ${formatEther(balance)} 0G`);
console.log(`Network chainId: ${chainId}`);

const factory = new ContractFactory(abi, bytecode, wallet);
const contract = await factory.deploy();

console.log(`Deployment tx: ${contract.deploymentTransaction()?.hash}`);
await contract.waitForDeployment();

const address = await contract.getAddress();

console.log(`ProofRegistry deployed: ${address}`);
console.log(`Explorer: https://chainscan.0g.ai/address/${address}`);

function readEnv(path) {
  if (!fs.existsSync(path)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}
