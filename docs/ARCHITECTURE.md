# Architecture

## One-line design

**LI.FI decides what to send. KeeperHub decides how it is reviewed, simulated, broadcast, retried, and audited.**

## Components

### 1. Quote layer (LI.FI)

- Base URL: `https://li.quest/v1`
- Primary endpoint: `GET /quote`
- Inputs: `fromChain`, `toChain`, `fromToken`, `toToken`, `fromAmount`, `fromAddress`, `slippage`, optional `integrator`
- Output we care about:
  - `id` — quote / route id for the demo and logs
  - `tool`, `includedSteps` — human-readable plan
  - `transactionRequest` — `{ to, data, value, chainId }` (and related gas fields when present)

API key is optional for low volume (`x-lifi-api-key` for higher limits). Prefer server-side use of any key.

Verified:

- Base USDC → WETH (same-chain swap) — live settle on mainnet ([PROOF.md](PROOF.md))
- Base USDC → Arbitrum USDC (cross-chain) — quote + calldata returned (bridge settle optional)

### 2. Mapper

LI.FI returns raw `transactionRequest` (`to`, `data`, `value`, `chainId`).
KeeperHub `POST /api/execute/contract-call` needs `functionName` + ABI (no raw `data` field).

**Two-step mapping** (see `src/mapper/lifi-to-keeperhub.ts` + `decode-lifi-call.ts`):

1. **Approve (when `estimate.approvalAddress` is set)** — map to a standard ERC-20 `approve(spender, amount)` contract-call against the from-token.
2. **Swap** — decode LI.FI diamond calldata with embedded V3/Generic facet ABIs (`src/abi/lifi-facets.ts`), then `POST /api/execute/contract-call`.

**Args shape:** KeeperHub rejects bare arrays for Solidity tuples. The mapper serializes struct args as **named objects** (e.g. `_swapData[0]` as `{ callTo, approveTo, … }`).

**Simulate:** `pnpm run:sim` / shared pipeline calls the same contract-call endpoint with `"simulate": true` (boolean) for each step — no broadcast, no audit row. Requires a configured KeeperHub org wallet (`from` address). Swap dry-run may show `TRANSFER_FROM_FAILED` when approve is not persisted — expected.

Also:

- Align chain id with KeeperHub’s naming
- Preserve quote `id` in run metadata for the audit story
- Multi-step LI.FI flows: execute in order; stop on first failure; surface which step failed

### 3. Execution layer (KeeperHub)

HTTP Direct Execution (`POST /api/execute/contract-call`), same as simulate:

1. Optional preflight `simulate: true` (`pnpm run:sim` / `run:exec` default)
2. Confirm gate (`REQUIRE_CONFIRM` + `--confirm` or interactive `y`)
3. Broadcast without `simulate`, with `Idempotency-Key: lifi-x-kh:{quoteId}:{kind}:{runId}`
4. Poll `GET /api/execute/{executionId}/status` until terminal (`completed` / `failed` / `unconfirmed`), honoring `X-Poll-Interval-Hint`
5. Persist artifact under `artifacts/run-*.json` (gitignored); committed sample in `fixtures/proof-run.json`

Shared logic lives in `src/pipeline/index.ts` (CLI + HTTP API both call it).

### 4. Interfaces

| Surface | Entry |
|---|---|
| CLI | `pnpm quote`, `pnpm run:sim`, `pnpm run:exec --confirm` |
| API | Hono on `:8787` — `/api/health`, `/defaults`, `/runs`, `/quote`, `/sim`, `/exec` (`src/server/index.ts`) |
| Dashboard | Vite React on `:5173`, proxies `/api` (`web/`) |

Judges care about the pipeline and proof links; the dashboard is demo chrome.

## Trust and custody

- User / org KeeperHub wallet signs and pays gas (Turnkey / org setup as configured). Gas **sponsorship** may cover fees; it does not fund token balances.
- LI.FI does not receive private keys from this project.
- `LIFI_FROM_ADDRESS` must equal the KeeperHub org wallet used for Direct Execution.
- Do not use random “detected” third-party agent wallets; fund deliberately and stay under KeeperHub’s stablecoin per-tx cap (≤ $100).

## Failure modes we handle

| Case | Behavior |
|---|---|
| LI.FI 4xx / no route | Abort; show API message |
| Simulate revert | Do not broadcast (exec path still preflights) |
| Mid multi-step failure | Stop; report completed vs pending steps |
| Network blip on execute | Retry same idempotency key until terminal or conflict |
| Wrong chain / mainnet guard | Fail validation before send (`ALLOW_MAINNET`, chain allowlist) |
| Wallet mismatch | Refuse when quote `from` ≠ org wallet (unless override) |

## Demo sequence (for video)

1. Show CLI or dashboard args (chains, tokens, amount)
2. Show LI.FI quote excerpt (`id`, `tool`, `transactionRequest.to`)
3. Show simulate result
4. Confirm
5. Show KeeperHub execution id + explorer link ([PROOF.md](PROOF.md))
6. Optional: open Basescan swap tx; say remove test

## Out of scope (v1)

- Replacing LI.FI’s own execution monitoring end-to-end
- Solana-first paths (EVM first; Solana later if time)
- Custom intent / LLM parsing of the swap
- Implementing KeeperHub’s platform `POST /api/execute/swap` (see [FEATURES.md](FEATURES.md) platform asks)
