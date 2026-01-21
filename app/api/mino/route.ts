import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { analyzeChannel } from "../../../lib/mino";
import { rateLimit } from "../../../lib/utils/rateLimit";
import { logger } from "../../../lib/utils/logger";

export const runtime = "nodejs";

const requestSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(5000)
});

export async function POST(request: Request) {
  const ip =
    headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limiter = rateLimit(`mino:${ip}`, 20, 60 * 1000);
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await analyzeChannel(
    parsed.data.title,
    parsed.data.description
  );
  if (!result) {
    logger.warn({
      message: "Mino AI returned invalid or low-confidence output",
      data: { title: parsed.data.title }
    });
  }

  return NextResponse.json({ result });
}
