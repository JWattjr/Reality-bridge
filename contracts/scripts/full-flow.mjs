import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ganache from "ganache";
import solc from "solc";
import {
  AbiCoder,
  BrowserProvider,
  ContractFactory,
  parseEther,
  parseUnits,
  sha256,
  toUtf8Bytes,
} from "ethers";

assert(process.argv[2], "Pass the exported Studionet adjudication proof as JSON.");
const networkProof = JSON.parse(process.argv[2]);
assert.equal(networkProof.network, "studionet");
assert.match(networkProof.resolverAddress, /^0x[0-9a-fA-F]{40}$/);
assert.match(networkProof.fixtureCommitment, /^0x[0-9a-fA-F]{64}$/);
const fixture = networkProof.fixture;
const resolvedResult = networkProof.result;

function source(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

function compile() {
  const input = {
    language: "Solidity",
    sources: {
      "contracts/src/ProofPlayBaseDuel.sol": {
        content: source("contracts/src/ProofPlayBaseDuel.sol"),
      },
      "contracts/test/MockUSDC.sol": {
        content: source("contracts/test/MockUSDC.sol"),
      },
      "contracts/test/MockGenLayerBridgeSender.sol": {
        content: source("contracts/test/MockGenLayerBridgeSender.sol"),
      },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
      evmVersion: "shanghai",
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors ?? []).filter((item) => item.severity === "error");
  assert.equal(errors.length, 0, errors.map((item) => item.formattedMessage).join("\n"));
  return output.contracts;
}

async function deploy(compiled, sourceName, contractName, signer, args = []) {
  const artifact = compiled[sourceName][contractName];
  const factory = new ContractFactory(artifact.abi, artifact.evm.bytecode.object, signer);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  return contract;
}

const compiled = compile();
const chain = ganache.provider({
  logging: { quiet: true },
  wallet: { totalAccounts: 6, defaultBalance: 1_000 },
  chain: {
    chainId: 31_337,
    time: new Date((fixture.kickoff - 3_600) * 1_000),
  },
});
const provider = new BrowserProvider(chain);
const [owner, creator, challenger, receiver, resolver] = await Promise.all(
  [0, 1, 2, 3, 4].map((index) => provider.getSigner(index)),
);

const usdc = await deploy(
  compiled,
  "contracts/test/MockUSDC.sol",
  "MockUSDC",
  owner,
);
const bridge = await deploy(
  compiled,
  "contracts/test/MockGenLayerBridgeSender.sol",
  "MockGenLayerBridgeSender",
  owner,
);
const duel = await deploy(
  compiled,
  "contracts/src/ProofPlayBaseDuel.sol",
  "ProofPlayBaseDuel",
  owner,
  [await usdc.getAddress(), 7_200],
);

const sourceChainId = 61_998;
await (await duel.configureBridge(
  await bridge.getAddress(),
  await receiver.getAddress(),
  await resolver.getAddress(),
  sourceChainId,
)).wait();

const stake = parseUnits("10", 6);
for (const player of [creator, challenger]) {
  await (await usdc.mint(await player.getAddress(), parseUnits("1000", 6))).wait();
  await (await usdc.connect(player).approve(await duel.getAddress(), stake)).wait();
}

const canonical = [
  "proofplay-fixture-v1",
  fixture.homeTeam,
  fixture.awayTeam,
  fixture.competition,
  fixture.kickoff,
  fixture.matchDate,
  fixture.resolutionUrl,
  fixture.goalsLine,
  fixture.cornersLine,
  fixture.cardsLine,
].join("\x1f");
const independentlyComputedCommitment = sha256(toUtf8Bytes(canonical));
const baseCommitment = await duel.computeFixtureCommitment(
  fixture.homeTeam,
  fixture.awayTeam,
  fixture.competition,
  fixture.kickoff,
  fixture.matchDate,
  fixture.resolutionUrl,
  fixture.goalsLine,
  fixture.cornersLine,
  fixture.cardsLine,
);
assert.equal(baseCommitment, independentlyComputedCommitment);
assert.equal(baseCommitment.toLowerCase(), networkProof.fixtureCommitment.toLowerCase());

const probabilities = [3400, 2500, 4100, 4400, 4700, 900, 5900, 4100, 5600, 4400, 5300, 4700, 6100, 3900];
const creatorPicks = [1, 1, 1, 1, 2, 1];
const challengerPicks = [3, 2, 2, 2, 1, 2];
await (await duel.connect(creator).createDuel(
  await challenger.getAddress(),
  fixture.homeTeam,
  fixture.awayTeam,
  fixture.competition,
  fixture.kickoff,
  fixture.matchDate,
  fixture.resolutionUrl,
  stake,
  fixture.goalsLine,
  fixture.cornersLine,
  fixture.cardsLine,
  probabilities,
  creatorPicks,
)).wait();
const duelId = 1n;
await (await duel.connect(challenger).acceptDuel(duelId, challengerPicks)).wait();

const latest = await provider.getBlock("latest");
assert(latest);
await provider.send("evm_increaseTime", [fixture.kickoff - latest.timestamp + 1]);
await provider.send("evm_mine", []);
const bridgeFee = parseEther("0.01");
await (await duel.requestResolution(duelId, "0x", { value: bridgeFee })).wait();

const [requestedDuelId, requestedCommitment] = AbiCoder.defaultAbiCoder().decode(
  ["uint256", "bytes32"],
  await bridge.lastData(),
);
assert.equal(requestedDuelId, duelId);
assert.equal(requestedCommitment, baseCommitment);

const resultPayload = AbiCoder.defaultAbiCoder().encode(
  ["uint256", "bytes32", "uint256", "uint256", "uint256", "uint256", "uint256"],
  [
    duelId,
    baseCommitment,
    resolvedResult.homeGoals,
    resolvedResult.awayGoals,
    resolvedResult.firstTeamToScore,
    resolvedResult.totalCorners,
    resolvedResult.totalCards,
  ],
);
let forgedCallbackRejected = false;
try {
  await duel.connect(resolver).processBridgeMessage(
    sourceChainId,
    await resolver.getAddress(),
    resultPayload,
  );
} catch (error) {
  forgedCallbackRejected =
    error?.info?.error?.data?.reason === "Only bridge receiver" ||
    String(error).includes("Only bridge receiver");
}
assert.equal(forgedCallbackRejected, true, "forged callback must be rejected");
await (await duel.connect(receiver).processBridgeMessage(
  sourceChainId,
  await resolver.getAddress(),
  resultPayload,
)).wait();

const challengerBeforeClaim = await usdc.balanceOf(await challenger.getAddress());
await (await duel.connect(challenger).claimPrize(duelId)).wait();
const challengerAfterClaim = await usdc.balanceOf(await challenger.getAddress());
assert.equal(challengerAfterClaim - challengerBeforeClaim, stake * 2n);
assert.equal(await usdc.balanceOf(await duel.getAddress()), 0n);

console.log(`✓ Studionet resolver: ${networkProof.resolverAddress}`);
console.log(`✓ Real result: ${fixture.homeTeam} ${resolvedResult.homeGoals}-${resolvedResult.awayGoals} ${fixture.awayTeam}, ${resolvedResult.totalCorners} corners, ${resolvedResult.totalCards} cards`);
console.log("✓ Base lifecycle: escrow → request → authenticated callback → settlement → challenger payout");
console.log(`✓ Fixture/evidence commitment: ${baseCommitment}`);
