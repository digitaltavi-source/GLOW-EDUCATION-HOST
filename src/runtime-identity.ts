import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type StaticIdentity = Record<string, unknown>;

function cleanValue(value: string | undefined, fallback = "UNDECLARED") {
  const v = value?.trim();
  if (!v) return fallback;
  return v.slice(0, 160);
}

function issuerHost(raw: string | undefined) {
  try {
    return raw?.trim() ? new URL(raw.trim()).hostname : "UNDECLARED";
  } catch {
    return "INVALID_URL";
  }
}

function mcpPath(raw: string | undefined) {
  try {
    return raw?.trim() ? new URL(raw.trim()).pathname : "UNDECLARED";
  } catch {
    return "INVALID_URL";
  }
}

function loadIdentityFile(candidate: string): { source: string; value: StaticIdentity } | null {
  if (!existsSync(candidate)) return null;
  try {
    const parsed = JSON.parse(readFileSync(candidate, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { source: candidate, value: parsed as StaticIdentity };
    }
  } catch {
    return null;
  }
  return null;
}

function loadStaticIdentity(env: NodeJS.ProcessEnv): { source: string; value: StaticIdentity } {
  const explicitPath = env.GLOW_RUNTIME_IDENTITY_PATH?.trim();
  if (explicitPath) {
    return loadIdentityFile(explicitPath) ?? {
      source: "UNDECLARED",
      value: { state: "UNDECLARED", reason: "EXPLICIT_IDENTITY_PATH_UNAVAILABLE" }
    };
  }

  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(moduleDir, "../../runtime-identity.json"),
    path.resolve(process.cwd(), "runtime-identity.json"),
    path.resolve(process.cwd(), "combined-runtime/public-host/runtime-identity.json")
  ];

  for (const candidate of candidates) {
    const loaded = loadIdentityFile(candidate);
    if (loaded) return loaded;
  }

  return { source: "UNDECLARED", value: { state: "UNDECLARED" } };
}

function staticString(value: StaticIdentity, key: string) {
  const raw = value[key];
  return typeof raw === "string" && raw.trim() ? raw.trim().slice(0, 160) : "UNDECLARED";
}

function configState(expected: string, configured: string) {
  if (expected === "UNDECLARED" && configured === "UNDECLARED") return "UNDECLARED";
  if (expected === "UNDECLARED") return "CONFIG_ONLY";
  if (configured === "UNDECLARED") return "ASSEMBLY_ONLY";
  return expected === configured ? "MATCH" : "CONFLICT";
}

export function loadRuntimeIdentity(env: NodeJS.ProcessEnv = process.env) {
  const staticIdentity = loadStaticIdentity(env);
  const authHost = issuerHost(env.GLOW_OAUTH_ISSUER);
  const backendBinding = env.GLOW_COMBINED_RUNTIME_MODULE?.trim()
    ? "IN_PROCESS_COMBINED_RUNTIME"
    : env.GLOW_PROTECTED_SERVICE_URL?.trim()
      ? "REMOTE_PROTECTED_SERVICE"
      : "UNDECLARED";
  const assemblyMissionStore = staticString(staticIdentity.value, "mission_store_mode");
  const assemblyDurableState = staticString(staticIdentity.value, "durable_state_mode");
  const configuredMissionStore = cleanValue(env.GLOW_MISSION_STORE);
  const configuredDurableState = cleanValue(env.GLOW_DURABLE_STATE_MODE);

  return {
    contract: "GLOW_RUNTIME_IDENTITY_V1",
    product: "GLOW Education",
    identity_source: staticIdentity.source,
    assembly: staticIdentity.value,
    runtime: {
      backend_binding: backendBinding,
      auth_mode: cleanValue(env.GLOW_AUTH_MODE),
      auth_provider: authHost.endsWith("supabase.co") ? "SUPABASE_OAUTH" : "EXTERNAL_OR_UNDECLARED",
      auth_issuer_host: authHost,
      mcp_path: mcpPath(env.GLOW_PUBLIC_MCP_URL),
      mission_store_mode: assemblyMissionStore !== "UNDECLARED" ? assemblyMissionStore : configuredMissionStore,
      mission_store_config_state: configState(assemblyMissionStore, configuredMissionStore),
      durable_state_mode: assemblyDurableState !== "UNDECLARED" ? assemblyDurableState : configuredDurableState,
      durable_state_config_state: configState(assemblyDurableState, configuredDurableState),
      combined_runtime_module_configured: Boolean(env.GLOW_COMBINED_RUNTIME_MODULE?.trim()),
      node_version: process.version
    },
    security: {
      secrets_exposed: false,
      subject_exposed: false,
      raw_environment_exposed: false
    }
  };
}
