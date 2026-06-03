# Glossary

> Terms used across these docs. For external links and references, see [Links & References](links.md).

**x402** — The HTTP `402 Payment Required` micropayment protocol. A server answers an unpaid request
with an `accepts[]` **envelope** (scheme, network, amount, asset, `payTo`); the client pays and retries
with proof in an `X-PAYMENT` header; the server verifies and returns the resource.

**402 envelope / `accepts[]`** — The JSON body of a 402 response describing how to pay: `scheme`
(`"exact"`), `network` (`"base-sepolia"`), `maxAmountRequired`, `payTo`, `asset` (USDC), and `extra`
(decimals, purpose, verified, service).

**`X-PAYMENT`** — The request header carrying the payment proof (here, the redemption transaction hash)
on the retry after a 402.

**ERC-7710** — Ethereum standard for **delegated execution rights** between smart accounts: a delegator
grants a delegate a scoped, caveated permission, redeemed through a `DelegationManager`.

**Delegation** — The signed object granting the permission. Contains delegator, delegate, authority,
caveats, salt, and a signature. In Covenant it *is* the covenant.

**Caveat** — An on-chain constraint attached to a delegation, checked at redemption time by a **caveat
enforcer** contract. Covenant uses two.

**`ERC20TransferAmountEnforcer`** — The enforcer backing the **budget cap**: cumulative ERC-20 (USDC)
transfers under the delegation cannot exceed `maxAmount`.

**`TimestampEnforcer`** — The enforcer backing the **expiry**: a redemption is only valid within the
configured time window (`beforeThreshold`).

**Redemption** — Calling `redeemDelegations` to execute the delegated action (here, a USDC transfer)
under the delegation's caveats.

**`DelegationManager`** — MetaMask's audited contract that validates a delegation + its caveats and
executes the redemption. Pre-deployed on Base Sepolia.

**DeleGator / smart account** — MetaMask's audited ERC-7710 smart-contract account. Covenant uses the
**Hybrid** implementation; the connected EOA is its owner/signer.

**Counterfactual address** — A smart account's deterministic address, known before it is deployed. It
can sign delegations immediately; it must be **deployed** (and funded) before a redemption can settle
on-chain.

**EIP-712** — The typed-data signing standard used to produce the real wallet signature when a covenant
is created. Signing moves no funds.

**Covenant** — In this app: the user-signed ERC-7710 delegation **plus** its policy — budget, expiry,
per-request cap, allowed services, purpose, and active window.

**Policy engine / firewall** — `src/lib/policy.ts`. The off-chain `evaluatePolicy` that checks each
payment against the covenant *before* any redemption and returns `approved` / `needs_user` / `blocked`.

**`needs_user` (approve once & pay)** — The decision when a payment fails *only* the soft per-request
cap. The run pauses for one-time human approval; the on-chain budget still caps the total.

**`execMode` (`real` / `simulated`)** — The honesty flag on a settlement. `real` only when the
redemption broadcast succeeded **and** the seller verified the on-chain transfer; otherwise `simulated`.

**Smart Accounts Kit / Delegation Toolkit** — MetaMask's SDK (`@metamask/delegation-toolkit@0.13.0`)
for creating accounts and building/signing/redeeming ERC-7710 delegations.

**Venice AI** — The agent's reasoning provider, used for task planning (`planTask`) and report
generation (`generateReport`), proxied server-side.

**USDC** — The payment stablecoin (6 decimals) on Base Sepolia. Convert with `toUnits` / `fromUnits`.

**Base Sepolia** — The OP-stack L2 testnet Covenant runs on; cheap, fast, and where MetaMask's contracts
are pre-deployed.
