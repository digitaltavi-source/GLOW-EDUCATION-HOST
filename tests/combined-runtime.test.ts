import test from "node:test";
import assert from "node:assert/strict";
import {
  BackendError,
  callCombinedPreviewService,
  checkCombinedPreviewReadiness
} from "../src/backend.js";
import type { HostConfig } from "../src/config.js";

const config: HostConfig = {
  combinedRuntimeModule: "./not-used-in-tests.mjs",
  stagingUiEnabled: true,
  port: 3000
};

const request = {
  request_id: "combined-test-1",
  operation: "create_learning_experience" as const,
  role: "teacher" as const,
  locale: "vi-VN",
  input: { goal: "demo" }
};

test("combined preview accepts only public-declassified contract", async () => {
  const runtime = {
    async execute() {
      return {
        request_id: "combined-test-1",
        status: "completed",
        exposure: "PUBLIC_DECLASSIFIED",
        result: { title: "Safe result" },
        public_evidence: [],
        errors: []
      };
    }
  };
  const out = await callCombinedPreviewService(config, request, runtime);
  assert.equal(out.exposure, "PUBLIC_DECLASSIFIED");
  assert.equal(out.status, "completed");
});

test("combined preview rejects MODEL_SESSION_PRIVATE", async () => {
  const runtime = {
    async execute() {
      return {
        request_id: "combined-test-1",
        status: "accepted",
        exposure: "MODEL_SESSION_PRIVATE",
        result: { work: { kind: "PRIVATE_WORK" } },
        public_evidence: [],
        errors: []
      };
    }
  };
  await assert.rejects(
    () => callCombinedPreviewService(config, request, runtime),
    (error: unknown) => error instanceof BackendError &&
      error.message === "COMBINED_PRIVATE_EXPOSURE_REJECTED"
  );
});

test("combined preview rejects unknown top-level fields", async () => {
  const runtime = {
    async execute() {
      return {
        request_id: "combined-test-1",
        status: "completed",
        exposure: "PUBLIC_DECLASSIFIED",
        result: { title: "Safe result" },
        public_evidence: [],
        errors: [],
        private_trace: "must-not-cross"
      };
    }
  };
  await assert.rejects(
    () => callCombinedPreviewService(config, request, runtime),
    (error: unknown) => error instanceof BackendError &&
      error.message === "COMBINED_DECLASSIFICATION_SCHEMA_REJECTED"
  );
});

test("combined readiness passes only on bounded mission-not-found", async () => {
  const runtime = {
    async execute() {
      return {
        request_id: "combined-preview-readiness-probe",
        status: "blocked",
        exposure: "PUBLIC_DECLASSIFIED",
        result: null,
        public_evidence: [],
        errors: [{code:"MISSION_NOT_FOUND",message:"MISSION_NOT_FOUND",retryable:false}]
      };
    }
  };
  const out = await checkCombinedPreviewReadiness(config, runtime);
  assert.deepEqual(out,{ok:true,code:"COMBINED_RUNTIME_REACHABLE"});
});

test("combined readiness fails closed on private exposure", async () => {
  const runtime = {
    async execute() {
      return {
        request_id: "combined-preview-readiness-probe",
        status: "accepted",
        exposure: "MODEL_SESSION_PRIVATE",
        result: { work: { kind: "PRIVATE_WORK" } },
        public_evidence: [],
        errors: []
      };
    }
  };
  const out = await checkCombinedPreviewReadiness(config, runtime);
  assert.equal(out.ok,false);
  assert.equal(out.code,"COMBINED_PRIVATE_EXPOSURE_REJECTED");
});
