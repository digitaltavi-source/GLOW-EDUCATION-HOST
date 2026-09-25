import test from "node:test";
import assert from "node:assert/strict";
import { LearningRequest } from "../src/contracts.js";

const operations = [
  "create_learning_experience",
  "get_work",
  "submit_work",
  "inspect_blocked_stage",
  "approve_stage",
  "get_status",
  "get_delivery"
] as const;

for (const operation of operations) {
  test(`public contract admits ChatGPT work-loop operation: ${operation}`, () => {
    const parsed = LearningRequest.parse({
      request_id: `test-${operation}`,
      operation,
      role: "teacher",
      locale: "vi-VN",
      input: { mission_id: "M-test" }
    });
    assert.equal(parsed.operation, operation);
  });
}

test("public contract rejects unknown Factory-control mutation operation", () => {
  assert.throws(() => LearningRequest.parse({
    request_id: "bad-operation",
    operation: "mutate_factory_canon",
    role: "teacher",
    locale: "vi-VN",
    input: {}
  }));
});
