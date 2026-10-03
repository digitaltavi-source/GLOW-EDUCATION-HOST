import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { callConfiguredService } from "../src/backend.js";
import type { HostConfig } from "../src/config.js";
import type { LearningRequestType } from "../src/contracts.js";

const request: LearningRequestType = {
  request_id: "dispatch-regression",
  operation: "get_status",
  role: "unspecified",
  locale: "vi-VN",
  input: { mission_id: "M-NOT-FOUND" }
};

test("NORMAL: combined binding dispatches MCP work to combined runtime", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "glow-combined-"));
  const modulePath = path.join(dir, "runtime.mjs");
  await writeFile(modulePath, `
    export async function createGlowCombinedRuntime() {
      return {
        async execute(subject, raw) {
          return {
            request_id: raw.request_id,
            status: "blocked",
            exposure: "PUBLIC_DECLASSIFIED",
            public_evidence: [],
            errors: [{ code: "MISSION_NOT_FOUND", message: "MISSION_NOT_FOUND", retryable: false }]
          };
        }
      };
    }
  `);
  try {
    const config: HostConfig = {
      combinedRuntimeModule: pathToFileURL(modulePath).href,
      port: 3000
    };
    const out = await callConfiguredService(config, "subject-1", request);
    assert.equal(out.errors[0]?.code, "MISSION_NOT_FOUND");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});


test("PRIVATE WORK: combined MCP path propagates subject and preserves MODEL_SESSION_PRIVATE", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "glow-combined-private-"));
  const modulePath = path.join(dir, "runtime.mjs");
  await writeFile(modulePath, `
    export async function createGlowCombinedRuntime() {
      return {
        async execute(subject, raw) {
          if (subject !== "subject-private") throw new Error("SUBJECT_NOT_PROPAGATED");
          return {
            request_id: raw.request_id,
            status: "accepted",
            exposure: "MODEL_SESSION_PRIVATE",
            result: { work: { kind: "CAPABILITY_SCREENING", work_token: "fixture-token" } },
            public_evidence: [],
            errors: []
          };
        }
      };
    }
  `);
  try {
    const config: HostConfig = {
      combinedRuntimeModule: pathToFileURL(modulePath).href,
      port: 3000
    };
    const out = await callConfiguredService(config, "subject-private", request);
    assert.equal(out.exposure, "MODEL_SESSION_PRIVATE");
    assert.equal(out.status, "accepted");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("IDENTITY HANDOFF: same subject may continue a web-originated mission; different subject is blocked", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "glow-identity-handoff-"));
  const modulePath = path.join(dir, "runtime.mjs");
  await writeFile(modulePath, `
    let owner = null;
    const missionId = "M-WEB-HANDOFF";
    export async function createGlowCombinedRuntime() {
      return {
        async execute(subject, raw) {
          if (raw.operation === "create_learning_experience") {
            owner = subject;
            return {
              request_id: raw.request_id,
              status: "accepted",
              exposure: "PUBLIC_DECLASSIFIED",
              result: { mission_id: missionId, state: "H1_WORKING", stage: "H1", next_action: "get_work" },
              public_evidence: [],
              errors: []
            };
          }
          if (raw.input?.mission_id === missionId && subject !== owner) {
            return {
              request_id: raw.request_id,
              status: "failed",
              exposure: "PUBLIC_DECLASSIFIED",
              result: null,
              public_evidence: [],
              errors: [{ code: "MISSION_SUBJECT_MISMATCH", message: "MISSION_SUBJECT_MISMATCH", retryable: false }]
            };
          }
          if (raw.operation === "get_work") {
            return {
              request_id: raw.request_id,
              status: "accepted",
              exposure: "MODEL_SESSION_PRIVATE",
              result: { state: "H1_WORKING", stage: "H1", work: { kind: "CAPABILITY_SCREENING", work_token: "handoff-token" } },
              public_evidence: [],
              errors: []
            };
          }
          return {
            request_id: raw.request_id,
            status: "accepted",
            exposure: "PUBLIC_DECLASSIFIED",
            result: { mission_id: missionId, state: "H1_WORKING", stage: "H1", next_action: "get_work" },
            public_evidence: [],
            errors: []
          };
        }
      };
    }
  `);
  try {
    const config: HostConfig = { combinedRuntimeModule: pathToFileURL(modulePath).href, port: 3000 };
    const created = await callConfiguredService(config, "shared-subject", {
      request_id: "web-create",
      operation: "create_learning_experience",
      role: "teacher",
      locale: "vi-VN",
      input: { topic: "identity-handoff" }
    });
    assert.equal(created.result?.mission_id, "M-WEB-HANDOFF");

    const continued = await callConfiguredService(config, "shared-subject", {
      request_id: "plugin-get-work",
      operation: "get_work",
      role: "teacher",
      locale: "vi-VN",
      input: { mission_id: "M-WEB-HANDOFF" }
    });
    assert.equal(continued.exposure, "MODEL_SESSION_PRIVATE");
    assert.equal(continued.status, "accepted");

    const takeover = await callConfiguredService(config, "other-subject", {
      request_id: "plugin-takeover",
      operation: "get_status",
      role: "teacher",
      locale: "vi-VN",
      input: { mission_id: "M-WEB-HANDOFF" }
    });
    assert.equal(takeover.status, "failed");
    assert.equal(takeover.errors[0]?.code, "MISSION_SUBJECT_MISMATCH");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("FAILURE: remote mode without protected service fails closed", async () => {
  const config: HostConfig = { port: 3000 };
  await assert.rejects(
    () => callConfiguredService(config, "subject-1", request),
    /PROTECTED_SERVICE_NOT_CONFIGURED/
  );
});

test("ADVERSARIAL: combined binding takes precedence over stray remote config", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "glow-combined-precedence-"));
  const modulePath = path.join(dir, "runtime.mjs");
  await writeFile(modulePath, `
    export async function createGlowCombinedRuntime() {
      return {
        async execute(subject, raw) {
          return {
            request_id: raw.request_id,
            status: "blocked",
            exposure: "PUBLIC_DECLASSIFIED",
            public_evidence: [{ source: "combined-runtime" }],
            errors: [{ code: "MISSION_NOT_FOUND", message: "MISSION_NOT_FOUND", retryable: false }]
          };
        }
      };
    }
  `);
  try {
    const config: HostConfig = {
      combinedRuntimeModule: pathToFileURL(modulePath).href,
      protectedServiceUrl: "https://127.0.0.1.invalid",
      protectedServiceToken: "must-not-be-used",
      port: 3000
    };
    const out = await callConfiguredService(config, "subject-1", request);
    assert.equal(out.public_evidence[0]?.source, "combined-runtime");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("RECOVERY: a valid combined binding recovers from missing remote-service configuration", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "glow-combined-recovery-"));
  const modulePath = path.join(dir, "runtime.mjs");
  await writeFile(modulePath, `
    export async function createGlowCombinedRuntime() {
      return {
        async execute(subject, raw) {
          return {
            request_id: raw.request_id,
            status: "blocked",
            exposure: "PUBLIC_DECLASSIFIED",
            public_evidence: [],
            errors: [{ code: "MISSION_NOT_FOUND", message: "MISSION_NOT_FOUND", retryable: false }]
          };
        }
      };
    }
  `);
  try {
    const broken: HostConfig = { port: 3000 };
    await assert.rejects(() => callConfiguredService(broken, "subject-1", request), /PROTECTED_SERVICE_NOT_CONFIGURED/);
    const repaired: HostConfig = { combinedRuntimeModule: pathToFileURL(modulePath).href, port: 3000 };
    const out = await callConfiguredService(repaired, "subject-1", request);
    assert.equal(out.errors[0]?.code, "MISSION_NOT_FOUND");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
