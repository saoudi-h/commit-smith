import { z } from "zod";

export const CommitSchema = z.object({
  request: z.string().min(1, "Request description is required"),
  style: z.enum(["default", "strict", "minimal", "descriptive"]).default("default"),
  auto_commit: z.boolean().default(true),
  auto_stage: z.boolean().default(true),
});