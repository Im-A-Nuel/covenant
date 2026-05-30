import { NextResponse } from "next/server";

/**
 * Demo x402-enabled paid API.
 *
 * GET without a valid `X-PAYMENT` header  -> 402 Payment Required (x402 envelope).
 * GET with an `X-PAYMENT` header          -> 200 with the paid resource.
 *
 * The 402 envelope follows the x402 `accepts` shape so the client can build a
 * policy decision and an ERC-7710 redemption against it.
 */

const PRICE_USDC = 0.25;
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
// Demo seller / facilitator receiving address (verified service in this demo).
const PAY_TO = process.env.X402_PAY_TO || "0x000000000000000000000000000000000000dEaD";

function priceToUnits(p: number) {
  return BigInt(Math.round(p * 1e6)).toString();
}

export async function GET(req: Request) {
  const payment = req.headers.get("x-payment");

  if (!payment) {
    return NextResponse.json(
      {
        x402Version: 1,
        error: "Payment Required",
        accepts: [
          {
            scheme: "exact",
            network: "base-sepolia",
            maxAmountRequired: priceToUnits(PRICE_USDC),
            resource: "/api/x402/sentiment",
            description: "ETH short-term sentiment report (paid)",
            mimeType: "application/json",
            payTo: PAY_TO,
            asset: USDC_BASE_SEPOLIA,
            assetName: "USDC",
            maxTimeoutSeconds: 120,
            extra: { decimals: 6, purpose: "research-data-purchase", verified: true },
          },
        ],
      },
      { status: 402, headers: { "x-accept-payment": "exact base-sepolia USDC" } }
    );
  }

  // Payment proof present (tx hash or simulated proof) -> deliver the resource.
  return NextResponse.json(
    {
      paid: true,
      paymentProof: payment,
      resource: {
        asset: "ETH",
        horizon: "short-term",
        sentimentScore: -0.22,
        sentimentLabel: "slightly negative",
        fundingRate: "elevated",
        socialVolume: "rising",
        confidence: 0.71,
        note: "Aggregated paid sentiment + derivatives funding. Mild downside risk, no structural red flags.",
        generatedAt: new Date().toISOString(),
      },
    },
    { status: 200, headers: { "x-payment-response": "settled" } }
  );
}
