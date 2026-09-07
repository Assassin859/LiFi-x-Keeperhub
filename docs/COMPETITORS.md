# Competitor analysis — Agent Economy main track

Internal note for **LI.FI x KeeperHub**. Not a teardown of teammates — a read of the bar and how we win on a different lane.

**Deadline:** submissions close **2026-09-18, 12:00 CEST**.

---

## Primary competitor: gavel (Edy Cu)

| | |
|---|---|
| Pitch | Executes Safe txs nobody paid gas for, built on KeeperHub |
| Code | https://github.com/edycutjong/gavel |
| Live | https://gavel.edycu.dev/ |
| Demo | https://youtu.be/bkhfJbQH6KI |
| Write-up | https://dev.to/edycutjong/i-built-a-detector-for-stuck-safe-transactions-93-of-what-it-found-was-already-dead-17he |
| Discord | Posted ~2026-09-07 (Edy Cu) in hackathon channel |

### Problem they name

A Safe multisig splits one act in two:

- **Signing** — off-chain, free  
- **Executing** — on-chain call anyone may make, assigned to nobody  

Fully authorised transactions rot. gavel executes them from a **KeeperHub-managed wallet that owns nothing on the Safe** (no key, no approval, no owner slot). Onboarding: give a Safe address.

### The survey that killed their own pitch

Before building, read-only detector on **1,299 Base mainnet Safes**:

| Figure | Value |
|---|---|
| Matches (naive fully-signed + not executed) | 366 |
| Permanently dead (nonce already consumed) | 339 (**92.6%** false positives) |
| Live stalls | rare (~**0.39%** of Safes) |

Naive “signed but not executed” is almost always wrong because Safe nonces are sequential and the queue does not mark dead slots. So **refusal became the product** — nine named refusal reasons, each tested — not polish around a keeper.

### Through KeeperHub

- Direct Execution path; claim **50 runs, 0 failures**  
- `GET /api/analytics/runs` as ledger (they render it, do not re-compute)  
- Honest split: **survey = Base mainnet**, **execution = Sepolia testnet**

### Proof bar

- `python3 survey/rederive.py` — offline, no credentials, ~0.2s; re-derives ~24 published figures from committed raw responses  
- CI on every push so README cannot drift from measurement  
- Upstream while building: #2278 (Safe plugin `execTransaction` args / drain vector), #2279 (plan gating), PR #2277 (trace-method probe), design comment on #2240  

### Why judges will like it

| Move | Effect |
|---|---|
| Measure before marketing | Credibility; killed own hype |
| Refusal as product | Depth over “we execute Safes” |
| Clear KeeperHub role | Wallet owns nothing on Safe |
| Re-derivable claims | Trust without asking judges to believe |
| Full submit triad | Repo + live + video + write-up |
| Candid limits | Testnet exec, rare condition, no EIP-1271, no circuit breaker |

### Fair weak spots

- **Narrow market** — they admit rarity; usefulness is deep not wide  
- **Mainnet survey / testnet execution** — may dock “value moved” if judges want mainnet tx proof  
- **Different niche** — Safe ops, not swap/bridge; do not clone  

### Lessons to steal (form only)

1. One-liner split of duties  
2. Named refusals (not boolean fail)  
3. One re-derivable claim (fixture + script or N/N artifacts)  
4. Ugly limits said first  
5. Ship repo + demo URL + video + execution proof  
6. Compete on **LI.FI quote → KeeperHub settle**, not on stuck Safes  

---

## Our lane vs gavel

| Them | Us (this repo) |
|---|---|
| Rare Safe stuck-tx niche, measured honestly | High-volume path: **LI.FI swap/bridge aggregator** |
| Sepolia exec, Base survey | Live LI.FI quote + KeeperHub broadcast (prefer mainnet Base if funded) |
| Refusal as product | Same pattern — plus **quote id ↔ execution id ↔ explorer** side by side |
| Partner = Safe ecosystem | Partner = LI.FI / `li.quest` (confirmed valid for main track) |

**Do not try to beat gavel at Safe + survey.** Beat them on a bigger live partner and a finished, checkable pipeline.

---

## Other landscape (not 1:1 competitors)

| Pattern | Risk to us | Notes |
|---|---|---|
| NL chat → KeeperHub only | Looks like last year’s demos | Avoid; LI.FI must be on the critical path |
| Thin MCP wrappers on agent frameworks | Crowded; need structured partner artifact | Eliza-style alone is weak without partner calldata |
| Protocol plugins only (Uniswap node, LayerZero PR) | Bounty-shaped; not main-track “live project” | Different BUIDL |
| Docs-only / survey-only bounty PRs | Compete on bounty track | Our bounty = open KeeperHub PRs (#2213 / #2215 / #2217) |

---

## Win condition for this repo

1. Code pushed (`src/`, `web/`, artifacts)  
2. One real KeeperHub settle with quote id + execution id + explorer link  
3. Demo video stating remove test: no LI.FI quote → nothing to send  
4. DoraHacks **main** BUIDL submitted (editable until deadline)  
5. Optional: named refusals + small rederive/fixture (gavel bar without Safe niche)  

Bounty = separate BUIDL. Swap/Bridge platform ask = Discord greenlight after demo exists — not the main-track win condition.

See [CONTEXT.md](CONTEXT.md), [FEATURES.md](FEATURES.md), [SUBMISSION.md](SUBMISSION.md).
