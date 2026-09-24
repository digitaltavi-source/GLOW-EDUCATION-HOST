import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createMcpExpressApp, getOAuthProtectedResourceMetadataUrl, requireBearerAuth } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import type { McpServerFactory } from "@modelcontextprotocol/server";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { loadConfig } from "./config.js";
import { loadOAuthConfig, loadStaticBearerConfig, createJwtVerifier, createStaticBearerVerifier, createHybridVerifier } from "./oauth.js";
import { callProtectedService, checkProtectedReadiness } from "./backend.js";
import { LearningRequest } from "./contracts.js";
import { classifyWorkResponse } from "./work-response.js";
import { buildProtectedResourceMetadata } from "./resource-metadata.js";

const config = loadConfig();
const configuredMcpServerUrl = new URL(process.env.GLOW_PUBLIC_MCP_URL ?? `http://127.0.0.1:${config.port}/mcp`);
const publicAuthorizationServerBase = process.env.GLOW_PUBLIC_AUTHORIZATION_SERVER?.trim() || configuredMcpServerUrl.origin;
const configuredAuthMode = (process.env.GLOW_AUTH_MODE?.trim() || "oauth").toLowerCase();
const authMode = configuredAuthMode === "static_bearer" ? "hybrid" : configuredAuthMode;
const supabaseOAuthConfig = {
  issuer: process.env.GLOW_OAUTH_ISSUER?.trim() || "https://rjllafrkmwijvqojmdsd.supabase.co/auth/v1",
  audience: process.env.GLOW_OAUTH_AUDIENCE?.trim() || "authenticated",
  jwksUrl: process.env.GLOW_OAUTH_JWKS_URL?.trim() || "https://rjllafrkmwijvqojmdsd.supabase.co/auth/v1/.well-known/jwks.json"
};
const oauthConfig = authMode === "oauth"
  ? loadOAuthConfig()
  : authMode === "hybrid"
    ? supabaseOAuthConfig
    : null;
const requiredScopes = authMode === "legacy_static"
  ? ["education.run"]
  : (process.env.GLOW_OAUTH_REQUIRED_SCOPES ?? "email")
      .split(/\s+/).map(v=>v.trim()).filter(Boolean);
const verifier = authMode === "legacy_static"
  ? createStaticBearerVerifier(loadStaticBearerConfig())
  : authMode === "hybrid"
    ? createHybridVerifier({
        staticConfig: loadStaticBearerConfig(),
        oauthConfig: oauthConfig!,
        oauthScopes: requiredScopes
      })
    : createJwtVerifier(oauthConfig!);
const toolSecuritySchemes = authMode === "legacy_static"
  ? undefined
  : [{ type: "oauth2" as const, scopes: requiredScopes }];

function toolResult(value: Record<string, unknown>) {
  return {
    structuredContent: value,
    content: [{ type: "text" as const, text: JSON.stringify(value) }]
  };
}

function toolError(code: string) {
  return {
    isError: true,
    structuredContent: {
      status: "failed",
      exposure: "PUBLIC_DECLASSIFIED",
      errors: [{ code, message: code, retryable: false }]
    },
    content: [{ type: "text" as const, text: code }]
  };
}

function subjectFrom(ctx: { authInfo?: { scopes: string[]; extra?: Record<string, unknown> } }) {
  const authInfo = ctx.authInfo;
  const subject = authInfo?.extra?.["sub"];
  if (typeof subject !== "string" || !subject) throw new Error("AUTH_REQUIRED");
  if (!requiredScopes.every(scope=>authInfo.scopes.includes(scope))) throw new Error("SCOPE_REQUIRED");
  return subject;
}

async function invoke(
  ctx: { authInfo?: { scopes: string[]; extra?: Record<string, unknown> } },
  operation: "create_learning_experience"|"get_work"|"submit_work"|"approve_stage"|"get_status"|"get_delivery",
  role: "teacher"|"learner"|"parent"|"unspecified",
  locale: string,
  input: Record<string, unknown>,
  request_id?: string
) {
  const subject = subjectFrom(ctx);
  const request = LearningRequest.parse({
    request_id: request_id ?? randomUUID(),
    operation, role, locale, input
  });
  return callProtectedService(config, subject, request);
}

const buildServer: McpServerFactory = ctx => {
  const server = new McpServer(
    { name: "glow-education", version: "0.1.0" },
    {
      instructions:
        "Use GLOW Education only for the user's explicit learning request. ChatGPT is the reasoning/intelligence host. The backend owns Factory state, Kit sequencing, validation, approval binding, freeze/admission, evidence and delivery boundaries. When a work package is returned, perform only that bounded work, then submit the result. Never invent success, approvals, evidence, or Factory state."
    }
  );

  server.registerTool(
    "glow_public_profile",
    {
      title: "GLOW Education public profile",
      description: "Returns the public host status and current claim boundary.",
      annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
      inputSchema: z.object({})
    },
    async () => toolResult({
      product: "GLOW Education",
      version: "0.1.0-candidate",
      status: "CHATGPT_WORK_LOOP_CANDIDATE"
    })
  );

  server.registerTool(
    "glow_start_learning_mission",
    {
      title: "Start a GLOW Education mission",
      description: "Creates a protected Factory mission. After this, call glow_get_factory_work.",
      annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema: z.object({
        request_id: z.string().min(1).max(128).optional(),
        role: z.enum(["teacher","learner","parent","unspecified"]).default("unspecified"),
        locale: z.string().min(2).max(32).default("vi-VN"),
        input: z.record(z.string(), z.unknown())
      })
    },
    async ({request_id,role,locale,input}) => {
      try { return toolResult(await invoke(ctx,"create_learning_experience",role,locale,input,request_id) as unknown as Record<string,unknown>); }
      catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  server.registerTool(
    "glow_get_factory_work",
    {
      title: "Get the next bounded Factory work package",
      description: "Returns a MODEL_SESSION_PRIVATE work package for ChatGPT reasoning. Do not present private work-package internals to the user as public Factory output.",
      annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema: z.object({
        mission_id: z.string().min(1).max(128),
        role: z.enum(["teacher","learner","parent","unspecified"]).default("unspecified"),
        locale: z.string().min(2).max(32).default("vi-VN")
      })
    },
    async ({mission_id,role,locale}) => {
      try {
        const out=await invoke(ctx,"get_work",role,locale,{mission_id});
        const classification=classifyWorkResponse(out);
        if(classification==="SAFE_PUBLIC_FAILURE"){
          return {
            isError:true,
            ...toolResult(out as unknown as Record<string,unknown>)
          };
        }
        return toolResult(out as unknown as Record<string,unknown>);
      } catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  server.registerTool(
    "glow_submit_factory_work",
    {
      title: "Submit completed bounded Factory work",
      description: "Submits ChatGPT's result for the exact current work token. The Factory either returns the next work package or an approval gate.",
      annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema: z.object({
        mission_id: z.string().min(1).max(128),
        work_token: z.string().min(1).max(256),
        result: z.record(z.string(), z.unknown()),
        role: z.enum(["teacher","learner","parent","unspecified"]).default("unspecified"),
        locale: z.string().min(2).max(32).default("vi-VN")
      })
    },
    async ({mission_id,work_token,result,role,locale}) => {
      try { return toolResult(await invoke(ctx,"submit_work",role,locale,{mission_id,work_token,result}) as unknown as Record<string,unknown>); }
      catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  server.registerTool(
    "glow_approve_factory_stage",
    {
      title: "Approve or reject the exact Factory stage candidate",
      description: "Binds the user's decision to the exact candidate, assurance and freeze-input hashes returned by the Factory.",
      annotations:{readOnlyHint:false,destructiveHint:true,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema: z.object({
        mission_id: z.string().min(1).max(128),
        approval: z.object({
          mission_id: z.string().min(1).max(128),
          stage: z.enum(["H1","H2","H3"]),
          decision: z.enum(["APPROVE","REJECT"]),
          candidate_sha256: z.string().length(64),
          assurance_sha256: z.string().length(64),
          freeze_input_bundle_hash: z.string().length(64)
        }).strict(),
        role: z.enum(["teacher","learner","parent","unspecified"]).default("unspecified"),
        locale: z.string().min(2).max(32).default("vi-VN")
      })
    },
    async ({mission_id,approval,role,locale}) => {
      try {
        const out=await invoke(ctx,"approve_stage",role,locale,{mission_id,approval});
        if(out.exposure!=="PUBLIC_DECLASSIFIED") throw new Error("APPROVAL_RESPONSE_EXPOSURE_INVALID");
        return toolResult(out as unknown as Record<string,unknown>);
      } catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  server.registerTool(
    "glow_get_factory_status",
    {
      title: "Get GLOW Education Factory mission status",
      description: "Returns declassified mission state and the next allowed action.",
      annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema: z.object({
        mission_id: z.string().min(1).max(128),
        role: z.enum(["teacher","learner","parent","unspecified"]).default("unspecified"),
        locale: z.string().min(2).max(32).default("vi-VN")
      })
    },
    async ({mission_id,role,locale}) => {
      try {
        const out=await invoke(ctx,"get_status",role,locale,{mission_id});
        if(out.exposure!=="PUBLIC_DECLASSIFIED") throw new Error("STATUS_EXPOSURE_INVALID");
        return toolResult(out as unknown as Record<string,unknown>);
      } catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  server.registerTool(
    "glow_get_delivery",
    {
      title: "Get the final GLOW Education delivery",
      description: "Returns only the final PUBLIC_DECLASSIFIED delivery after H3 admission.",
      annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema: z.object({
        mission_id: z.string().min(1).max(128),
        role: z.enum(["teacher","learner","parent","unspecified"]).default("unspecified"),
        locale: z.string().min(2).max(32).default("vi-VN")
      })
    },
    async ({mission_id,role,locale}) => {
      try {
        const out=await invoke(ctx,"get_delivery",role,locale,{mission_id});
        if(out.exposure!=="PUBLIC_DECLASSIFIED") throw new Error("DELIVERY_EXPOSURE_INVALID");
        return toolResult(out as unknown as Record<string,unknown>);
      } catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  // Compatibility alias for the old single-tool profile. It now only starts a mission.
  server.registerTool(
    "glow_create_learning_experience",
    {
      title: "Start a GLOW learning experience (compatibility alias)",
      description: "Starts a Factory mission; use the work-loop tools to continue it.",
      annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema: z.object({
        request_id: z.string().min(1).max(128).optional(),
        role: z.enum(["teacher","learner","parent","unspecified"]).default("unspecified"),
        locale: z.string().min(2).max(32).default("vi-VN"),
        input: z.record(z.string(), z.unknown())
      })
    },
    async ({request_id,role,locale,input}) => {
      try { return toolResult(await invoke(ctx,"create_learning_experience",role,locale,input,request_id) as unknown as Record<string,unknown>); }
      catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  return server;
};

const handler = createMcpHandler(buildServer);
const app = createMcpExpressApp({
  host: "0.0.0.0",
  allowedHosts: (process.env.GLOW_ALLOWED_HOSTS ?? "localhost,127.0.0.1").split(",").map(v=>v.trim()).filter(Boolean)
});

const mcpServerUrl = configuredMcpServerUrl;
const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(mcpServerUrl);
const resourceMetadata = buildProtectedResourceMetadata({
  resource:mcpServerUrl.toString(),
  authMode,
  oauthIssuer:authMode === "legacy_static" ? null : publicAuthorizationServerBase,
  scopes:requiredScopes
});
const auth = requireBearerAuth({
  verifier,
  requiredScopes,
  resourceMetadataUrl
});
const node = toNodeHandler(handler);

const resourceMetadataPath = new URL(resourceMetadataUrl).pathname;
app.get(resourceMetadataPath, (_req,res) => {
  res.json(resourceMetadata);
});

app.get("/.well-known/oauth-authorization-server", (_req,res) => {
  res.json({
    issuer: publicAuthorizationServerBase,
    authorization_endpoint: "https://rjllafrkmwijvqojmdsd.supabase.co/auth/v1/oauth/authorize",
    token_endpoint: "https://rjllafrkmwijvqojmdsd.supabase.co/auth/v1/oauth/token",
    registration_endpoint: "https://rjllafrkmwijvqojmdsd.supabase.co/auth/v1/oauth/clients/register",
    scopes_supported: ["email","profile","openid"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code","refresh_token"],
    token_endpoint_auth_methods_supported: ["none","client_secret_post","client_secret_basic"],
    code_challenge_methods_supported: ["S256"]
  });
});

const publicDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../public");

app.get("/oauth-client.js", (_req,res) => {
  res.type("application/javascript");
  res.sendFile(path.join(publicDir,"oauth-client.js"));
});

app.get("/oauth/consent", (_req,res) => {
  res.type("html").send(`<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GLOW Education — Cấp quyền</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#171717;background:#f6f7fb}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}
main{width:min(560px,100%);background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:28px;box-shadow:0 18px 50px rgba(0,0,0,.08)}
h1{font-size:24px;margin:0 0 8px}.muted{color:#666;line-height:1.55}.card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:18px 0}
label{display:block;font-weight:600;margin:12px 0 6px}input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #cbd5e1;border-radius:9px}
button{border:0;border-radius:9px;padding:11px 16px;font-weight:700;cursor:pointer}.primary{background:#111827;color:#fff}.secondary{background:#eef2f7}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
#status{font-size:14px;margin-top:16px;color:#475569}#status[data-error="1"]{color:#b91c1c}code{word-break:break-all;font-size:12px}
</style>
</head>
<body>
<main>
<h1>GLOW Education</h1>
<p class="muted">ChatGPT đang yêu cầu quyền sử dụng GLOW Education thay mặt bạn. Hệ thống chỉ cấp quyền sau khi bạn xác nhận.</p>
<section id="login-panel" class="card" hidden>
<label for="email">Email</label>
<input id="email" type="email" autocomplete="email" placeholder="you@example.com">
<div class="actions"><button id="signin" class="primary" type="button">Gửi liên kết đăng nhập</button></div>
</section>
<section id="consent-panel" class="card" hidden>
<p><strong>Ứng dụng:</strong> <span id="client-name">ChatGPT</span></p>
<p><strong>Quyền yêu cầu:</strong> <span id="scopes"></span></p>
<p class="muted"><strong>Callback:</strong> <code id="redirect-uri"></code></p>
<div class="actions">
<button id="approve" class="primary" type="button">Cho phép</button>
<button id="deny" class="secondary" type="button">Từ chối</button>
</div>
</section>
<p id="status" aria-live="polite">Đang kiểm tra yêu cầu…</p>
</main>
<script src="/oauth-client.js"></script>
</body>
</html>`);
});

app.get("/healthz", (_req,res) => {
  res.json({ok:true,product:"GLOW Education",version:"0.1.0-candidate",mode:"CHATGPT_WORK_LOOP"});
});

app.get("/readyz", async (_req,res) => {
  const readiness = await checkProtectedReadiness(config);
  res.status(readiness.ok ? 200 : 503).json({
    ok: readiness.ok,
    product: "GLOW Education",
    public_host: "running",
    protected_factory: readiness.ok ? "reachable_authenticated" : "unavailable",
    code: readiness.code
  });
});

app.all("/mcp",auth,(req,res)=>void node(req,res,req.body));

app.listen(config.port,()=>{
  console.error(`GLOW Education public host listening on :${config.port}`);
});
