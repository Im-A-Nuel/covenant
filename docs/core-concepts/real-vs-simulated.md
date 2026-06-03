# Real vs Simulated

> Covenant is honest about what is genuinely on-chain versus simulated, and shows a badge at **every**
> step. Nothing pretends to be on-chain when it isn't. This honesty is a feature, not a disclaimer.

## Why this matters

Many "agent pays on-chain" demos quietly fake the settlement — a hardcoded hash, a green checkmark, no
actual transaction. Covenant takes the opposite stance: the UI tells you, at each step, exactly how much
is real. That makes the claims **auditable** and the demo **trustworthy**, which is the whole point of a
safety tool.

## How the badge is derived

```ts
const verified = !!delivery?.verified;                         // server confirmed the USDC transfer
const execMode = redeemMode === "real" && verified ? "real" : "simulated";
```

An audit entry is marked **`on-chain`** only when **both** halves are true: the `redeemDelegations`
broadcast succeeded (`redeemMode === "real"`) **and** the seller verified the USDC transfer on-chain
(`verified`). Otherwise it is `simulated`.

## What's real, when

| Condition | What is real | Badge |
| --- | --- | --- |
| No wallet connected | Nothing on-chain; the flow is demonstrated end-to-end. | `simulated` |
| Wallet on Base Sepolia, covenant signed | Smart-account derivation, the delegation, **all caveats**, and the **EIP-712 signature**. | signature is **real** |
| Above + smart account **deployed & funded** | The `redeemDelegations` tx broadcasts, the receipt is awaited, and the seller verifies the USDC transfer. | `on-chain · verified` |
| Broadcast happened but the seller couldn't verify, or the account is undeployed/unfunded | Delegation + signature still real; settlement falls back. | `simulated` |

So even with **no wallet at all**, the full agent loop runs and is honestly labeled `simulated` — which
is what lets the [three-decision demo](../getting-started/demo-guide.md) work for anyone, instantly.

## The simulated fallback (and why it's safe to show)

When a real redemption isn't possible (no wallet, or an undeployed/unfunded smart account),
`executeCovenantPayment` catches the failure and returns a **deterministic synthetic hash derived from
the real signature**, marked `mode: "simulated"`. The delegation and signature stay real; only the
settlement is simulated. The audit trail links to BaseScan **only** for a full, real `0x` hash — never
for a synthetic display string — so a reader can always tell the two apart.

## The audit trail as proof surface

Every run lands in the **Audit log** (`/dashboard/audit`):

* **Approved** entries show an `on-chain` / `simulated` badge, and a **BaseScan link** for real txs.
* **Blocked** entries show the failing reason (the covenant rule that stopped them).
* **Approved-by-you** (over-limit override) entries note the one-time per-request override.
* The whole log **exports to JSON**.

## Strict mode — prove the gate is real

Set `X402_REQUIRE_ONCHAIN=true` and the x402 server keeps the **402 paywall up** until a payment is
**verified on-chain**. A simulated (no-wallet) run will *not* unlock the resource — a clean way to prove
that the on-chain settlement gate is genuinely doing the work, not waved through. See the
[Demo Guide](../getting-started/demo-guide.md#strict-mode--prove-the-gate-is-real).

## The principle

> If a step is on-chain, the UI proves it (a real hash, a BaseScan link, a verified transfer). If it
> isn't, the UI says `simulated`. There is no third, ambiguous state.
