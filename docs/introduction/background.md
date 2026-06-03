# Background

> The context Covenant is built into: autonomous agents are starting to *transact*, and the rails for
> letting them do so safely have only just arrived.

## Autonomous agents are becoming economic actors

AI agents have moved from answering questions to *taking actions* — browsing, calling APIs, running
multi-step plans with little human supervision. The natural next step is **paying for things**: an
agent that researches a market needs paid data; an agent that ships code needs paid compute; an agent
that books travel needs to settle a bill. For that, an agent needs a way to move money on its own.

But money is exactly where "mostly autonomous" becomes dangerous. An agent that can read your calendar
and make a mistake wastes a few minutes. An agent that can spend your money and make a mistake — or be
*tricked* into one by a prompt injection — drains your wallet. The missing piece is not "give the agent
a wallet"; it is **give the agent a wallet with rules that hold even when the agent is wrong**.

## The three rails that make this possible now

Covenant sits at the intersection of three technologies that each matured recently.

### 1. x402 — paying over HTTP

[x402](https://x402.org) revives the long-dormant **HTTP `402 Payment Required`** status code as a real
micropayment protocol. A server answers an unpaid request with a structured **payment envelope**
(`accepts[]`: how much, in what asset, to which address, on which network). The client pays, then
retries the request with proof of payment in an `X-PAYMENT` header. The server verifies the payment and
returns the resource. It turns any HTTP endpoint into a pay-per-call service with no accounts, API keys,
or subscriptions — ideal for agents that discover and use services on the fly.

### 2. ERC-7710 — delegated, constrained permissions

[ERC-7710](https://eips.ethereum.org/EIPS/eip-7710) standardizes **delegated execution rights** between
smart contract accounts. A delegator can grant a delegate a *scoped, caveated* permission — "you may
spend up to N USDC," "only before this timestamp" — that is redeemed through an on-chain
`DelegationManager`. The constraints (**caveats**, enforced by **caveat enforcer** contracts) are
checked on-chain at redemption time, so they hold regardless of what the delegate's software does.

### 3. MetaMask Smart Accounts (Delegation Toolkit)

MetaMask's [Delegation Toolkit](https://docs.metamask.io/delegation-toolkit/) ships **audited,
pre-deployed** smart-contract accounts (DeleGators) and the `DelegationManager` on testnets including
**Base Sepolia**. It provides the SDK to create an account, build and **sign** an ERC-7710 delegation
(a real EIP-712 signature), and **redeem** it — without writing or deploying any Solidity yourself.

### Plus: stablecoins on a fast, cheap L2

Payments settle in **USDC** (6 decimals) on **Base Sepolia**, an OP-stack L2 where transactions are
cheap and fast enough for sub-dollar, pay-per-call economics.

## Why these don't solve the problem on their own

Each rail is necessary but not sufficient:

* **x402 alone** gives an agent a way to pay, but no notion of a *budget* or *policy* — nothing stops it
  from paying for the wrong thing, too often, or too much.
* **ERC-7710 alone** gives you on-chain spending limits, but no connection to the *act of paying for a
  service*, and only coarse limits (a budget cap, a time window) — not "only these services," "only for
  this purpose," "not the same thing twice."
* **A smart account alone** holds funds; it does not decide *whether a given payment is allowed*.

The interesting work — and Covenant's contribution — is **composing them into a single, coherent safety
model**: the x402 envelope drives the ERC-7710 redemption, on-chain caveats enforce the hard limits, and
an off-chain policy engine enforces the intent-level rules. That composition is the subject of the rest
of these docs, starting with [The Problem](the-problem.md).
