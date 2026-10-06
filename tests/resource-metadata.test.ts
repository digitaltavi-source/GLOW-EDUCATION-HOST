import test from "node:test";
import assert from "node:assert/strict";
import { buildProtectedResourceMetadata } from "../src/resource-metadata.js";

test("OAuth resource metadata follows the configured issuer", () => {
  const out=buildProtectedResourceMetadata({
    resource:"https://education.example/mcp-v2",
    authMode:"oauth",
    oauthIssuer:"https://identity.example/auth/v1",
    scopes:["email","email"]
  });
  assert.deepEqual(out.authorization_servers,["https://identity.example/auth/v1"]);
  assert.deepEqual(out.scopes_supported,["email"]);
});

test("static bearer metadata does not advertise an OAuth authority", () => {
  const out=buildProtectedResourceMetadata({
    resource:"https://education.example/mcp-v2",
    authMode:"static_bearer",
    oauthIssuer:null,
    scopes:["education.run"]
  });
  assert.equal("authorization_servers" in out,false);
});

test("non-local MCP resource metadata requires HTTPS", () => {
  assert.throws(()=>buildProtectedResourceMetadata({
    resource:"http://education.example/mcp-v2",
    authMode:"oauth",
    oauthIssuer:"https://identity.example/auth/v1",
    scopes:["email"]
  }),/RESOURCE_HTTPS_REQUIRED/);
});
