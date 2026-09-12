/**
 * Intent-level pending-write guard (#2374 lesson).
 * Claim BEFORE broadcast; clear only on resolved completed / clean failed (no hash).
 * While outstanding, a fresh quote/poll must not issue a second write for the same intent.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { RefusalCode, RefusalError } from "../errors/refusal.js";

const PENDING_TTL_MS = 15 * 60 * 1000;

export type IntentClaim = {
  intentKey: string;
  quoteId: string;
  kind: string;
  runId: string;
  createdAt: string;
  executionId?: string | null;
  transactionHash?: string | null;
  status?: string | null;
};

function pendingDir(): string {
  return resolve(process.cwd(), "artifacts", "pending");
}

function pendingPath(intentKey: string): string {
  const safe = intentKey.replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 180);
  return resolve(pendingDir(), `${safe}.json`);
}

/** Stable intent key from route params + step (not a fresh UUID). */
export function buildIntentKey(input: {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  kind: string;
}): string {
  const material = [
    input.fromChain,
    input.toChain,
    input.fromToken.toLowerCase(),
    input.toToken.toLowerCase(),
    input.fromAmount,
    input.fromAddress.toLowerCase(),
    input.kind,
  ].join("|");
  const digest = createHash("sha256").update(material).digest("hex").slice(0, 16);
  return `intent:${input.kind}:${digest}`;
}

export async function claimIntent(
  intentKey: string,
  meta: { quoteId: string; kind: string; runId: string },
): Promise<void> {
  await mkdir(pendingDir(), { recursive: true });
  const path = pendingPath(intentKey);
  try {
    const raw = await readFile(path, "utf8");
    const existing = JSON.parse(raw) as IntentClaim;
    const age = Date.now() - Date.parse(existing.createdAt);
    if (Number.isFinite(age) && age < PENDING_TTL_MS) {
      throw new RefusalError(
        RefusalCode.INTENT_IN_FLIGHT,
        `Pending write already claimed for ${intentKey} (status=${existing.status ?? "pending"}, exec=${existing.executionId ?? "n/a"}). Resolve or wait for TTL; do not re-broadcast.`,
        existing,
      );
    }
  } catch (err) {
    if (err instanceof RefusalError) throw err;
    /* no existing or unreadable — proceed */
  }

  const claim: IntentClaim = {
    intentKey,
    quoteId: meta.quoteId,
    kind: meta.kind,
    runId: meta.runId,
    createdAt: new Date().toISOString(),
  };
  await writeFile(path, `${JSON.stringify(claim, null, 2)}\n`, "utf8");
}

export async function updateIntent(
  intentKey: string,
  patch: Partial<IntentClaim>,
): Promise<void> {
  const path = pendingPath(intentKey);
  let base: IntentClaim;
  try {
    base = JSON.parse(await readFile(path, "utf8")) as IntentClaim;
  } catch {
    return;
  }
  await writeFile(
    path,
    `${JSON.stringify({ ...base, ...patch }, null, 2)}\n`,
    "utf8",
  );
}

export async function clearIntent(intentKey: string): Promise<void> {
  try {
    await unlink(pendingPath(intentKey));
  } catch {
    /* already gone */
  }
}
