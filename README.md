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

Scaffold and documentation in place. Implementation next:

- [ ] LI.FI quote client
- [ ] Map `transactionRequest` → KeeperHub execute
- [ ] Simulate + confirm gate
- [ ] Idempotent execute + status poll
- [ ] CLI (and optional thin UI)
- [ ] Demo video + sample run artifacts

---

## Quick start (when implemented)

```bash
cp .env.example .env
# fill KeeperHub + wallet settings
pnpm install
pnpm quote    # LI.FI quote only
pnpm run:sim  # quote + KeeperHub simulate
pnpm run:exec # quote + review + execute
```

---

## Docs

- [Hackathon brief and goals](docs/HACKATHON.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Submission checklist](docs/SUBMISSION.md)

## License

MIT (unless stated otherwise).
