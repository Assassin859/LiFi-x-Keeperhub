# Context: how not to lose (Agent Economy main track)

Internal strategy note for this repo. Captures competitor read (gavel) and the execution plan through submission.

**Deadline:** DoraHacks submissions close **2026-09-18, 12:00 CEST**.

**Tracks:** Main = this repo (live integration). Bounty = separate BUIDL (KeeperHub PRs). Do not mix.

---

## Competitor: gavel (Edy Cu)

- **Discord / pitch:** executes fully-signed Safe txs that nobody paid gas for, via a KeeperHub wallet that owns nothing on the Safe.
- **Code:** https://github.com/edycutjong/gavel  
- **Live:** https://gavel.edycu.dev/  
- **Demo:** https://youtu.be/bkhfJbQH6KI  
- **Write-up:** https://dev.to/edycutjong/i-built-a-detector-for-stuck-safe-transactions-93-of-what-it-found-was-already-dead-17he  

### What they built

Safe multisig = sign off-chain (free) + execute on-chain (anyone, nobody assigned) → authorised txs rot. gavel executes from KeeperHub; onboarding is “give me your Safe address.”

### Why the post is strong

They measured before marketing. Survey of 1,299 Base mainnet Safes (read-only):

- 366 txs matched a naive “fully signed, not executed” detector  
- 339 permanently dead (nonce already consumed) → **92.6% false positives**  
- Live stall is rare (~0.39% of Safes)

So **refusal is the product** (nine named reasons, tested). Not polish around a keeper.

### Through KeeperHub

Claim: 50 Direct Execution runs, zero failures; `GET /api/analytics/runs` as ledger. Honest: survey = mainnet, execution = testnet (Sepolia).

### Proof bar they set

- Offline `survey/rederive.py` re-derives published figures from committed raw data (~0.2s, no credentials)  
- CI fails if README drifts from measurement  
- Upstream filings while building (#2278, #2279, PR #2277, comment on #2240)

### Fair weak spots

- Narrow market (they admit rarity)  
- Mainnet survey / testnet execution gap  
- Different niche than swap/bridge (do not clone Safe)

### Lessons to steal (form, not niche)

1. Clear split of duties one-liner  
2. Named refusals  
3. One re-derivable claim (fixture + script or N/N run artifacts)  
4. Say ugly limits first (testnet/mainnet, caps)  
5. Ship triad: repo + live/demo + video + execution proof  
6. Compete on **LI.FI → KeeperHub settle**, not on Safe stuck-tx  

---

## Our product (this repo)

**LI.FI plans the route. KeeperHub settles it.**

Pipeline: LI.FI `/quote` → map approve + swap → simulate → confirm → `contract-call` + Idempotency-Key → status poll → artifacts (quote id, execution id, explorer link).

Remove test: break LI.FI quote → no calldata → nothing for KeeperHub to send.

See [FEATURES.md](FEATURES.md), [ARCHITECTURE.md](ARCHITECTURE.md), [HACKATHON.md](HACKATHON.md), [SUBMISSION.md](SUBMISSION.md).

---

## How not to lose — priority order

Do **not** try to beat gavel at Safe + survey. Beat them on a **bigger live partner + a finished, checkable pipeline**.

### This week (main track — win condition)

1. **Commit and push** `src/`, `web/`, lockfile, docs — judges cannot score what is not on GitHub.  
2. **One real KeeperHub settle** — e.g. Base USDC → ETH/WETH, small amount. Persist quote id + execution id + explorer link under `artifacts/`.  
3. **Demo video (2–3 min)** — quote JSON → sim → confirm → exec → explorer. Say the one-liner and the remove test.  
4. **Submit DoraHacks main BUIDL early** — editable until the deadline; empty form loses by default.  
5. **Optional gavel-bar polish** — named refusal reasons; small rederive/fixture check. Do not start a Safe product.

### Cheap insurance (parallel)

- Second DoraHacks BUIDL for **bounty** pointing at KeeperHub PRs (#2213 / #2215 / #2217).  
- Discord ask for first-class Swap/Bridge + MCP `execute_swap` only **after** main demo assets exist (optional upside, not the win condition).

### Do not do

- Rebuild gavel or chase their survey story  
- Start KeeperHub Swap/Bridge epic before submit assets exist  
- Leave glue uncommitted while polishing Discord pitches  

---

## Framing vs gavel

| Them | Us |
|---|---|
| Rare Safe stuck-tx niche, measured honestly | High-volume path: **swap/bridge aggregator (LI.FI)** |
| Sepolia exec, Base survey | Live LI.FI quote + KeeperHub broadcast (prefer mainnet Base if funded) |
| Refusal as product | Same — plus **quote id ↔ execution id ↔ explorer** side by side |

---

## Immediate next action

Commit + push this repo’s implementation, run one `pnpm run:exec --confirm`, put the three proof links in the README / artifacts. Everything else is secondary until that exists.

**Contacts:** DoraHacks Agent Economy; KeeperHub Discord for logistics / optional feature greenlight only after demo is recorded.
