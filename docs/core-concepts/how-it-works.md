# How It Works

> One run, from "user signs a covenant" to "report + audit." The staged UI in `run-flow.tsx` mirrors
> these steps one card at a time, each with a `real` / `on-chain` / `simulated` badge.

## The end-to-end run

```mermaid
sequenceDiagram
  actor User
  participant Agent as Agent (run-flow)
  participant Venice
  participant X402 as x402 service
  participant Policy as Policy engine
  participant DM as DelegationManager
  participant Chain as Base Sepolia

  User->>Agent: sign covenant (ERC-7710: budget + expiry caveats)
  User->>Agent: give a task
  Agent->>Venice: planTask(task, covenant)
  Venice-->>Agent: step-by-step plan
  Agent->>X402: GET /api/x402/sentiment
  X402-->>Agent: 402 Payment Required (envelope)
  Agent->>Policy: evaluatePolicy(covenant, payment, history)
  alt blocked (a hard rule failed)
    Policy-->>Agent: BLOCKED — stop, no funds move, audit it
  else needs_user (only per-request cap failed)
    Policy-->>User: Approve once & pay?
    User-->>Agent: approve / cancel
  else approved (all checks pass)
    Policy-->>Agent: APPROVED
  end
  Agent->>DM: redeemDelegations(USDC transfer(payTo, amount))
  DM->>Chain: execute under budget + expiry caveats
  Chain-->>Agent: tx receipt (await + status check)
  Agent->>X402: GET + X-PAYMENT: txHash
  X402->>Chain: verify USDC Transfer to payTo >= price
  X402-->>Agent: paid resource
  Agent->>Venice: generateReport(task, paidData, covenant)
  Venice-->>Agent: report → written to the audit trail
```

## Step by step

1. **Sign the covenant** (`/new`). `createCovenantDelegation` builds the ERC-7710 delegation with a
   budget scope (`erc20TransferAmount`) and, when an expiry is set, a `timestamp` caveat, then
   `signDelegation` triggers the **real MetaMask EIP-712 signature**. No money moves.
2. **Plan** (`venice.ts` → `/api/venice`). Venice AI turns the task into concrete steps. (Falls back to
   a deterministic plan if no API key.)
3. **Request paid data** (`x402.ts → requestPaidData`). The agent calls the service; it returns
   **`402 Payment Required`** with an x402 envelope. `x402.ts` parses it into a `PaymentRequest`
   (price, asset, `payTo`, purpose, service, verified).
4. **Evaluate policy** (`policy.ts → evaluatePolicy`). Seven checks run against the covenant; the result
   is one of three decisions (below). **This happens before any transaction is built.**
5. **Settle — only if allowed** (`delegation.ts → executeCovenantPayment`). On approval, the agent
   builds a USDC `transfer(payTo, amount)`, redeems it through the `DelegationManager`
   (`ExecutionMode.SingleDefault`), and **waits for the receipt**. A reverted receipt is treated as a
   failed redemption.
6. **Prove + deliver** (`x402.ts → settleAndDeliver`). The agent re-requests the resource with the tx
   hash in `X-PAYMENT`; the server **verifies the USDC transfer on-chain** and returns the data.
7. **Report + audit.** Venice writes the report, the covenant's remaining budget is decremented, and an
   audit entry is recorded (with the on-chain proof and an honest `execMode`).

## The three decisions

`evaluatePolicy` resolves exactly one outcome:

```ts
const allOk    = checks.every(c => c.ok);
const hardFail = !budgetOk || !active || duplicate || !serviceOk || !purposeOk || !verifiedOk;

if (allOk)                       decision = "approved";    // every rule passed
else if (!perReqOk && !hardFail) decision = "needs_user";  // ONLY the per-request cap failed
else                             decision = "blocked";     // a hard rule was violated
```

| Decision | Meaning | What the run does |
| --- | --- | --- |
| **`approved`** | All seven checks passed. | Redeems the delegation and settles immediately. |
| **`needs_user`** | Price is over the per-request cap, **but every other rule passed**. | Pauses and shows **Approve once & pay** / **Cancel**. Approve → settles (audit notes the one-time override). Cancel → recorded as blocked. **No funds move until you approve.** |
| **`blocked`** | At least one *hard* rule failed (budget, service, verified, purpose, duplicate, inactive). | Halts **before** any redemption. No funds move. Records the failing rules. |

The "needs approval" pause is implemented as a promise the staged run awaits; the **Approve once & pay**
/ **Cancel** buttons resolve it. The per-request check still renders a red ✗ even after approval — the
rule genuinely failed; the user simply chose to override it that one time. See the
[security model](security-model.md#soft-vs-hard-the-per-request-override) for why this override is safe.

## Honesty

Covenant is explicit about what is on-chain versus simulated, with a badge at every step. A settlement
is marked `on-chain` **only** when the redemption broadcast succeeded **and** the seller verified the
transfer. This deserves its own page → [Real vs Simulated](real-vs-simulated.md).
