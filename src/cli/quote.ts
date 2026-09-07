import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { loadLifiEnv, loadSafetyEnv } from "../config/env.js";
import {
  assertAmount,
  assertChainAllowed,
  assertChainId,
  assertEvmAddress,
} from "../config/validate.js";
import {
  formatQuoteHuman,
  formatQuoteJson,
  formatQuoteRaw,
} from "../lifi/format.js";
import { getQuote, type QuoteOverrides } from "../lifi/quote.js";

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    options: {
      "from-chain": { type: "string" },
      "to-chain": { type: "string" },
      "from-token": { type: "string" },
      "to-token": { type: "string" },
      "from-amount": { type: "string" },
      "from-address": { type: "string" },
      slippage: { type: "string" },
      json: { type: "boolean", default: false },
      raw: { type: "boolean", default: false },
      out: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(`Usage: pnpm quote [options]

Options (all optional; fall back to .env):
  --from-chain <id>
  --to-chain <id>
  --from-token <address>
  --to-token <address>
  --from-amount <wei>
  --from-address <address>
  --slippage <decimal>
  --json              Print compact summary JSON
  --raw               Print full LI.FI response JSON
  --out <path>        Also write the same output to a file
  -h, --help
`);
    return;
  }

  if (values.json && values.raw) {
    throw new Error("Use only one of --json or --raw");
  }

  const env = loadLifiEnv();
  const safety = loadSafetyEnv();
  const overrides: QuoteOverrides = {};
  if (values["from-chain"]) overrides.fromChain = values["from-chain"];
  if (values["to-chain"]) overrides.toChain = values["to-chain"];
  if (values["from-token"]) overrides.fromToken = values["from-token"];
  if (values["to-token"]) overrides.toToken = values["to-token"];
  if (values["from-amount"]) overrides.fromAmount = values["from-amount"];
  if (values["from-address"]) overrides.fromAddress = values["from-address"];
  if (values.slippage) overrides.slippage = values.slippage;

  const params = { ...env, ...overrides };

  assertChainId("fromChain", params.fromChain);
  assertChainId("toChain", params.toChain);
  assertChainAllowed(params.fromChain, safety.allowMainnet);
  assertChainAllowed(params.toChain, safety.allowMainnet);
  assertEvmAddress("fromToken", params.fromToken);
  assertEvmAddress("toToken", params.toToken);
  assertEvmAddress("fromAddress", params.fromAddress);
  assertAmount("fromAmount", params.fromAmount);

  console.error("LI.FI quote…");
  console.error(
    `  ${params.fromChain} → ${params.toChain} | amount=${params.fromAmount} | from=${params.fromAddress}`,
  );

  const quote = await getQuote(params);

  let output: string;
  if (values.raw) {
    output = formatQuoteRaw(quote);
  } else if (values.json) {
    output = formatQuoteJson(quote);
  } else {
    output = `${formatQuoteHuman(quote)}\n`;
  }

  process.stdout.write(output);

  if (values.out) {
    const outPath = resolve(process.cwd(), values.out);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, output, "utf8");
    console.error(`Wrote ${outPath}`);
  }
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(resolve(entry)).href) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\nQuote failed: ${message}`);
    process.exit(1);
  });
}
