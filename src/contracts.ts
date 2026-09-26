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

export const LearningResponse = z.object({
  request_id: z.string(),
  status: z.enum(["accepted","completed","blocked","degraded","failed"]),
  exposure: z.enum(["PUBLIC_DECLASSIFIED","MODEL_SESSION_PRIVATE"]).default("PUBLIC_DECLASSIFIED"),
  result: z.record(z.string(), z.unknown()).nullable().optional(),
  public_evidence: z.array(z.record(z.string(), z.unknown())).default([]),
  errors: z.array(PublicError).default([])
}).strict();

export type LearningRequestType = z.infer<typeof LearningRequest>;
export type LearningResponseType = z.infer<typeof LearningResponse>;
