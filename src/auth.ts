export type McpAuthInfo = {
  scopes?: string[];
  extra?: Record<string, unknown>;
};

export class AuthError extends Error {}

export function requireUser(authInfo: McpAuthInfo | undefined, requiredScope: string): string {
  const sub = authInfo?.extra?.["sub"];
  if (typeof sub !== "string" || !sub.trim()) throw new AuthError("AUTH_REQUIRED");

  const scopes = authInfo?.scopes ?? [];
  if (!scopes.includes(requiredScope)) throw new AuthError("SCOPE_REQUIRED");

  return sub;
}
