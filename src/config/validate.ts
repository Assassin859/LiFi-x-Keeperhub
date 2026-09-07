const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const POSITIVE_INT_RE = /^\d+$/;
const AMOUNT_RE = /^\d+$/;

export function assertEvmAddress(label: string, value: string): void {
  if (!ADDRESS_RE.test(value)) {
    throw new Error(
      `Invalid ${label}: expected 0x + 40 hex chars, got "${value}"`,
    );
  }
}

export function assertChainId(label: string, value: string): void {
  if (!POSITIVE_INT_RE.test(value)) {
    throw new Error(`Invalid ${label}: expected numeric chain id, got "${value}"`);
  }
}

export function assertAmount(label: string, value: string): void {
  if (!AMOUNT_RE.test(value) || value === "0") {
    throw new Error(
      `Invalid ${label}: expected positive integer (smallest units), got "${value}"`,
    );
  }
}

/** Chains blocked when ALLOW_MAINNET=false. Base (8453) stays allowed for the demo. */
const MAINNET_CHAIN_IDS = new Set(["1"]);

export function assertChainAllowed(
  chainId: string,
  allowMainnet: boolean,
): void {
  if (!allowMainnet && MAINNET_CHAIN_IDS.has(chainId)) {
    throw new Error(
      `Chain ${chainId} is blocked (ALLOW_MAINNET=false). Set ALLOW_MAINNET=true to use Ethereum mainnet.`,
    );
  }
}
