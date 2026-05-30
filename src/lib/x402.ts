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
      raw402: body,
    };
    return { status: "paywall", payment, endpoint };
  }
  const data = await res.json();
  return { status: "ok", data };
}

/** Re-request the resource with a payment proof (tx hash) in the X-PAYMENT header. */
export async function settleAndDeliver(endpoint: string, paymentProof: string): Promise<unknown> {
  const res = await fetch(endpoint, {
    headers: { accept: "application/json", "x-payment": paymentProof },
  });
  return res.json();
}
