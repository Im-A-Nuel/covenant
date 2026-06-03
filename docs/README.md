# Covenant — Documentation

> **Policy-bound x402 payments for autonomous AI agents.**
> Let agents pay — but only under covenant.

Welcome to the full documentation for **Covenant**. Giving an AI agent a wallet is like giving a
toddler an uncapped credit card: one prompt injection or runaway loop can drain it. Covenant is the
**safety layer for self-paying agents** — a user signs one spending policy (the *covenant*), and from
then on the agent can pay for [x402](https://x402.org) services autonomously using **ERC-7710 delegated
permissions** from a **MetaMask Smart Account**, but it can never step outside that policy.

**Hackathon tracks:** Best x402 + ERC-7710 · Best Agent · Best use of Venice AI

---

## Read in order

| # | Document | What's inside |
| --- | --- | --- |
| 01 | [Background](./01-background.md) | The landscape: agentic commerce, x402, ERC-7710, MetaMask smart accounts, why now. |
| 02 | [Problem](./02-problem.md) | Why an agent + a wallet is dangerous, and why existing answers fall short. |
| 03 | [Solution](./03-solution.md) | The covenant idea, the value proposition, and the core guarantees. |
| 04 | [Architecture](./04-architecture.md) | System design, tech stack, repo layout, component diagram. |
| 05 | [How it works](./05-how-it-works.md) | The end-to-end run, the three decisions, the staged UI. |
| 06 | [Security model](./06-security-model.md) | Two-layer defense, hard on-chain caveats vs soft policy, threat model. |
| 07 | [Technical reference](./07-technical-reference.md) | Module-by-module reference, data model, API routes, config. |
| 08 | [x402 + ERC-7710](./08-x402-and-erc7710.md) | How the payment rail and the guardrail lock into one transaction. |
| 09 | [Demo guide](./09-demo-guide.md) | Setup, the three no-wallet scenarios, and the full on-chain walkthrough. |
| 10 | [Hackathon tracks](./10-hackathon-tracks.md) | How Covenant meets each track and the judging criteria. |
| 11 | [Roadmap](./11-roadmap.md) | Honest limitations and the path to production. |
| 12 | [Glossary](./12-glossary.md) | Terms and references. |

---

## The idea in 30 seconds

A user signs a **covenant**: an ERC-7710 delegation from their MetaMask Smart Account to the agent's
executor, carrying two on-chain caveats — a hard **USDC budget cap** and an **expiry**. The agent can
then call paid x402 services and settle them by **redeeming** that delegation. Before any redemption an
off-chain **policy engine** checks the payment against the finer covenant rules. The budget and expiry
are enforced *cryptographically* by MetaMask's audited `DelegationManager`; everything else is enforced
by the policy engine. A compromised agent still cannot exceed the budget or spend after expiry — those
limits are the contract, not our code.

```mermaid
flowchart LR
  U([User]) -->|signs covenant| D[ERC-7710 delegation\nbudget + expiry caveats]
  A([Agent]) -->|task| P{Policy engine}
  X[x402 service] -->|402 Payment Required| P
  P -->|blocked / needs approval| S([Stop · no funds move])
  P -->|approved| R[redeemDelegations\nUSDC transfer]
  D -.guards.-> R
  R -->|tx hash| X
  X -->|verify transfer on-chain| OK([Paid data delivered])
```

## What makes it different

- **Two independent layers of defense.** A bypass of the off-chain policy is still caught by the
  on-chain caveats, and vice-versa. See [Security model](./06-security-model.md).
- **Honest about what's real.** Every step is badged `on-chain` / `real` / `simulated`; nothing claims
  to be on-chain when it isn't. See [How it works](./05-how-it-works.md#real-vs-simulated).
- **x402 and ERC-7710 are one transaction, not two features.** The USDC transfer that satisfies x402's
  "prove you paid" is the very transfer constrained by the ERC-7710 caveats. See
  [x402 + ERC-7710](./08-x402-and-erc7710.md).
- **No custom smart contracts.** Covenant uses MetaMask's audited, pre-deployed `DelegationManager` and
  DeleGator account on Base Sepolia. We deploy nothing of our own to the chain.

## Project links

- **Live demo:** `npm run dev` → http://localhost:3000 → *Launch the demo* (see [Demo guide](./09-demo-guide.md))
- **Root README:** [`../README.md`](../README.md) — the product pitch
- **Stack:** Next.js 16 · React 19 · Tailwind v4 · viem · `@metamask/delegation-toolkit` · Venice AI · Base Sepolia

> **Publishing these docs.** This folder is plain GitHub-flavored Markdown with Mermaid diagrams, so it
> renders as-is on GitHub. To serve it as a site, point GitHub Pages at `/docs` (Jekyll renders it
> automatically) or drop in an MkDocs/Docusaurus config later — no change to the content is required.
