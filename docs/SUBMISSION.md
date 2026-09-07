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

### Suggested form answers (copy-paste)

**Track:** Best Integration into a Live Project  

**Project name:** LI.FI × KeeperHub  

**One-liner:** LI.FI plans the route; KeeperHub settles it.  

**Description:**  
Integrates LI.FI’s live quote/route API (`li.quest`) with KeeperHub Direct Execution. Flow: quote → map approve + decode swap → simulate → human confirm → idempotent `contract-call` broadcast → status poll → explorer proof. Not an NL agent inventing calldata. Remove LI.FI and there is nothing to send.

**Partner:** LI.FI (`li.quest` / Jumper stack)  

**KeeperHub surfaces:** HTTP Direct Execution API (`POST /api/execute/contract-call`, status poll). Local CLI + dashboard for demo. Org API key (`kh_`).  

**Network:** Base mainnet (`8453`)  

**Source:** https://github.com/Assassin859/LiFi-x-Keeperhub  

**Demo video:** (upload after recording — see [VIDEO.md](VIDEO.md))  

**Transaction link:** https://basescan.org/tx/0x77833f89ea827e7b6982257975e1fb4a763da40b924027bcfecae2114f86bcb8  

**What still breaks / limits:** KeeperHub ≤ $100 stablecoin/tx; swap dry-run can show allowance gap until approve is broadcast; gas sponsorship ≠ free ETH balance; cross-chain bridge settle not the primary demo; hosted public UI deferred (local dashboard works).  

**Contact:** (your email + Discord/X)

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
