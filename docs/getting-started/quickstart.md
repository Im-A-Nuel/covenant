# Quickstart

> Run Covenant locally in under a minute. No wallet and no API keys required — the app runs fully and
> badges everything honestly as `simulated` until you connect a wallet.

## Prerequisites

* **Node.js** 18+ (the project is built and typechecked on a current LTS / Node 20+).
* **npm** (ships with Node).
* *(Optional)* **MetaMask** on **Base Sepolia** + testnet USDC, only for the real on-chain path
  → [Going On-Chain](going-on-chain.md).

## Install & run

```bash
npm install
cp .env.example .env.local   # optional — every var is optional; see below
npm run dev                  # http://localhost:3000
```

Open **http://localhost:3000** → **Launch the demo**.

## First thing to try

Go to the **Task Console**, pick the **Compliance Bot** covenant, and **Run agent**. The policy firewall
lights up red and **halts before any payment** — your first look at the covenant doing its job. Then try
the other two covenants for the *approved* and *needs-approval* paths → [Demo Guide](demo-guide.md).

## Configuration (all optional)

| Var | Default | Purpose |
| --- | --- | --- |
| `VENICE_API_KEY` | _(unset → mock)_ | Real Venice AI planning + reports. Without it, a deterministic mock is used. |
| `VENICE_MODEL` | `llama-3.3-70b` | Venice model id. |
| `NEXT_PUBLIC_RPC_URL` | `https://sepolia.base.org` | Base Sepolia RPC. |
| `X402_PAY_TO` | `0x…dEaD` | The demo seller's receiving address. |
| `X402_REQUIRE_ONCHAIN` | `false` | `true` = strict mode: hold the 402 paywall until a payment is verified on-chain. |

Full table: [Technical Reference → Configuration](../architecture/technical-reference.md#configuration).

## Useful commands

```bash
npm run dev        # dev server
npm run build      # production build (also runs the full TypeScript typecheck)
npm run lint       # eslint
npx tsc --noEmit   # typecheck only
```

## Next steps

* See all three decision paths → [Demo Guide](demo-guide.md)
* Take a covenant fully on-chain → [Going On-Chain](going-on-chain.md)
* Understand what you're seeing → [How It Works](../core-concepts/how-it-works.md)
