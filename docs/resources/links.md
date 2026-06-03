# Links & References

> External specs, tools, and project pointers referenced throughout these docs.

## Protocols & standards

| Resource | Link |
| --- | --- |
| x402 — HTTP payments | <https://x402.org> |
| ERC-7710 — Smart Contract Delegation | <https://eips.ethereum.org/EIPS/eip-7710> |
| ERC-7715 — Request executions from wallets (related) | <https://eips.ethereum.org/EIPS/eip-7715> |
| EIP-712 — Typed structured data signing | <https://eips.ethereum.org/EIPS/eip-712> |
| ERC-4337 — Account abstraction (context) | <https://eips.ethereum.org/EIPS/eip-4337> |

## MetaMask Delegation Toolkit

| Resource | Link |
| --- | --- |
| Delegation Toolkit docs | <https://docs.metamask.io/delegation-toolkit/> |
| Package | `@metamask/delegation-toolkit@0.13.0` |

## Network & explorer

| Resource | Link |
| --- | --- |
| Base | <https://base.org> |
| Base Sepolia explorer (BaseScan) | <https://sepolia.basescan.org> |
| Default RPC | `https://sepolia.base.org` |
| USDC testnet faucet (Circle) | <https://faucet.circle.com/> |

## Tooling

| Resource | Link |
| --- | --- |
| Next.js | <https://nextjs.org> |
| React | <https://react.dev> |
| Tailwind CSS | <https://tailwindcss.com> |
| viem | <https://viem.sh> |
| Venice AI | <https://venice.ai> |

## In this repository

| Resource | Path |
| --- | --- |
| Product pitch (root README) | [`../../README.md`](../../README.md) |
| Documentation home | [Welcome](../README.md) |
| Policy engine | `src/lib/policy.ts` |
| Delegation create / redeem | `src/lib/delegation.ts` |
| x402 service (402 + verify) | `src/app/api/x402/sentiment/route.ts` |
| x402 client | `src/lib/x402.ts` |
| Smart account | `src/lib/smart-account.ts` |
| Staged run UI | `src/components/run-flow.tsx` |
| Settlement readiness | `src/components/settlement-readiness.tsx` |

## Document map

[Welcome](../README.md) · **Introduction:** [Overview](../introduction/overview.md) ·
[Background](../introduction/background.md) · [The Problem](../introduction/the-problem.md) ·
[The Solution](../introduction/the-solution.md) · [Key Features](../introduction/key-features.md) ·
**Core Concepts:** [How It Works](../core-concepts/how-it-works.md) ·
[Security Model](../core-concepts/security-model.md) · [x402 + ERC-7710](../core-concepts/x402-and-erc-7710.md) ·
[Real vs Simulated](../core-concepts/real-vs-simulated.md) · **Architecture:**
[System Architecture](../architecture/system-architecture.md) ·
[Technical Reference](../architecture/technical-reference.md) · **Getting Started:**
[Quickstart](../getting-started/quickstart.md) · [Demo Guide](../getting-started/demo-guide.md) ·
[Going On-Chain](../getting-started/going-on-chain.md) · **Hackathon:**
[Tracks & Judging](../hackathon/tracks-and-judging.md) · **Resources:** [Roadmap](roadmap.md) ·
[Glossary](glossary.md) · Links & References
