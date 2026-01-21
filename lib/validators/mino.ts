import { z } from "zod";

const wordCount = (value: string) => value.trim().split(/\s+/).length;

export const minoResponseSchema = z.object({
  category: z.string().min(2).max(80).nullable(),
  subcategory: z.string().min(2).max(80).nullable(),
  one_liner: z
    .string()
    .max(160)
    .refine((value) => wordCount(value) <= 20, "One-liner is too long")
    .nullable(),
  confidence: z.number().min(0).max(1)
});

export const linkClassificationSchema = z.object({
  blog: z.string().url().nullable(),
  newsletter: z.string().url().nullable()
});
