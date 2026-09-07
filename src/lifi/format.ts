import {
  getApprovalAddress,
  type LifiQuote,
} from "./quote.js";

export type QuoteSummary = {
  id: string | null;
  tool: string | null;
  action: {
    fromChainId: number | null;
    toChainId: number | null;
    fromToken: string | null;
    toToken: string | null;
    fromAmount: string | null;
  };
  steps: Array<{ tool: string | null; type: string | null }>;
  transactionRequest: {
    to: string | null;
    chainId: number | string | null;
    value: string | null;
    dataLength: number;
  };
  approvalSpender: string | null;
  hasApprovalSpender: boolean;
};

function tokenLabel(
  token: { symbol?: string; address?: string } | undefined,
): string | null {
  if (!token) return null;
  return token.symbol ?? token.address ?? null;
}

export function summarizeQuote(quote: LifiQuote): QuoteSummary {
  const tx = quote.transactionRequest ?? {};
  const data = typeof tx.data === "string" ? tx.data : "";
  const approvalSpender = getApprovalAddress(quote) ?? null;
  const action = quote.action;

  return {
    id: quote.id ?? null,
    tool: quote.tool ?? null,
    action: {
      fromChainId: action?.fromChainId ?? null,
      toChainId: action?.toChainId ?? null,
      fromToken: tokenLabel(action?.fromToken),
      toToken: tokenLabel(action?.toToken),
      fromAmount: action?.fromAmount ?? null,
    },
    steps: (quote.includedSteps ?? []).map((step) => ({
      tool: step.tool ?? null,
      type: step.type ?? null,
    })),
    transactionRequest: {
      to: tx.to ?? null,
      chainId: tx.chainId ?? null,
      value: tx.value ?? null,
      dataLength: data.length,
    },
    approvalSpender,
    hasApprovalSpender: Boolean(approvalSpender),
  };
}

export function formatQuoteHuman(quote: LifiQuote): string {
  const s = summarizeQuote(quote);
  const lines: string[] = [
    "Quote OK",
    `  id:     ${s.id ?? "(none)"}`,
    `  tool:   ${s.tool ?? "(none)"}`,
  ];

  const from =
    s.action.fromToken && s.action.fromChainId != null
      ? `${s.action.fromToken} (chain ${s.action.fromChainId})`
      : s.action.fromToken ??
        (s.action.fromChainId != null ? `chain ${s.action.fromChainId}` : null);
  const to =
    s.action.toToken && s.action.toChainId != null
      ? `${s.action.toToken} (chain ${s.action.toChainId})`
      : s.action.toToken ??
        (s.action.toChainId != null ? `chain ${s.action.toChainId}` : null);

  if (from || to) {
    lines.push(`  route:  ${from ?? "?"} → ${to ?? "?"}`);
  }
  if (s.action.fromAmount) {
    lines.push(`  amount: ${s.action.fromAmount}`);
  }

  if (s.steps.length > 0) {
    lines.push("  steps:");
    for (const [i, step] of s.steps.entries()) {
      lines.push(
        `    ${i + 1}. ${step.tool ?? "(tool?)"} [${step.type ?? "unknown"}]`,
      );
    }
  } else {
    lines.push("  steps:  (none)");
  }

  lines.push(`  to:      ${s.transactionRequest.to ?? "(none)"}`);
  lines.push(`  chainId: ${s.transactionRequest.chainId ?? "(none)"}`);
  lines.push(`  value:   ${s.transactionRequest.value ?? "(none)"}`);
  lines.push(
    `  data:    ${
      s.transactionRequest.dataLength
        ? `${s.transactionRequest.dataLength} chars`
        : "(none)"
    }`,
  );

  if (s.hasApprovalSpender) {
    lines.push(
      `  approval spender: ${s.approvalSpender} (ERC20 allowance target; check on-chain before execute)`,
    );
  } else {
    lines.push("  approval spender: (none reported)");
  }

  return lines.join("\n");
}

export function formatQuoteJson(quote: LifiQuote): string {
  return `${JSON.stringify(summarizeQuote(quote), null, 2)}\n`;
}

export function formatQuoteRaw(quote: LifiQuote): string {
  return `${JSON.stringify(quote, null, 2)}\n`;
}
