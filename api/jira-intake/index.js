/**
 * api/jira-intake/index.js — Azure Function proxy for AI Skills Intake → Jira
 * Owner: IT Enterprise AI team · ITEnterpriseAIteam@forcepoint.com
 * Jira:  AI Skills Intake board 4770
 *
 * Creates a Story on the Enterprise AI Jira project (key AI) with the label
 * "ai-skills-intake" and attaches the originating GitHub PR as a Jira remote
 * link. Called from SkillSubmit.jsx after a successful PR creation so the
 * skill submission is automatically tracked on the governance board.
 *
 * Why server-side: keeps JIRA_API_TOKEN out of the browser bundle. Same pattern
 * as /api/ask. Anonymous at the Functions layer because Azure Static Web Apps
 * EasyAuth gates /api/* upstream.
 *
 * Deploy as an Azure Function (Node.js 20, HTTP trigger, anonymous auth).
 *
 * Environment variables (set in Azure Function App settings / Key Vault references):
 *   JIRA_API_TOKEN     — Atlassian API token (reference from Key Vault)
 *   JIRA_API_USER      — email of the service account that owns the token
 *   JIRA_BASE_URL      — host only, default: forcepoint.atlassian.net
 *   JIRA_PROJECT_KEY   — default: AI
 *   JIRA_DEFAULT_LABEL — default: ai-skills-intake
 *   ALLOWED_ORIGINS    — comma-separated allowed CORS origins
 */

const https = require("https");

const JIRA_HOST          = process.env.JIRA_BASE_URL      || "forcepoint.atlassian.net";
const JIRA_PROJECT_KEY   = process.env.JIRA_PROJECT_KEY   || "AI";
const JIRA_DEFAULT_LABEL = process.env.JIRA_DEFAULT_LABEL || "ai-skills-intake";
const JIRA_API_USER      = process.env.JIRA_API_USER      || "";
const JIRA_API_TOKEN     = process.env.JIRA_API_TOKEN     || "";
const STORY_ISSUETYPE_ID = "10003";

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
  const body = req.body || {};
  const { skillName, version, refNum, prUrl, prNumber, branch, submitter, intent } = body;

  const missing = [];
  if (!skillName)              missing.push("skillName");
  if (!version)                missing.push("version");
  if (!prUrl)                  missing.push("prUrl");
  if (!submitter?.email)       missing.push("submitter.email");
  if (missing.length) {
    context.res = {
      status: 400, headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: `Missing required field(s): ${missing.join(", ")}` })
    };
    return;
  }

  if (!JIRA_API_TOKEN || !JIRA_API_USER) {
    context.res = {
      status: 500, headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: "JIRA_API_TOKEN / JIRA_API_USER not configured" })
    };
    return;
  }

  const authHeader = "Basic " + Buffer.from(`${JIRA_API_USER}:${JIRA_API_TOKEN}`).toString("base64");

  // ── BUILD ADF DESCRIPTION ─────────────────────────────────
  // Jira Cloud REST v3 requires description in Atlassian Document Format.
  const description = adfDoc([
    adfParagraph([
      adfText("Submitted by ", { strong: false }),
      adfText(submitter.name || submitter.email, { strong: true }),
      adfText(submitter.dept ? ` (${submitter.dept})` : ""),
      adfText(` · ${submitter.email}`)
    ]),
    adfParagraph([
      adfText("Skill: ", { strong: true }),
      adfText(`${skillName} v${version}`)
    ]),
    intent ? adfParagraph([adfText(intent)]) : null,
    adfParagraph([
      adfText("GitHub PR: ", { strong: true }),
      adfLink(prUrl, prNumber ? `#${prNumber}` : prUrl)
    ]),
    branch ? adfParagraph([
      adfText("Branch: ", { strong: true }),
      adfText(branch, { code: true })
    ]) : null,
    refNum ? adfParagraph([
      adfText("Reference: ", { strong: true }),
      adfText(refNum, { code: true })
    ]) : null,
  ].filter(Boolean));

  // ── CREATE STORY ──────────────────────────────────────────
  const issuePayload = JSON.stringify({
    fields: {
      project:   { key: JIRA_PROJECT_KEY },
      issuetype: { id:  STORY_ISSUETYPE_ID },
      summary:   `Skill intake — ${skillName} v${version}`,
      description,
      labels:    [JIRA_DEFAULT_LABEL],
    }
  });

  try {
    const createRes = await jiraRequest("POST", "/rest/api/3/issue", authHeader, issuePayload);

    if (createRes.status < 200 || createRes.status >= 300) {
      const upstreamErr = safeParse(createRes.body);
      context.log.error("Jira issue create failed:", createRes.status, upstreamErr);
      context.res = {
        status: 502, headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error: extractJiraError(upstreamErr) || `Jira responded HTTP ${createRes.status}`
        })
      };
      return;
    }

    const created = JSON.parse(createRes.body);
    const issueKey = created.key;
    const issueUrl = `https://${JIRA_HOST}/browse/${issueKey}`;

    // ── ATTACH GITHUB PR AS REMOTE LINK (non-fatal) ──────────
    const remoteLinkPayload = JSON.stringify({
      object: {
        url:   prUrl,
        title: prNumber ? `GitHub PR #${prNumber}${branch ? ` — ${branch}` : ""}` : "GitHub PR",
        icon:  {
          url16x16: "https://github.githubassets.com/favicons/favicon.png",
          title:    "GitHub"
        }
      }
    });

    const linkRes = await jiraRequest(
      "POST",
      `/rest/api/3/issue/${encodeURIComponent(issueKey)}/remotelink`,
      authHeader,
      remoteLinkPayload
    );
    if (linkRes.status < 200 || linkRes.status >= 300) {
      context.log.warn(`Remote link for ${issueKey} failed (non-fatal):`, linkRes.status, linkRes.body);
    }

    context.log.info("Jira intake success:", { issueKey, prNumber, skillName, submitter: submitter.email });

    context.res = {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, issueKey, issueUrl })
    };

  } catch (err) {
    context.log.error("Jira proxy error:", err);
    context.res = {
      status: 500, headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: "Internal proxy error" })
    };
  }
};

// ── helpers ────────────────────────────────────────────────

function jiraRequest(method, path, authHeader, payload) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: JIRA_HOST,
      path,
      method,
      headers: {
        "Content-Type":   "application/json",
        "Accept":         "application/json",
        "Authorization":  authHeader,
        "Content-Length": Buffer.byteLength(payload),
      }
    };
    const httpReq = https.request(options, res => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end",  ()    => resolve({ status: res.statusCode, body: data }));
    });
    httpReq.on("error", reject);
    httpReq.write(payload);
    httpReq.end();
  });
}

function safeParse(s) { try { return JSON.parse(s); } catch { return s; } }

function extractJiraError(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  if (parsed.errorMessages?.length) return parsed.errorMessages.join("; ");
  if (parsed.errors && typeof parsed.errors === "object") {
    return Object.entries(parsed.errors).map(([f, m]) => `${f}: ${m}`).join("; ");
  }
  return null;
}

// ── minimal ADF builders ───────────────────────────────────

function adfDoc(content) {
  return { type: "doc", version: 1, content };
}

function adfParagraph(content) {
  return { type: "paragraph", content };
}

function adfText(text, marks) {
  const node = { type: "text", text: String(text) };
  const m = [];
  if (marks?.strong) m.push({ type: "strong" });
  if (marks?.code)   m.push({ type: "code" });
  if (m.length) node.marks = m;
  return node;
}

function adfLink(href, label) {
  return {
    type: "text",
    text: label || href,
    marks: [{ type: "link", attrs: { href } }]
  };
}
