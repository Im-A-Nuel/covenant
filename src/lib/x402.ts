import type { Address } from "viem";
import type { PaymentRequest } from "./types";
import { uid } from "./utils";

interface X402Accept {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  payTo: string;
  asset: string;
  extra?: { decimals?: number; purpose?: string; verified?: boolean };
}

/** Call the paid service. Returns either the delivered data or a 402 paywall. */
export async function requestPaidData(
  endpoint = "/api/x402/sentiment"
): Promise<
  | { status: "ok"; data: unknown }
  | { status: "paywall"; payment: PaymentRequest; endpoint: string }
> {
  const res = await fetch(endpoint, { headers: { accept: "application/json" } });
  if (res.status === 402) {
    const body = await res.json();
    const accept: X402Accept = body.accepts?.[0];
    const decimals = accept.extra?.decimals ?? 6;
    const price = Number(accept.maxAmountRequired) / 10 ** decimals;
    const payment: PaymentRequest = {
      id: uid("pay"),
      service: new URL(endpoint, "http://x").pathname.replace("/api/x402/", "").replace(/\//g, "-") + ".demo",
      resource: accept.description,
      price,
      token: "USDC",
      payTo: accept.payTo as Address,
      purpose: accept.extra?.purpose ?? "research-data-purchase",
      scheme: accept.scheme,
      network: accept.network,
      verified: accept.extra?.verified ?? false,
      raw402: body,
    };
    return { status: "paywall", payment, endpoint };
  }
  const data = await res.json();
  return { status: "ok", data };
}

export interface DeliveryResult {
  delivered: boolean;
  /** Server confirmed the payment settled on-chain (real USDC transfer to the seller). */
  verified: boolean;
  settlement: "on-chain" | "unverified";
  payer?: string;
  amountVerified?: string;
  verifyNote?: string;
  resource?: unknown;
  raw: unknown;
}

/**
 * Re-request the resource with a payment proof (redemption tx hash) in the
 * X-PAYMENT header. The server verifies the proof on-chain and returns whether
 * settlement was real ("on-chain") or could not be verified ("unverified").
 */
export async function settleAndDeliver(endpoint: string, paymentProof: string): Promise<DeliveryResult> {
  const res = await fetch(endpoint, {
    headers: { accept: "application/json", "x-payment": paymentProof },
  });
  const body = (await res.json().catch(() => ({}))) as {
    paid?: boolean;
    verified?: boolean;
    settlement?: "on-chain" | "unverified";
    payer?: string;
    amountVerified?: string;
    verifyNote?: string;
    resource?: unknown;
  };

  // Strict mode keeps the paywall up (402) when the payment can't be verified.
  if (res.status === 402) {
    return { delivered: false, verified: false, settlement: "unverified", raw: body };
  }

  return {
    delivered: !!body.paid,
    verified: !!body.verified,
    settlement: body.settlement ?? "unverified",
    payer: body.payer,
    amountVerified: body.amountVerified,
    verifyNote: body.verifyNote,
    resource: body.resource,
    raw: body,
  };
}
