import { randomUUID } from "node:crypto";
import { createMcpExpressApp, getOAuthProtectedResourceMetadataUrl, requireBearerAuth } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import type { McpServerFactory } from "@modelcontextprotocol/server";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { loadConfig } from "./config.js";
import { loadOAuthConfig, createJwtVerifier } from "./oauth.js";
import { callProtectedService } from "./backend.js";
import { LearningRequest } from "./contracts.js";

const config = loadConfig();
const oauth = loadOAuthConfig();

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
      errors: [{ code, message: code, retryable: false }]
    },
    content: [{ type: "text" as const, text: code }]
  };
}

const buildServer: McpServerFactory = ctx => {
  const server = new McpServer(
    { name: "glow-education", version: "0.1.0" },
    {
      instructions:
        "Use GLOW Education only for the user's explicit learning request. Treat every returned result as public/declassified. Preserve blocked, degraded, auth, and backend errors instead of inventing success."
    }
  );

  server.registerTool(
    "glow_public_profile",
    {
      title: "GLOW Education public profile",
      description: "Returns the public host status and current claim boundary.",
      inputSchema: z.object({})
    },
    async () =>
      toolResult({
        product: "GLOW Education",
        version: "0.1.0-candidate",
        status: "HOST_INTEGRATION_CANDIDATE"
      })
  );

  server.registerTool(
    "glow_create_learning_experience",
    {
      title: "Create a GLOW learning experience",
      description:
        "Sends a bounded learning request to the protected GLOW Education service and returns only declassified output.",
      inputSchema: z.object({
        request_id: z.string().min(1).max(128).optional(),
        role: z.enum(["teacher", "learner", "parent", "unspecified"]).default("unspecified"),
        locale: z.string().min(2).max(32).default("vi-VN"),
        input: z.record(z.string(), z.unknown())
      })
    },
    async ({ request_id, role, locale, input }) => {
      try {
        const authInfo = ctx.authInfo;
        const subject = authInfo?.extra?.["sub"];
        if (typeof subject !== "string" || !subject) return toolError("AUTH_REQUIRED");
        if (!authInfo.scopes.includes("education.run")) return toolError("SCOPE_REQUIRED");

        const request = LearningRequest.parse({
          request_id: request_id ?? randomUUID(),
          operation: "create_learning_experience",
          role,
          locale,
          input
        });
        const response = await callProtectedService(config, subject, request);
        return toolResult(response as unknown as Record<string, unknown>);
      } catch (error) {
        return toolError(error instanceof Error ? error.message : "HOST_REQUEST_FAILED");
      }
    }
  );

  return server;
};

const handler = createMcpHandler(buildServer);
const app = createMcpExpressApp({
  host: "0.0.0.0",
  allowedHosts: (process.env.GLOW_ALLOWED_HOSTS ?? "localhost,127.0.0.1")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean)
});

const mcpServerUrl = new URL(process.env.GLOW_PUBLIC_MCP_URL ?? `http://127.0.0.1:${config.port}/mcp`);
const auth = requireBearerAuth({
  verifier: createJwtVerifier(oauth),
  requiredScopes: ["education.run"],
  resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(mcpServerUrl)
});
const node = toNodeHandler(handler);

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, product: "GLOW Education", version: "0.1.0-candidate" });
});

app.all("/mcp", auth, (req, res) => void node(req, res, req.body));

app.listen(config.port, () => {
  console.error(`GLOW Education public host listening on :${config.port}`);
});
