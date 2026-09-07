# LI.FI x KeeperHub

Main-track submission for **KeeperHub - The Agent Economy** on DoraHacks.

**LI.FI plans the route. KeeperHub settles it.**

This project integrates [LI.FI](https://li.fi) (live swap/bridge aggregator) with [KeeperHub](https://keeperhub.com) as the execution, review, simulation, and audit layer. It is not a standalone natural-language agent demo.

Confirmed valid for the main track by KeeperHub (partner does not need to be an agent framework).

---

## Live proof (Base mainnet)

| | |
|---|---|
| Route | 1 USDC → WETH on Base via LI.FI |
| Quote id | `c10dd97b-ee60-47f6-b7b7-9b7beafb971d:0` |
| **Swap tx** | https://basescan.org/tx/0x77833f89ea827e7b6982257975e1fb4a763da40b924027bcfecae2114f86bcb8 |
| Approve tx | https://basescan.org/tx/0x4bfcad4ea65547526e54d9e6c431e4aba4af7205a0fbdef30018640bc7f28ebc |
| KeeperHub exec (swap) | `05lj3m301cqcrhdrd6yf7` |

Full write-up: [docs/PROOF.md](docs/PROOF.md) · fixture: [fixtures/proof-run.json](fixtures/proof-run.json)

---

## Goal

Win the **Best Integration into a Live Project** track by showing:

1. A real LI.FI quote/route (`/quote` → `transactionRequest`)
2. Human review and/or dry-run before broadcast
3. Execution through KeeperHub (HTTP Direct Execution API)
4. A public transaction link plus KeeperHub execution ids

Secondary track (separate DoraHacks BUIDL): KeeperHub feature PRs — not this repository.

---

## Why this is different from last hackathon

| Last pattern | This project |
|---|---|
| Custom NL chat invents a transfer | LI.FI returns structured calldata |
| KeeperHub is the whole product | KeeperHub only executes LI.FI’s plan |
| Remove the “agent” and little remains | Remove LI.FI and there is nothing to execute |

Judges can verify: quote id / route JSON next to KeeperHub execution id and explorer tx.

---

## Architecture

```
User intent (CLI / dashboard)
  → LI.FI GET https://li.quest/v1/quote
  → transactionRequest { to, data, value, chainId }
  → Map approve + decode swap → KeeperHub contract-call shape
  → KeeperHub simulate (optional)
  → Review / confirm
  → KeeperHub execute (+ Idempotency-Key)
  → Poll status → transactionLink + artifact
```

- **LI.FI:** routing across DEXs, bridges, solvers (60+ chains). Does not custody keys for this flow.
- **KeeperHub:** nonces, gas, retries, wallets, dry-run, audit trail.

---

## Hackathon

| Item | Detail |
|---|---|
| Event | [KeeperHub - The Agent Economy](https://dorahacks.io/hackathon/agent-economy/detail) |
| Track | Best Integration into a Live Project (main) |
| Build window | 2026-09-06 → 2026-09-18 12:00 CEST |
| Repo | https://github.com/Assassin859/LiFi-x-Keeperhub |
| Partner | LI.FI / Jumper (`li.quest` API) |
| Execution | KeeperHub Direct Execution HTTP API |

Submission needs: this source link, demo video, KeeperHub-executed tx link (swap above).

---

## Status

| Phase | State |
|---|---|
| 0 Toolchain + smoke | Done |
| 1 Quote CLI | Done |
| 2 Simulate (map + dry-run) | Done |
| 3 Execute + poll + artifacts | Done (Base mainnet) |
| Dashboard (API + Vite UI) | Done |
| Named refusals + proof:check | Done |
| Demo video + DoraHacks BUIDL | **Todo — see docs/VIDEO.md** |

---

## Quick start

```bash
cp .env.example .env
# Required: KEEPERHUB_API_KEY (kh_ org key)
# Set LIFI_FROM_ADDRESS to your KeeperHub org wallet (must match sim "from")
# Fund that wallet with Base USDC. Keep amount ≤ $100 stablecoin/tx.
# For mainnet broadcast: ALLOW_MAINNET=true
pnpm install

# CLI
pnpm quote
pnpm run:sim
pnpm run:exec --confirm
pnpm proof:check   # offline: README/PROOF match fixtures/proof-run.json

# Dashboard (two terminals)
pnpm api          # http://localhost:8787
pnpm dashboard    # http://localhost:5173
```

### Remove test

Point `LIFI_API_BASE` at a broken URL (or unset a required quote field) → no `transactionRequest` → nothing for KeeperHub to send.

---

## Docs

- [Demo video script](docs/VIDEO.md)
- [Live proof](docs/PROOF.md)
- [Hackathon brief and goals](docs/HACKATHON.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Features](docs/FEATURES.md)
- [Competitor analysis](docs/COMPETITORS.md)
- [Context / how not to lose](docs/CONTEXT.md)
- [Submission checklist](docs/SUBMISSION.md)

## License

MIT (unless stated otherwise).
