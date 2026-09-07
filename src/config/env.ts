import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

loadDotenv({ path: resolve(process.cwd(), ".env"), quiet: true });

function optional(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

function required(name: string): string {
  const value = optional(name);
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

export type AppEnv = {
  lifi: {
    apiBase: string;
    apiKey: string;
    integrator: string;
    fromChain: string;
    toChain: string;
    fromToken: string;
    toToken: string;
    fromAmount: string;
    fromAddress: string;
    slippage: string;
  };
  keeperhub: {
    baseUrl: string;
    apiKey: string;
    orgId: string;
    network: string;
  };
  safety: {
    requireConfirm: boolean;
    allowMainnet: boolean;
  };
};

export function loadLifiEnv(): AppEnv["lifi"] {
  return {
    apiBase: optional("LIFI_API_BASE", "https://li.quest/v1").replace(
      /\/$/,
      "",
    ),
    apiKey: optional("LIFI_API_KEY"),
    integrator: optional("LIFI_INTEGRATOR", "lifi-x-keeperhub"),
    fromChain: optional("LIFI_FROM_CHAIN", "8453"),
    toChain: optional("LIFI_TO_CHAIN", "8453"),
    fromToken: optional(
      "LIFI_FROM_TOKEN",
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    ),
    toToken: optional(
      "LIFI_TO_TOKEN",
      "0x4200000000000000000000000000000000000006",
    ),
    fromAmount: optional("LIFI_FROM_AMOUNT", "1000000"),
    fromAddress: required("LIFI_FROM_ADDRESS"),
    slippage: optional("LIFI_SLIPPAGE", "0.03"),
  };
}

export function loadKeeperhubEnv(): AppEnv["keeperhub"] {
  const apiKey = required("KEEPERHUB_API_KEY");
  if (!apiKey.startsWith("kh_")) {
    throw new Error(
      "KEEPERHUB_API_KEY must be an organisation key (prefix kh_). Webhook keys (wfb_) are not valid here.",
    );
  }

  return {
    baseUrl: optional(
      "KEEPERHUB_BASE_URL",
      "https://app.keeperhub.com",
    ).replace(/\/$/, ""),
    apiKey,
    orgId: optional("KEEPERHUB_ORG_ID"),
    network: optional("KEEPERHUB_NETWORK", "base"),
  };
}

/**
 * REQUIRE_CONFIRM is reserved for Phase 3 `run:exec` (human gate before broadcast).
 * Quote / smoke paths do not prompt.
 */
export function loadSafetyEnv(): AppEnv["safety"] {
  return {
    requireConfirm: optional("REQUIRE_CONFIRM", "true") !== "false",
    allowMainnet: optional("ALLOW_MAINNET", "false") === "true",
  };
}
