import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/google/authOptions";
import { discoverRequestSchema } from "../../../../lib/validators/discover";
import { rateLimit } from "../../../../lib/utils/rateLimit";
import { logger } from "../../../../lib/utils/logger";
import { getOAuthClient } from "../../../../lib/google/oauth";
import { runDiscovery } from "../../../../lib/services/discovery";

export const runtime = "nodejs";

function parseBoolean(value: string | null) {
  if (!value) return false;
  return ["1", "true", "yes"].includes(value.toLowerCase());
}

function parseIntSafe(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildInputFromSearchParams(searchParams: URLSearchParams) {
  return {
    query: searchParams.get("query") || "",
    category: searchParams.get("category") || "",
    subcategory: searchParams.get("subcategory") || undefined,
    subscriberRange: {
      min: parseIntSafe(searchParams.get("subscriberMin")),
      max: parseIntSafe(searchParams.get("subscriberMax"))
    },
    minVideoCount: parseIntSafe(searchParams.get("minVideoCount")) ?? 0,
    maxResults: parseIntSafe(searchParams.get("maxResults")) ?? 20,
    maxPages: parseIntSafe(searchParams.get("maxPages")) ?? 1,
    sheetId: searchParams.get("sheetId") || undefined,
    schedule: parseBoolean(searchParams.get("schedule"))
  };
}

export async function GET(request: Request) {
  const ip =
    headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limiter = rateLimit(`cron:${ip}`, 4, 60 * 1000);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const url = new URL(request.url);
  const inputCandidate = buildInputFromSearchParams(url.searchParams);
  const parsed = discoverRequestSchema.safeParse(inputCandidate);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const session = await getServerSession(authOptions);
  const authHeader = headers().get("authorization") || "";
  const cronSecret = process.env.NEXTAUTH_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken =
    session?.accessToken || headers().get("x-google-access-token") || "";
  const refreshToken =
    session?.refreshToken || headers().get("x-google-refresh-token") || undefined;

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = getOAuthClient({
    accessToken,
    refreshToken
  });

  logger.info({
    message: "Scheduled discovery started",
    data: {
      query: parsed.data.query,
      category: parsed.data.category,
      maxPages: parsed.data.maxPages
    }
  });

  const startedAt = Date.now();
  try {
    const response = await runDiscovery(parsed.data, auth);
    logger.info({
      message: "Scheduled discovery completed",
      data: {
        durationMs: Date.now() - startedAt,
        added: response.added,
        updated: response.updated,
        skipped: response.skipped
      }
    });
    return NextResponse.json(response);
  } catch (error) {
    logger.error({
      message: "Scheduled discovery failed",
      data: { error: error instanceof Error ? error.message : "unknown" }
    });
    return NextResponse.json(
      { error: "Scheduled discovery failed" },
      { status: 500 }
    );
  }
}
