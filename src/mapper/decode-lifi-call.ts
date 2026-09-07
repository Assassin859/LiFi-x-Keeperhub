import { formatEther, Interface } from "ethers";
import { LIFI_FACET_FRAGMENTS } from "../abi/lifi-facets.js";
import type { KeeperhubRawSwap } from "./lifi-to-keeperhub.js";

export type DecodedContractCall = {
  chainId: number;
  contractAddress: string;
  functionName: string;
  functionArgs: string;
  abi: string;
  value?: string;
  selector: string;
};

const iface = new Interface([...LIFI_FACET_FRAGMENTS]);

/**
 * Serialize ethers Result / bigint values into JSON-safe KeeperHub args.
 * Tuples must be objects (named fields), not positional arrays.
 */
export function serializeArg(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toObject?: unknown }).toObject === "function"
  ) {
    try {
      return serializeArg(
        (value as { toObject: (deep?: boolean) => unknown }).toObject(true),
      );
    } catch {
      if (typeof (value as { toArray?: unknown }).toArray === "function") {
        return (value as { toArray: () => unknown[] }).toArray().map(serializeArg);
      }
    }
  }

  if (Array.isArray(value)) {
    // Prefer named tuple fields if present on the array-like Result
    const named = Object.keys(value).filter((k) => Number.isNaN(Number(k)));
    if (named.length > 0) {
      const obj: Record<string, unknown> = {};
      for (const key of named) {
        obj[key] = serializeArg(
          (value as unknown as Record<string, unknown>)[key],
        );
      }
      return obj;
    }
    return value.map(serializeArg);
  }

  if (value && typeof value === "object") {
    const obj: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (Number.isNaN(Number(key))) {
        obj[key] = serializeArg(child);
      }
    }
    if (Object.keys(obj).length > 0) {
      return obj;
    }
  }

  return value;
}

function weiToKeeperhubEther(value: string): string | undefined {
  const normalized =
    value === "" || value === "0" || value === "0x" || value === "0x0"
      ? 0n
      : BigInt(value);
  if (normalized === 0n) {
    return undefined;
  }
  return formatEther(normalized);
}

/**
 * Decode LI.FI diamond calldata into a KeeperHub contract-call body.
 */
export function decodeLifiCall(raw: KeeperhubRawSwap): DecodedContractCall {
  let parsed;
  try {
    parsed = iface.parseTransaction({ data: raw.data });
  } catch {
    parsed = null;
  }

  if (!parsed) {
    throw new Error(
      `Unsupported LI.FI selector ${raw.selector}. Add facet ABI or use a same-chain GenericSwap / V3 ERC20 route.`,
    );
  }

  const args = parsed.args.map((arg) => serializeArg(arg));
  const fragmentJson = JSON.parse(parsed.fragment.format("json")) as object;
  const etherValue = weiToKeeperhubEther(raw.value);

  return {
    chainId: raw.chainId,
    contractAddress: raw.to,
    functionName: parsed.name,
    functionArgs: JSON.stringify(args),
    abi: JSON.stringify([fragmentJson]),
    ...(etherValue ? { value: etherValue } : {}),
    selector: parsed.selector,
  };
}
