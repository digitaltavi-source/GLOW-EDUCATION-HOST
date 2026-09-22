import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { requireUser } from "./auth.js";
import { callProtectedService } from "./backend.js";
import { LearningRequest } from "./contracts.js";

const config = loadConfig();
const transports = new Map<string, StreamableHTTPServerTransport>();

function toolResult(value: unknown) {
  return {
    structuredContent: value as Record<string, unknown>,
    content: [{ type: "text" as const, text: JSON.stringify(value) }]
  };
}

function toolError(code: string) {
  return {
    isError: true,
    structuredContent: { status: "failed", errors: [{ code, message: code, retryable: false }] },
    content: [{ type: "text" as const, text: code }]
  };
}

function buildServer(): McpServer {
  const server = new McpServer(
    { name: "glow-education", version: "0.1.0" },
    {
      instructions:
        "Use GLOW Education tools only for the user's explicit learning request. Treat every returned result as public/declassified. If a tool returns blocked, degraded, auth, or backend errors, preserve that state and do not invent a successful result."
    }
  );

  server.registerTool(
    "glow_public_profile",
    {
      title: "GLOW Education public profile",
      description: "Returns the public host status and current claim boundary.",
      inputSchema: {},
      outputSchema: {
        product: z.string(),
        version: z.string(),
        status: z.string(),
        liveBackendConnected: z.boolean()
      },
      securitySchemes: [{ type: "noauth" }],
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    async () => toolResult({
      product: "GLOW Education",
      version: "0.1.0-candidate",
      status: "HOST_INTEGRATION_CANDIDATE",
      liveBackendConnected: true
    })
  );

  server.registerTool(
    "glow_create_learning_experience",
    {
      title: "Create a GLOW learning experience",
      description: "Sends a bounded learning request to the protected GLOW Education service and returns only declassified output.",
      inputSchema: {
        request_id: z.string().min(1).max(128).optional(),
        role: z.enum(["teacher","learner","parent","unspecified"]).default("unspecified"),
        locale: z.string().min(2).max(32).default("vi-VN"),
        input: z.record(z.unknown())
      },
      securitySchemes: [{ type: "oauth2", scopes: ["education.run"] }],
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
    },
    async ({ request_id, role, locale, input }, extra) => {
      try {
        const subject = requireUser(extra.authInfo, "education.run");
        const request = LearningRequest.parse({
          request_id: request_id ?? randomUUID(),
          operation: "create_learning_experience",
          role,
          locale,
          input
        });
        return toolResult(await callProtectedService(config, subject, request));
      } catch (error) {
        return toolError(error instanceof Error ? error.message : "HOST_REQUEST_FAILED");
      }
    }
  );

  return server;
}

const app = createMcpExpressApp();
app.get("/healthz", (_req, res) => {
  res.json({ ok: true, product: "GLOW Education", version: "0.1.0-candidate" });
});

app.post("/mcp", async (req, res) => {
  const sid = req.headers["mcp-session-id"];
  let transport = typeof sid === "string" ? transports.get(sid) : undefined;

  if (!transport && !sid && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: id => { transports.set(id, transport!); }
    });
    const server = buildServer();
    transport.onclose = () => {
      if (transport?.sessionId) transports.delete(transport.sessionId);
      void server.close();
    };
    await server.connect(transport);
  }

  if (!transport) {
    res.status(400).json({ error: "INVALID_OR_MISSING_MCP_SESSION" });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", async (req, res) => {
  const sid = req.headers["mcp-session-id"];
  const transport = typeof sid === "string" ? transports.get(sid) : undefined;
  if (!transport) {
    res.status(400).send("INVALID_OR_MISSING_MCP_SESSION");
    return;
  }
  await transport.handleRequest(req, res);
});

app.listen(config.port, () => {
  console.log(`GLOW Education public host listening on :${config.port}`);
});
