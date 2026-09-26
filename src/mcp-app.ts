import { createMcpExpressApp } from "@modelcontextprotocol/express";

export const DEFAULT_MCP_JSON_LIMIT = "512kb";

export function createGlowMcpExpressApp(
  allowedHosts: string[],
  jsonLimit = process.env.GLOW_MCP_JSON_LIMIT?.trim() || DEFAULT_MCP_JSON_LIMIT
) {
  return createMcpExpressApp({
    host: "0.0.0.0",
    allowedHosts,
    jsonLimit
  });
}
