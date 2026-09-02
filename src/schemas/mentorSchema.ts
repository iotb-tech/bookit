import { z } from "zod";

export const mentorSingleAvailabilitySchema = z.object({
  resourceId: z.string().min(1),
  startIso: z.string().datetime({ offset: true }),
  endIso: z.string().datetime({ offset: true }),
}).superRefine((value, ctx) => {
  const start = new Date(value.startIso).getTime();
  const end = new Date(value.endIso).getTime();
  if (end <= start) ctx.addIssue({ code: "custom", path: ["endIso"], message: "End time must be after start time." });
});

export const mentorWeeklyAvailabilitySchema = z.object({
  resourceId: z.string().min(1),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1, "Choose at least one day."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  sessionDurationMinutes: z.number().int().min(15).max(240),
  breakMinutes: z.number().int().min(0).max(240),
  weeksAhead: z.number().int().min(1).max(12),
  timezone: z.string().min(1),
  replaceExisting: z.boolean().default(true),
});

export const mentorProfileSchema = z.object({
  resourceId: z.string().optional().nullable(),
  fullName: z.string().trim().min(2, "Your name is required.").max(100),
  headline: z.string().trim().max(120).optional().default(""),
  description: z.string().trim().max(1200).optional().default(""),
  skills: z.array(z.string().trim().min(1).max(60)).max(20),
  durationMinutes: z.number().int().min(15).max(240),
  meetingLink: z.union([z.literal(""), z.url("Enter a valid meeting URL.")]),
  timezone: z.string().min(1),
});

export const mentorCancellationSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().trim().max(300).optional().default(""),
});
