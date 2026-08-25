import {
  BrowserProvider,
  Contract,
  ZeroAddress,
  getAddress,
  isAddress,
  parseUnits,
  sha256,
  toUtf8Bytes,
} from "ethers";

export const BASE_SEPOLIA = {
  chainId: 84532,
  chainIdHex: "0x14a34",
  name: "Base Sepolia",
  nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
  rpcUrl: "https://sepolia.base.org",
  explorerUrl: "https://sepolia.basescan.org",
  usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
} as const;

const ERC20_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const DUEL_ABI = [
  {
    type: "event",
    name: "DuelCreated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "duelId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: true, name: "invitedOpponent", type: "address" },
      { indexed: false, name: "kickoff", type: "uint64" },
      { indexed: false, name: "entryStake", type: "uint96" },
      { indexed: false, name: "fixtureCommitment", type: "bytes32" },
    ],
  },
  {
    type: "function",
    name: "duelCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getMatchmakingState",
    stateMutability: "view",
    inputs: [{ name: "duelId", type: "uint256" }],
    outputs: [
      { name: "status", type: "uint8" },
      { name: "creator", type: "address" },
      { name: "invitedOpponent", type: "address" },
      { name: "kickoff", type: "uint64" },
      { name: "entryStake", type: "uint96" },
      { name: "fixtureCommitment", type: "bytes32" },
    ],
  },
  {
    type: "function",
    name: "createDuel",
    stateMutability: "nonpayable",
    inputs: [
      { name: "invitedOpponent", type: "address" },
      { name: "homeTeam", type: "string" },
      { name: "awayTeam", type: "string" },
      { name: "competition", type: "string" },
      { name: "kickoff", type: "uint64" },
      { name: "matchDate", type: "string" },
      { name: "resolutionUrl", type: "string" },
      { name: "entryStake", type: "uint96" },
      { name: "totalGoalsLineTenths", type: "uint16" },
      { name: "totalCornersLineTenths", type: "uint16" },
      { name: "totalCardsLineTenths", type: "uint16" },
      { name: "impliedProbabilityBps", type: "uint16[14]" },
      { name: "creatorPicks", type: "uint8[6]" },
    ],
    outputs: [{ name: "duelId", type: "uint256" }],
  },
  {
    type: "function",
    name: "acceptDuel",
    stateMutability: "nonpayable",
    inputs: [
      { name: "duelId", type: "uint256" },
      { name: "challengerPicks", type: "uint8[6]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getDuelEntryStake",
    stateMutability: "view",
    inputs: [{ name: "duelId", type: "uint256" }],
    outputs: [{ name: "", type: "uint96" }],
  },
] as const;

export type BaseWallet = {
  address: string;
  getEthereumProvider?: () => Promise<unknown>;
  switchChain?: (chainId: number) => Promise<void>;
};

export type TicketFixture = {
  homeTeam: string;
  awayTeam: string;
  competition: string;
  kickoff: number;
  matchDate: string;
  resolutionUrl: string;
  totalGoalsLineTenths: number;
  totalCornersLineTenths: number;
  totalCardsLineTenths: number;
};

export type CreateDuelInput = {
  wallet: BaseWallet;
  fixture: TicketFixture;
  invitedOpponent?: string | null;
  entryStake: string;
  impliedProbabilityBps: readonly number[];
  picks: readonly number[];
};

export function getProofPlayDuelAddress() {
  const value = process.env.NEXT_PUBLIC_PROOFPLAY_DUEL_ADDRESS;
  return value && isAddress(value) ? getAddress(value) : null;
}

export function isBaseDuelConfigured() {
  return Boolean(getProofPlayDuelAddress());
}

export function baseExplorerAddress(address: string) {
  return BASE_SEPOLIA.explorerUrl + "/address/" + address;
}

export function baseExplorerTx(hash: string) {
  return BASE_SEPOLIA.explorerUrl + "/tx/" + hash;
}

export function createFixtureCommitment(fixture: TicketFixture) {
  return sha256(
    toUtf8Bytes(
      [
        "proofplay-fixture-v1",
        fixture.homeTeam,
        fixture.awayTeam,
        fixture.competition,
        fixture.kickoff,
        fixture.matchDate,
        fixture.resolutionUrl,
        fixture.totalGoalsLineTenths,
        fixture.totalCornersLineTenths,
        fixture.totalCardsLineTenths,
      ].join("\x1f"),
    ),
  );
}

export async function approveAndCreateBaseDuel(input: CreateDuelInput) {
  const duelAddress = getProofPlayDuelAddress();
  if (!duelAddress) {
    throw new Error("The Base Sepolia duel contract address is not configured yet.");
  }
  if (!input.wallet.getEthereumProvider || !input.wallet.switchChain) {
    throw new Error("Connect an EVM wallet that can sign Base Sepolia transactions.");
  }
  if (input.impliedProbabilityBps.length !== 14 || input.picks.length !== 6) {
    throw new Error("A complete six-pick ticket and 14 outcome probabilities are required.");
  }

  const fixture = input.fixture;
  const commitmentFields = [
    fixture.homeTeam,
    fixture.awayTeam,
    fixture.competition,
    fixture.matchDate,
    fixture.resolutionUrl,
  ];
  if (
    commitmentFields.some((field) => !field.trim() || field.includes("\x1f")) ||
    fixture.kickoff <= Date.now() / 1000
  ) {
    throw new Error("Use complete fixture metadata without reserved control characters.");
  }
  if (!fixture.resolutionUrl.startsWith("https://")) {
    throw new Error("The fixture evidence source must use HTTPS.");
  }
  if (
    !Number.isInteger(fixture.kickoff) ||
    !Number.isInteger(fixture.totalGoalsLineTenths) ||
    !Number.isInteger(fixture.totalCornersLineTenths) ||
    !Number.isInteger(fixture.totalCardsLineTenths)
  ) {
    throw new Error("Fixture data must use whole-number on-chain values.");
  }

  await input.wallet.switchChain(BASE_SEPOLIA.chainId);
  const ethereumProvider = await input.wallet.getEthereumProvider();
  const provider = new BrowserProvider(
    ethereumProvider as ConstructorParameters<typeof BrowserProvider>[0],
    BASE_SEPOLIA.chainId,
  );
  const signer = await provider.getSigner();
  const stake = parseUnits(input.entryStake, 6);
  if (stake <= BigInt(0)) throw new Error("Enter a positive test-USDC entry.");

  const invitedOpponent = input.invitedOpponent?.trim()
    ? getAddress(input.invitedOpponent.trim())
    : ZeroAddress;
  const token = new Contract(BASE_SEPOLIA.usdcAddress, ERC20_ABI, signer);
  const duel = new Contract(duelAddress, DUEL_ABI, signer);
  const allowance = await token.allowance(await signer.getAddress(), duelAddress);
  let approvalHash: string | undefined;

  if (allowance < stake) {
    const approval = await token.approve(duelAddress, stake);
    approvalHash = approval.hash;
    await approval.wait();
  }

  const fixtureCommitment = createFixtureCommitment(fixture);
  const transaction = await duel.createDuel(
    invitedOpponent,
    fixture.homeTeam,
    fixture.awayTeam,
    fixture.competition,
    BigInt(fixture.kickoff),
    fixture.matchDate,
    fixture.resolutionUrl,
    stake,
    fixture.totalGoalsLineTenths,
    fixture.totalCornersLineTenths,
    fixture.totalCardsLineTenths,
    [...input.impliedProbabilityBps],
    [...input.picks],
  );
  const receipt = await transaction.wait();
  const hash = receipt?.hash ?? transaction.hash;
  let duelId: string | undefined;
  for (const log of receipt?.logs ?? []) {
    try {
      const parsed = duel.interface.parseLog(log);
      if (parsed?.name === "DuelCreated") {
        duelId = parsed.args.duelId.toString();
        break;
      }
    } catch {
      // Ignore unrelated USDC approval and transfer logs.
    }
  }
  return {
    approvalHash,
    duelHash: hash,
    duelId,
    fixtureCommitment,
    explorerUrl: baseExplorerTx(hash),
  };
}

export async function acceptBaseDuel(input: {
  wallet: BaseWallet;
  duelId: string;
  picks: readonly number[];
}) {
  const duelAddress = getProofPlayDuelAddress();
  if (!duelAddress) {
    throw new Error("The Base Sepolia duel contract address is not configured yet.");
  }
  if (!input.wallet.getEthereumProvider || !input.wallet.switchChain) {
    throw new Error("Connect an EVM wallet that can sign Base Sepolia transactions.");
  }
  if (!/^[1-9]\d*$/.test(input.duelId) || input.picks.length !== 6) {
    throw new Error("Enter a valid duel ID and complete all six picks.");
  }

  await input.wallet.switchChain(BASE_SEPOLIA.chainId);
  const ethereumProvider = await input.wallet.getEthereumProvider();
  const provider = new BrowserProvider(
    ethereumProvider as ConstructorParameters<typeof BrowserProvider>[0],
    BASE_SEPOLIA.chainId,
  );
  const signer = await provider.getSigner();
  const duel = new Contract(duelAddress, DUEL_ABI, signer);
  const stake: bigint = await duel.getDuelEntryStake(BigInt(input.duelId));
  const token = new Contract(BASE_SEPOLIA.usdcAddress, ERC20_ABI, signer);
  const allowance: bigint = await token.allowance(await signer.getAddress(), duelAddress);
  let approvalHash: string | undefined;
  if (allowance < stake) {
    const approval = await token.approve(duelAddress, stake);
    approvalHash = approval.hash;
    await approval.wait();
  }
  const transaction = await duel.acceptDuel(BigInt(input.duelId), [...input.picks]);
  const receipt = await transaction.wait();
  const hash = receipt?.hash ?? transaction.hash;
  return { approvalHash, duelHash: hash, explorerUrl: baseExplorerTx(hash) };
}

const OPEN_DUEL_STATUS = BigInt(1);
const MATCHMAKING_SCAN_LIMIT = BigInt(25);

export async function findOrCreateBaseDuel(input: CreateDuelInput) {
  const duelAddress = getProofPlayDuelAddress();
  if (!duelAddress) {
    throw new Error("The Base Sepolia duel contract address is not configured yet.");
  }
  if (!input.wallet.getEthereumProvider || !input.wallet.switchChain) {
    throw new Error("Connect an EVM wallet that can sign Base Sepolia transactions.");
  }

  const stake = parseUnits(input.entryStake, 6);
  if (stake <= BigInt(0)) throw new Error("Enter a positive test-USDC entry.");

  await input.wallet.switchChain(BASE_SEPOLIA.chainId);
  const ethereumProvider = await input.wallet.getEthereumProvider();
  const provider = new BrowserProvider(
    ethereumProvider as ConstructorParameters<typeof BrowserProvider>[0],
    BASE_SEPOLIA.chainId,
  );
  const signer = await provider.getSigner();
  const player = getAddress(await signer.getAddress());
  const duel = new Contract(duelAddress, DUEL_ABI, provider);
  const latestDuelId: bigint = await duel.duelCount();
  const fixtureCommitment = createFixtureCommitment(input.fixture);
  const oldestDuelId = latestDuelId > MATCHMAKING_SCAN_LIMIT
    ? latestDuelId - MATCHMAKING_SCAN_LIMIT + BigInt(1)
    : BigInt(1);

  for (
    let duelId = latestDuelId;
    duelId >= oldestDuelId && duelId > BigInt(0);
    duelId -= BigInt(1)
  ) {
    const state = await duel.getMatchmakingState(duelId);
    const status = BigInt(state.status);
    const creator = getAddress(state.creator);
    const invitedOpponent = getAddress(state.invitedOpponent);
    const kickoff = Number(state.kickoff);
    const candidateStake = BigInt(state.entryStake);
    const candidateCommitment = String(state.fixtureCommitment).toLowerCase();
    if (
      status !== OPEN_DUEL_STATUS ||
      creator === player ||
      invitedOpponent !== ZeroAddress ||
      kickoff <= Date.now() / 1000 ||
      candidateStake !== stake ||
      candidateCommitment !== fixtureCommitment.toLowerCase()
    ) {
      continue;
    }

    try {
      const joined = await acceptBaseDuel({
        wallet: input.wallet,
        duelId: duelId.toString(),
        picks: input.picks,
      });
      return {
        ...joined,
        duelId: duelId.toString(),
        fixtureCommitment,
        matchmakingStatus: "matched" as const,
      };
    } catch (error) {
      if ((error as { code?: string }).code !== "CALL_EXCEPTION") throw error;
      // Another player won the race for this duel. Continue through the queue.
    }
  }

  const created = await approveAndCreateBaseDuel({ ...input, invitedOpponent: null });
  return { ...created, matchmakingStatus: "queued" as const };
}
