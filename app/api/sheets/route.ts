import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { authOptions } from "../../../lib/google/authOptions";
import { getOAuthClient } from "../../../lib/google/oauth";
import { createSheet } from "../../../lib/sheets";
import { rateLimit } from "../../../lib/utils/rateLimit";
import { logger } from "../../../lib/utils/logger";

export const runtime = "nodejs";

export async function POST() {
  const ip =
    headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limiter = rateLimit(`sheets:${ip}`, 10, 60 * 1000);
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = getOAuthClient({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken
  });

  const sheet = await createSheet(auth);
  logger.info({
    message: "Sheet created",
    data: { sheetId: sheet.sheetId }
  });
  return NextResponse.json(sheet);
}
