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

Verified in prep (examples):

- Base USDC → WETH (same-chain swap) returned Sushi route + calldata
- Base USDC → Arbitrum USDC (cross-chain) returned bridge tool + calldata

### 2. Mapper

LI.FI returns raw `transactionRequest` (`to`, `data`, `value`, `chainId`).
KeeperHub `POST /api/execute/contract-call` needs `functionName` + ABI (no raw `data` field).

**Two-step mapping** (see `src/mapper/lifi-to-keeperhub.ts` + `decode-lifi-call.ts`):

1. **Approve (when `estimate.approvalAddress` is set)** — map to a standard ERC-20 `approve(spender, amount)` contract-call against the from-token.
2. **Swap** — decode LI.FI diamond calldata with embedded V3/Generic facet ABIs (`src/abi/lifi-facets.ts`), then `POST /api/execute/contract-call`.

**Simulate (Phase 2):** `pnpm run:sim` calls the same contract-call endpoint with `"simulate": true` (boolean) for each step — no broadcast, no audit row. Requires a configured KeeperHub org wallet (`from` address).

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
5. Persist artifact under `artifacts/run-*.json` (quote id, execution ids, `transactionLink`)

### 4. Interface

MVP: CLI. Optional thin UI later. Judges care about the pipeline, not chrome.

## Trust and custody

- User / org KeeperHub wallet signs and pays gas (Turnkey / org setup as configured).
- LI.FI does not receive private keys from this project.
- Do not use random “detected” third-party agent wallets; use a wallet you control and fund on testnet/mainnet deliberately.

## Failure modes we handle

| Case | Behavior |
|---|---|
| LI.FI 4xx / no route | Abort; show API message |
| Simulate revert | Do not broadcast |
| Mid multi-step failure | Stop; report completed vs pending steps |
| Network blip on execute | Retry same idempotency key until terminal or conflict |
| Wrong chain | Fail validation before send |

## Demo sequence (for video)

1. Show CLI args (chains, tokens, amount)
2. Show LI.FI quote excerpt (`id`, `tool`, `transactionRequest.to`)
3. Show simulate result
4. Confirm
5. Show KeeperHub execution id + explorer link
6. Optional: KeeperHub audit / run UI

## Out of scope (v1)

- Replacing LI.FI’s own execution monitoring end-to-end
- Solana-first paths (EVM first; Solana later if time)
- Custom intent / LLM parsing of the swap
