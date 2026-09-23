import test from "node:test";
import assert from "node:assert/strict";
import { classifyWorkResponse } from "../src/work-response.js";

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

test("work exposure: rejects unexpected successful public response", () => {
  assert.throws(
    () => classifyWorkResponse({status:"accepted",exposure:"PUBLIC_DECLASSIFIED"}),
    /WORK_EXPOSURE_INVALID/
  );
});
