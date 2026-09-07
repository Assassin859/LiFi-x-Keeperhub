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

### 2. MCP `execute_swap`

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
| Measurable claim | Quote id + KeeperHub execution id + explorer link side by side |
| Upstream filings optional | Feature ask above; not required for main-track submit |

gavel’s bar also includes **refusal as product** and a **re-derivable survey**. Optional follow-ups for us:

- Named refusal reasons (no route, sim revert, confirm denied, mid-step fail, chain not allowed)
- A small re-derivable script that checks README claims against a committed fixture (quote shape + mapped steps)

---

## Track split

| Track | Where | Features |
|---|---|---|
| Main — live integration | This repo | Quote → map → sim → confirm → exec → status |
| Bounty — KeeperHub feature | Separate BUIDL / PR | First-class Swap/Bridge + MCP `execute_swap` (if green-lit) |

See [HACKATHON.md](HACKATHON.md), [ARCHITECTURE.md](ARCHITECTURE.md), [SUBMISSION.md](SUBMISSION.md).
