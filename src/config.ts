export type HostConfig = {
  protectedServiceUrl?: string;
  protectedServiceToken?: string;
  combinedRuntimeModule?: string;
  stagingUiEnabled?: boolean;
  port: number;
};

export function loadConfig(env = process.env): HostConfig {
  const protectedServiceUrl = env.GLOW_PROTECTED_SERVICE_URL?.trim();
  const protectedServiceToken = env.GLOW_PROTECTED_SERVICE_TOKEN?.trim();
  const combinedRuntimeModule = env.GLOW_COMBINED_RUNTIME_MODULE?.trim();
  const stagingUiEnabled = (env.GLOW_STAGING_UI_ENABLED ?? "0").trim() === "1";
  const port = Number(env.PORT ?? 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("CONFIG_PORT_INVALID");
  }

  if (protectedServiceUrl) {
    const parsed = new URL(protectedServiceUrl);
    if (parsed.protocol !== "https:" && env.GLOW_ALLOW_INSECURE_LOCAL !== "1") {
      throw new Error("CONFIG_HTTPS_REQUIRED");
    }
  }

  if (!combinedRuntimeModule && (!protectedServiceUrl || !protectedServiceToken)) {
    throw new Error("CONFIG_BACKEND_REQUIRED");
  }

  return {
    ...(protectedServiceUrl ? { protectedServiceUrl: protectedServiceUrl.replace(/\/$/, "") } : {}),
    ...(protectedServiceToken ? { protectedServiceToken } : {}),
    ...(combinedRuntimeModule ? { combinedRuntimeModule } : {}),
    stagingUiEnabled,
    port
  };
}
