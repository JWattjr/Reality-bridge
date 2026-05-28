import { BrowserProvider, Contract, Interface, JsonRpcProvider, ZeroAddress, formatEther, formatUnits, isAddress, parseUnits } from "ethers";

export const XLAYER_TESTNET = {
  chainId: 1952,
  chainIdHex: "0x7a0",
  name: "X Layer testnet",
  nativeCurrency: {
    decimals: 18,
    name: "OKB",
    symbol: "OKB",
  },
  rpcUrls: ["https://testrpc.xlayer.tech/terigon", "https://xlayertestrpc.okx.com/terigon"],
  explorerUrl: "https://www.okx.com/web3/explorer/xlayer-test",
} as const;

export const FOOTBALL_PREDICTION_ABI = [
  {
    type: "function",
    name: "placePrediction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "selectedOption", type: "uint256" },
      { name: "amountUSDT", type: "uint256" },
    ],
    outputs: [{ name: "predictionId", type: "uint256" }],
  },
  {
    type: "function",
    name: "claimWinnings",
    stateMutability: "nonpayable",
    inputs: [{ name: "predictionId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claimRefund",
    stateMutability: "nonpayable",
    inputs: [{ name: "predictionId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "closeMarket",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "resolveMarket",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "winningOption", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "refundMarket",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "markets",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "gameId", type: "uint256" },
      { name: "title", type: "string" },
      { name: "category", type: "string" },
      { name: "marketType", type: "uint8" },
      { name: "minStake", type: "uint256" },
      { name: "closeTime", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "winningOption", type: "uint256" },
      { name: "totalPool", type: "uint256" },
      { name: "winningPool", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "predictions",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "user", type: "address" },
      { name: "gameId", type: "uint256" },
      { name: "marketId", type: "uint256" },
      { name: "selectedOption", type: "uint256" },
      { name: "amountUSDT", type: "uint256" },
      { name: "timestamp", type: "uint256" },
      { name: "claimed", type: "bool" },
      { name: "resolved", type: "bool" },
      { name: "isCorrect", type: "bool" },
      { name: "pointsEarned", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "marketOptionCount",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "PredictionPlaced",
    inputs: [
      { name: "predictionId", type: "uint256", indexed: true },
      { name: "marketId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "amountUSDT", type: "uint256", indexed: false },
    ],
  },
] as const;

export const TEST_USDT_ABI = [
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
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "faucet",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

export type XLayerWallet = {
  address: string;
  walletClientType?: string;
  connectorType?: string;
  switchChain?: (targetChainId: `0x${string}` | number) => Promise<void>;
  getEthereumProvider?: () => Promise<unknown>;
};

export function isPrivyEmbeddedWallet(wallet?: Partial<XLayerWallet> | null) {
  const walletClientType = wallet?.walletClientType?.toLowerCase();
  const connectorType = wallet?.connectorType?.toLowerCase();
  return connectorType === "embedded" || walletClientType === "privy" || walletClientType === "privy-v2";
}

export function getPrivyEmbeddedXLayerWallet(wallets: readonly XLayerWallet[] = []) {
  return wallets.find(isPrivyEmbeddedWallet);
}

export function getXLayerRpcUrl() {
  return process.env.XLAYER_RPC_URL ?? process.env.NEXT_PUBLIC_XLAYER_RPC_URL ?? XLAYER_TESTNET.rpcUrls[0];
}

export function getFootballPredictionAddress() {
  return validAddress(process.env.NEXT_PUBLIC_FOOTBALL_PREDICTION_ADDRESS);
}

export function getTestUSDTAddress() {
  return validAddress(process.env.NEXT_PUBLIC_TEST_USDT_ADDRESS);
}

export function isXLayerContractsConfigured() {
  return Boolean(getFootballPredictionAddress() && getTestUSDTAddress());
}

export function xLayerExplorerTx(txHash: string) {
  return `${XLAYER_TESTNET.explorerUrl}/tx/${txHash}`;
}

export function xLayerExplorerAddress(address: string) {
  return `${XLAYER_TESTNET.explorerUrl}/address/${address}`;
}

export function usdtAmount(value: string | number) {
  return parseUnits(String(value || 0), 6);
}

export async function getXLayerOKBBalance(address: string) {
  const provider = new JsonRpcProvider(getXLayerRpcUrl(), XLAYER_TESTNET.chainId);
  const balance = await provider.getBalance(address);

  return {
    address,
    chainId: XLAYER_TESTNET.chainId,
    network: XLAYER_TESTNET.name,
    symbol: XLAYER_TESTNET.nativeCurrency.symbol,
    balance: formatEther(balance),
    explorerUrl: xLayerExplorerAddress(address),
  };
}

export async function getXLayerUSDTBalance(address: string): Promise<string> {
  const usdtAddress = getTestUSDTAddress();
  if (!usdtAddress) return "0";
  const provider = new JsonRpcProvider(getXLayerRpcUrl(), XLAYER_TESTNET.chainId);
  const contract = new Contract(usdtAddress, TEST_USDT_ABI, provider);
  try {
    const balance = await contract.balanceOf(address);
    return formatUnits(balance, 6);
  } catch {
    return "0";
  }
}

export async function getBrowserXLayerSigner(wallet: XLayerWallet) {
  if (!isPrivyEmbeddedWallet(wallet)) {
    throw new Error("ProofPlay uses your Privy embedded wallet for bets. External wallets like OKX are not used for placing bets.");
  }

  if (!wallet.switchChain || !wallet.getEthereumProvider) {
    throw new Error("Privy embedded wallet is not ready for X Layer transactions yet.");
  }

  await wallet.switchChain(XLAYER_TESTNET.chainId);
  const eip1193Provider = await wallet.getEthereumProvider();
  const provider = new BrowserProvider(
    eip1193Provider as ConstructorParameters<typeof BrowserProvider>[0],
    XLAYER_TESTNET.chainId,
  );

  return provider.getSigner();
}

export async function approveAndPlacePrediction(input: {
  wallet: XLayerWallet;
  marketId: number;
  optionIndex: number;
  stake: string;
}) {
  const predictionAddress = getFootballPredictionAddress();
  const usdtAddress = getTestUSDTAddress();

  if (!predictionAddress || !usdtAddress) {
    throw new Error("X Layer contracts are not configured yet.");
  }

  const signer = await getBrowserXLayerSigner(input.wallet);
  const userAddress = await signer.getAddress();
  const amount = usdtAmount(input.stake);
  
  const readProvider = getXLayerReadProvider();
  const usdtWrite = new Contract(usdtAddress, TEST_USDT_ABI, signer);
  const gameRead = new Contract(predictionAddress, FOOTBALL_PREDICTION_ABI, readProvider);
  const gameWrite = new Contract(predictionAddress, FOOTBALL_PREDICTION_ABI, signer);

  await assertContractCode(readProvider, usdtAddress, "Test USDT");
  await assertContractCode(readProvider, predictionAddress, "Prediction");

  const marketIssue = await getPlacePredictionIssue(gameRead, input.marketId, input.optionIndex, amount);
  if (marketIssue) {
    throw new Error(marketIssue);
  }

  const currentAllowance = await readErc20Allowance(readProvider, usdtAddress, userAddress, predictionAddress);
  let approvalHash: string | undefined;

  if (currentAllowance < amount) {
    let approval;
    try {
      approval = await usdtWrite.approve(predictionAddress, amount);
    } catch (error) {
      throw new Error(readTokenActionError(error, "approve"));
    }
    approvalHash = approval.hash;
    await approval.wait();
  }

  const tx = await gameWrite.placePrediction(input.marketId, input.optionIndex, amount);
  const receipt = await tx.wait();
  const predictionId = readPredictionId(receipt?.logs ?? []);

  return {
    approvalHash,
    predictionHash: receipt?.hash ?? tx.hash,
    predictionId,
    explorerUrl: xLayerExplorerTx(receipt?.hash ?? tx.hash),
  };
}

export async function claimTestUSDT(wallet: XLayerWallet) {
  const usdtAddress = getTestUSDTAddress();
  if (!usdtAddress) throw new Error("Test USDT contract is not configured yet.");

  const signer = await getBrowserXLayerSigner(wallet);
  const usdt = new Contract(usdtAddress, TEST_USDT_ABI, signer);
  const tx = await usdt.faucet();
  const receipt = await tx.wait();

  return {
    txHash: receipt?.hash ?? tx.hash,
    explorerUrl: xLayerExplorerTx(receipt?.hash ?? tx.hash),
  };
}

export async function claimWinningsOnXLayer(wallet: XLayerWallet, predictionId: string | number) {
  return predictionAction(wallet, "claimWinnings", predictionId);
}

export async function claimRefundOnXLayer(wallet: XLayerWallet, predictionId: string | number) {
  return predictionAction(wallet, "claimRefund", predictionId);
}

export async function closeMarketOnXLayer(wallet: XLayerWallet, marketId: string | number) {
  return marketAction(wallet, "closeMarket", marketId);
}

export async function refundMarketOnXLayer(wallet: XLayerWallet, marketId: string | number) {
  return marketAction(wallet, "refundMarket", marketId);
}

export async function resolveMarketOnXLayer(wallet: XLayerWallet, marketId: string | number, winningOption: string | number) {
  const predictionAddress = getFootballPredictionAddress();
  if (!predictionAddress) throw new Error("Prediction contract is not configured yet.");

  const signer = await getBrowserXLayerSigner(wallet);
  const game = new Contract(predictionAddress, FOOTBALL_PREDICTION_ABI, signer);
  const tx = await game.resolveMarket(BigInt(marketId), BigInt(winningOption));
  const receipt = await tx.wait();

  return {
    txHash: receipt?.hash ?? tx.hash,
    explorerUrl: xLayerExplorerTx(receipt?.hash ?? tx.hash),
  };
}

async function predictionAction(wallet: XLayerWallet, action: "claimWinnings" | "claimRefund", predictionId: string | number) {
  const predictionAddress = getFootballPredictionAddress();
  if (!predictionAddress) throw new Error("Prediction contract is not configured yet.");

  const signer = await getBrowserXLayerSigner(wallet);
  const userAddress = await signer.getAddress();
  
  // Use read provider for preflight checks
  const readProvider = getXLayerReadProvider();
  const gameRead = new Contract(predictionAddress, FOOTBALL_PREDICTION_ABI, readProvider);
  const onChainPredictionId = BigInt(predictionId);
  const preflightIssue = await getPredictionActionIssue(gameRead, action, onChainPredictionId, userAddress);

  if (preflightIssue) {
    throw new Error(preflightIssue);
  }

  const gameWrite = new Contract(predictionAddress, FOOTBALL_PREDICTION_ABI, signer);
  try {
    const tx = await gameWrite[action](onChainPredictionId);
    const receipt = await tx.wait();

    return {
      txHash: receipt?.hash ?? tx.hash,
      explorerUrl: xLayerExplorerTx(receipt?.hash ?? tx.hash),
    };
  } catch (error) {
    throw new Error(readPredictionActionError(error, action));
  }
}

async function marketAction(wallet: XLayerWallet, action: "closeMarket" | "refundMarket", marketId: string | number) {
  const predictionAddress = getFootballPredictionAddress();
  if (!predictionAddress) throw new Error("Prediction contract is not configured yet.");

  const signer = await getBrowserXLayerSigner(wallet);
  const game = new Contract(predictionAddress, FOOTBALL_PREDICTION_ABI, signer);
  const tx = await game[action](BigInt(marketId));
  const receipt = await tx.wait();

  return {
    txHash: receipt?.hash ?? tx.hash,
    explorerUrl: xLayerExplorerTx(receipt?.hash ?? tx.hash),
  };
}

function readPredictionId(logs: Array<{ topics?: readonly string[]; data?: string }>) {
  const contractInterface = new Interface(FOOTBALL_PREDICTION_ABI);

  for (const log of logs) {
    try {
      const parsed = contractInterface.parseLog({
        topics: [...(log.topics ?? [])],
        data: log.data ?? "0x",
      });
      if (parsed?.name === "PredictionPlaced") {
        return parsed.args.predictionId.toString() as string;
      }
    } catch {
      // Ignore logs from other contracts in the receipt.
    }
  }

  return undefined;
}

function validAddress(value?: string) {
  return value && isAddress(value) ? value : null;
}

function getXLayerReadProvider() {
  return new JsonRpcProvider(getXLayerRpcUrl(), XLAYER_TESTNET.chainId);
}

async function assertContractCode(provider: JsonRpcProvider, address: string, label: string) {
  const code = await provider.getCode(address);
  if (!code || code === "0x") {
    throw new Error(`${label} contract was not found at ${address} on X Layer testnet. Check the deployed contract address in env.`);
  }
}

async function readErc20Allowance(provider: JsonRpcProvider, tokenAddress: string, owner: string, spender: string) {
  const tokenInterface = new Interface(TEST_USDT_ABI);
  const data = tokenInterface.encodeFunctionData("allowance", [owner, spender]);

  try {
    const result = await provider.call({ to: tokenAddress, data });
    const [allowance] = tokenInterface.decodeFunctionResult("allowance", result);
    return allowance as bigint;
  } catch (error) {
    throw new Error(readTokenActionError(error, "allowance"));
  }
}

async function getPlacePredictionIssue(game: Contract, marketId: number, optionIndex: number, amount: bigint) {
  try {
    const market = await game.markets(marketId);
    const onChainMarketId = BigInt(market.id);

    if (onChainMarketId <= BigInt(0)) {
      return `Market #${marketId} was not found on-chain. Refresh the match page so it loads the latest synced market ids.`;
    }

    const status = Number(market.status);
    if (status !== 0) {
      return `Market #${marketId} is not open on-chain. Refresh the match page and choose an open market.`;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (BigInt(nowSeconds) >= BigInt(market.closeTime)) {
      return `Market #${marketId} is already closed on-chain.`;
    }

    const optionCount = Number(await game.marketOptionCount(marketId));
    if (optionIndex < 0 || optionIndex >= optionCount) {
      return `That outcome is not available on-chain for market #${marketId}. Refresh the match page and pick again.`;
    }

    const minStake = BigInt(market.minStake);
    if (amount < minStake) {
      return `This market requires at least ${formatUnits(minStake, 6)} Test USDT on-chain. Refresh the match page if that does not match the displayed minimum.`;
    }

    return "";
  } catch (error) {
    return readPredictionPlacementError(error);
  }
}

async function getPredictionActionIssue(
  game: Contract,
  action: "claimWinnings" | "claimRefund",
  predictionId: bigint,
  userAddress: string,
) {
  try {
    const prediction = await game.predictions(predictionId);
    const owner = String(prediction.user ?? ZeroAddress);
    const ownerLower = owner.toLowerCase();

    if (ownerLower === ZeroAddress.toLowerCase()) {
      return `Prediction #${predictionId.toString()} was not found on this X Layer contract. This usually means the app indexed a bet from another deployment.`;
    }

    if (ownerLower !== userAddress.toLowerCase()) {
      return `This bet belongs to ${shortAddress(owner)}, but your Privy wallet is ${shortAddress(userAddress)}. Claim with the wallet that placed the bet.`;
    }

    if (prediction.claimed) {
      return "This bet has already been claimed.";
    }

    const market = await game.markets(prediction.marketId);
    const marketStatus = Number(market.status);

    if (action === "claimRefund") {
      if (marketStatus !== 4) {
        return "This market is not refundable on-chain yet.";
      }
      return "";
    }

    if (!prediction.resolved || marketStatus !== 2) {
      return "This market is not resolved on-chain yet. Resolve it from the admin dashboard using the same X Layer contract, then claim.";
    }

    if (!prediction.isCorrect) {
      return "This pick did not win, so there are no winnings to claim.";
    }

    if (BigInt(market.winningPool) <= BigInt(0)) {
      return "This market has no winning pool on-chain.";
    }

    return "";
  } catch (error) {
    return readPredictionActionError(error, action);
  }
}

function readPredictionActionError(error: unknown, action: "claimWinnings" | "claimRefund") {
  const fallback = action === "claimWinnings" ? "Could not claim winnings on X Layer." : "Could not claim refund on X Layer.";
  const anyError = error as {
    reason?: string;
    shortMessage?: string;
    message?: string;
    info?: { error?: { message?: string } };
  };
  const raw = anyError.reason ?? anyError.shortMessage ?? anyError.info?.error?.message ?? anyError.message ?? "";

  if (raw.includes("Not your pick")) return "This bet was placed by another wallet. Switch to the wallet that placed it.";
  if (raw.includes("No winnings")) return "This pick is not claimable yet or it did not win.";
  if (raw.includes("Claimed") || raw.includes("Already claimed")) return "This bet has already been claimed.";
  if (raw.includes("Market unresolved")) return "This market is not resolved on-chain yet.";
  if (raw.includes("No winning pool")) return "This market has no winning pool on-chain.";
  if (raw.includes("Not refunded")) return "This market is not refundable on-chain yet.";
  if (raw.includes("USDT payout failed")) return "The payout transfer failed. The contract may not have enough Test USDT for this payout.";
  if (raw.includes("missing revert data") || raw.includes("CALL_EXCEPTION")) return fallback;

  return raw || fallback;
}

function readTokenActionError(error: unknown, action: "allowance" | "approve") {
  const fallback =
    action === "allowance"
      ? "Could not read Test USDT allowance on X Layer. Refresh the app and confirm the Test USDT address matches the deployed X Layer token."
      : "Could not approve Test USDT. Confirm your Privy wallet is on X Layer testnet and try again.";
  const anyError = error as {
    reason?: string;
    shortMessage?: string;
    message?: string;
    info?: { error?: { message?: string } };
  };
  const raw = anyError.reason ?? anyError.shortMessage ?? anyError.info?.error?.message ?? anyError.message ?? "";

  if (raw.includes("missing revert data") || raw.includes("CALL_EXCEPTION")) return fallback;
  if (raw.includes("network") || raw.includes("detect network")) return "X Layer RPC is not responding. Try again in a moment.";

  return raw || fallback;
}

function readPredictionPlacementError(error: unknown) {
  const anyError = error as {
    reason?: string;
    shortMessage?: string;
    message?: string;
    info?: { error?: { message?: string } };
  };
  const raw = anyError.reason ?? anyError.shortMessage ?? anyError.info?.error?.message ?? anyError.message ?? "";

  if (raw.includes("Market not found")) return "This market was not found on-chain. Refresh the match page so it loads the latest synced market ids.";
  if (raw.includes("Market not open")) return "This market is not open on-chain.";
  if (raw.includes("Market closed")) return "This market is already closed on-chain.";
  if (raw.includes("Bad option")) return "That outcome is not available on-chain for this market.";
  if (raw.includes("Stake too low")) return "Your stake is below the on-chain minimum for this market. Refresh the match page and try again.";
  if (raw.includes("USDT transfer failed")) return "The Test USDT transfer failed. Check your balance and allowance, then try again.";
  if (raw.includes("missing revert data") || raw.includes("CALL_EXCEPTION")) return "Could not verify this market on X Layer. Refresh the match page and try again.";

  return raw || "Could not verify this market on X Layer. Refresh the match page and try again.";
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
