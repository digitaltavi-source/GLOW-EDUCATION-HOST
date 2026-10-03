import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { loadRuntimeIdentity } from "./runtime-identity.js";

export const DEFAULT_MCP_JSON_LIMIT = "512kb";

export function createGlowMcpExpressApp(
  allowedHosts: string[],
  jsonLimit = process.env.GLOW_MCP_JSON_LIMIT?.trim() || DEFAULT_MCP_JSON_LIMIT
) {
  const app = createMcpExpressApp({
    host: "0.0.0.0",
    allowedHosts,
    jsonLimit
  });

  app.get("/system/identity", (_req, res) => {
    res.json(loadRuntimeIdentity());
  });

  return app;
}
