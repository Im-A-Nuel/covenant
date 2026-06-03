# 11 · Roadmap

> An honest account of the current limitations and the path from hackathon build to production. Covenant
> is built to be truthful about what is real (see [Real vs simulated](./05-how-it-works.md#real-vs-simulated)),
> and that honesty extends to its gaps.

## Current limitations

| Limitation | Detail | Impact |
| --- | --- | --- |
| **Session-only delegations** | Signed delegations live in a runtime ref, not `localStorage` ([why](./07-technical-reference.md#state--persistence)). | A real on-chain redemption only works in the session that created the covenant. |
| **Single demo seller / service** | `X402_PAY_TO` is one address; the service directory is seed data. | The marketplace breadth is illustrative, not live. |
| **No automated tests** | Correctness is shown via the staged UI, the on-chain verification, and the typecheck. | Fine for a hackathon; needed before production. |
| **EOA-submitted redemption** | The delegate EOA submits the redemption (no ERC-4337 bundler/paymaster). | Simplifies the demo; a production agent would likely use a relayer/bundler. |
| **Fixed demo dates** | Seed covenants use hardcoded ISO timestamps with a far-future expiry so the active demos keep passing the window check. | Demo data only; real covenants compute expiry from the chosen window. |
| **Off-chain rules are client-enforced** | Service/purpose/verified/duplicate checks run in the client policy engine. | They are intent guardrails, not cryptographic guarantees — only budget + expiry are on-chain. |

## Near-term (post-hackathon hardening)

- **Persisted, secure delegation storage.** Replace the session ref with a server-side signer or an
  encrypted store, or move to **ERC-7715 session keys** so the agent holds a scoped key instead of a raw
  delegation — enabling redemption across sessions without exposing signatures.
- **More on-chain caveats.** Push more of the policy on-chain where enforcers exist (e.g. per-call limits
  via a streaming/period enforcer, allow-listed targets), shrinking the trusted off-chain surface.
- **Real multi-service marketplace.** Wire several live x402 sellers with distinct prices, purposes, and
  verification, and a discovery flow.
- **Automated test suite.** Unit tests for `evaluatePolicy` (decision matrix), integration tests for the
  402 → redeem → verify loop, and a forked-chain test for caveat enforcement.

## Medium-term

- **Relayer / bundler path.** Submit redemptions via an ERC-4337 bundler or a gasless relayer so the
  agent never needs native gas.
- **Multi-asset & multi-chain.** Beyond Base Sepolia USDC — other stablecoins and L2s, mainnet.
- **Richer agent autonomy.** Multi-step purchases, budget pacing over time, and agent-initiated covenant
  *renewal requests* (the user re-signs an extension rather than raising a live cap).
- **Notifications & spend analytics.** Real-time alerts on blocks/approvals and spend dashboards.

## Longer-term vision

- **A reusable "agent payments safety" SDK.** Extract the covenant pattern (envelope-driven redemption +
  two-layer enforcement + honest audit) into a library any agent framework can adopt.
- **Standardized covenant schema.** A portable policy format so a covenant signed in one app is
  understood by another.
- **Reputation & verified-seller registries.** Make the "verified seller" check backed by an on-chain or
  attested registry rather than an envelope flag.

## Explicitly out of scope (and why)

- **Holding user funds.** Covenant never takes custody — funds stay in the user's smart account until a
  specific allowed payment. That is the whole point; a custodial model would reintroduce the trust we
  removed.
- **Claiming on-chain settlement when it isn't.** The app will always badge `simulated` honestly rather
  than fake a hash. (See [Real vs simulated](./05-how-it-works.md#real-vs-simulated).)

---

**Next:** [12 · Glossary →](./12-glossary.md)
