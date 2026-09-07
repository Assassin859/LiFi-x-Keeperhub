import { useEffect, useState, type FormEvent } from "react";

type Defaults = {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  slippage: string;
};

type RunStep = {
  kind?: string;
  status?: string;
  transactionLink?: string | null;
  executionId?: string;
};

type Run = {
  file?: string;
  runId?: string;
  quoteId?: string;
  createdAt?: string;
  steps?: RunStep[];
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

const empty: Defaults = {
  fromChain: "8453",
  toChain: "8453",
  fromToken: "",
  toToken: "",
  fromAmount: "1000000",
  fromAddress: "",
  slippage: "0.03",
};

export function App() {
  const [form, setForm] = useState<Defaults>(empty);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "error" | ""; text: string }>({
    kind: "",
    text: "",
  });
  const [output, setOutput] = useState("Load defaults, then Quote / Simulate / Execute.");
  const [runs, setRuns] = useState<Run[]>([]);

  async function refreshRuns() {
    const data = await api<{ runs: Run[] }>("/api/runs");
    setRuns(data.runs);
  }

  useEffect(() => {
    void (async () => {
      try {
        const defaults = await api<Defaults>("/api/defaults");
        setForm(defaults);
        await refreshRuns();
        setStatus({ kind: "ok", text: "Connected to local API." });
      } catch (err) {
        setStatus({
          kind: "error",
          text: err instanceof Error ? err.message : String(err),
        });
      }
    })();
  }, []);

  function setField<K extends keyof Defaults>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function runAction(
    kind: "quote" | "sim" | "exec",
    event?: FormEvent,
  ) {
    event?.preventDefault();
    setBusy(kind);
    setStatus({ kind: "", text: "" });
    try {
      const path =
        kind === "quote" ? "/api/quote" : kind === "sim" ? "/api/sim" : "/api/exec";
      const body =
        kind === "exec"
          ? { ...form, confirm: true }
          : { ...form };
      if (kind === "exec" && !confirm) {
        throw new Error("Check “I confirm broadcast” before Execute.");
      }
      const data = await api<unknown>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setOutput(JSON.stringify(data, null, 2));
      setStatus({
        kind: "ok",
        text:
          kind === "exec"
            ? "Execute completed — see links in output / runs."
            : `${kind} ok`,
      });
      if (kind === "exec") await refreshRuns();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ kind: "error", text: message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="app">
      <header className="brand">
        <h1>
          LI.FI <span>×</span> KeeperHub
        </h1>
        <p>
          LI.FI plans the route. KeeperHub settles it. Quote, dry-run, then
          broadcast with an audit trail — Base USDC → WETH by default.
        </p>
      </header>

      <div className="layout">
        <form className="panel" onSubmit={(e) => void runAction("quote", e)}>
          <h2>Pipeline</h2>
          <div className="grid two">
            <label>
              From chain
              <input
                type="text"
                value={form.fromChain}
                onChange={(e) => setField("fromChain", e.target.value)}
              />
            </label>
            <label>
              To chain
              <input
                type="text"
                value={form.toChain}
                onChange={(e) => setField("toChain", e.target.value)}
              />
            </label>
            <label>
              From token
              <input
                type="text"
                value={form.fromToken}
                onChange={(e) => setField("fromToken", e.target.value)}
              />
            </label>
            <label>
              To token
              <input
                type="text"
                value={form.toToken}
                onChange={(e) => setField("toToken", e.target.value)}
              />
            </label>
            <label>
              Amount (base units)
              <input
                type="text"
                value={form.fromAmount}
                onChange={(e) => setField("fromAmount", e.target.value)}
              />
            </label>
            <label>
              Slippage
              <input
                type="text"
                value={form.slippage}
                onChange={(e) => setField("slippage", e.target.value)}
              />
            </label>
          </div>
          <label style={{ marginTop: 10 }}>
            From address (org wallet)
            <input
              type="text"
              value={form.fromAddress}
              onChange={(e) => setField("fromAddress", e.target.value)}
            />
          </label>

          <label className="confirm">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
            />
            I confirm on-chain broadcast via KeeperHub
          </label>

          <div className="actions">
            <button type="submit" disabled={!!busy}>
              {busy === "quote" ? "Quoting…" : "Quote"}
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void runAction("sim")}
            >
              {busy === "sim" ? "Simulating…" : "Simulate"}
            </button>
            <button
              type="button"
              className="danger"
              disabled={!!busy || !confirm}
              onClick={() => void runAction("exec")}
            >
              {busy === "exec" ? "Executing…" : "Execute"}
            </button>
            <button
              type="button"
              className="primary"
              disabled={!!busy}
              onClick={() => void refreshRuns()}
            >
              Refresh runs
            </button>
          </div>
          <div className={`status ${status.kind}`}>{status.text}</div>
        </form>

        <section className="panel">
          <h2>Live result</h2>
          <pre className="out">{output}</pre>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 18 }}>
        <h2>Recent executions</h2>
        <div className="runs">
          {runs.length === 0 ? (
            <p className="status">No run artifacts yet.</p>
          ) : (
            runs.map((run) => (
              <article className="run" key={run.file ?? run.runId ?? run.quoteId}>
                <header>
                  <span>{run.quoteId ?? "quote?"}</span>
                  <span>{run.createdAt ?? run.file}</span>
                </header>
                <div className="steps">
                  {(run.steps ?? []).map((step, i) => (
                    <div className="step" key={`${run.file}-${i}`}>
                      <span className="pill">{step.status ?? "?"}</span>
                      <strong>{step.kind}</strong>
                      {step.executionId ? <span>{step.executionId}</span> : null}
                      {step.transactionLink ? (
                        <a href={step.transactionLink} target="_blank" rel="noreferrer">
                          explorer
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
