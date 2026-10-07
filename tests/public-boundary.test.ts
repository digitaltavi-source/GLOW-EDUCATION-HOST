import test from "node:test";
import assert from "node:assert/strict";
import { LearningResponse } from "../src/contracts.js";
import {callProtectedService,callCombinedPreviewService} from "../src/backend.js";
const base={request_id:"boundary",status:"completed",exposure:"PUBLIC_DECLASSIFIED",public_evidence:[],errors:[]};
const request={request_id:"boundary",operation:"get_delivery" as const,role:"teacher" as const,locale:"vi-VN",input:{mission_id:"M"}};
for(const result of [{private_trace:"canary"},{artifact:{confidential_prompt:"canary"}},{output:{teacher_product:{facilitation_execution:[{internal_trace:"canary"}]}}}]) {
  test("public nested fields fail closed: "+JSON.stringify(result),async()=>{
    const payload={...base,result};
    assert.equal(LearningResponse.safeParse(payload).success,false);
    await assert.rejects(callCombinedPreviewService({port:3000},request,{execute:async()=>payload}),/SCHEMA_REJECTED/);
    await assert.rejects(callProtectedService({port:3000,protectedServiceUrl:"https://synthetic.invalid",protectedServiceToken:"synthetic"},"u",request,(async()=>Response.json(payload)) as typeof fetch),/SCHEMA_REJECTED/);
  });
}
test("nested evidence and arbitrary new public keys fail closed",()=>{
  assert.equal(LearningResponse.safeParse({...base,public_evidence:[{value:{private_trace:"canary"}}]}).success,false);
  assert.equal(LearningResponse.safeParse({...base,result:{unexpected_new_field:"canary"}}).success,false);
});
test("public educational text is preserved; private model work has a separate boundary",()=>{
 const result={output:{teacher_product:{teacher_prompts:["Explain what a private key is."]},learner_product:{activity_practice:["Translate the sentence."]},assessment_evidence_progress_product:{rubric_evidence_criteria:["Correct meaning."]}}};
 assert.deepEqual(LearningResponse.parse({...base,result}).result,result);
 const work={work:{private_prompt:"authorized model-session content"}};
 assert.deepEqual(LearningResponse.parse({...base,exposure:"MODEL_SESSION_PRIVATE",result:work}).result,work);
});
