import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

function compiledServerSource() {
  return readFileSync(path.resolve(process.cwd(), "dist/src/server.js"), "utf8");
}

function toolBlock(source: string, toolName: string) {
  const marker = `"${toolName}"`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${toolName} must exist in compiled server wiring`);
  const next = source.indexOf("server.registerTool(", start + marker.length);
  return source.slice(start, next === -1 ? source.length : next);
}

test("WIRING: recovery tool uses recovery-specific exposure classifier", () => {
  const block = toolBlock(compiledServerSource(), "glow_recover_blocked_factory_stage");
  assert.match(block, /classifyRecoveryResponse\(out\)/);
  assert.doesNotMatch(block, /classifyWorkResponse\(out\)/);
});

test("WIRING: get-work tool still uses private-work exposure classifier", () => {
  const block = toolBlock(compiledServerSource(), "glow_get_factory_work");
  assert.match(block, /classifyWorkResponse\(out\)/);
  assert.doesNotMatch(block, /classifyRecoveryResponse\(out\)/);
});

test("IDENTITY: public server no longer claims legacy live-demo version", () => {
  const source = compiledServerSource();
  assert.equal(source.includes("0.2.0-live-demo"), false);
  assert.equal(source.includes("SUPERVISED_LIVE_DEMO_VERIFIED_NOT_PRODUCTION"), false);
  assert.match(source, /PUBLIC_HOST_ADAPTER_VERSION\s*=\s*"0\.3\.0"/);
});

test("SURFACE: only the governed MCP v2 route is exposed", () => {
  const source = compiledServerSource();
  assert.match(source, /app\.all\("\/mcp-v2"/);
  assert.doesNotMatch(source, /app\.all\("\/mcp"[,)]/);
  assert.doesNotMatch(source, /app\.all\("\/mcp-v3"/);
  assert.match(source, /CONFIG_PUBLIC_MCP_PATH_MUST_BE_MCP_V2/);
});

test("AUTH: static bearer is not silently widened to hybrid OAuth", () => {
  const source = compiledServerSource();
  assert.doesNotMatch(source, /configuredAuthMode\s*===\s*"static_bearer"\s*\?\s*"hybrid"/);
  assert.match(source, /allowedAuthModes\s*=\s*new Set\(\[\s*"oauth"\s*,\s*"static_bearer"\s*,\s*"hybrid"\s*,\s*"legacy_static"\s*,\s*"staging_disabled"\s*\]\)/);
});

test("AUTH: public OAuth metadata is not pinned to a second hard-coded tenant", () => {
  const source = compiledServerSource();
  assert.doesNotMatch(source, /rjllafrkmwijvqojmdsd\.supabase\.co/);
  assert.match(source, /oauthConfig\?\.issuer/);
});
