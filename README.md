# Covenant — Policy-Bound x402 Payments for Autonomous Agents

> Let agents pay, but only under covenant.

Covenant turns wallet permissions into **enforceable spending policies**. An AI agent can pay for
[x402](https://x402.org) services using **ERC-7710 delegated permissions** issued from a **MetaMask
Smart Account** — but only within a user-signed budget, allowed services, purpose, and per-request
limit. Full wallet control never leaves the user.

**Tracks:** Best x402 + ERC-7710 · Best Agent · Best use of Venice AI

## The flow

```
User signs a Covenant (ERC-7710 delegation, erc20TransferAmount caveat = hard cap)
        ↓
Agent gets a task → Venice AI plans it
        ↓
Agent calls an x402 service → 402 Payment Required
        ↓
Policy Engine checks: budget · per-request · service · purpose · duplicate · expiry
        ↓
If approved → redeemDelegations() pays USDC on Base Sepolia
        ↓
Paid data delivered → Venice AI writes the final report
        ↓
Everything lands in the Audit Trail
```

## Where each requirement is met

| Requirement | Implementation |
| --- | --- |
| MetaMask Smart Accounts Kit | `src/lib/smart-account.ts` — `toMetaMaskSmartAccount` (Hybrid) |
| ERC-7710 delegation | `src/lib/delegation.ts` — `createDelegation` + `signDelegation` (real MetaMask EIP-712 signature) |
| ERC-7710 redemption | `src/lib/delegation.ts` — `redeemDelegations` (USDC transfer execution) |
| x402 | `src/app/api/x402/sentiment/route.ts` (real 402 envelope) + `src/lib/x402.ts` |
| Policy firewall | `src/lib/policy.ts` |
| Venice AI | `src/app/api/venice/route.ts` + `src/lib/venice.ts` (planner + report) |

## Run

```bash
npm install
cp .env.example .env.local   # optional: add VENICE_API_KEY for real AI
npm run dev
```

Open http://localhost:3000 → **Launch the demo**. Connect MetaMask (Base Sepolia), create a covenant
(this prompts a real ERC-7710 signature), then run the agent.

### Graceful degradation

The app **always runs**. Without a Venice key it uses a deterministic mock. Without a connected
wallet (or funds), the covenant is created in *simulated* mode and settlement is simulated — while the
delegation creation + signature remain real whenever a wallet is connected. Badges in the UI always
show whether each step is `on-chain`/`real` or `simulated`.

## Stack

Next.js 16 · React 19 · Tailwind v4 · viem · `@metamask/delegation-toolkit` · Venice AI · Base Sepolia
