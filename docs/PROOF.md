# Live proof — Base mainnet

Public evidence that LI.FI planned a route and KeeperHub settled it.

**Primary submission tx (swap):**  
https://basescan.org/tx/0x77833f89ea827e7b6982257975e1fb4a763da40b924027bcfecae2114f86bcb8

Committed fixture: [`fixtures/proof-run.json`](../fixtures/proof-run.json)

---

## Run summary

| Field | Value |
|---|---|
| When | 2026-09-07T10:38:28.141Z |
| Network | Base mainnet (`8453`) |
| Route | 1 USDC → WETH (same-chain via LI.FI) |
| Quote id | `c10dd97b-ee60-47f6-b7b7-9b7beafb971d:0` |
| Run id | `6805dd7d-eaf8-40d4-8c37-7cc31b6dafb5` |
| Org wallet (`from`) | `0xc63a364f8bbaa6be263f577762e7c180a68b9fac` |
| Surface | KeeperHub HTTP Direct Execution (`contract-call`) |

## Steps

| Step | KeeperHub execution id | Explorer |
|---|---|---|
| Approve | `7zdrn0o95852nv1iiur18` | [approve tx](https://basescan.org/tx/0x4bfcad4ea65547526e54d9e6c431e4aba4af7205a0fbdef30018640bc7f28ebc) |
| Swap | `05lj3m301cqcrhdrd6yf7` | [swap tx](https://basescan.org/tx/0x77833f89ea827e7b6982257975e1fb4a763da40b924027bcfecae2114f86bcb8) |

## How to re-check

1. Open the **swap** Basescan link (above).  
2. Confirm `from` matches the org wallet and the call targets the LI.FI diamond / facet path.  
3. Diff local `artifacts/run-*.json` (gitignored) against `fixtures/proof-run.json` after a new run.

## Limits (said first)

- Amount capped by KeeperHub stablecoin policy (≤ $100 / tx); this run used **1 USDC**.  
- Gas sponsorship paid fees; the wallet still needed USDC for the swap itself.  
- Same-chain Base path proven; cross-chain quote works in LI.FI, live bridge settle optional.

See [SUBMISSION.md](SUBMISSION.md) and [ARCHITECTURE.md](ARCHITECTURE.md).
