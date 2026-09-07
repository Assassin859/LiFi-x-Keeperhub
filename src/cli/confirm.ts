import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export type ConfirmOptions = {
  requireConfirm: boolean;
  allowMainnet: boolean;
  confirmFlag: boolean;
  /** True when either from or to chain is Ethereum mainnet (1). */
  touchesMainnet: boolean;
};

/**
 * Gate broadcasts. Default REQUIRE_CONFIRM=true requires --confirm or interactive y.
 * When ALLOW_MAINNET=true and the route touches mainnet, --confirm is always required.
 */
export async function ensureBroadcastConfirmed(
  opts: ConfirmOptions,
): Promise<void> {
  const mustConfirm =
    opts.requireConfirm || (opts.allowMainnet && opts.touchesMainnet);

  if (!mustConfirm) {
    return;
  }

  if (opts.confirmFlag) {
    return;
  }

  if (input.isTTY && output.isTTY) {
    const rl = createInterface({ input, output });
    try {
      const answer = await rl.question(
        "Broadcast on-chain via KeeperHub? Type y to confirm: ",
      );
      if (answer.trim().toLowerCase() !== "y") {
        throw new Error("Broadcast cancelled (confirmation not given).");
      }
    } finally {
      rl.close();
    }
    return;
  }

  throw new Error(
    "Broadcast requires confirmation. Re-run with --confirm (or set REQUIRE_CONFIRM=false for non-mainnet demos).",
  );
}
