# Demo video script (2–3 min)

Record the local dashboard at http://localhost:5173 with API on :8787.

```bash
pnpm api
pnpm dashboard
```

**Do not re-broadcast** unless you want a fresh tx. Showing Quote + Simulate + the committed Basescan swap is enough.

Primary proof to flash on screen:  
https://basescan.org/tx/0x77833f89ea827e7b6982257975e1fb4a763da40b924027bcfecae2114f86bcb8

---

## Shot list

| # | Time | What to show | What to say |
|---|---|---|---|
| 1 | 0:00–0:20 | README / dashboard hero | “LI.FI plans the route. KeeperHub settles it. This is a live aggregator integration, not an NL agent inventing calldata.” |
| 2 | 0:20–0:50 | Click **Quote** → Live result JSON | “LI.FI returns the quote id, tool, and transactionRequest. That calldata is the only thing we ever send.” |
| 3 | 0:50–1:20 | Click **Simulate** | “KeeperHub dry-run first. Approve simulates clean; swap may show an allowance gap until we broadcast approve — expected.” |
| 4 | 1:20–1:50 | Recent executions + open swap Basescan | “Here is the live Base mainnet settle: quote id, KeeperHub execution id, explorer link — side by side.” |
| 5 | 1:50–2:20 | Remove test | Break quote: set From token to `0x0000000000000000000000000000000000000001` or stop the API briefly / wrong amount — show refusal / no route. “Remove LI.FI and there is nothing for KeeperHub to send.” |
| 6 | 2:20–2:40 | Optional: show `fixtures/proof-run.json` or PROOF.md | “Claims are re-checkable from the repo fixture.” |
| 7 | 2:40–end | Close on one-liner | “Partner = LI.FI. Execution = KeeperHub Direct Execution. Mainnet proof linked in the BUIDL.” |

---

## Remove-test options (pick one)

1. **Dashboard:** change From token to an invalid/junk address → Quote fails with a named refusal (`NO_ROUTE` / `INVALID_INPUT`).  
2. **CLI:** `LIFI_API_BASE=https://127.0.0.1:9 pnpm quote` → fails; nothing to execute.  
3. **Exec without confirm:** leave checkbox unchecked → Execute disabled / `CONFIRM_DENIED`.

---

## Upload tips

- 1080p, clear audio, no music over speech  
- Zoom browser to 125% so JSON is readable  
- Title the file: `lifi-x-keeperhub-demo.mp4`  
- Paste the same swap tx into the DoraHacks form  

Next: fill the form using [SUBMISSION.md](SUBMISSION.md).
