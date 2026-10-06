import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadRuntimeIdentity } from "../src/runtime-identity.js";

test("NORMAL: runtime identity reports baked assembly and live topology without secrets", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "glow-runtime-id-"));
  const identityPath = path.join(dir, "runtime-identity.json");
  await writeFile(identityPath, JSON.stringify({
    contract: "GLOW_ASSEMBLY_IDENTITY_V1",
    assembly_id: "TEST-ASSEMBLY",
    public_host_sha: "a".repeat(40),
    private_factory_sha: "b".repeat(40),
    capability_release: "GLOW_EDUCATION_CAPABILITY_SYSTEM_v0.10.3-rc13.zip",
    mission_store_mode: "sqlite",
    durable_state_mode: "mysql"
  }));
  try {
    const out = loadRuntimeIdentity({
      GLOW_RUNTIME_IDENTITY_PATH: identityPath,
      GLOW_COMBINED_RUNTIME_MODULE: "private-runtime.mjs",
      GLOW_AUTH_MODE: "oauth",
      GLOW_OAUTH_ISSUER: "https://example.supabase.co/auth/v1",
      GLOW_PUBLIC_MCP_URL: "https://education.example/mcp-v2",
      GLOW_MISSION_STORE: "sqlite",
      GLOW_DURABLE_STATE_MODE: "mysql",
      SECRET_TOKEN: "must-not-leak"
    });
    assert.equal(out.contract, "GLOW_RUNTIME_IDENTITY_V1");
    assert.equal((out.assembly as any).assembly_id, "TEST-ASSEMBLY");
    assert.equal(out.runtime.backend_binding, "IN_PROCESS_COMBINED_RUNTIME");
    assert.equal(out.runtime.auth_provider, "SUPABASE_OAUTH");
    assert.equal(out.runtime.mcp_path, "/mcp-v2");
    assert.equal(out.runtime.mission_store_mode, "sqlite");
    assert.equal(out.runtime.mission_store_config_state, "MATCH");
    assert.equal(out.runtime.durable_state_mode, "mysql");
    assert.equal(out.runtime.durable_state_config_state, "MATCH");
    const serialized = JSON.stringify(out);
    assert.equal(serialized.includes("must-not-leak"), false);
    assert.equal(serialized.includes("SECRET_TOKEN"), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("FAILURE: missing baked identity stays explicitly UNDECLARED", () => {
  const out = loadRuntimeIdentity({
    GLOW_RUNTIME_IDENTITY_PATH: "/definitely/not/present/runtime-identity.json",
    GLOW_AUTH_MODE: "oauth",
    GLOW_PUBLIC_MCP_URL: "https://education.example/mcp-v2"
  });
  assert.equal((out.assembly as any).state, "UNDECLARED");
  assert.equal(out.runtime.backend_binding, "UNDECLARED");
});

test("ADVERSARIAL: malformed URLs are reported, not echoed as trusted topology", () => {
  const out = loadRuntimeIdentity({
    GLOW_OAUTH_ISSUER: "not-a-url",
    GLOW_PUBLIC_MCP_URL: "also-not-a-url"
  });
  assert.equal(out.runtime.auth_issuer_host, "INVALID_URL");
  assert.equal(out.runtime.mcp_path, "INVALID_URL");
});


test("ADVERSARIAL: stale environment cannot silently rewrite baked topology", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "glow-runtime-id-conflict-"));
  const identityPath = path.join(dir, "runtime-identity.json");
  await writeFile(identityPath, JSON.stringify({
    assembly_id: "TEST-ASSEMBLY",
    mission_store_mode: "sqlite",
    durable_state_mode: "mysql"
  }));
  try {
    const out = loadRuntimeIdentity({
      GLOW_RUNTIME_IDENTITY_PATH: identityPath,
      GLOW_COMBINED_RUNTIME_MODULE: "private-runtime.mjs",
      GLOW_MISSION_STORE: "postgres",
      GLOW_DURABLE_STATE_MODE: "mysql"
    });
    assert.equal(out.runtime.mission_store_mode, "sqlite");
    assert.equal(out.runtime.mission_store_config_state, "CONFLICT");
    assert.equal(out.runtime.durable_state_mode, "mysql");
    assert.equal(out.runtime.durable_state_config_state, "MATCH");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
