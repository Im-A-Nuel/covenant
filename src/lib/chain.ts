import { createPublicClient, createWalletClient, custom, http, erc20Abi, type Address, type EIP1193Provider, type PublicClient } from "viem";
import { baseSepolia } from "viem/chains";

export const CHAIN = baseSepolia;

/** Circle USDC on Base Sepolia */
export const USDC_ADDRESS: Address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

/** Public RPC, overridable via env */
const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL && process.env.NEXT_PUBLIC_RPC_URL.length > 0
    ? process.env.NEXT_PUBLIC_RPC_URL
    : "https://sepolia.base.org";

// Cast to the plain PublicClient alias: baseSepolia is an OP-stack chain whose
// L2 tx formatters widen getBlock's union, which TS otherwise reports as an
// "unrelated" type vs the toolkit's expected PublicClient. Runtime is identical.
export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL),
}) as unknown as PublicClient;

// The provider the user explicitly picked in the wallet chooser (EIP-6963).
// When set, it overrides auto-detection so every request goes to that wallet.
let chosenProvider: EIP1193Provider | undefined;
export function setInjectedProvider(p: EIP1193Provider | undefined) {
  chosenProvider = p;
}

export function getInjected(): EIP1193Provider | undefined {
  if (chosenProvider) return chosenProvider;
  if (typeof window === "undefined") return undefined;
  // Prefer MetaMask if multiple providers are injected.
  const eth = (window as unknown as { ethereum?: EIP1193Provider & { providers?: EIP1193Provider[]; isMetaMask?: boolean } }).ethereum;
  if (!eth) return undefined;
  if (eth.providers?.length) {
    return eth.providers.find((p) => (p as { isMetaMask?: boolean }).isMetaMask) ?? eth.providers[0];
  }
  return eth;
}

export function getWalletClient(account: Address) {
  const provider = getInjected();
  if (!provider) throw new Error("No injected wallet found. Install MetaMask.");
  return createWalletClient({
    account,
    chain: CHAIN,
    transport: custom(provider),
  });
}

/** On-chain USDC balance (raw units, 6 decimals) of an address. */
export async function usdcBalance(address: Address): Promise<bigint> {
  return publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });
}

export const EXPLORER = "https://sepolia.basescan.org";
export const explorerTx = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const explorerAddr = (addr: string) => `${EXPLORER}/address/${addr}`;
