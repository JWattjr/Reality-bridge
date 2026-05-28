import { BrowserProvider, Contract, Interface, JsonRpcProvider, formatEther, formatUnits, isAddress, parseUnits } from "ethers";

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
  switchChain?: (targetChainId: `0x${string}` | number) => Promise<void>;
  getEthereumProvider?: () => Promise<unknown>;
};

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
  if (!wallet.switchChain || !wallet.getEthereumProvider) {
    throw new Error("Connected wallet does not support X Layer transactions.");
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
  const usdt = new Contract(usdtAddress, TEST_USDT_ABI, signer);
  const game = new Contract(predictionAddress, FOOTBALL_PREDICTION_ABI, signer);

  const currentAllowance = (await usdt.allowance(userAddress, predictionAddress)) as bigint;
  let approvalHash: string | undefined;

  if (currentAllowance < amount) {
    const approval = await usdt.approve(predictionAddress, amount);
    approvalHash = approval.hash;
    await approval.wait();
  }

  const tx = await game.placePrediction(input.marketId, input.optionIndex, amount);
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
  const game = new Contract(predictionAddress, FOOTBALL_PREDICTION_ABI, signer);
  const tx = await game[action](BigInt(predictionId));
  const receipt = await tx.wait();

  return {
    txHash: receipt?.hash ?? tx.hash,
    explorerUrl: xLayerExplorerTx(receipt?.hash ?? tx.hash),
  };
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
