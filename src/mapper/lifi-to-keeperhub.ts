import {
  getApprovalAddress,
  type LifiQuote,
} from "../lifi/quote.js";
import {
  decodeLifiCall,
  type DecodedContractCall,
} from "./decode-lifi-call.js";

/** Minimal ERC-20 ABI fragment for approve(spender, amount). */
export const ERC20_APPROVE_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export type KeeperhubContractCall = {
  chainId: number;
  contractAddress: string;
  functionName: string;
  functionArgs: string;
  abi: string;
  value?: string;
};

export type KeeperhubRawSwap = {
  quoteId: string | null;
  chainId: number;
  to: string;
  data: string;
  value: string;
  selector: string;
};

export type SimulationStep = {
  kind: "approve" | "swap";
  quoteId: string | null;
  call: KeeperhubContractCall;
  selector?: string;
};

export function extractSelector(data: string): string {
  const hex = data.startsWith("0x") ? data.slice(2) : data;
  if (hex.length < 8) {
    throw new Error(`Calldata too short to extract selector: ${data}`);
  }
  return `0x${hex.slice(0, 8)}`;
}

function resolveChainId(quote: LifiQuote): number {
  const raw =
    quote.transactionRequest?.chainId ??
    quote.action?.fromChainId ??
    quote.action?.toChainId;
  if (raw == null) {
    throw new Error("Quote missing chainId for KeeperHub mapping");
  }
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid chainId on quote: ${String(raw)}`);
  }
  return n;
}

/**
 * Map LI.FI approval spender → KeeperHub contract-call (ERC20 approve).
 */
export function mapApproveCall(
  quote: LifiQuote,
  fromToken: string,
  fromAmount: string,
): KeeperhubContractCall {
  const spender = getApprovalAddress(quote);
  if (!spender) {
    throw new Error(
      "No approval spender on quote (estimate.approvalAddress missing); cannot map approve call",
    );
  }

  return {
    chainId: resolveChainId(quote),
    contractAddress: fromToken,
    functionName: "approve",
    functionArgs: JSON.stringify([spender, fromAmount]),
    abi: JSON.stringify(ERC20_APPROVE_ABI),
  };
}

/**
 * Preserve LI.FI transactionRequest as raw calldata for decode.
 */
export function mapSwapRaw(quote: LifiQuote): KeeperhubRawSwap {
  const tx = quote.transactionRequest;
  if (!tx?.to || !tx.data) {
    throw new Error("Quote has no executable transactionRequest for swap map");
  }

  const value =
    tx.value == null
      ? "0"
      : typeof tx.value === "string"
        ? tx.value
        : String(tx.value);

  return {
    quoteId: quote.id ?? null,
    chainId: resolveChainId(quote),
    to: tx.to,
    data: tx.data,
    value,
    selector: extractSelector(tx.data),
  };
}

export function decodedToContractCall(
  decoded: DecodedContractCall,
): KeeperhubContractCall {
  return {
    chainId: decoded.chainId,
    contractAddress: decoded.contractAddress,
    functionName: decoded.functionName,
    functionArgs: decoded.functionArgs,
    abi: decoded.abi,
    ...(decoded.value ? { value: decoded.value } : {}),
  };
}

export type SimulationPlanParams = {
  fromToken: string;
  fromAmount: string;
};

/**
 * Ordered simulate/execute plan: optional approve, then decoded swap.
 */
export function buildSimulationPlan(
  quote: LifiQuote,
  params: SimulationPlanParams,
): SimulationStep[] {
  const quoteId = quote.id ?? null;
  const steps: SimulationStep[] = [];

  if (getApprovalAddress(quote)) {
    steps.push({
      kind: "approve",
      quoteId,
      call: mapApproveCall(quote, params.fromToken, params.fromAmount),
    });
  }

  const raw = mapSwapRaw(quote);
  const decoded = decodeLifiCall(raw);
  steps.push({
    kind: "swap",
    quoteId,
    call: decodedToContractCall(decoded),
    selector: decoded.selector,
  });

  return steps;
}
