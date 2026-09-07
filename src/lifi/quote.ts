import type { AppEnv } from "../config/env.js";
import { RefusalCode, RefusalError } from "../errors/refusal.js";
import { fetchWithTimeout } from "../http/fetch.js";

export type LifiTransactionRequest = {
  to?: string;
  data?: string;
  value?: string;
  chainId?: number | string;
  gasLimit?: string;
  gasPrice?: string;
};

export type LifiStepAction = {
  fromChainId?: number;
  toChainId?: number;
  fromToken?: { symbol?: string; address?: string; chainId?: number };
  toToken?: { symbol?: string; address?: string; chainId?: number };
  fromAmount?: string;
  toAmount?: string;
  [key: string]: unknown;
};

export type LifiIncludedStep = {
  tool?: string;
  type?: string;
  action?: LifiStepAction;
  [key: string]: unknown;
};

export type LifiEstimate = {
  approvalAddress?: string;
  toAmount?: string;
  toAmountMin?: string;
  [key: string]: unknown;
};

export type LifiQuote = {
  id?: string;
  tool?: string;
  action?: LifiStepAction;
  estimate?: LifiEstimate;
  includedSteps?: LifiIncludedStep[];
  transactionRequest?: LifiTransactionRequest;
  [key: string]: unknown;
};

export type QuoteParams = AppEnv["lifi"];

export type QuoteOverrides = Partial<
  Pick<
    QuoteParams,
    | "fromChain"
    | "toChain"
    | "fromToken"
    | "toToken"
    | "fromAmount"
    | "fromAddress"
    | "slippage"
  >
>;

function assertExecutableQuote(quote: LifiQuote): void {
  const tx = quote.transactionRequest;
  const to = tx?.to;
  const data = tx?.data;
  if (!to || !data) {
    throw new RefusalError(
      RefusalCode.NO_ROUTE,
      "Quote has no transactionRequest (no executable route)",
      { quoteId: quote.id ?? null },
    );
  }
}

export async function getQuote(params: QuoteParams): Promise<LifiQuote> {
  const url = new URL(`${params.apiBase}/quote`);
  url.searchParams.set("fromChain", params.fromChain);
  url.searchParams.set("toChain", params.toChain);
  url.searchParams.set("fromToken", params.fromToken);
  url.searchParams.set("toToken", params.toToken);
  url.searchParams.set("fromAmount", params.fromAmount);
  url.searchParams.set("fromAddress", params.fromAddress);
  url.searchParams.set("slippage", params.slippage);
  if (params.integrator) {
    url.searchParams.set("integrator", params.integrator);
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (params.apiKey) {
    headers["x-lifi-api-key"] = params.apiKey;
  }

  const response = await fetchWithTimeout(url, { headers });
  const bodyText = await response.text();
  let body: unknown;
  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    body = bodyText;
  }

  if (!response.ok) {
    const snippet =
      typeof body === "string"
        ? body.slice(0, 400)
        : JSON.stringify(body).slice(0, 400);
    throw new RefusalError(
      RefusalCode.NO_ROUTE,
      `LI.FI quote failed (${response.status}): ${snippet}`,
      { status: response.status },
    );
  }

  const quote = body as LifiQuote;
  assertExecutableQuote(quote);
  return quote;
}

export function getApprovalAddress(quote: LifiQuote): string | undefined {
  const fromEstimate = quote.estimate?.approvalAddress;
  if (typeof fromEstimate === "string" && fromEstimate) {
    return fromEstimate;
  }

  for (const step of quote.includedSteps ?? []) {
    const stepEstimate = (step as { estimate?: LifiEstimate }).estimate;
    const addr = stepEstimate?.approvalAddress;
    if (typeof addr === "string" && addr) {
      return addr;
    }
  }

  return undefined;
}
