/**
 * Cross-chain quote sample (no broadcast) — proves LI.FI bridge path is wired.
 * Default: Base USDC → Arbitrum USDC.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadLifiEnv } from "../src/config/env.js";
import { assertAmount, assertEvmAddress } from "../src/config/validate.js";
import { summarizeQuote } from "../src/lifi/format.js";
import { getQuote } from "../src/lifi/quote.js";

const ARBITRUM = "42161";
const ARB_USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

async function main(): Promise<void> {
  const env = loadLifiEnv();
  assertEvmAddress("fromAddress", env.fromAddress);
  assertAmount("fromAmount", env.fromAmount);

  const params = {
    ...env,
    fromChain: env.fromChain || "8453",
    toChain: process.env.BRIDGE_TO_CHAIN ?? ARBITRUM,
    fromToken: env.fromToken,
    toToken: process.env.BRIDGE_TO_TOKEN ?? ARB_USDC,
  };

  const quote = await getQuote(params);
  const summary = summarizeQuote(quote);
  const out = {
    kind: "cross-chain-quote-sample",
    createdAt: new Date().toISOString(),
    params: {
      fromChain: params.fromChain,
      toChain: params.toChain,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
    },
    quoteId: quote.id ?? null,
    tool: quote.tool ?? null,
    hasTransactionRequest: Boolean(
      quote.transactionRequest?.to && quote.transactionRequest?.data,
    ),
    summary,
  };

  const dir = resolve(process.cwd(), "fixtures");
  await mkdir(dir, { recursive: true });
  const path = resolve(dir, "bridge-quote-sample.json");
  await writeFile(path, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(out, null, 2));
  console.log(`\nWrote ${path}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
