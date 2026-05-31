import {
  createDelegation,
  createExecution,
  redeemDelegations,
  ExecutionMode,
  type Delegation,
} from "@metamask/delegation-toolkit";
import { encodeFunctionData, erc20Abi, type Address, type Hex } from "viem";
import type { SmartAccount } from "./smart-account";
import { publicClient, getWalletClient, USDC_ADDRESS } from "./chain";
import { toUnits } from "./utils";

export interface SignedDelegation {
  delegation: Delegation;
  signature: Hex;
  delegationManager: Address;
  chainId: number;
}

/**
 * Create + sign a Covenant: an ERC-7710 delegation from the user's smart account
 * to the agent's executor, scoped to spend at most `budgetUSDC` of USDC.
 * The on-chain caveat (erc20TransferAmount) is the HARD cap; the off-chain
 * policy engine enforces the finer rules (per-request, service, purpose...).
 *
 * Signing triggers a real MetaMask EIP-712 signature.
 */
export async function createCovenantDelegation(
  smartAccount: SmartAccount,
  delegate: Address,
  budgetUSDC: number
): Promise<SignedDelegation> {
  const delegation = createDelegation({
    environment: smartAccount.environment,
    from: smartAccount.address,
    to: delegate,
    scope: {
      type: "erc20TransferAmount",
      tokenAddress: USDC_ADDRESS,
      maxAmount: toUnits(budgetUSDC),
    },
  });

  const signature = await smartAccount.signDelegation({ delegation });

  return {
    delegation: { ...delegation, signature },
    signature,
    delegationManager: smartAccount.environment.DelegationManager,
    chainId: publicClient.chain!.id,
  };
}

export interface ExecutionResult {
  mode: "real" | "simulated";
  transactionHash: string;
  note?: string;
}

/**
 * Redeem the covenant delegation to pay `amountUSDC` to `payTo`.
 * Builds a USDC transfer execution and redeems it through the DelegationManager.
 * Falls back to a simulated settlement if the delegate cannot broadcast
 * (e.g. smart account not yet deployed / unfunded on testnet).
 */
export async function executeCovenantPayment(
  signed: SignedDelegation,
  delegateEOA: Address,
  payTo: Address,
  amountUSDC: number
): Promise<ExecutionResult> {
  const callData = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [payTo, toUnits(amountUSDC)],
  });

  const execution = createExecution({ target: USDC_ADDRESS, value: 0n, callData });

  try {
    const walletClient = getWalletClient(delegateEOA);
    const txHash = await redeemDelegations(
      walletClient,
      publicClient,
      signed.delegationManager,
      [
        {
          permissionContext: [signed.delegation],
          executions: [execution],
          mode: ExecutionMode.SingleDefault,
        },
      ]
    );
    // Wait for the redemption to mine so the x402 server can verify the USDC
    // transfer on-chain. A reverted receipt is treated as a failed redemption.
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      throw new Error("redemption reverted on-chain");
    }
    return { mode: "real", transactionHash: txHash };
  } catch (e) {
    // Graceful fallback: keep the real signed delegation, simulate settlement.
    const synthetic = simulatedHash(signed.signature, amountUSDC, payTo);
    return {
      mode: "simulated",
      transactionHash: synthetic,
      note: `On-chain redemption unavailable (${truncate((e as Error).message)}). Settlement simulated. Delegation and signature are real.`,
    };
  }
}

function simulatedHash(sig: Hex, amount: number, payTo: string): Hex {
  // Deterministic pseudo-hash derived from the real signature for traceability.
  const seed = `${sig}${amount}${payTo}`;
  let h = 0n;
  for (let i = 0; i < seed.length; i++) h = (h * 131n + BigInt(seed.charCodeAt(i))) % (1n << 256n);
  return ("0x" + h.toString(16).padStart(64, "0")) as Hex;
}

function truncate(s: string, n = 80) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/** JSON-safe view of a delegation for display. */
export function delegationSummary(signed: SignedDelegation) {
  return {
    delegator: signed.delegation.delegator,
    delegate: signed.delegation.delegate,
    authority: signed.delegation.authority,
    caveats: signed.delegation.caveats.length,
    signature: signed.signature,
    delegationManager: signed.delegationManager,
    chainId: signed.chainId,
  };
}
