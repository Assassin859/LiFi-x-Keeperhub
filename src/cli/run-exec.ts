import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { ensureBroadcastConfirmed } from "./confirm.js";
import { loadKeeperhubEnv, loadLifiEnv, loadSafetyEnv } from "../config/env.js";
import {
  assertAmount,
  assertChainAllowed,
  assertChainId,
  assertEvmAddress,
} from "../config/validate.js";
import {
  KeeperhubApiError,
  KeeperhubClient,
  type BroadcastBody,
  type SimulateBody,
} from "../keeperhub/client.js";
import { getQuote, type QuoteOverrides } from "../lifi/quote.js";
import { buildSimulationPlan } from "../mapper/lifi-to-keeperhub.js";

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 120);
}

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
      confirm: { type: "boolean", default: false },
      "skip-sim": { type: "boolean", default: false },
      "allow-from-mismatch": { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(`Usage: pnpm run:exec [options]

Quote via LI.FI, optional preflight simulate, confirm, then broadcast
approve (if needed) + swap through KeeperHub. Polls status and writes an artifact.

Options:
  (same quote flags as pnpm quote)
  --confirm                 Acknowledge on-chain broadcast
  --skip-sim                Skip preflight simulates
  --allow-from-mismatch     Allow LIFI_FROM_ADDRESS != org wallet
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

  const client = new KeeperhubClient({
    baseUrl: khEnv.baseUrl,
    apiKey: khEnv.apiKey,
  });

  console.error("LI.FI quote…");
  console.error(
    `  ${params.fromChain} → ${params.toChain} | amount=${params.fromAmount} | from=${params.fromAddress}`,
  );

  const quote = await getQuote(params);
  const plan = buildSimulationPlan(quote, {
    fromToken: params.fromToken,
    fromAmount: params.fromAmount,
  });
  const quoteId = quote.id ?? "unknown-quote";
  const runId = randomUUID();

  console.error(`Quote id: ${quoteId}`);
  console.error(`Steps: ${plan.map((s) => s.kind).join(" → ")}`);

  if (!values["skip-sim"]) {
    console.error("\nPreflight simulate…");
    for (const step of plan) {
      console.error(`  sim ${step.kind} (${step.call.functionName})…`);
      try {
        const sim = await client.contractCall({
          chainId: step.call.chainId,
          contractAddress: step.call.contractAddress,
          functionName: step.call.functionName,
          functionArgs: step.call.functionArgs,
          abi: step.call.abi,
          ...(step.call.value ? { value: step.call.value } : {}),
          simulate: true,
        });
        if (sim.mode !== "simulate") {
          throw new Error("Unexpected non-simulate response during preflight");
        }
        const body = sim.body as SimulateBody;
        if (
          body.from &&
          typeof body.from === "string" &&
          body.from.toLowerCase() !== params.fromAddress.toLowerCase()
        ) {
          const msg = `LIFI_FROM_ADDRESS (${params.fromAddress}) != KeeperHub org wallet (${body.from}). Set LIFI_FROM_ADDRESS to the org wallet, or pass --allow-from-mismatch.`;
          if (!values["allow-from-mismatch"]) {
            throw new Error(msg);
          }
          console.error(`  warning: ${msg}`);
        }
        console.error(
          `  sim OK — gas=${body.gasEstimate ?? "?"} wouldRevert=${body.wouldRevert ?? false}`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const approvePlanned = plan.some((s) => s.kind === "approve");
        const allowanceGap =
          step.kind === "swap" &&
          approvePlanned &&
          /TRANSFER_FROM_FAILED|insufficient allowance|allowance/i.test(
            message,
          );
        if (allowanceGap) {
          console.error(
            `  sim swap allowance gap (expected before broadcast): continuing`,
          );
          continue;
        }
        throw err;
      }
    }
  }

  await ensureBroadcastConfirmed({
    requireConfirm: safety.requireConfirm,
    allowMainnet: safety.allowMainnet,
    confirmFlag: Boolean(values.confirm),
    touchesMainnet: params.fromChain === "1" || params.toChain === "1",
  });

  console.error("\nBroadcasting via KeeperHub…");

  const stepResults: Array<Record<string, unknown>> = [];

  for (const step of plan) {
    const idempotencyKey = `lifi-x-kh:${sanitizeId(quoteId)}:${step.kind}:${runId}`;
    console.error(
      `\nExecute ${step.kind} (${step.call.functionName}) key=${idempotencyKey}`,
    );

    const broadcast = await client.contractCall({
      chainId: step.call.chainId,
      contractAddress: step.call.contractAddress,
      functionName: step.call.functionName,
      functionArgs: step.call.functionArgs,
      abi: step.call.abi,
      ...(step.call.value ? { value: step.call.value } : {}),
      idempotencyKey,
    });

    if (broadcast.mode !== "broadcast") {
      throw new Error("Expected broadcast response from contract-call");
    }

    const body = broadcast.body as BroadcastBody;
    const executionId = body.executionId;
    if (!executionId) {
      throw new KeeperhubApiError(
        `Broadcast returned no executionId: ${JSON.stringify(body).slice(0, 400)}`,
        broadcast.status,
        body,
      );
    }

    console.error(`  executionId: ${executionId}`);
    if (body.transactionHash) {
      console.error(`  tx (immediate): ${body.transactionHash}`);
    }

    console.error(`  polling status…`);
    const polled = await client.pollExecutionStatus(executionId);
    const st = polled.body.status ?? "unknown";
    console.error(`  status: ${st}`);
    if (polled.body.transactionHash) {
      console.error(`  hash: ${polled.body.transactionHash}`);
    }
    if (polled.body.transactionLink) {
      console.error(`  link: ${polled.body.transactionLink}`);
    }

    stepResults.push({
      kind: step.kind,
      functionName: step.call.functionName,
      selector: step.selector ?? null,
      idempotencyKey,
      executionId,
      status: st,
      transactionHash:
        polled.body.transactionHash ?? body.transactionHash ?? null,
      transactionLink:
        polled.body.transactionLink ?? body.transactionLink ?? null,
      error: polled.body.error ?? null,
    });

    if (st === "failed") {
      throw new Error(
        `${step.kind} execution failed (${executionId}): ${JSON.stringify(polled.body.error ?? polled.body).slice(0, 400)}`,
      );
    }
  }

  const artifact = {
    runId,
    quoteId,
    fromAddress: params.fromAddress,
    steps: stepResults,
    createdAt: new Date().toISOString(),
  };

  const outPath = resolve(
    process.cwd(),
    "artifacts",
    `run-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  await mkdir(resolve(process.cwd(), "artifacts"), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.error(`\nWrote ${outPath}`);

  if (values.json) {
    process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
  } else {
    console.error(`\nExecute complete: ${stepResults.length} step(s).`);
    for (const s of stepResults) {
      console.error(
        `  ${s.kind}: ${s.status} ${s.transactionLink ?? s.transactionHash ?? ""}`,
      );
    }
  }
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(resolve(entry)).href) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\nrun:exec failed: ${message}`);
    process.exit(1);
  });
}
