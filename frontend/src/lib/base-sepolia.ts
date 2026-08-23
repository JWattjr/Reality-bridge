import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  formatUnits,
  isAddress,
  parseUnits,
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
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const MARKET_ABI = [
  {
    type: "function",
    name: "placePrediction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint8" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export type BaseWallet = {
  address: string;
  getEthereumProvider?: () => Promise<unknown>;
  switchChain?: (chainId: number | `0x${string}`) => Promise<void>;
};

export function getProofPlayMarketAddress() {
  const value = process.env.NEXT_PUBLIC_PROOFPLAY_MARKET_ADDRESS;
  return value && isAddress(value) ? value : null;
}

export function isBaseMarketConfigured() {
  return Boolean(getProofPlayMarketAddress());
}

export function baseExplorerAddress(address: string) {
  return `${BASE_SEPOLIA.explorerUrl}/address/${address}`;
}

export function baseExplorerTx(hash: string) {
  return `${BASE_SEPOLIA.explorerUrl}/tx/${hash}`;
}

export async function getBaseSepoliaUsdcBalance(address: string) {
  const provider = new JsonRpcProvider(BASE_SEPOLIA.rpcUrl, BASE_SEPOLIA.chainId);
  const usdc = new Contract(BASE_SEPOLIA.usdcAddress, ERC20_ABI, provider);
  return formatUnits(await usdc.balanceOf(address), 6);
}

export async function approveAndPlaceBasePrediction(input: {
  wallet: BaseWallet;
  marketId: number;
  outcome: 1 | 2 | 3;
  stake: string;
}) {
  const marketAddress = getProofPlayMarketAddress();
  if (!marketAddress) throw new Error("Base market address is not configured yet.");
  if (!input.wallet.getEthereumProvider || !input.wallet.switchChain) {
    throw new Error("Connect a Privy wallet that can sign Base Sepolia transactions.");
  }

  await input.wallet.switchChain(BASE_SEPOLIA.chainId);
  const ethereumProvider = await input.wallet.getEthereumProvider();
  const provider = new BrowserProvider(
    ethereumProvider as ConstructorParameters<typeof BrowserProvider>[0],
    BASE_SEPOLIA.chainId,
  );
  const signer = await provider.getSigner();
  const amount = parseUnits(input.stake, 6);
  if (amount <= BigInt(0)) throw new Error("Enter a positive USDC stake.");

  const token = new Contract(BASE_SEPOLIA.usdcAddress, ERC20_ABI, signer);
  const market = new Contract(marketAddress, MARKET_ABI, signer);
  const allowance = await token.allowance(await signer.getAddress(), marketAddress);
  let approvalHash: string | undefined;

  if (allowance < amount) {
    const approval = await token.approve(marketAddress, amount);
    approvalHash = approval.hash;
    await approval.wait();
  }

  const transaction = await market.placePrediction(BigInt(input.marketId), input.outcome, amount);
  const receipt = await transaction.wait();
  const hash = receipt?.hash ?? transaction.hash;
  return { approvalHash, predictionHash: hash, explorerUrl: baseExplorerTx(hash) };
}
