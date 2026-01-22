import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { discoverRequestSchema } from "../../../lib/validators/discover";
import { rateLimit } from "../../../lib/utils/rateLimit";
import { logger } from "../../../lib/utils/logger";
import { runDiscoveryLite } from "../../../lib/services/discovery";
import type { DiscoverResponse } from "../../../types";

const MAX_PER_MINUTE = 8;
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ip =
      headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limiter = rateLimit(`discover:${ip}`, MAX_PER_MINUTE, 60 * 1000);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = discoverRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;

    const response = await runDiscoveryLite(input);
    return NextResponse.json(response satisfies DiscoverResponse);
  } catch (error) {
    logger.error({
      message: "Discover creators failed",
      data: { error: error instanceof Error ? error.message : "unknown" }
    });
    return NextResponse.json(
      { error: "Failed to discover creators" },
      { status: 500 }
    );
  }
}
