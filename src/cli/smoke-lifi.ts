import { main } from "./quote.js";

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\nLI.FI smoke failed: ${message}`);
  process.exit(1);
});
