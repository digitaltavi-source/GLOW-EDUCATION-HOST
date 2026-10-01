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
        async execute(raw) {
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
        async execute(raw) {
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
        async execute(raw) {
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
