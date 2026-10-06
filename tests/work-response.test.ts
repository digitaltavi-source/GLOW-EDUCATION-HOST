import test from "node:test";
import assert from "node:assert/strict";
import { classifyRecoveryResponse, classifyWorkResponse } from "../src/work-response.js";

test("work exposure: accepts private work package", () => {
  assert.equal(classifyWorkResponse({status:"accepted",exposure:"MODEL_SESSION_PRIVATE"}),"PRIVATE_WORK");
});

test("work exposure: preserves safe declassified protected failure", () => {
  assert.equal(classifyWorkResponse({
    status:"failed",
    exposure:"PUBLIC_DECLASSIFIED",
    errors:[{code:"MISSION_NOT_FOUND"}]
  }),"SAFE_PUBLIC_FAILURE");
});

test("work exposure: preserves safe declassified blocked outcome", () => {
  assert.equal(classifyWorkResponse({
    status:"blocked",
    exposure:"PUBLIC_DECLASSIFIED",
    errors:[{code:"H2_SYNTHESIS_RECOVERY_BLOCKED_H2_CAPABILITY_PLAN"}]
  }),"SAFE_PUBLIC_FAILURE");
});

test("work exposure: preserves safe declassified degraded outcome", () => {
  assert.equal(classifyWorkResponse({
    status:"degraded",
    exposure:"PUBLIC_DECLASSIFIED",
    errors:[{code:"MISSION_CONCURRENT_UPDATE"}]
  }),"SAFE_PUBLIC_FAILURE");
});

test("work exposure: rejects unexpected successful public response", () => {
  assert.throws(
    () => classifyWorkResponse({status:"accepted",exposure:"PUBLIC_DECLASSIFIED"}),
    /WORK_EXPOSURE_INVALID/
  );
});

test("recovery exposure: accepts bounded public success", () => {
  assert.equal(classifyRecoveryResponse({status:"accepted",exposure:"PUBLIC_DECLASSIFIED"}),"SAFE_PUBLIC_SUCCESS");
});

test("recovery exposure: preserves bounded public failure", () => {
  assert.equal(classifyRecoveryResponse({status:"failed",exposure:"PUBLIC_DECLASSIFIED"}),"SAFE_PUBLIC_FAILURE");
});

test("recovery exposure: rejects private success", () => {
  assert.throws(
    () => classifyRecoveryResponse({status:"accepted",exposure:"MODEL_SESSION_PRIVATE"}),
    /RECOVERY_EXPOSURE_INVALID/
  );
});
