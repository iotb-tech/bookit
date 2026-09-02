import { z } from "zod";

const optionalUrl = z.union([
  z.literal(""),
  z.string().url("Enter a valid meeting link."),
]);

export const studyGroupSchema = z.object({
  resourceId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2, "Group name is required.").max(80, "Keep the group name under 80 characters."),
  headline: z.string().trim().max(120, "Keep the headline under 120 characters.").optional().default(""),
  description: z.string().trim().max(1000, "Keep the description under 1000 characters.").optional().default(""),
  skills: z.array(z.string().trim().min(1)).max(12, "Use up to 12 topics."),
  capacity: z.number().int().min(2, "Capacity must be at least 2.").max(200, "Capacity cannot exceed 200."),
  durationMinutes: z.number().int().min(30).max(240),
  meetingLink: optionalUrl.optional().default(""),
  timezone: z.string().trim().min(1).max(80),
  acceptingMembers: z.boolean(),
});

export const studyGroupSessionSchema = z.object({
  resourceId: z.string().uuid(),
  startIso: z.string().datetime(),
  endIso: z.string().datetime(),
  meetingLink: optionalUrl.optional().default(""),
});

export const studyGroupMemberActionSchema = z.object({
  resourceId: z.string().uuid(),
  userId: z.string().uuid(),
});
