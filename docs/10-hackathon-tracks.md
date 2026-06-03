# 10 · Hackathon tracks

> How Covenant maps to each track it targets, and why the design is a strong fit rather than a checkbox.

**Primary:** Best x402 + ERC-7710 · **Also:** Best Agent · Best use of Venice AI

---

## 🏆 Best x402 + ERC-7710 (primary)

The thesis: don't integrate the two specs *side by side* — **fuse them into one transaction.**

| What judges look for | How Covenant delivers |
| --- | --- |
| Real x402 protocol use | A genuine **402 envelope** (`accepts[]` with `scheme/network/maxAmountRequired/payTo/asset/extra`) and an `X-PAYMENT` retry, served by `api/x402/sentiment`. |
| Real ERC-7710 use | A real **`createDelegation` + `signDelegation`** (EIP-712) with **two caveats** (budget via `ERC20TransferAmountEnforcer`, expiry via `TimestampEnforcer`) and a real **`redeemDelegations`**. |
| The two working *together* | The **redemption execution is built directly from the 402 envelope** — the USDC `transfer(payTo, amount)` is the delegated action, capped by the caveats. The resulting tx hash is the x402 payment proof, which the server **re-verifies on-chain**. One transaction, both specs. See [08 · x402 + ERC-7710](./08-x402-and-erc7710.md). |
| On-chain settlement | `redeemDelegations` broadcasts on Base Sepolia, the receipt is awaited, and the seller verifies the USDC `Transfer ≥ price` before delivering. Honestly badged `on-chain` only when both happen. |
| Audited, no-foot-gun contracts | Uses MetaMask's **pre-deployed, audited** `DelegationManager` + DeleGator; **no custom Solidity**. |

**The differentiator:** the budget and expiry are **cryptographically enforced** by the
`DelegationManager`, so a compromised agent cannot exceed them. That is a substantive safety claim, not
a demo gimmick — and it is exactly the point where x402 (the rail) and ERC-7710 (the guardrail) meet.

## 🤖 Best Agent

Covenant is a complete **autonomous agent loop** with a safety contract:

- **Plans** a natural-language task (Venice AI) → **discovers** it needs paid data → **pays** for an
  x402 service on its own → **verifies + consumes** the data → **reports**.
- **No human in the loop** for in-policy payments — true autonomy.
- **Safe autonomy:** the agent operates inside a signed covenant; the one place a human is asked
  (`needs_user`) is a deliberate soft speed-bump, and even that is bounded by the on-chain budget.
- **Accountable:** every action — approved, held, or blocked — lands in an exportable audit trail with
  the reason and on-chain proof.

The pitch: *not just an agent that can pay, but an agent you can actually trust with a wallet.*

## 🧠 Best use of Venice AI

Venice AI is the agent's reasoning layer, used in two places (`lib/venice.ts` → `api/venice`):

- **`planTask`** — turns the user's plain-language task and the covenant constraints into a concrete,
  ordered plan shown live in the run.
- **`generateReport`** — synthesizes the paid data into the final answer/report.

It is integrated **privacy-respectfully**: the key is held **server-side** (`api/venice`, never on the
client), and the app **degrades gracefully** to a deterministic mock when no key is present, so the demo
always runs. Model is configurable (`VENICE_MODEL`, default `llama-3.3-70b`).

## Judging-criteria mapping

| Criterion | Where it shows |
| --- | --- |
| **Innovation** | Fusing x402 + ERC-7710 into one guarded transaction; the two-layer (hard caveat / soft policy) safety model. |
| **Technical depth** | Real signatures, real redemption with receipt-waiting, on-chain `Transfer` verification, counterfactual smart-account deploy without a bundler. |
| **Completeness** | Full loop: plan → 402 → policy → redeem → verify → report → audit, plus deploy/fund readiness and three demo scenarios. |
| **Polish / UX** | Staged run UI, honest per-step badges, audit trail with BaseScan links, three one-click demo covenants. |
| **Honesty / trust** | Explicit `real` vs `simulated` everywhere; strict mode (`X402_REQUIRE_ONCHAIN`) to prove the gate. |
| **Real-world relevance** | Agentic commerce safety is a live, unsolved problem; the pattern composes audited primitives. |

## Why it wins (the one-liner)

> Most "agent pays" demos show that an agent *can* spend. Covenant shows how to let it spend **safely** —
> by making the x402 payment and the ERC-7710 permission the same transaction, with hard limits enforced
> on-chain where the agent can't reach them.

---

**Next:** [11 · Roadmap →](./11-roadmap.md)
