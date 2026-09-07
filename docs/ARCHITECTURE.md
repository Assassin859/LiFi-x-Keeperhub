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

Convert LI.FI `transactionRequest` into KeeperHub direct-execution arguments:

- Network / chain id alignment with KeeperHub’s naming
- `to`, calldata `data`, native `value`
- Preserve quote `id` in run metadata for the audit story

Multi-step LI.FI flows: execute in order; stop on first failure; surface which step failed.

### 3. Execution layer (KeeperHub)

Preferred surfaces (any that we wire for the demo):

- MCP: `execute_contract_call`, `execute_transfer` (if native), `get_direct_execution_status`
- Or HTTP equivalents used by `kh` / API client

Always:

1. Optional `simulate=true` (or dry-run) before live
2. Confirm gate (CLI prompt or explicit `--confirm`)
3. Unique `Idempotency-Key` per logical step
4. Poll until completed / failed / unconfirmed policy documented
5. Persist: quote id, execution id, `transactionLink`

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
