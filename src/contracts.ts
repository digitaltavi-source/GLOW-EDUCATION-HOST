import { z } from "zod";

export const LearningRequest = z.object({
  request_id: z.string().min(1).max(128),
  operation: z.enum(["create_learning_experience","get_work","submit_work","inspect_blocked_stage","recover_blocked_stage","approve_stage","get_status","get_delivery","continue_learning_experience"]),
  role: z.enum(["teacher","learner","parent","unspecified"]).default("unspecified"),
  input: z.record(z.string(), z.unknown()),
  locale: z.string().min(2).max(32).default("vi-VN"),
  client_context: z.record(z.string(), z.unknown()).optional()
}).strict();

export const PublicError = z.object({
  code: z.string().min(1).max(128),
  message: z.string().min(1).max(1000),
  retryable: z.boolean()
}).strict();

const ResponseEnvelope = z.object({
  request_id: z.string(),
  status: z.enum(["accepted","completed","blocked","degraded","failed"]),
  exposure: z.enum(["PUBLIC_DECLASSIFIED","MODEL_SESSION_PRIVATE"]).default("PUBLIC_DECLASSIFIED"),
  result: z.record(z.string(), z.unknown()).nullable().optional(),
  public_evidence: z.array(z.record(z.string(), z.unknown())).default([]),
  errors: z.array(PublicError).default([])
}).strict();

export type LearningRequestType = z.infer<typeof LearningRequest>;
export type LearningResponseType = z.infer<typeof LearningResponse>;

// Public structures are explicitly admitted. Authenticated model work retains
// its separate opaque contract; unknown public fields fail closed at any depth.
const publicKeys = new Set(`mission_id state stage next_action runtime_profile
factory_state execution_profile selected_capabilities topic learning_goal title
artifact output claim_ceiling claim_limit release_authorized approval_required
kind candidate_sha256 assurance_sha256 freeze_input_bundle_hash public_preview
allowed_decisions profile learning_outcomes artifact_demands artifact_demand_id
product_owner user_surface modality teacher_moves learner_actions concept_explanation
practice exit_check speaker_notes teacher_product learner_product
assessment_evidence_progress_product assurance disposition gate_count session_count
independence_class independent_qualification facilitation_execution pacing_sequence
teacher_prompts adaptation_guidance teacher_media_tool session_setup
accessibility_localization authorized_assessment_projection_contracts learner_content
activity_practice learner_media_play learner_safe_feedback ai_paths assessments
scoring_answer_logic rubric_evidence_criteria feedback_rules mastery_progress_schema
evidence_ownership_classification teacher_safe_projection learner_safe_projection
field_instrumentation assessment_binding_sha256 step teacher_action
projection_contract_ref presentation_policy path_id allowed_support
may_generate_mastery_response evidence_class requires_outcome_evidence metric purpose
counts_as_mastery class type value source`.split(/\s+/));

function publicShape(value: unknown, depth = 0): boolean {
  if (depth > 40) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(item => publicShape(item, depth + 1));
  if (typeof value !== "object") return false;
  return Object.entries(value).every(([key, item]) => publicKeys.has(key) && publicShape(item, depth + 1));
}

export const LearningResponse = ResponseEnvelope.superRefine((value, ctx) => {
  if (value.exposure === "PUBLIC_DECLASSIFIED" &&
      (!publicShape(value.result ?? null) || !publicShape(value.public_evidence))) {
    ctx.addIssue({ code: "custom", message: "PUBLIC_PAYLOAD_SHAPE_REJECTED" });
  }
});
