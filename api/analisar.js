const DEFAULT_MODEL = "claude-sonnet-5-5";
const MAX_TOKENS = 16000;
const MAX_PROMPT_CHARS = 250000;

function sameCode(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const accessCode = process.env.ACCESS_CODE;
  if (!apiKey || !accessCode) return res.status(500).json({ error: "function_not_configured" });
  if (!sameCode(String(req.headers["x-access-code"] || ""), accessCode)) {
    return res.status(401).json({ error: "invalid_access_code" });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  const prompt = body && body.prompt;
  if (typeof prompt !== "string" || !prompt.trim()) return res.status(400).json({ error: "missing_prompt" });
  if (prompt.length > MAX_PROMPT_CHARS) return res.status(413).json({ error: "prompt_too_large" });

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.MODEL || DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      stream: true,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  res.status(upstream.status);
  res.setHeader("content-type", upstream.headers.get("content-type") || "text/event-stream");
  if (!upstream.body) return res.end();

  const reader = upstream.body.getReader();
  req.on("close", () => { reader.cancel().catch(() => {}); });
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  } catch {
    // conexão encerrada pelo navegador ou pelo serviço
  } finally {
    res.end();
  }
}
