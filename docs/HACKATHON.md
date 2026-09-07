# Hackathon: KeeperHub - The Agent Economy

## Event

- **Platform:** [DoraHacks](https://dorahacks.io/hackathon/agent-economy/detail)
- **Name:** KeeperHub - The Agent Economy
- **Theme:** Agents and apps compose work; humans review and dry-run; **deterministic onchain execution** through KeeperHub
- **Build:** 2026-09-06 to 2026-09-18, 12:00 CEST
- **Judging:** repository-level review; up to 10 finalists pitch live

## Tracks (two BUIDLs if entering both)

### Main (this repo)

**Best Integration into a Live Project** — ranked prizes ($2k / $1.2k / $800).

Requirement (paraphrased): plug KeeperHub into a **live** project (users, deployed product, or active protocol). Show value moving through KeeperHub with proof.

**Our partner:** LI.FI (swap/bridge aggregator API + Jumper UI). Confirmed by KeeperHub staff that an aggregator quote → KeeperHub execute path is valid; partner need not be an agent framework.

### Bounty (separate BUIDL, not this repo)

**Best KeeperHub Feature** — mergeable PRs into KeeperHub ($500 x 2).

Our bounty candidates live on Assassin859 forks / KeeperHub PRs (e.g. protocol execution id, MCP idempotency, For Each stop-on-failure). Demo for bounty: 60–90s screen capture of the feature; tx link only if the feature is onchain.

## Our goal

1. Ship a **credible main-track integration** judges will not file as “another NL agent.”
2. Submit a **separate bounty BUIDL** pointing at existing KeeperHub PRs.
3. Produce artifacts: source, demo video, KeeperHub tx + audit.

## Success criteria (main)

- LI.FI `/quote` is on the critical path (real `transactionRequest`).
- KeeperHub performs simulate and/or execute; explorer shows the tx.
- README and video state the split of duties clearly.
- “Remove LI.FI” test: pipeline cannot invent a swap without a quote.

## Judging rubric (main) — how we map

| Criterion | Our answer |
|---|---|
| Integration depth | LI.FI-specific quote mapping and step handling |
| Execution through KeeperHub | Required; tx + execution id |
| Reliability / observability | Simulate, idempotency keys, status poll, failure stop |
| Usefulness | Apps that already use LI.FI quotes get production-grade settlement |
| DX / code quality | Typed client, env-based config, reproducible CLI |

## What we are not building

- A general-purpose chatbot that bypasses LI.FI
- A fork of Jumper
- A PR into `lifinance/*` (optional later; not required)
- Mixing bounty PR work into this repository

## Timeline (internal)

| Window | Focus |
|---|---|
| Early | Quote client + one same-chain Base execute via KeeperHub |
| Mid | Cross-chain path, sim gate, failures, README |
| Late | Demo video, submission form, pitch dry-run |
