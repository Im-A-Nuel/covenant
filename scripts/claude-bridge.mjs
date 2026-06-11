#!/usr/bin/env node
/**
 * Claude Code → OpenAI-compatible bridge.
 *
 * Exposes a minimal `POST /chat/completions` endpoint that internally shells out
 * to the Claude Code CLI in headless print mode and returns the response in
 * OpenAI chat-completion shape. This lets Covenant's existing Venice proxy
 * (`src/app/api/venice/route.ts`) treat Claude Code as the agent's LLM with ZERO
 * app code changes — just point VENICE_BASE_URL here.
 *
 * Why the flags matter:
 *   --system-prompt <sys>                  Override Claude Code's coding-agent
 *                                          persona. Without this it (correctly)
 *                                          flags our agent prompt as injection
 *                                          and refuses to emit JSON.
 *   --exclude-dynamic-system-prompt-sections  Strip repo/env context it would
 *                                          otherwise inject.
 *   --disallowed-tools ...                 Make it a pure text responder — no
 *                                          Bash/Read/Write/etc. This closes the
 *                                          prompt-injection→RCE path from any
 *                                          x402 "paid data" fed into a report.
 *
 * SECURITY: binds 127.0.0.1 only by default. Do NOT expose this to the public
 * internet — it pipes HTTP input into a local CLI. If you must reach it from
 * another host, tunnel it (ssh -L) rather than setting BRIDGE_HOST=0.0.0.0.
 *
 * Run on the machine that has Claude Code installed + authenticated:
 *   node scripts/claude-bridge.mjs
 *
 * Then in .env.local:
 *   VENICE_API_KEY=local                  # any non-empty value (gate, not verified)
 *   VENICE_BASE_URL=http://localhost:8787
 *
 * Env knobs:
 *   BRIDGE_PORT   (default 8787)
 *   BRIDGE_HOST   (default 127.0.0.1)
 *   CLAUDE_BIN    (default "claude")
 *   CLAUDE_MODEL  (optional; passed as --model if set, e.g. "sonnet")
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";

const PORT = Number(process.env.BRIDGE_PORT || 8787);
const HOST = process.env.BRIDGE_HOST || "127.0.0.1";
const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "";
const NO_TOOLS = "Bash Edit Write Read Glob Grep WebFetch WebSearch NotebookEdit Task".split(" ");

/** Split OpenAI messages into a system prompt (override) and a user prompt. */
function splitMessages(messages, wantJson) {
  const sys = [];
  const convo = [];
  for (const m of messages || []) {
    if (!m || typeof m.content !== "string") continue;
    if (m.role === "system") sys.push(m.content);
    else if (m.role === "assistant") convo.push(`[ASSISTANT]\n${m.content}`);
    else convo.push(m.content);
  }
  if (wantJson) sys.push("Return ONLY raw JSON. No markdown, no code fences, no prose.");
  return { system: sys.join("\n\n"), prompt: convo.join("\n\n") };
}

/** Strip ```json … ``` fences a model might still wrap JSON in. */
function stripFences(text) {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  return fence ? fence[1].trim() : t;
}

function runClaude(system, prompt) {
  return new Promise((resolve, reject) => {
    const args = ["-p", prompt, "--output-format", "json", "--exclude-dynamic-system-prompt-sections"];
    if (system) args.push("--system-prompt", system);
    if (CLAUDE_MODEL) args.push("--model", CLAUDE_MODEL);
    args.push("--disallowed-tools", ...NO_TOOLS);

    const child = spawn(CLAUDE_BIN, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => reject(new Error(`spawn ${CLAUDE_BIN} failed: ${e.message}`)));
    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`claude exited ${code}: ${err.slice(0, 200) || out.slice(0, 200)}`));
      }
      // Print mode with --output-format json wraps the answer in { result, ... }.
      try {
        const parsed = JSON.parse(out);
        if (parsed.is_error) return reject(new Error(`claude error: ${String(parsed.result).slice(0, 200)}`));
        resolve(typeof parsed.result === "string" ? parsed.result : out);
      } catch {
        resolve(out.trim());
      }
    });
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => resolve(b));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const url = req.url || "";
  if (req.method === "GET" && (url === "/" || url === "/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, bridge: "claude-code", bin: CLAUDE_BIN }));
  }
  if (req.method !== "POST" || !url.endsWith("/chat/completions")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "not found" }));
  }

  try {
    const body = JSON.parse((await readBody(req)) || "{}");
    const wantJson = body?.response_format?.type === "json_object";
    const { system, prompt } = splitMessages(body.messages, wantJson);

    const started = Date.now();
    let content = await runClaude(system, prompt);
    if (wantJson) content = stripFences(content);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id: `claude-bridge-${started}`,
        object: "chat.completion",
        model: CLAUDE_MODEL || "claude-code",
        choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
      })
    );
  } catch (e) {
    // Non-200 → the Covenant proxy falls back to its deterministic mock, so the
    // demo never hard-fails even if Claude Code is unavailable.
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(e?.message || e) }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[claude-bridge] listening on http://${HOST}:${PORT}  (bin: ${CLAUDE_BIN}${CLAUDE_MODEL ? `, model: ${CLAUDE_MODEL}` : ""})`);
  console.log(`[claude-bridge] set VENICE_BASE_URL=http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT} and VENICE_API_KEY=local`);
});
