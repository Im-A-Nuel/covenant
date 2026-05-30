import {
  Implementation,
  toMetaMaskSmartAccount,
  type MetaMaskSmartAccount,
} from "@metamask/delegation-toolkit";
import type { Address } from "viem";
import { publicClient, getWalletClient } from "./chain";

export type SmartAccount = MetaMaskSmartAccount;

/**
 * Create the user's MetaMask Smart Account (ERC-7710 DeleGator).
 * The connected EOA is the owner/signer. Address is counterfactual until
 * first deployment, but can sign delegations immediately.
 */
export async function createUserSmartAccount(owner: Address): Promise<SmartAccount> {
  const walletClient = getWalletClient(owner);
  const account = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [owner, [], [], []],
    deploySalt: "0x",
    signer: { walletClient },
  });
  return account;
}

export async function isDeployed(address: Address): Promise<boolean> {
  const code = await publicClient.getCode({ address });
  return !!code && code !== "0x";
}

/**
 * Deploy the smart account on-chain. The owner EOA submits a single regular
 * transaction to the account factory (no ERC-4337 bundler needed) and pays gas.
 * Required before a delegation can actually be redeemed on-chain, because the
 * DelegationManager must call into a deployed delegator to execute the transfer.
 */
export async function deploySmartAccount(owner: Address, smartAccount: SmartAccount): Promise<`0x${string}`> {
  const { factory, factoryData } = await smartAccount.getFactoryArgs();
  if (!factory || !factoryData) {
    throw new Error("No factory args available — the smart account may already be deployed.");
  }
  const walletClient = getWalletClient(owner);
  const hash = await walletClient.sendTransaction({ to: factory, data: factoryData });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
