# Covenant — Policy-Bound x402 Payments for Autonomous Agents

> Let agents pay, but only under covenant.

Giving an AI agent a wallet is like giving a toddler an uncapped credit card — one prompt injection or
runaway loop can drain it. **Covenant is the safety layer for self-paying agents.** A user signs one
spending policy (the *covenant*); from then on the agent can pay for
[x402](https://x402.org) services autonomously using **ERC-7710 delegated permissions** from a
**MetaMask Smart Account** — but it can never step outside that policy. Even if the agent is fully
compromised, it cannot exceed the budget or spend after the covenant expires, because those limits are
enforced by MetaMask's audited smart contracts, not by our code.

**Tracks:** Best x402 + ERC-7710 · Best Agent · Best use of Venice AI

📚 **Full documentation:** see [`docs/`](./docs/) — background, problem, solution, architecture, the
two-layer security model, technical reference, the x402 ↔ ERC-7710 integration, demo guide, and roadmap.

## Two layers of defense

Covenant enforces the policy in two places, so a bypass of one is still caught by the other:

| Layer | Enforces | Where |
| --- | --- | --- |
| **On-chain caveats** (ERC-7710) | Hard budget cap · covenant expiry | `ERC20TransferAmountEnforcer` + `TimestampEnforcer` baked into the signed delegation |
| **Off-chain policy engine** | Per-request cap · service allow-list · verified seller · purpose · duplicates · active window | `src/lib/policy.ts`, runs before any redemption |

The budget cap and the expiry are **cryptographically enforced**: the DelegationManager rejects any
redemption that exceeds the budget or happens after the window — regardless of what our server does.

## The flow

```
User signs a Covenant
  → ERC-7710 delegation with 2 on-chain caveats: erc20TransferAmount (budget) + timestamp (expiry)
        ↓
Agent gets a task → Venice AI plans it
        ↓
Agent calls an x402 service → 402 Payment Required (real envelope: price, asset=USDC, payTo)
        ↓
Policy Engine checks: budget · per-request · service · verified seller · purpose · duplicate · active
        ↓
  ── blocked / needs-approval → STOP. No funds move. Recorded in the audit trail.
  └─ approved ↓
redeemDelegations() → USDC transfer settles on Base Sepolia (waits for the receipt)
        ↓
Agent re-requests the resource with the tx hash → the x402 server VERIFIES the transfer on-chain
        ↓
Paid data delivered → Venice AI writes the report → everything lands in the Audit Trail (BaseScan links)
```

## What "real" means here (honesty matters)

The app is honest about what is on-chain vs simulated, and shows a badge at every step:

- **Real whenever a wallet is on Base Sepolia:** smart-account derivation, the covenant delegation +
  its caveats, and the **MetaMask EIP-712 signature**.
- **Real on-chain settlement** when the smart account is **deployed and funded with USDC**: the
  redemption broadcasts a real `redeemDelegations` tx, Covenant **waits for the receipt**, and the
  x402 server **verifies the USDC `Transfer` to the seller** before delivering the resource. The audit
  entry is marked `on-chain` only when the broadcast succeeded **and** the seller verified the payment.
- **Simulated** otherwise (no wallet / undeployed / unfunded): the flow still runs end-to-end with a
  synthetic tx hash, clearly labeled `simulated`. Nothing pretends to be on-chain when it isn't.

The **Settlement readiness** panel in the Task Console deploys the smart account and shows its USDC
balance + a faucet link, so you can take a covenant all the way to a real settlement.

## Where each requirement is met

| Requirement | Implementation |
| --- | --- |
| MetaMask Smart Accounts Kit | `src/lib/smart-account.ts` — `toMetaMaskSmartAccount` (Hybrid) + deploy via factory |
| ERC-7710 delegation | `src/lib/delegation.ts` — `createDelegation` + `signDelegation` (real EIP-712), budget **and** expiry caveats |
| ERC-7710 redemption | `src/lib/delegation.ts` — `redeemDelegations` (USDC transfer), waits for receipt |
| x402 (protocol) | `src/app/api/x402/sentiment/route.ts` — real 402 envelope + `src/lib/x402.ts` client |
| x402 (on-chain settlement) | same route — verifies the redemption tx (USDC `Transfer` to seller ≥ price) on Base Sepolia |
| Policy firewall | `src/lib/policy.ts` — blocks before any redemption |
| Venice AI | `src/app/api/venice/route.ts` + `src/lib/venice.ts` (planner + report) |

### How x402 and ERC-7710 lock together

The 402 envelope advertises `asset` (USDC), `maxAmountRequired`, and `payTo`. Covenant builds the
`redeemDelegations` execution **directly from that envelope** — the USDC `transfer(payTo, amount)`
becomes the delegated execution, redeemed under the covenant's caveats. The resulting tx hash is then
handed back to the x402 server as the payment proof, which the server verifies on-chain. The two specs
aren't two separate features bolted together — x402 is the payment rail and ERC-7710 is the guardrail
on it.

## Demo

```bash
npm install
cp .env.example .env.local   # optional: VENICE_API_KEY for real AI; X402_PAY_TO for the seller
npm run dev
```

Open http://localhost:3000 → **Launch the demo**.

**See the firewall block (no wallet needed):** Task Console → pick the **Compliance Bot** covenant →
Run. The payment violates its service allow-list, purpose, and per-request cap, so the policy engine
**blocks it live** (red ✗ on each failed rule) before any redemption.

**Take it on-chain (Base Sepolia):**
1. Connect MetaMask on Base Sepolia and create a covenant — this prompts a **real ERC-7710 signature**.
2. Task Console → **Settlement readiness** panel → **Deploy** the smart account, then **Fund** it with
   testnet USDC (faucet link provided).
3. Run a task. The redemption broadcasts on-chain, the server verifies the USDC transfer, and the
   audit entry shows an **`on-chain`** badge with a **BaseScan link** to the real transaction.

> Set `X402_REQUIRE_ONCHAIN=true` to run the x402 server in strict mode: the paywall (402) stays up
> until a payment is verified on-chain — a clean way to prove the gate is real.

## Covenant lifecycle

A covenant is `active`, then becomes `depleted` (budget spent), `expired` (past its window), or
`revoked` (user revokes from the covenant card). Every decision — approved / blocked / needs-approval —
is recorded in the audit trail with the reason, cost, permission used, and on-chain proof, and can be
exported as JSON.

## Env (`.env.local`, all optional — the app runs without them)

- `VENICE_API_KEY`, `VENICE_MODEL` (default `llama-3.3-70b`), `VENICE_BASE_URL`
- `NEXT_PUBLIC_RPC_URL` (default `https://sepolia.base.org`)
- `X402_PAY_TO` (demo seller address) · `X402_REQUIRE_ONCHAIN` (`true` = strict on-chain gate)

## Stack

Next.js 16 · React 19 · Tailwind v4 · viem · `@metamask/delegation-toolkit` · Venice AI · Base Sepolia
