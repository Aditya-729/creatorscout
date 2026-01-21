import { z } from "zod";

export const subscriberRangeSchema = z.object({
  min: z.number().int().nonnegative().nullable(),
  max: z.number().int().nonnegative().nullable()
});

export const discoverRequestSchema = z.object({
  query: z.string().min(2).max(120),
  category: z.string().min(2).max(60),
  subcategory: z.string().min(2).max(60).optional(),
  subscriberRange: subscriberRangeSchema,
  minVideoCount: z.number().int().nonnegative().max(1000000),
  maxResults: z.number().int().min(1).max(50),
  maxPages: z.number().int().min(1).max(5),
  sheetId: z.string().optional()
});
