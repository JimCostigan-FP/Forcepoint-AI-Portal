/**
 * api/ask/index.js — Azure Function proxy for Claude API calls
 * Owner: IT Enterprise AI team · ITEnterpriseAIteam@forcepoint.com
 * Jira:  AI-110
 *
 * This function sits between the browser and the Anthropic API so that:
 *  - The API key never reaches the browser
 *  - Entra ID authentication is validated server-side (via Azure Static Web Apps EasyAuth)
 *  - DLP inspection can be added here (call your Forcepoint DLP API before forwarding)
 *  - Rate limiting and logging can be applied centrally
 *
 * Deploy as an Azure Function (Node.js 20, HTTP trigger, anonymous auth —
 * authentication is handled by Azure Static Web Apps EasyAuth at the app level).
 *
 * Environment variables (set in Azure Function App settings / Key Vault references):
 *   ANTHROPIC_API_KEY   — your Anthropic API key (reference from Key Vault)
 *   ANTHROPIC_MODEL     — model ID (default: claude-sonnet-4-20250514)
 *   ALLOWED_ORIGINS     — comma-separated allowed CORS origins (e.g. https://ai-enablement.forcepoint.com)
 */

const https = require("https");

const MODEL     = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
const API_KEY   = process.env.ANTHROPIC_API_KEY || "";
const MAX_TOKENS = 1000;

const SYSTEM = `You are the Forcepoint Enterprise AI assistant.

Your role is to help Forcepoint employees use AI tools effectively and safely.
You embody the Forcepoint brand voice: the Sage archetype — warm, direct, collaborative and radically simple.

Guidelines:
- Keep all responses to 2–3 sentences maximum unless the user explicitly asks for more detail.
- Use plain language. Avoid jargon unless it genuinely aids clarity.
- Never reproduce, describe or infer Protected Information, source code, customer PII or Forcepoint Confidential data.
- If you are uncertain, say so clearly rather than guessing.
- Always encourage users to check the Forcepoint AI Policy (FP-IS-AI) and the AI Registry for tool approvals.
- Reference the AI Ambassador program and the Enterprise AI team (ITEnterpriseAIteam@forcepoint.com) when relevant.`;

module.exports = async function (context, req) {
  // ── CORS ──────────────────────────────────────────────────
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const origin = req.headers["origin"] || "";
  const corsOrigin = allowedOrigins.length === 0 || allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  const corsHeaders = {
    "Access-Control-Allow-Origin":  corsOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: corsHeaders, body: "" };
    return;
  }

  // ── VALIDATE REQUEST ──────────────────────────────────────
  const message = req.body?.message?.trim();
  if (!message) {
    context.res = {
      status: 400, headers: corsHeaders,
      body: JSON.stringify({ error: "message field is required" })
    };
    return;
  }

  if (!API_KEY) {
    context.res = {
      status: 500, headers: corsHeaders,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" })
    };
    return;
  }

  // ── TODO: DLP INSPECTION (P1) ─────────────────────────────
  // Add your Forcepoint DLP API call here before forwarding to Claude.
  // If DLP blocks the prompt, return a 403 and log the event.
  //
  // Example:
  //   const dlpResult = await checkDLP(message);
  //   if (dlpResult.blocked) {
  //     context.log.warn("DLP P1 block:", dlpResult.reason);
  //     context.res = { status: 403, headers: corsHeaders, body: JSON.stringify({ error: "Content blocked by DLP policy" }) };
  //     return;
  //   }

  // ── CALL ANTHROPIC API ────────────────────────────────────
  try {
    const payload = JSON.stringify({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      system:     SYSTEM,
      messages:   [{ role: "user", content: message }]
    });

    const responseText = await new Promise((resolve, reject) => {
      const options = {
        hostname: "api.anthropic.com",
        path:     "/v1/messages",
        method:   "POST",
        headers:  {
          "Content-Type":       "application/json",
          "Content-Length":     Buffer.byteLength(payload),
          "x-api-key":          API_KEY,
          "anthropic-version":  "2023-06-01"
        }
      };

      const httpReq = https.request(options, res => {
        let data = "";
        res.on("data", chunk => { data += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      });

      httpReq.on("error", reject);
      httpReq.write(payload);
      httpReq.end();
    });

    if (responseText.status !== 200) {
      const err = JSON.parse(responseText.body);
      context.log.error("Anthropic API error:", err);
      context.res = {
        status: 502, headers: corsHeaders,
        body: JSON.stringify({ error: `Model error: ${err?.error?.message || "unknown"}` })
      };
      return;
    }

    const data = JSON.parse(responseText.body);
    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    // ── TODO: DLP INSPECTION (P3) ─────────────────────────────
    // Add your Forcepoint DLP API call here to inspect the completion before return.
    // If DLP blocks the completion, return a sanitised message instead.

    context.res = {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    };

  } catch (err) {
    context.log.error("Proxy error:", err);
    context.res = {
      status: 500, headers: corsHeaders,
      body: JSON.stringify({ error: "Internal proxy error" })
    };
  }
};
