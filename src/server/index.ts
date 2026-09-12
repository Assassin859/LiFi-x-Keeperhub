import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { RefusalCode, asRefusal, isRefusalError } from "../errors/refusal.js";
import {
  dashboardDefaults,
  listRunArtifacts,
  pipelineExec,
  pipelineQuote,
  pipelineSim,
  type PipelineOverrides,
} from "../pipeline/index.js";

const app = new Hono();
app.use("*", cors());

function bodyOverrides(body: Record<string, unknown>): PipelineOverrides {
  const o: PipelineOverrides = {};
  if (typeof body.fromChain === "string") o.fromChain = body.fromChain;
  if (typeof body.toChain === "string") o.toChain = body.toChain;
  if (typeof body.fromToken === "string") o.fromToken = body.fromToken;
  if (typeof body.toToken === "string") o.toToken = body.toToken;
  if (typeof body.fromAmount === "string") o.fromAmount = body.fromAmount;
  if (typeof body.fromAddress === "string") o.fromAddress = body.fromAddress;
  if (typeof body.slippage === "string") o.slippage = body.slippage;
  return o;
}

function refusalResponse(err: unknown) {
  const refusal = asRefusal(err);
  return {
    refusal: refusal.code,
    error: refusal.message,
    ...(refusal.details !== undefined ? { details: refusal.details } : {}),
  };
}

app.get("/api/health", (c) => c.json({ ok: true, service: "lifi-x-keeperhub" }));

app.get("/api/defaults", (c) => c.json(dashboardDefaults()));

app.get("/api/runs", async (c) => {
  const runs = await listRunArtifacts();
  return c.json({ runs });
});

app.get("/api/refusals", (c) =>
  c.json({
    codes: Object.values(RefusalCode),
    note: "Named refusals returned on /api/quote, /api/sim, /api/exec failures",
  }),
);

app.post("/api/quote", async (c) => {
  try {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await pipelineQuote(bodyOverrides(body));
    return c.json(result);
  } catch (err) {
    return c.json(refusalResponse(err), 400);
  }
});

app.post("/api/sim", async (c) => {
  try {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await pipelineSim(bodyOverrides(body));
    return c.json(result);
  } catch (err) {
    return c.json(refusalResponse(err), 400);
  }
});

app.post("/api/exec", async (c) => {
  try {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.confirm !== true) {
      return c.json(
        {
          refusal: RefusalCode.CONFIRM_DENIED,
          error: "confirm must be true to broadcast",
        },
        400,
      );
    }
    const result = await pipelineExec(bodyOverrides(body), {
      confirm: true,
      skipSim: body.skipSim === true,
      allowFromMismatch: body.allowFromMismatch === true,
    });
    return c.json(result);
  } catch (err) {
    const status = isRefusalError(err) && err.code === RefusalCode.CONFIRM_DENIED ? 400 : 400;
    return c.json(refusalResponse(err), status);
  }
});

const port = Number(process.env.PORT ?? 8787);
console.log(`API listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
