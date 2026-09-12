# Reliability — why we do not double-spend

Design notes for judges. Inspired by production incidents discussed in the Agent Economy Discord (KeeperHub #2374: status `failed` while value already moved).

## Invariant

**A reported failure that may have broadcast is not safe to retry.**

False negatives are worse than false positives: the caller’s instinct is to try again.

## What this integration does

| Guard | Behavior |
|---|---|
| Confirm gate | No broadcast without explicit confirm |
| Intent lock | Before each step, claim `artifacts/pending/{intent}.json` keyed by route params + step kind (15m TTL). Second click → `INTENT_IN_FLIGHT` |
| Idempotency-Key | `lifi-x-kh:{quoteId}:{kind}` — scoped to quote step, **not** a fresh UUID per click |
| `UNCONFIRMED` | If KeeperHub status is `unconfirmed`, or `failed` **with** a `transactionHash`, refuse with `UNCONFIRMED` and **keep** the pending claim |
| Clean `failed` | Only clear the intent lock when status is `failed` with **no** hash (never reached chain) |
| Named refusals | `NO_ROUTE`, `CONFIRM_DENIED`, `WALLET_MISMATCH`, `INTENT_IN_FLIGHT`, `UNCONFIRMED`, … |

## What we do not do

- Auto-retry on `failed`
- Treat “status failed” as proof nothing moved
- Invent calldata without a LI.FI quote

## Partner specificity (Luca, 2026-09)

Main track: building against a live project’s **public API / deployed contracts** is enough; the project need not approve. Constraint: **specific to them, not a generic adapter** — LI.FI quote semantics live in this repo’s mapper, not a config toggle.

## Proof

- Live Base settle: [PROOF.md](PROOF.md)
- Offline claim check: `pnpm proof:check`
