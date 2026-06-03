# 07 · Technical reference

> Module-by-module reference, the data model, the API routes, configuration, and state/persistence.
> File paths are relative to `src/`.

## `lib/chain.ts` — chain access

viem `publicClient` and a wallet-client factory for **Base Sepolia**, the **USDC** token address
(6 decimals), `usdcBalance(address)`, and explorer helpers `explorerTx(hash)` / `explorerAddr(addr)`.

> **Gotcha:** `publicClient` is deliberately cast to a plain `PublicClient`. Base Sepolia is an OP-stack
> chain whose L2 transaction formatters widen `getBlock`'s return union, which TypeScript otherwise
> rejects against the toolkit's expected `PublicClient`. Runtime behavior is identical.

## `lib/smart-account.ts` — the user's smart account

| Export | Purpose |
| --- | --- |
| `createUserSmartAccount(owner)` | `toMetaMaskSmartAccount` with `Implementation.Hybrid`; the connected EOA is the signer. The address is **counterfactual** (deterministic) until first deployment but can sign delegations immediately. |
| `isDeployed(address)` | Returns whether contract code exists at the address. |
| `deploySmartAccount(owner, sa)` | The owner EOA sends **one ordinary transaction** to the account factory (`getFactoryArgs()`). **No ERC-4337 bundler is required.** Deployment is needed before a delegation can be redeemed, because the `DelegationManager` must call into a deployed delegator. |

> **Toolkit note:** the factory param is `signer` (not `signatory`), e.g. `signer: { walletClient }`
> — `@metamask/delegation-toolkit@0.13.0`.

## `lib/delegation.ts` — create, sign, redeem

| Export | Purpose |
| --- | --- |
| `createCovenantDelegation(sa, delegate, budgetUSDC, expiresAtSec?)` | Builds the ERC-7710 delegation: `scope: { type: "erc20TransferAmount", tokenAddress: USDC, maxAmount }` (the budget cap) plus, when `expiresAtSec` is given, a `timestamp` caveat (`beforeThreshold`) for the expiry. Then `signDelegation` triggers the **real EIP-712 signature**. Returns a `SignedDelegation`. |
| `executeCovenantPayment(signed, delegateEOA, payTo, amountUSDC)` | Encodes a USDC `transfer(payTo, amount)`, wraps it via `createExecution`, and calls `redeemDelegations(...)` with `ExecutionMode.SingleDefault`. **Waits for the receipt** and treats a reverted receipt as failure. On any error (e.g. undeployed/unfunded account) it falls back to a deterministic **simulated** hash derived from the real signature — the delegation and signature stay real. Returns `{ mode: "real" \| "simulated", transactionHash, note? }`. |
| `delegationSummary(signed)` | JSON-safe view (delegator, delegate, authority, caveat count, signature, manager, chainId). |

## `lib/policy.ts` — the firewall

`evaluatePolicy(covenant, payment, history)` — a pure function returning
`{ decision, checks[], reason }`. The seven checks and the decision logic are documented in
[05 · How it works](./05-how-it-works.md#the-three-decisions) and
[06 · Security model](./06-security-model.md#layer-2--off-chain-policy-firewall). Runs before any
redemption is attempted.

## `app/api/x402/sentiment/route.ts` — the paid service

The demo x402-enabled API with **real on-chain verification**.

- `GET` **without** `X-PAYMENT` → **HTTP 402** with an x402 `accepts[]` envelope:
  `scheme: "exact"`, `network: "base-sepolia"`, `maxAmountRequired`, `payTo`, `asset: USDC`, and
  `extra: { decimals, purpose, verified, service }`.
- `GET` **with** `X-PAYMENT: <txHash>` → `verifyPayment` fetches the receipt and looks for a USDC
  `Transfer` to `PAY_TO` for **≥ the price**:
  - **found** → `settlement: "on-chain"`, returns the resource.
  - **not found / not a real tx** → `settlement: "unverified"`, returns the resource anyway (honest
    dual-mode) **unless** `X402_REQUIRE_ONCHAIN=true`, in which case the **paywall (402) stays up**.

Constants: `PRICE_USDC = 0.25`, `PAY_TO = (X402_PAY_TO || 0x…dEaD)`, `REQUIRE_ONCHAIN`.

## `lib/x402.ts` — the x402 client

| Export | Purpose |
| --- | --- |
| `requestPaidData(endpoint)` | Calls the service; on 402 parses the envelope into a `PaymentRequest`, **preferring `extra.service`** so the name matches the covenant allow-list. |
| `settleAndDeliver(endpoint, proofHash)` | Re-requests with the proof in `X-PAYMENT`; returns a `DeliveryResult` (`delivered`, `verified`, `settlement`, `payer`, `amountVerified`, `resource`). `verified` is the source of truth for whether settlement was real. |

## `lib/venice.ts` + `app/api/venice/route.ts` — the AI

`planTask` (the planner) and `generateReport` (the final write-up). The route proxies Venice AI
**server-side** so `VENICE_API_KEY` never reaches the client, and falls back to a deterministic mock
when unset — so the app runs with no key.

## `lib/wallet.tsx` / `lib/store.tsx` — React context

- `WalletProvider` / `useWallet` — connect, chain switch, and a lazy `ensureSmartAccount()`.
- `StoreProvider` / `useStore` — covenants + audit (persisted), plus the **session-only** signed
  delegations (see [below](#state--persistence)).

## `components/run-flow.tsx` — the staged run

Owns the `plan → x402 → policy → settle` stages, the **Approve once & pay** gate (a promise the staged
effect awaits, resolved by the buttons), the honest `execMode` calculation, and writing the audit entry.

## `components/settlement-readiness.tsx` — go on-chain

Shown only for a covenant with a **real** delegation. Surfaces the smart-account address (BaseScan
link), deployment status (+ a **Deploy** button), USDC balance (+ a **Fund**/faucet link), and whether
the delegation was signed this session — turning the run's badge from `simulated` to `on-chain · verified`.

## Data model (`lib/types.ts`)

| Type | Key fields |
| --- | --- |
| `Covenant` | `id, agent, totalBudget, remainingBudget, durationHours, maxPerRequest, allowedServices[], purpose, expiresAt, status, delegation?, smartAccount?` — `status ∈ active \| depleted \| expired \| revoked`. |
| `SignedDelegationMeta` | the (serialized) delegation, `signature`, `delegationManager`, `chainId`, `mode: "real" \| "simulated"`. |
| `PaymentRequest` | `service, resource, price, payTo, purpose, scheme, network, verified` (parsed from the 402 envelope). |
| `PolicyResult` | `{ decision: "approved" \| "blocked" \| "needs_user", checks: PaymentCheck[], reason }`. |
| `AuditEntry` | `task, agent, service, resource, amount, decision, reason, transactionHash?, execMode, remainingBudget, status: "completed" \| "blocked" \| "pending", timestamp`. |

USDC has **6 decimals**; convert with `toUnits` / `fromUnits` in `utils.ts`.

## State & persistence

`store.tsx` keeps covenants and the audit log in `localStorage` under **`covenant_state_v2`** (bumping
the version forces a clean re-seed when the seed data or schema changes). It seeds from `seed.ts` only on
first load (empty storage); thereafter it reads back what is stored.

**Signed delegations are deliberately *not* persisted.** They live in a runtime `Map` ref and are lost
on reload. The consequence: a **real on-chain redemption only works in the same session that created the
covenant**. This is a security choice — raw signatures should not sit in `localStorage` — not a missing
feature. The covenant *metadata* persists; the signing material does not.

## Configuration

All env vars are optional — the app runs with none of them. Put them in `.env.local`.

| Var | Default | Purpose |
| --- | --- | --- |
| `VENICE_API_KEY` | _(unset → mock)_ | Real Venice AI planning + reports (server-side only). |
| `VENICE_MODEL` | `llama-3.3-70b` | Venice model id. |
| `VENICE_BASE_URL` | Venice default | Override the Venice endpoint. |
| `NEXT_PUBLIC_RPC_URL` | `https://sepolia.base.org` | Base Sepolia RPC. |
| `X402_PAY_TO` | `0x…dEaD` | The demo seller's receiving address (what the server verifies transfers against). |
| `X402_REQUIRE_ONCHAIN` | `false` | `true` = strict mode: the 402 paywall stays up until a payment is verified on-chain. |

## Build & checks

```bash
npm run dev        # dev server (http://localhost:3000)
npm run build      # production build (also runs the full TypeScript typecheck)
npm run lint       # eslint
npx tsc --noEmit   # typecheck only
```

> **Environment notes:** Next.js 16 / React 19 / Tailwind v4 — `params`/`searchParams` are async.
> tsconfig `target` must stay `ES2020`+ (the code uses BigInt literals like `10n`). `lucide-react` is
> v1 — verify an icon is exported before importing.

---

**Next:** [08 · x402 + ERC-7710 →](./08-x402-and-erc7710.md)
