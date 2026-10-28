// Worker do Cloudflare para a ferramenta "Cortes Pó de Pólen".
// Guarda a chave da Anthropic no servidor e repassa a resposta em streaming.
//
// Variáveis a definir no Worker (as duas primeiras como segredos):
//   ANTHROPIC_API_KEY  chave da API da Anthropic
//   ACCESS_CODE        código de acesso que você compartilha com quem vai usar
//   ALLOWED_ORIGIN     (opcional) endereço onde o HTML fica hospedado,
//                      ex.: https://cortes.nektardesign.com.br  (padrão: qualquer origem)
//   MODEL              (opcional) nome do modelo (padrão abaixo)

const DEFAULT_MODEL = "claude-sonnet-5-5";
const MAX_TOKENS = 16000;
const MAX_PROMPT_CHARS = 250000;

function cors(env) {
  return {
    "access-control-allow-origin": env.ALLOWED_ORIGIN || "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-access-code",
    "access-control-max-age": "86400",
    "vary": "origin",
  };
}

function json(env, status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors(env), "content-type": "application/json" },
  });
}

// Comparação que não revela, pelo tempo de resposta, quantos caracteres acertaram.
function sameCode(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env) });
    if (request.method !== "POST") return json(env, 405, { error: "method_not_allowed" });

    if (!env.ANTHROPIC_API_KEY || !env.ACCESS_CODE) return json(env, 500, { error: "worker_not_configured" });
    if (!sameCode(request.headers.get("x-access-code") || "", env.ACCESS_CODE)) {
      return json(env, 401, { error: "invalid_access_code" });
    }

    let body;
    try { body = await request.json(); } catch { return json(env, 400, { error: "invalid_body" }); }
    const prompt = body && body.prompt;
    if (typeof prompt !== "string" || !prompt.trim()) return json(env, 400, { error: "missing_prompt" });
    if (prompt.length > MAX_PROMPT_CHARS) return json(env, 413, { error: "prompt_too_large" });

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.MODEL || DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    // Repassa a resposta (streaming ou erro) com o mesmo status.
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...cors(env),
        "content-type": upstream.headers.get("content-type") || "text/event-stream",
        "cache-control": "no-store",
      },
    });
  },
};
