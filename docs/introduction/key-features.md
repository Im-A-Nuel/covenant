# Key Features

> What Covenant ships, at a glance. Each feature links to where it is documented in depth.

## 🔐 Two-layer enforcement

Hard limits (budget, expiry) are enforced **on-chain** by MetaMask's audited `DelegationManager`; intent
rules (service, purpose, verified, duplicate, per-request, active) are enforced by an **off-chain policy
firewall** that runs before any payment. A bypass of one layer is still caught by the other.
→ [Security model](../core-concepts/security-model.md)

## ⛓️ Fused x402 + ERC-7710

The USDC transfer that satisfies x402's payment proof **is** the ERC-7710 redemption — one transaction,
constrained by the covenant's caveats and re-verified on-chain by the seller. Not two features side by
side. → [x402 + ERC-7710](../core-concepts/x402-and-erc-7710.md)

## 🤖 Autonomous agent loop

Plan (Venice AI) → hit a `402` → vet against the covenant → redeem → verify → consume → report — with
**no human in the loop** for in-policy payments. → [How It Works](../core-concepts/how-it-works.md)

## ✋ Approve-once for over-limit payments

When a payment fails *only* the soft per-request cap, the run **pauses** for a one-time
**Approve once & pay** / **Cancel** — a human speed-bump that the on-chain budget still contains.
→ [How It Works → The three decisions](../core-concepts/how-it-works.md#the-three-decisions)

## 🚦 Real payment firewall

Seven checks — budget, per-request, allowed service, verified seller, purpose, no-duplicate, active —
resolve to **approved / needs approval / blocked**. A blocked payment never builds a transaction.
→ [Technical reference → policy.ts](../architecture/technical-reference.md#libpolicyts--the-firewall)

## 🪪 Real signatures & redemption

A real **EIP-712** signature on covenant creation; a real **`redeemDelegations`** that broadcasts on
Base Sepolia and **waits for the receipt**; on-chain **USDC `Transfer` verification** by the seller.
→ [How It Works](../core-concepts/how-it-works.md)

## 🧾 Honest, exportable audit trail

Every attempt — approved, held, or blocked — is logged with its reason, cost, the permission used, and
the on-chain proof (BaseScan link for real txs), and exports to JSON.
→ [Real vs Simulated](../core-concepts/real-vs-simulated.md)

## 🏷️ Real-vs-simulated honesty

Every step is badged `real` / `on-chain` / `simulated`. A settlement is marked `on-chain` only when the
redemption broadcast succeeded **and** the seller verified it. Strict mode (`X402_REQUIRE_ONCHAIN`) can
hold the paywall until a payment is verified on-chain. → [Real vs Simulated](../core-concepts/real-vs-simulated.md)

## 🚀 Deploy & fund without a bundler

The **Settlement readiness** panel deploys the smart account (one ordinary EOA tx — no ERC-4337 bundler)
and shows its USDC balance with a faucet link, taking a covenant all the way to a real settlement.
→ [Going On-Chain](../getting-started/going-on-chain.md)

## 🧠 Venice AI planning & reporting

The agent's reasoning — task planning and report generation — runs through Venice AI, proxied
server-side (key never touches the client) with a graceful mock fallback.
→ [Architecture](../architecture/system-architecture.md)

## 🧩 No custom smart contracts

Covenant deploys **nothing** of its own to the chain. It composes MetaMask's audited, pre-deployed
`DelegationManager`, DeleGator account, and caveat enforcers. → [System Architecture](../architecture/system-architecture.md)
