import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { loadKeeperhubEnv, loadLifiEnv, loadSafetyEnv } from "../config/env.js";
import {
  assertAmount,
  assertChainAllowed,
  assertChainId,
  assertEvmAddress,
} from "../config/validate.js";
import { KeeperhubClient } from "../keeperhub/client.js";
import { getQuote, type QuoteOverrides } from "../lifi/quote.js";
import { buildSimulationPlan } from "../mapper/lifi-to-keeperhub.js";

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
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(`Usage: pnpm run:sim [options]

Quotes via LI.FI, then dry-runs approve (if needed) + swap on KeeperHub
with simulate:true (no broadcast).

Options (optional; fall back to .env) match \`pnpm quote\`:
  --from-chain --to-chain --from-token --to-token
  --from-amount --from-address --slippage
  --json
  -h, --help
`);
    return;
  }

  const env = loadLifiEnv();
  const safety = loadSafetyEnv();
  const khEnv = loadKeeperhubEnv();

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
  const plan = buildSimulationPlan(quote, {
    fromToken: params.fromToken,
    fromAmount: params.fromAmount,
  });

  console.error(`Quote id: ${quote.id ?? "(none)"}`);
  console.error(`Simulation steps: ${plan.map((s) => s.kind).join(" → ")}`);

  const client = new KeeperhubClient({
    baseUrl: khEnv.baseUrl,
    apiKey: khEnv.apiKey,
  });

  const results: Array<{
    kind: string;
    quoteId: string | null;
    functionName: string;
    selector?: string;
    simulate: Record<string, unknown>;
  }> = [];

  for (const step of plan) {
    console.error(`\nSimulating ${step.kind} (${step.call.functionName})…`);
    try {
      const response = await client.contractCall({
        chainId: step.call.chainId,
        contractAddress: step.call.contractAddress,
        functionName: step.call.functionName,
        functionArgs: step.call.functionArgs,
        abi: step.call.abi,
        ...(step.call.value ? { value: step.call.value } : {}),
        simulate: true,
      });

      const body = response.body;
      results.push({
        kind: step.kind,
        quoteId: step.quoteId,
        functionName: step.call.functionName,
        selector: step.selector,
        simulate: {
          success: body.success ?? true,
          status: body.status,
          from: body.from,
          to: body.to,
          gasEstimate: body.gasEstimate,
          wouldRevert: body.wouldRevert ?? false,
          simulatedReturnValue: body.simulatedReturnValue,
        },
      });

      if (!values.json) {
        console.error(`Simulate OK — ${step.kind}`);
        console.error(`  function: ${step.call.functionName}`);
        if (step.selector) console.error(`  selector: ${step.selector}`);
        console.error(`  from:     ${body.from ?? "(n/a)"}`);
        console.error(`  to:       ${body.to ?? step.call.contractAddress}`);
        console.error(`  gas:      ${body.gasEstimate ?? "(n/a)"}`);
        console.error(`  wouldRevert: ${body.wouldRevert ?? false}`);
        if (
          body.from &&
          typeof body.from === "string" &&
          body.from.toLowerCase() !== params.fromAddress.toLowerCase()
        ) {
          console.error(
            `  warning: LIFI_FROM_ADDRESS (${params.fromAddress}) != KeeperHub org wallet (${body.from}). Set LIFI_FROM_ADDRESS to the org wallet before execute.`,
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const approvePlanned = plan.some((s) => s.kind === "approve");
      const allowanceGap =
        step.kind === "swap" &&
        approvePlanned &&
        /TRANSFER_FROM_FAILED|insufficient allowance|allowance/i.test(message);

      if (allowanceGap) {
        results.push({
          kind: step.kind,
          quoteId: step.quoteId,
          functionName: step.call.functionName,
          selector: step.selector,
          simulate: {
            success: false,
            expectedWithoutOnChainAllowance: true,
            error: message,
          },
        });
        console.error(
          `Simulate swap reverted (expected): dry-runs do not persist the approve step.`,
        );
        console.error(`  ${message}`);
        console.error(
          `  run:exec will broadcast approve then swap so allowance applies.`,
        );
        continue;
      }
      throw err;
    }
  }

  if (values.json) {
    process.stdout.write(
      `${JSON.stringify({ quoteId: quote.id ?? null, steps: results }, null, 2)}\n`,
    );
  } else {
    const ok = results.filter((r) => r.simulate.success !== false).length;
    console.error(
      `\nDone: ${ok}/${results.length} step(s) simulated cleanly (no broadcast).`,
    );
  }
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(resolve(entry)).href) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\nrun:sim failed: ${message}`);
    process.exit(1);
  });
}
