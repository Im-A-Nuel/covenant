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
