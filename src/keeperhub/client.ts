import { fetchWithTimeout } from "../http/fetch.js";

export type KeeperhubConfig = {
  baseUrl: string;
  apiKey: string;
};

export type KeeperhubKeyInfo = {
  keyPrefix?: string;
  name?: string;
  [key: string]: unknown;
};

export type AuthCheckResult = {
  ok: true;
  status: number;
  keys: KeeperhubKeyInfo[];
  total: number | null;
};

export type ContractCallRequest = {
  chainId: number;
  contractAddress: string;
  functionName: string;
  functionArgs: string;
  abi: string;
  value?: string;
  /** When true, dry-run only. Omit/false to broadcast. */
  simulate?: boolean;
  idempotencyKey?: string;
};

export type SimulateBody = {
  success?: boolean;
  status?: string;
  from?: string;
  to?: string;
  value?: string;
  gasEstimate?: string;
  simulatedReturnValue?: unknown;
  wouldRevert?: boolean;
  [key: string]: unknown;
};

export type BroadcastBody = {
  executionId?: string;
  status?: string;
  transactionHash?: string;
  transactionLink?: string;
  idempotentReplay?: boolean;
  [key: string]: unknown;
};

export type SimulateSuccess = {
  ok: true;
  mode: "simulate";
  status: number;
  body: SimulateBody;
};

export type BroadcastSuccess = {
  ok: true;
  mode: "broadcast";
  status: number;
  body: BroadcastBody;
};

export type ExecutionStatusBody = {
  executionId?: string;
  status?: string;
  transactionHash?: string;
  transactionLink?: string;
  error?: unknown;
  receipts?: unknown[];
  [key: string]: unknown;
};

export type ExecutionStatusResult = {
  ok: true;
  status: number;
  body: ExecutionStatusBody;
  pollIntervalHintSeconds: number;
};

export class KeeperhubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "KeeperhubApiError";
  }
}

const TERMINAL_STATUSES = new Set(["completed", "failed", "unconfirmed"]);

function parseKeysPage(body: unknown): {
  keys: KeeperhubKeyInfo[];
  total: number | null;
} {
  if (Array.isArray(body)) {
    return { keys: body as KeeperhubKeyInfo[], total: body.length };
  }

  if (body && typeof body === "object") {
    const obj = body as {
      items?: unknown;
      keys?: unknown;
      meta?: { total?: unknown };
    };

    if (Array.isArray(obj.items)) {
      const total =
        typeof obj.meta?.total === "number" ? obj.meta.total : obj.items.length;
      return { keys: obj.items as KeeperhubKeyInfo[], total };
    }

    if (Array.isArray(obj.keys)) {
      const total =
        typeof obj.meta?.total === "number" ? obj.meta.total : obj.keys.length;
      return { keys: obj.keys as KeeperhubKeyInfo[], total };
    }
  }

  return { keys: [], total: null };
}

function formatContractCallError(status: number, body: unknown): string {
  if (body && typeof body === "object") {
    const b = body as {
      code?: unknown;
      failureKind?: unknown;
      wouldRevert?: unknown;
      error?: unknown;
      message?: unknown;
    };

    const parts: string[] = [`KeeperHub contract-call failed (${status})`];
    if (typeof b.code === "string") parts.push(`code=${b.code}`);
    if (typeof b.failureKind === "string") {
      parts.push(`failureKind=${b.failureKind}`);
    }
    if (typeof b.wouldRevert === "boolean") {
      parts.push(`wouldRevert=${b.wouldRevert}`);
    }
    if (typeof b.error === "string") parts.push(b.error);
    else if (typeof b.message === "string") parts.push(b.message);
    else parts.push(JSON.stringify(body).slice(0, 400));

    if (status === 422 || b.code === "WALLET_NOT_CONFIGURED") {
      parts.push(
        "Configure an organisation wallet in the KeeperHub dashboard.",
      );
    }
    return parts.join(" — ");
  }

  return `KeeperHub contract-call failed (${status}): ${String(body).slice(0, 400)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class KeeperhubClient {
  constructor(private readonly config: KeeperhubConfig) {}

  private headers(opts?: {
    json?: boolean;
    idempotencyKey?: string;
  }): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${this.config.apiKey}`,
    };
    if (opts?.json) headers["Content-Type"] = "application/json";
    if (opts?.idempotencyKey) {
      headers["Idempotency-Key"] = opts.idempotencyKey;
    }
    return headers;
  }

  async checkAuth(): Promise<AuthCheckResult> {
    const url = `${this.config.baseUrl}/api/keys`;
    const response = await fetchWithTimeout(url, { headers: this.headers() });
    const bodyText = await response.text();
    let body: unknown;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      body = bodyText;
    }

    if (response.status === 401) {
      throw new Error(
        "KeeperHub auth failed (401). Use an organisation API key with prefix kh_ (not wfb_).",
      );
    }

    if (!response.ok) {
      const snippet =
        typeof body === "string"
          ? body.slice(0, 400)
          : JSON.stringify(body).slice(0, 400);
      throw new Error(
        `KeeperHub /api/keys failed (${response.status}): ${snippet}`,
      );
    }

    const { keys, total } = parseKeysPage(body);

    return {
      ok: true,
      status: response.status,
      keys,
      total,
    };
  }

  async contractCall(
    request: ContractCallRequest,
  ): Promise<SimulateSuccess | BroadcastSuccess> {
    const { idempotencyKey, simulate, ...rest } = request;
    const payload: Record<string, unknown> = { ...rest };
    if (simulate === true) {
      payload.simulate = true;
    }

    const url = `${this.config.baseUrl}/api/execute/contract-call`;
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: this.headers({
        json: true,
        idempotencyKey: simulate ? undefined : idempotencyKey,
      }),
      body: JSON.stringify(payload),
    });

    const bodyText = await response.text();
    let body: unknown;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      body = bodyText;
    }

    // 202 can be a valid async/failed-cap style response for broadcasts
    if (!response.ok && response.status !== 202) {
      throw new KeeperhubApiError(
        formatContractCallError(response.status, body),
        response.status,
        body,
      );
    }

    if (simulate === true) {
      const parsed = (body ?? {}) as SimulateBody;
      if (parsed.wouldRevert === true || parsed.success === false) {
        throw new KeeperhubApiError(
          formatContractCallError(response.status, body),
          response.status,
          body,
        );
      }
      return { ok: true, mode: "simulate", status: response.status, body: parsed };
    }

    const parsed = (body ?? {}) as BroadcastBody;
    if (!parsed.executionId && parsed.status === "failed") {
      throw new KeeperhubApiError(
        formatContractCallError(response.status, body),
        response.status,
        body,
      );
    }

    return {
      ok: true,
      mode: "broadcast",
      status: response.status,
      body: parsed,
    };
  }

  async getExecutionStatus(
    executionId: string,
  ): Promise<ExecutionStatusResult> {
    const url = `${this.config.baseUrl}/api/execute/${encodeURIComponent(executionId)}/status`;
    const response = await fetchWithTimeout(url, { headers: this.headers() });
    const bodyText = await response.text();
    let body: unknown;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      body = bodyText;
    }

    if (!response.ok) {
      throw new KeeperhubApiError(
        `KeeperHub status failed (${response.status}): ${
          typeof body === "string"
            ? body.slice(0, 400)
            : JSON.stringify(body).slice(0, 400)
        }`,
        response.status,
        body,
      );
    }

    const hintRaw = response.headers.get("X-Poll-Interval-Hint");
    const hintSeconds =
      hintRaw != null && hintRaw !== "" && Number.isFinite(Number(hintRaw))
        ? Number(hintRaw)
        : 2;

    return {
      ok: true,
      status: response.status,
      body: (body ?? {}) as ExecutionStatusBody,
      pollIntervalHintSeconds: hintSeconds,
    };
  }

  async pollExecutionStatus(
    executionId: string,
    opts?: { maxWaitMs?: number; fallbackIntervalSec?: number },
  ): Promise<ExecutionStatusResult> {
    const maxWaitMs = opts?.maxWaitMs ?? 90_000;
    const fallback = opts?.fallbackIntervalSec ?? 2;
    const started = Date.now();
    let last: ExecutionStatusResult | undefined;

    while (Date.now() - started < maxWaitMs) {
      last = await this.getExecutionStatus(executionId);
      const status = last.body.status ?? "";
      if (TERMINAL_STATUSES.has(status) || last.pollIntervalHintSeconds === 0) {
        return last;
      }
      const waitSec =
        last.pollIntervalHintSeconds > 0
          ? last.pollIntervalHintSeconds
          : fallback;
      await sleep(Math.max(0.5, waitSec) * 1000);
    }

    if (!last) {
      throw new Error(`No status received for execution ${executionId}`);
    }
    throw new Error(
      `Timed out polling ${executionId} after ${maxWaitMs}ms (last status=${last.body.status ?? "?"})`,
    );
  }
}
