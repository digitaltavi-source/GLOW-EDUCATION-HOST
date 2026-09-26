import test from "node:test";
import assert from "node:assert/strict";
import { requireUser, AuthError } from "../src/auth.js";

test("requires authenticated subject", () => {
  assert.throws(() => requireUser({ scopes: ["education.run"], extra: {} }, "education.run"), AuthError);
});

test("requires exact scope", () => {
  assert.throws(() => requireUser({ scopes: [], extra: { sub: "u1" } }, "education.run"), AuthError);
});

test("returns subject only when auth and scope are present", () => {
  assert.equal(requireUser({ scopes: ["education.run"], extra: { sub: "u1" } }, "education.run"), "u1");
});
