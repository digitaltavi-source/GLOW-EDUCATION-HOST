import test from "node:test";
import assert from "node:assert/strict";
import { callProtectedService, BackendError } from "../src/backend.js";
import type { HostConfig } from "../src/config.js";

const config: HostConfig = {
  protectedServiceUrl: "https://protected.example",
  protectedServiceToken: "test-token",
  port: 3000
};

const request = {
  request_id: "r1",
  operation: "create_learning_experience" as const,
  role: "teacher" as const,
  locale: "vi-VN",
  input: { goal: "demo" }
};

test("accepts only public response schema", async () => {
  const fakeFetch = async () => new Response(JSON.stringify({
    request_id: "r1",
    status: "completed",
    result: { title: "Public result" },
    public_evidence: [],
    errors: []
  }), { status: 200, headers: { "content-type": "application/json" } });

  const out = await callProtectedService(config, "user-1", request, fakeFetch as typeof fetch);
  assert.equal(out.status, "completed");
});


test("accepts authenticated model-session private work response shape", async () => {
  const fakeFetch = async () => new Response(JSON.stringify({
    request_id: "r1",
    status: "accepted",
    exposure: "MODEL_SESSION_PRIVATE",
    result: {
      mission_id: "M-test",
      state: "H1_WORKING",
      stage: "H1",
      work: { kind: "CAPABILITY_SCREENING", work_token: "opaque" }
    },
    public_evidence: [],
    errors: []
  }), { status: 200, headers: { "content-type": "application/json" } });

  const out = await callProtectedService(config, "user-1", request, fakeFetch as typeof fetch);
  assert.equal(out.exposure, "MODEL_SESSION_PRIVATE");
  assert.equal(out.status, "accepted");
});

test("rejects extra protected fields at declassification boundary", async () => {
  const fakeFetch = async () => new Response(JSON.stringify({
    request_id: "r1",
    status: "completed",
    result: { title: "Public result" },
    public_evidence: [],
    errors: [],
    internal_trace: "must-not-cross"
  }), { status: 200, headers: { "content-type": "application/json" } });

  await assert.rejects(
    () => callProtectedService(config, "user-1", request, fakeFetch as typeof fetch),
    (error: unknown) => error instanceof BackendError && error.message === "DECLASSIFICATION_SCHEMA_REJECTED"
  );
});

test("fails closed on protected service HTTP error", async () => {
  const fakeFetch = async () => new Response("no", { status: 503 });
  await assert.rejects(
    () => callProtectedService(config, "user-1", request, fakeFetch as typeof fetch),
    /PROTECTED_SERVICE_HTTP_503/
  );
});
