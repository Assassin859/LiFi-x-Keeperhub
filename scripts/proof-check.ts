/**
 * Offline check: README / PROOF claims must match fixtures/proof-run.json.
 * No network, no credentials — re-derivable for judges.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const SWAP_TX =
  "0x77833f89ea827e7b6982257975e1fb4a763da40b924027bcfecae2114f86bcb8";
const APPROVE_TX =
  "0x4bfcad4ea65547526e54d9e6c431e4aba4af7205a0fbdef30018640bc7f28ebc";
const QUOTE_ID = "c10dd97b-ee60-47f6-b7b7-9b7beafb971d:0";
const SWAP_EXEC = "05lj3m301cqcrhdrd6yf7";
const APPROVE_EXEC = "7zdrn0o95852nv1iiur18";

type ProofStep = {
  kind?: string;
  executionId?: string;
  transactionHash?: string;
  transactionLink?: string;
  status?: string;
};

type ProofFixture = {
  quoteId?: string;
  steps?: ProofStep[];
};

function fail(msg: string): never {
  console.error(`proof:check FAILED — ${msg}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const root = resolve(process.cwd());
  const fixturePath = resolve(root, "fixtures/proof-run.json");
  const readme = await readFile(resolve(root, "README.md"), "utf8");
  const proofDoc = await readFile(resolve(root, "docs/PROOF.md"), "utf8");
  const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as ProofFixture;

  if (fixture.quoteId !== QUOTE_ID) {
    fail(`fixture quoteId != ${QUOTE_ID}`);
  }

  const approve = fixture.steps?.find((s) => s.kind === "approve");
  const swap = fixture.steps?.find((s) => s.kind === "swap");
  if (!approve || !swap) fail("fixture missing approve/swap steps");
  if (approve.executionId !== APPROVE_EXEC) fail("approve executionId drift");
  if (swap.executionId !== SWAP_EXEC) fail("swap executionId drift");
  if (approve.transactionHash !== APPROVE_TX) fail("approve tx hash drift");
  if (swap.transactionHash !== SWAP_TX) fail("swap tx hash drift");
  if (approve.status !== "completed" || swap.status !== "completed") {
    fail("steps not completed");
  }
  if (!swap.transactionLink?.includes(SWAP_TX)) {
    fail("swap transactionLink missing hash");
  }

  for (const [label, text] of [
    ["README.md", readme],
    ["docs/PROOF.md", proofDoc],
  ] as const) {
    if (!text.includes(SWAP_TX)) fail(`${label} missing swap tx`);
    if (!text.includes(QUOTE_ID)) fail(`${label} missing quote id`);
    if (!text.includes(SWAP_EXEC)) fail(`${label} missing swap execution id`);
  }

  console.log("proof:check OK");
  console.log(`  quoteId: ${QUOTE_ID}`);
  console.log(`  swap:    https://basescan.org/tx/${SWAP_TX}`);
  console.log(`  exec:    ${SWAP_EXEC}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
