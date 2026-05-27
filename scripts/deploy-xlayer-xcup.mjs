import fs from "node:fs";
import solc from "solc";
import { ContractFactory, JsonRpcProvider, Wallet, formatEther, parseUnits } from "ethers";

const env = readEnv(".env");
const privateKey = env.XLAYER_PRIVATE_KEY;
const rpcUrl = env.XLAYER_RPC_URL || "https://testrpc.xlayer.tech/terigon";
const chainId = Number(env.XLAYER_CHAIN_ID || 1952);
const explorer = env.XLAYER_EXPLORER_URL || "https://www.okx.com/web3/explorer/xlayer-test";
const platformFeeBps = Number(env.PLATFORM_FEE_BPS || 0);

if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
  throw new Error("XLAYER_PRIVATE_KEY must be set to a 0x-prefixed private key in .env");
}

const compiled = compileContracts([
  "contracts/TestUSDT.sol",
  "contracts/FootballPredictionGame.sol",
]);

const provider = new JsonRpcProvider(rpcUrl, chainId);
const wallet = new Wallet(privateKey, provider);
const balance = await provider.getBalance(wallet.address);

console.log(`Deployer: ${wallet.address}`);
console.log(`Balance: ${formatEther(balance)} OKB`);
console.log(`Network chainId: ${chainId}`);

const testUsdt = await deploy(compiled.TestUSDT, []);
const game = await deploy(compiled.FootballPredictionGame, [await testUsdt.getAddress(), platformFeeBps]);

console.log("");
console.log("Seeding X Cup games and markets...");
await seedGamesAndMarkets(game);

const testUsdtAddress = await testUsdt.getAddress();
const gameAddress = await game.getAddress();

console.log("");
console.log("X Layer deployment complete:");
console.log(`NEXT_PUBLIC_TEST_USDT_ADDRESS=${testUsdtAddress}`);
console.log(`NEXT_PUBLIC_FOOTBALL_PREDICTION_ADDRESS=${gameAddress}`);
console.log(`NEXT_PUBLIC_XLAYER_RPC_URL=${rpcUrl}`);
console.log(`XLAYER_RPC_URL=${rpcUrl}`);
console.log(`XLAYER_CHAIN_ID=${chainId}`);
console.log(`Test USDT explorer: ${explorer}/address/${testUsdtAddress}`);
console.log(`Prediction explorer: ${explorer}/address/${gameAddress}`);

async function deploy(contract, args) {
  const factory = new ContractFactory(contract.abi, contract.bytecode, wallet);
  const instance = await factory.deploy(...args);
  console.log(`Deployment tx: ${instance.deploymentTransaction()?.hash}`);
  await instance.waitForDeployment();
  console.log(`${contract.name} deployed: ${await instance.getAddress()}`);
  return instance;
}

async function seedGamesAndMarkets(contract) {
  for (const game of GAMES) {
    const tx = await contract.createGameEvent(
      game.teamA,
      game.teamB,
      game.competition,
      unix(game.matchStartTime),
      unix(game.marketCloseTime),
      game.rewardConfigURI,
    );
    await tx.wait();
    console.log(`Game ${game.chainGameId}: ${game.teamA} vs ${game.teamB}`);
  }

  for (const market of MARKETS) {
    const tx = await contract.createMarket(
      market.chainGameId,
      market.title,
      market.category,
      market.marketType === "YES_NO" ? 0 : 1,
      market.options,
      parseUnits(String(market.minStake), 6),
      unix(market.closeTime),
    );
    await tx.wait();
    console.log(`Market ${market.chainMarketId}: ${market.title}`);
  }
}

function compileContracts(sourcePaths) {
  const sources = Object.fromEntries(
    sourcePaths.map((path) => [path, { content: fs.readFileSync(path, "utf8") }]),
  );
  const input = {
    language: "Solidity",
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
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

  return {
    TestUSDT: artifact(output, "contracts/TestUSDT.sol", "TestUSDT"),
    FootballPredictionGame: artifact(output, "contracts/FootballPredictionGame.sol", "FootballPredictionGame"),
  };
}

function artifact(output, sourcePath, name) {
  const compiled = output.contracts[sourcePath][name];
  return {
    name,
    abi: compiled.abi,
    bytecode: `0x${compiled.evm.bytecode.object}`,
  };
}

function unix(value) {
  return Math.floor(new Date(value).getTime() / 1000);
}

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

const GAMES = [
  {
    chainGameId: 1,
    teamA: "USA",
    teamB: "Paraguay",
    competition: "ProofPlay X Cup",
    matchStartTime: "2026-06-12T20:00:00Z",
    marketCloseTime: "2026-06-12T19:45:00Z",
    rewardConfigURI: "ipfs://proofplay/x-cup/usa-paraguay/rewards",
  },
  {
    chainGameId: 2,
    teamA: "Brazil",
    teamB: "Japan",
    competition: "ProofPlay X Cup",
    matchStartTime: "2026-06-15T18:30:00Z",
    marketCloseTime: "2026-06-15T18:15:00Z",
    rewardConfigURI: "ipfs://proofplay/x-cup/brazil-japan/rewards",
  },
  {
    chainGameId: 3,
    teamA: "Argentina",
    teamB: "Germany",
    competition: "ProofPlay X Cup",
    matchStartTime: "2026-06-18T21:00:00Z",
    marketCloseTime: "2026-06-18T20:45:00Z",
    rewardConfigURI: "ipfs://proofplay/x-cup/argentina-germany/rewards",
  },
];

const MARKETS = [
  market(1, 1, "USA wins", "Match Result", "YES_NO", ["Yes", "No"], 5, "2026-06-12T19:45:00Z"),
  market(2, 1, "Draw", "Match Result", "YES_NO", ["Yes", "No"], 5, "2026-06-12T19:45:00Z"),
  market(3, 1, "Paraguay wins", "Match Result", "YES_NO", ["Yes", "No"], 5, "2026-06-12T19:45:00Z"),
  market(4, 1, "Both teams to score", "Goals", "YES_NO", ["Yes", "No"], 5, "2026-06-12T19:45:00Z"),
  market(5, 1, "First to score", "Players", "MULTI_CHOICE", ["USA", "Paraguay"], 10, "2026-06-12T19:45:00Z"),
  market(6, 1, "Red card in match", "Cards", "YES_NO", ["Yes", "No"], 5, "2026-06-12T19:45:00Z"),
  market(7, 2, "Brazil wins", "Match Result", "YES_NO", ["Yes", "No"], 5, "2026-06-15T18:15:00Z"),
  market(8, 2, "Over 4.5 goals", "Goals", "YES_NO", ["Yes", "No"], 5, "2026-06-15T18:15:00Z"),
  market(9, 2, "Player of the match", "Players", "MULTI_CHOICE", ["Vinicius Jr", "Rodrygo", "Kubo", "Mitoma"], 10, "2026-06-15T18:15:00Z"),
  market(10, 3, "Argentina wins", "Match Result", "YES_NO", ["Yes", "No"], 5, "2026-06-18T20:45:00Z"),
  market(11, 3, "Under 2.5 goals", "Goals", "YES_NO", ["Yes", "No"], 5, "2026-06-18T20:45:00Z"),
  market(12, 3, "Top goal scorer", "Players", "MULTI_CHOICE", ["Messi", "Alvarez", "Musiala", "Havertz", "No goal"], 10, "2026-06-18T20:45:00Z"),
];

function market(chainMarketId, chainGameId, title, category, marketType, options, minStake, closeTime) {
  return { chainMarketId, chainGameId, title, category, marketType, options, minStake, closeTime };
}
