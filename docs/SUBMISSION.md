# Submission checklist

DoraHacks BUIDL for **main track only**. Create a **second BUIDL** for the KeeperHub feature bounty.

## Main BUIDL (this repo)

- [ ] Track selected: Best Integration into a Live Project
- [x] Source: https://github.com/Assassin859/LiFi-x-Keeperhub
- [ ] Demo video (integration running end-to-end)
- [x] Transaction executed through KeeperHub (explorer link)
- [ ] Form: partner = LI.FI; what the integration does
- [ ] Form: KeeperHub surfaces used (HTTP Direct Execution + local CLI/dashboard; not MCP for this path)
- [x] Form: **mainnet** (Base `8453`)
- [ ] Form: what still breaks (candid)
- [ ] Reachable contact (email + Discord/X)

### Proof links (paste into form)

| Item | Value |
|---|---|
| Repo | https://github.com/Assassin859/LiFi-x-Keeperhub |
| **Swap tx (primary)** | https://basescan.org/tx/0x77833f89ea827e7b6982257975e1fb4a763da40b924027bcfecae2114f86bcb8 |
| Approve tx | https://basescan.org/tx/0x4bfcad4ea65547526e54d9e6c431e4aba4af7205a0fbdef30018640bc7f28ebc |
| Quote id | `c10dd97b-ee60-47f6-b7b7-9b7beafb971d:0` |
| Swap execution id | `05lj3m301cqcrhdrd6yf7` |
| Write-up | [PROOF.md](PROOF.md), [fixtures/proof-run.json](../fixtures/proof-run.json) |

### Suggested form answers

- **Partner:** LI.FI (`li.quest` quote API / Jumper stack)
- **What it does:** LI.FI returns the route + calldata; this client maps approve + swap into KeeperHub `contract-call`, simulates, confirms, broadcasts with idempotency, and polls status.
- **Surfaces:** HTTP Direct Execution API (`/api/execute/contract-call`, status poll). Local CLI + dashboard for demo. Org API key (`kh_`).
- **Network:** Base mainnet
- **What still breaks / limits:** KeeperHub ≤ $100 stablecoin/tx; swap sim can look like allowance failure because approve is not persisted in dry-run; gas sponsorship ≠ free ETH balance; cross-chain bridge settle not yet the primary demo path; no deployed public hosted UI (local dashboard only).

### Video outline (suggested 2–3 min)

1. One sentence: LI.FI plans, KeeperHub settles
2. Run quote → show LI.FI JSON (`id`, `tool`)
3. Simulate / confirm
4. Execute → explorer + KeeperHub status (or show committed proof if not re-broadcasting)
5. Remove test (10–20s): break quote → nothing to send
6. Optional: open Basescan swap tx

### Remove test (mention in README or video)

Disable LI.FI / break the quote URL → no calldata → no KeeperHub send.

## Bounty BUIDL (separate)

- [ ] Track: Best KeeperHub Feature
- [ ] Links to open or merged PRs
- [ ] 60–90s capture of feature / tests (per KeeperHub guidance)
- [ ] Tx link only if the feature has an onchain surface

Optional platform asks (after main video): Swap/Bridge UI+API, stablecoin→gas top-up, MCP `execute_swap` — [FEATURES.md](FEATURES.md).

## Deadlines

- Submissions close: **2026-09-18, 12:00 CEST**
- Nothing accepted after that

## Contacts / channels

- Hackathon: https://dorahacks.io/hackathon/agent-economy/detail
- KeeperHub Discord: prefer DM / office hours for strategy; general for logistics only

See [COMPETITORS.md](COMPETITORS.md), [CONTEXT.md](CONTEXT.md).
