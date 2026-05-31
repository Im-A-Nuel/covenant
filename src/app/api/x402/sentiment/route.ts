import { NextResponse } from "next/server";
import { erc20Abi, isHash, parseEventLogs, type Hash } from "viem";
import { publicClient, USDC_ADDRESS } from "@/lib/chain";

/**
 * Demo x402-enabled paid API with REAL on-chain payment verification.
 *
 * GET without `X-PAYMENT`            -> 402 Payment Required (x402 envelope).
 * GET with `X-PAYMENT: <txHash>`     -> verify the tx on Base Sepolia, then:
 *    - if a USDC Transfer to the seller for >= the price is found -> 200, settlement "on-chain".
 *    - else (no real tx / simulated hash) -> 200 with settlement "unverified" so the
 *      funds-free demo still delivers, clearly labeled (honest dual-mode), UNLESS
 *      X402_REQUIRE_ONCHAIN=true, in which case the paywall stays up (402).
 *
 * The 402 envelope follows the x402 `accepts` shape so the client can build a
 * policy decision and an ERC-7710 redemption against it.
 */

const PRICE_USDC = 0.25;
// Demo seller / facilitator receiving address (verified service in this demo).
const PAY_TO = (process.env.X402_PAY_TO || "0x000000000000000000000000000000000000dEaD").toLowerCase();
const REQUIRE_ONCHAIN = process.env.X402_REQUIRE_ONCHAIN === "true";

function priceUnits(p: number): bigint {
  return BigInt(Math.round(p * 1e6));
}

interface Verification {
  verified: boolean;
  settlement: "on-chain" | "unverified";
  txHash?: string;
  payer?: string;
  amount?: string;
  reason?: string;
}

/**
 * Verify a payment proof against Base Sepolia. The proof is a redemption tx hash
 * (raw, or inside a JSON envelope `{ txHash }`). We look up its receipt and confirm
 * a USDC `Transfer` to the seller for at least the asking price. This is what makes
 * the x402 settlement real rather than trust-the-header.
 */
async function verifyPayment(proof: string): Promise<Verification> {
  let txHash = proof.trim();
  if (txHash.startsWith("{")) {
    try {
      txHash = (JSON.parse(txHash) as { txHash?: string }).txHash ?? "";
    } catch {
      /* fall through */
    }
  }

  if (!isHash(txHash)) {
    return { verified: false, settlement: "unverified", reason: "No on-chain tx hash in payment proof." };
  }

  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as Hash });
    if (receipt.status !== "success") {
      return { verified: false, settlement: "unverified", txHash, reason: "Settlement transaction reverted." };
    }

    const transfers = parseEventLogs({ abi: erc20Abi, eventName: "Transfer", logs: receipt.logs });
    const need = priceUnits(PRICE_USDC);
    const match = transfers.find(
      (l) =>
        l.address.toLowerCase() === USDC_ADDRESS.toLowerCase() &&
        String(l.args.to).toLowerCase() === PAY_TO &&
        (l.args.value as bigint) >= need
    );

    if (!match) {
      return {
        verified: false,
        settlement: "unverified",
        txHash,
        reason: "No USDC transfer to the seller for the required amount in this transaction.",
      };
    }

    return {
      verified: true,
      settlement: "on-chain",
      txHash,
      payer: String(match.args.from),
      amount: (match.args.value as bigint).toString(),
    };
  } catch {
    return {
      verified: false,
      settlement: "unverified",
      txHash,
      reason: "Transaction not found on-chain (likely a simulated settlement).",
    };
  }
}

function paywall() {
  return NextResponse.json(
    {
      x402Version: 1,
      error: "Payment Required",
      accepts: [
        {
          scheme: "exact",
          network: "base-sepolia",
          maxAmountRequired: priceUnits(PRICE_USDC).toString(),
          resource: "/api/x402/sentiment",
          description: "ETH short-term sentiment report (paid)",
          mimeType: "application/json",
          payTo: PAY_TO,
          asset: USDC_ADDRESS,
          assetName: "USDC",
          maxTimeoutSeconds: 120,
          extra: { decimals: 6, purpose: "research-data-purchase", verified: true },
        },
      ],
    },
    { status: 402, headers: { "x-accept-payment": "exact base-sepolia USDC" } }
  );
}

export async function GET(req: Request) {
  const payment = req.headers.get("x-payment");
  if (!payment) return paywall();

  const v = await verifyPayment(payment);

  // Strict mode: only real, verified on-chain settlement unlocks the resource.
  if (!v.verified && REQUIRE_ONCHAIN) return paywall();

  return NextResponse.json(
    {
      paid: true,
      verified: v.verified,
      settlement: v.settlement, // "on-chain" | "unverified"
      paymentProof: v.txHash ?? payment,
      payer: v.payer,
      amountVerified: v.amount,
      verifyNote: v.reason,
      resource: {
        asset: "ETH",
        horizon: "short-term",
        sentimentScore: -0.22,
        sentimentLabel: "slightly negative",
        fundingRate: "elevated",
        socialVolume: "rising",
        confidence: 0.71,
        note: "Aggregated paid sentiment + derivatives funding. Mild downside risk, no structural red flags.",
      },
    },
    {
      status: 200,
      headers: { "x-payment-response": v.verified ? "settled" : "unverified" },
    }
  );
}
