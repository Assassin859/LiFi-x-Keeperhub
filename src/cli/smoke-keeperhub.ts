import { loadKeeperhubEnv } from "../config/env.js";
import { KeeperhubClient } from "../keeperhub/client.js";

async function main(): Promise<void> {
  const env = loadKeeperhubEnv();
  console.log("KeeperHub smoke: GET /api/keys…");
  console.log(`  base: ${env.baseUrl}`);

  const client = new KeeperhubClient({
    baseUrl: env.baseUrl,
    apiKey: env.apiKey,
  });

  const result = await client.checkAuth();
  const prefixes = result.keys
    .map((k) => k.keyPrefix)
    .filter((p): p is string => Boolean(p));

  console.log("\nAuth OK");
  console.log(`  status: ${result.status}`);
  console.log(`  keys on page: ${result.keys.length}`);
  if (result.total != null) {
    console.log(`  meta.total: ${result.total}`);
  } else if (result.keys.length === 0) {
    console.log(
      "  meta.total: (unavailable — response shape may not be a page)",
    );
  }
  if (prefixes.length > 0) {
    console.log(`  keyPrefix samples: ${prefixes.slice(0, 5).join(", ")}`);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\nKeeperHub smoke failed: ${message}`);
  process.exit(1);
});
