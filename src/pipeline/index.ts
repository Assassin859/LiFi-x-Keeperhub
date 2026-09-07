import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
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
import { summarizeQuote } from "../lifi/format.js";
import { getQuote, type QuoteOverrides, type QuoteParams } from "../lifi/quote.js";
import { buildSimulationPlan } from "../mapper/lifi-to-keeperhub.js";

export type PipelineOverrides = QuoteOverrides;

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 120);
}

export function resolveQuoteParams(overrides: PipelineOverrides = {}): QuoteParams {
  const env = loadLifiEnv();
  const safety = loadSafetyEnv();
  const params = { ...env, ...overrides };

  assertChainId("fromChain", params.fromChain);
  assertChainId("toChain", params.toChain);
  assertChainAllowed(params.fromChain, safety.allowMainnet);
  assertChainAllowed(params.toChain, safety.allowMainnet);
  assertEvmAddress("fromToken", params.fromToken);
  assertEvmAddress("toToken", params.toToken);
  assertEvmAddress("fromAddress", params.fromAddress);
  assertAmount("fromAmount", params.fromAmount);

  return params;
}

function khClient(): KeeperhubClient {
  const kh = loadKeeperhubEnv();
  return new KeeperhubClient({ baseUrl: kh.baseUrl, apiKey: kh.apiKey });
}

export async function pipelineQuote(overrides: PipelineOverrides = {}) {
  const params = resolveQuoteParams(overrides);
  const quote = await getQuote(params);
  return {
    params: {
      fromChain: params.fromChain,
      toChain: params.toChain,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
      slippage: params.slippage,
    },
    summary: summarizeQuote(quote),
    quoteId: quote.id ?? null,
  };
}

export async function pipelineSim(overrides: PipelineOverrides = {}) {
  const params = resolveQuoteParams(overrides);
  const quote = await getQuote(params);
  const plan = buildSimulationPlan(quote, {
    fromToken: params.fromToken,
    fromAmount: params.fromAmount,
  });
  const client = khClient();
  const steps: Array<Record<string, unknown>> = [];

  for (const step of plan) {
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
      if (response.mode !== "simulate") {
        throw new Error("Unexpected non-simulate response");
      }
      const body = response.body as SimulateBody;
      steps.push({
        kind: step.kind,
        functionName: step.call.functionName,
        selector: step.selector ?? null,
        success: true,
        from: body.from ?? null,
        gasEstimate: body.gasEstimate ?? null,
        wouldRevert: body.wouldRevert ?? false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const approvePlanned = plan.some((s) => s.kind === "approve");
      const allowanceGap =
        step.kind === "swap" &&
        approvePlanned &&
        /TRANSFER_FROM_FAILED|insufficient allowance|allowance/i.test(message);
      if (allowanceGap) {
        steps.push({
          kind: step.kind,
          functionName: step.call.functionName,
          selector: step.selector ?? null,
          success: false,
          expectedWithoutOnChainAllowance: true,
          error: message,
        });
        continue;
      }
      throw err;
    }
  }

  return {
    params: {
      fromChain: params.fromChain,
      toChain: params.toChain,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
      slippage: params.slippage,
    },
    quoteId: quote.id ?? null,
    summary: summarizeQuote(quote),
    steps,
  };
}

export async function pipelineExec(
  overrides: PipelineOverrides = {},
  opts: { confirm: boolean; skipSim?: boolean; allowFromMismatch?: boolean } = {
    confirm: false,
  },
) {
  if (!opts.confirm) {
    throw new Error("Broadcast requires confirm: true");
  }

  const params = resolveQuoteParams(overrides);
  const quote = await getQuote(params);
  const plan = buildSimulationPlan(quote, {
    fromToken: params.fromToken,
    fromAmount: params.fromAmount,
  });
  const client = khClient();
  const quoteId = quote.id ?? "unknown-quote";
  const runId = randomUUID();

  if (!opts.skipSim) {
    for (const step of plan) {
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
        if (sim.mode !== "simulate") continue;
        const body = sim.body as SimulateBody;
        if (
          body.from &&
          typeof body.from === "string" &&
          body.from.toLowerCase() !== params.fromAddress.toLowerCase() &&
          !opts.allowFromMismatch
        ) {
          throw new Error(
            `LIFI_FROM_ADDRESS (${params.fromAddress}) != KeeperHub org wallet (${body.from})`,
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const approvePlanned = plan.some((s) => s.kind === "approve");
        const allowanceGap =
          step.kind === "swap" &&
          approvePlanned &&
          /TRANSFER_FROM_FAILED|insufficient allowance|allowance/i.test(
            message,
          );
        if (allowanceGap) continue;
        throw err;
      }
    }
  }

  const stepResults: Array<Record<string, unknown>> = [];

  for (const step of plan) {
    const idempotencyKey = `lifi-x-kh:${sanitizeId(quoteId)}:${step.kind}:${runId}`;
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
      throw new Error("Expected broadcast response");
    }
    const body = broadcast.body as BroadcastBody;
    const executionId = body.executionId;
    if (!executionId) {
      throw new KeeperhubApiError(
        `No executionId: ${JSON.stringify(body).slice(0, 300)}`,
        broadcast.status,
        body,
      );
    }
    const polled = await client.pollExecutionStatus(executionId);
    const st = polled.body.status ?? "unknown";
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
        `${step.kind} failed (${executionId}): ${JSON.stringify(polled.body.error ?? polled.body).slice(0, 400)}`,
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

  const dir = resolve(process.cwd(), "artifacts");
  await mkdir(dir, { recursive: true });
  const file = `run-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const path = resolve(dir, file);
  await writeFile(path, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  return { ...artifact, artifactPath: file, summary: summarizeQuote(quote) };
}

export async function listRunArtifacts() {
  const dir = resolve(process.cwd(), "artifacts");
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => f.startsWith("run-") && f.endsWith(".json"));
  } catch {
    return [];
  }
  files.sort().reverse();
  const runs = [];
  for (const file of files.slice(0, 20)) {
    try {
      const raw = await readFile(resolve(dir, file), "utf8");
      const json = JSON.parse(raw) as Record<string, unknown>;
      runs.push({ file, ...json });
    } catch {
      /* skip bad files */
    }
  }
  return runs;
}

export function dashboardDefaults() {
  const env = loadLifiEnv();
  return {
    fromChain: env.fromChain,
    toChain: env.toChain,
    fromToken: env.fromToken,
    toToken: env.toToken,
    fromAmount: env.fromAmount,
    fromAddress: env.fromAddress,
    slippage: env.slippage,
  };
}
