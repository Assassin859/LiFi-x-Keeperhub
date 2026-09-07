# LI.FI x KeeperHub

Main-track submission for **KeeperHub - The Agent Economy** on DoraHacks.

**LI.FI plans the route. KeeperHub settles it.**

This project integrates [LI.FI](https://li.fi) (live swap/bridge aggregator) with [KeeperHub](https://keeperhub.com) as the execution, review, simulation, and audit layer. It is not a standalone natural-language agent demo.

Confirmed valid for the main track by KeeperHub (partner does not need to be an agent framework).

---

## Goal

Win the **Best Integration into a Live Project** track by showing:

1. A real LI.FI quote/route (`/quote` → `transactionRequest`)
2. Human review and/or dry-run before broadcast
3. Execution through KeeperHub (MCP or API)
4. A public transaction link plus KeeperHub audit/execution record

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
User intent (CLI / thin UI)
  → LI.FI GET https://li.quest/v1/quote
  → transactionRequest { to, data, value, chainId }
  → KeeperHub simulate (optional)
  → Review / confirm
  → KeeperHub execute_contract_call (+ Idempotency-Key)
  → Poll status → transactionLink + audit
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
| Execution | KeeperHub |

Submission needs: this source link, demo video, KeeperHub-executed tx link.

See [docs/HACKATHON.md](docs/HACKATHON.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/SUBMISSION.md](docs/SUBMISSION.md).

---

## Status

Phases 0–3 + dashboard in place. Submission polish next:

- [x] Phase 0: toolchain, env, LI.FI + KeeperHub smoke
- [x] Phase 1: LI.FI quote CLI (flags, steps, approval hint)
- [x] Phase 2: map approve + decode swap → KeeperHub `simulate: true`
- [x] Phase 3: confirm gate → idempotent execute + status poll + artifacts
- [x] Dashboard UI (local API + Vite)
- [ ] Demo video + DoraHacks submit

---

## Quick start

```bash
cp .env.example .env
# Required: KEEPERHUB_API_KEY (kh_ org key)
# Set LIFI_FROM_ADDRESS to your KeeperHub org wallet (must match sim "from")
# Fund that wallet with Base USDC (+ ETH for gas). Keep amount ≤ $100 stablecoin/tx.
pnpm install

# CLI
pnpm quote
pnpm run:sim
pnpm run:exec --confirm

# Dashboard (two terminals)
pnpm api          # http://localhost:8787
pnpm dashboard    # http://localhost:5173
```

---

## Docs

- [Hackathon brief and goals](docs/HACKATHON.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Features](docs/FEATURES.md)
- [Context / how not to lose](docs/CONTEXT.md)
- [Submission checklist](docs/SUBMISSION.md)

## License

MIT (unless stated otherwise).
