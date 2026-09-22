import { createRemoteJWKSet, jwtVerify } from "jose";
import type { OAuthTokenVerifier } from "@modelcontextprotocol/express";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { OAuthError, OAuthErrorCode } from "@modelcontextprotocol/server";

export type OAuthConfig = {
  issuer: string;
  audience: string;
  jwksUrl: string;
};

export function loadOAuthConfig(env = process.env): OAuthConfig {
  const issuer = env.GLOW_OAUTH_ISSUER?.trim();
  const audience = env.GLOW_OAUTH_AUDIENCE?.trim();
  const jwksUrl = env.GLOW_OAUTH_JWKS_URL?.trim();

  if (!issuer) throw new Error("CONFIG_OAUTH_ISSUER_REQUIRED");
  if (!audience) throw new Error("CONFIG_OAUTH_AUDIENCE_REQUIRED");
  if (!jwksUrl) throw new Error("CONFIG_OAUTH_JWKS_URL_REQUIRED");

  return { issuer, audience, jwksUrl };
}

export function createJwtVerifier(config: OAuthConfig): OAuthTokenVerifier {
  const jwks = createRemoteJWKSet(new URL(config.jwksUrl));

  return {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      try {
        const { payload } = await jwtVerify(token, jwks, {
          issuer: config.issuer,
          audience: config.audience
        });

        const subject = payload.sub;
        const exp = payload.exp;
        if (!subject || !exp) {
          throw new OAuthError(OAuthErrorCode.InvalidToken, "missing subject or expiry");
        }

        const rawScope = payload["scope"];
        const rawScp = payload["scp"];
        const scopes =
          typeof rawScope === "string"
            ? rawScope.split(/\s+/).filter(Boolean)
            : Array.isArray(rawScp)
              ? rawScp.filter((v): v is string => typeof v === "string")
              : [];

        const clientId =
          typeof payload["azp"] === "string"
            ? payload["azp"]
            : typeof payload["client_id"] === "string"
              ? payload["client_id"]
              : subject;

        return {
          token,
          clientId,
          scopes,
          expiresAt: exp,
          extra: { sub: subject }
        };
      } catch (error) {
        if (error instanceof OAuthError) throw error;
        throw new OAuthError(OAuthErrorCode.InvalidToken, "token verification failed");
      }
    }
  };
}
