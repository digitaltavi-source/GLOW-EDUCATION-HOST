import test from "node:test";
import assert from "node:assert/strict";
import { mapSubmitWorkInput } from "../src/tool-mapping.js";

test("submit tool maps public result to V2 work_result without changing plugin surface", () => {
  const result = { decisions: [{ capability_id: "example" }] };
  assert.deepEqual(
    mapSubmitWorkInput("M-1", "token-1", result),
    { mission_id: "M-1", work_token: "token-1", work_result: result }
  );
});
