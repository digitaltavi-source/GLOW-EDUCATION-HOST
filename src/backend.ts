import { resolve, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { LearningResponse, type LearningRequestType, type LearningResponseType } from "./contracts.js";
import type { HostConfig } from "./config.js";

export class BackendError extends Error {}

type CombinedRuntime = {
  execute(subject: string, raw: LearningRequestType): Promise<unknown>;
};

let combinedRuntimePromise: Promise<CombinedRuntime> | null = null;
let combinedRuntimeIdentity: string | null = null;

function combinedModuleUrl(specifier: string): string {
  if (specifier.startsWith("file:")) return specifier;
  return pathToFileURL(isAbsolute(specifier) ? specifier : resolve(process.cwd(), specifier)).href;
}

async function getCombinedRuntime(config: HostConfig): Promise<CombinedRuntime> {
  const specifier = config.combinedRuntimeModule?.trim();
  if (!specifier) throw new BackendError("COMBINED_RUNTIME_NOT_CONFIGURED");

  if (!combinedRuntimePromise || combinedRuntimeIdentity !== specifier) {
    combinedRuntimeIdentity = specifier;
    combinedRuntimePromise = import(combinedModuleUrl(specifier)).then(async mod => {
      const create = mod.createGlowCombinedRuntime;
      if (typeof create !== "function") throw new BackendError("COMBINED_RUNTIME_FACTORY_MISSING");
      const runtime = await create({
        stateDir: process.env.GLOW_NODE_STATE_DIR ?? ".glow-node-state"
      });
      if (!runtime || typeof runtime.execute !== "function") {
        throw new BackendError("COMBINED_RUNTIME_EXECUTOR_INVALID");
      }
      return runtime as CombinedRuntime;
    });
  }
  return combinedRuntimePromise;
}

export async function callProtectedService(
  config: HostConfig,
  subject: string,
  request: LearningRequestType,
  fetchImpl: typeof fetch = fetch
): Promise<LearningResponseType> {
  if (!config.protectedServiceUrl || !config.protectedServiceToken) {
    throw new BackendError("PROTECTED_SERVICE_NOT_CONFIGURED");
  }

  const response = await fetchImpl(`${config.protectedServiceUrl}/v1/learning-experiences`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${config.protectedServiceToken}`,
      "x-glow-subject": subject
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new BackendError(`PROTECTED_SERVICE_HTTP_${response.status}`);
  }

  const raw: unknown = await response.json();
  const parsed = LearningResponse.safeParse(raw);
  if (!parsed.success) throw new BackendError("DECLASSIFICATION_SCHEMA_REJECTED");

  return parsed.data;
}

export async function callCombinedPreviewService(
  config: HostConfig,
  request: LearningRequestType,
  runtimeOverride?: CombinedRuntime
): Promise<LearningResponseType> {
  const runtime = runtimeOverride ?? await getCombinedRuntime(config);
  const raw = await runtime.execute("staging-browser", request);
  const parsed = LearningResponse.safeParse(raw);
  if (!parsed.success) throw new BackendError("COMBINED_DECLASSIFICATION_SCHEMA_REJECTED");
  if (parsed.data.exposure !== "PUBLIC_DECLASSIFIED") {
    throw new BackendError("COMBINED_PRIVATE_EXPOSURE_REJECTED");
  }
  return parsed.data;
}

export async function callConfiguredService(
  config: HostConfig,
  subject: string,
  request: LearningRequestType
): Promise<LearningResponseType> {
  if (config.combinedRuntimeModule?.trim()) {
    const runtime = await getCombinedRuntime(config);
    const raw = await runtime.execute(subject, request);
    const parsed = LearningResponse.safeParse(raw);
    if (!parsed.success) throw new BackendError("COMBINED_RESPONSE_SCHEMA_REJECTED");
    return parsed.data;
  }
  return callProtectedService(config, subject, request);
}

export async function checkProtectedReadiness(
  config: HostConfig,
  fetchImpl: typeof fetch = fetch
): Promise<{ ok: boolean; protected_service_authenticated: boolean; code: string }> {
  const probe: LearningRequestType = {
    request_id: "protected-readiness-probe-v1",
    operation: "get_status",
    role: "unspecified",
    locale: "vi-VN",
    input: { mission_id: "M-PROTECTED-READINESS-NONEXISTENT" }
  };
  try {
    const out = await callProtectedService(config, "protected-readiness-probe", probe, fetchImpl);
    const code = out.errors?.[0]?.code ?? "";
    if ((out.status === "failed" || out.status === "blocked") && code === "MISSION_NOT_FOUND") {
      return { ok: true, protected_service_authenticated: true, code: "PROTECTED_FACTORY_REACHABLE" };
    }
    return { ok: false, protected_service_authenticated: true, code: "PROTECTED_FACTORY_UNEXPECTED_RESPONSE" };
  } catch (error) {
    const code = error instanceof Error ? error.message : "PROTECTED_FACTORY_PROBE_FAILED";
    return { ok: false, protected_service_authenticated: false, code };
  }
}

export async function checkCombinedPreviewReadiness(
  config: HostConfig,
  runtimeOverride?: CombinedRuntime
): Promise<{ ok: boolean; code: string }> {
  const probe: LearningRequestType = {
    request_id: "combined-preview-readiness-probe",
    operation: "get_status",
    role: "unspecified",
    locale: "vi-VN",
    input: { mission_id: "M-COMBINED-PREVIEW-NONEXISTENT" }
  };
  try {
    const out = await callCombinedPreviewService(config, probe, runtimeOverride);
    const code = out.errors?.[0]?.code ?? "";
    if ((out.status === "failed" || out.status === "blocked") && code === "MISSION_NOT_FOUND") {
      return { ok: true, code: "COMBINED_RUNTIME_REACHABLE" };
    }
    return { ok: false, code: "COMBINED_RUNTIME_UNEXPECTED_RESPONSE" };
  } catch (error) {
    return {
      ok: false,
      code: error instanceof Error ? error.message : "COMBINED_RUNTIME_PROBE_FAILED"
    };
  }
}
