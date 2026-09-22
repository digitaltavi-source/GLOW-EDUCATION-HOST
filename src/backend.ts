import { LearningResponse, type LearningRequestType, type LearningResponseType } from "./contracts.js";
import type { HostConfig } from "./config.js";

export class BackendError extends Error {}

export async function callProtectedService(
  config: HostConfig,
  subject: string,
  request: LearningRequestType,
  fetchImpl: typeof fetch = fetch
): Promise<LearningResponseType> {
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

  // Whitelist-based declassification: only the public response schema may cross this boundary.
  const parsed = LearningResponse.safeParse(raw);
  if (!parsed.success) throw new BackendError("DECLASSIFICATION_SCHEMA_REJECTED");

  return parsed.data;
}
