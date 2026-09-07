# Features

Product surface for **LI.FI x KeeperHub** (Agent Economy main track) and the related KeeperHub Direct Execution asks.

Modeled after strong submissions that lead with a clear problem, a measurable claim, and an explicit KeeperHub path (see e.g. [gavel](https://github.com/edycutjong/gavel): Safe execute-for-others with refusal logic as the product).

---

## One-line product

**LI.FI plans the route. KeeperHub settles it** — with human review and dry-run before broadcast.

---

## Shipped / in this repo (main track)

### Quote (LI.FI)

- Same-chain and cross-chain quotes via `GET https://li.quest/v1/quote`
- Surfaces route id, tool, steps, and `transactionRequest` (`to`, `data`, `value`, `chainId`)
- Amount / chain allowlists and safety guards in env

### Map to KeeperHub

- Approve step when LI.FI requires allowance (`approvalAddress`)
- Decode LI.FI diamond calldata into KeeperHub `contract-call` shape (`functionName` + ABI)
- Named tuple args for KeeperHub (e.g. `_swapData` as objects, not bare arrays)
- Multi-step order preserved; stop on first failure

### Simulate → confirm → execute → status

- `simulate: true` preflight (no broadcast)
- Confirm gate before live send
- Broadcast via `POST /api/execute/contract-call` with `Idempotency-Key`
- Poll `GET /api/execute/{executionId}/status`
- Artifacts: quote id, execution ids, explorer `transactionLink`

### Interfaces

- CLI: `pnpm quote`, `pnpm run:sim`, `pnpm run:exec --confirm`
- Local dashboard + API (`pnpm api` / `pnpm dashboard`) for demo UX

### Live proof

Base mainnet USDC → WETH: quote id + KeeperHub execution ids + Basescan links in [PROOF.md](PROOF.md) and `fixtures/proof-run.json`.

### Explicit non-goals (this repo)

- Not a general NL agent that invents calldata
- Not a fork of Jumper
- Not a PR into `lifinance/*`
- Does not call LI.FI `executeRoute` — KeeperHub owns broadcast

### Remove test (judging)

Break or disable the LI.FI quote path → no calldata → nothing to send through KeeperHub.

---

## Proposed KeeperHub platform features (bounty / product ask)

Separate from this integration BUIDL. Ask maintainers before opening a PR.

### 1. First-class Swap / Bridge

Not another Uniswap workflow node — a Direct Execution / Wallet product surface.

| Piece | Intent |
|---|---|
| UI | Swap and (later) Bridge on Wallet / Direct Execution |
| API | Real `POST /api/execute/swap` (today: `501 Coming soon`); Bridge later |
| Flow | Quote → simulate → confirm → execute → status |
| Backend start | Same-chain: Uniswap / Aerodrome; best route / bridge: LI.FI or similar |

**Why:** agents and orgs stop hand-building DEX calldata for the most common money movement.

### 2. Stablecoin → gas top-up

One-click / one API: convert a small USDC (or other stable) amount into native ETH for the org wallet.

| Piece | Intent |
|---|---|
| UI | Wallet fund screen: “Top up gas from USDC” |
| API / MCP | Named action over the same swap path |
| Reality check | Sponsorship pays **fees only**; it does not create spendable ETH |

**Why:** the failure mode we hit in production — USDC funded, little/no ETH — without forcing integrators to assemble DEX calldata.

### 3. MCP `execute_swap`

MCP tool over the same swap route so agents call a named tool instead of raw `execute_contract_call` with hand-assembled args.

**Why:** same product, agent-native surface.

---

## Comparison note (gavel-style bar)

What good main-track submissions emphasize:

| Pattern | How this project maps |
|---|---|
| Live partner, not a toy wrapper | LI.FI / `li.quest` (confirmed valid partner type) |
| KeeperHub is the execution ledger | Direct Execution API + status + audit; we do not re-compute settlement |
| Product honesty | Quote is required; no invented route |
| Measurable claim | Quote id + KeeperHub execution id + explorer link side by side ([PROOF.md](PROOF.md)) |
| Upstream filings optional | Feature ask above; not required for main-track submit |

gavel’s bar also includes **refusal as product** and a **re-derivable survey**. Shipped here:

- Named refusal codes (`NO_ROUTE`, `SIM_REVERT`, `CONFIRM_DENIED`, `WALLET_MISMATCH`, `CHAIN_NOT_ALLOWED`, `STEP_FAILED`, …) on API/CLI
- `pnpm proof:check` — offline assert README + PROOF vs `fixtures/proof-run.json`

---

## Track split

| Track | Where | Features |
|---|---|---|
| Main — live integration | This repo | Quote → map → sim → confirm → exec → status |
| Bounty — KeeperHub feature | Separate BUIDL / PR | Swap/Bridge + gas top-up + MCP `execute_swap` (if green-lit) |

See [HACKATHON.md](HACKATHON.md), [ARCHITECTURE.md](ARCHITECTURE.md), [COMPETITORS.md](COMPETITORS.md), [SUBMISSION.md](SUBMISSION.md).
