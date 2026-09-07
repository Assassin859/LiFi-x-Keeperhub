/** Named refusal codes — gavel-style clarity for judges and operators. */

export const RefusalCode = {
  INVALID_INPUT: "INVALID_INPUT",
  CHAIN_NOT_ALLOWED: "CHAIN_NOT_ALLOWED",
  NO_ROUTE: "NO_ROUTE",
  SIM_REVERT: "SIM_REVERT",
  CONFIRM_DENIED: "CONFIRM_DENIED",
  WALLET_MISMATCH: "WALLET_MISMATCH",
  STEP_FAILED: "STEP_FAILED",
  KEEPERHUB_ERROR: "KEEPERHUB_ERROR",
} as const;

export type RefusalCode = (typeof RefusalCode)[keyof typeof RefusalCode];

export class RefusalError extends Error {
  readonly code: RefusalCode;
  readonly details?: unknown;

  constructor(code: RefusalCode, message: string, details?: unknown) {
    super(message);
    this.name = "RefusalError";
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return {
      refusal: this.code,
      error: this.message,
      ...(this.details !== undefined ? { details: this.details } : {}),
    };
  }
}

export function isRefusalError(err: unknown): err is RefusalError {
  return err instanceof RefusalError;
}

/** Map unknown failures into the closest named refusal when possible. */
export function asRefusal(err: unknown): RefusalError {
  if (err instanceof RefusalError) return err;
  const message = err instanceof Error ? err.message : String(err);

  if (/confirmation|confirm must be true|Broadcast cancelled|Broadcast requires/i.test(message)) {
    return new RefusalError(RefusalCode.CONFIRM_DENIED, message);
  }
  if (/LIFI_FROM_ADDRESS|org wallet|mismatch/i.test(message)) {
    return new RefusalError(RefusalCode.WALLET_MISMATCH, message);
  }
  if (/ALLOW_MAINNET|Chain \d+ is blocked/i.test(message)) {
    return new RefusalError(RefusalCode.CHAIN_NOT_ALLOWED, message);
  }
  if (/no transactionRequest|no executable route|no route/i.test(message)) {
    return new RefusalError(RefusalCode.NO_ROUTE, message);
  }
  if (/wouldRevert|SIM_|simulate.*fail|TRANSFER_FROM_FAILED/i.test(message)) {
    return new RefusalError(RefusalCode.SIM_REVERT, message);
  }
  if (/Invalid |expected 0x|expected numeric|expected positive/i.test(message)) {
    return new RefusalError(RefusalCode.INVALID_INPUT, message);
  }
  if (/executionId|KeeperHub|contract-call|poll/i.test(message)) {
    return new RefusalError(RefusalCode.KEEPERHUB_ERROR, message);
  }
  if (/failed \(/i.test(message)) {
    return new RefusalError(RefusalCode.STEP_FAILED, message);
  }
  return new RefusalError(RefusalCode.KEEPERHUB_ERROR, message);
}
