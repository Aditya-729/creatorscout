import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/google/authOptions";
import { getOAuthClient } from "../../../../lib/google/oauth";
import { rateLimit } from "../../../../lib/utils/rateLimit";
import { logger } from "../../../../lib/utils/logger";
import { getAllRows, SHEET_HEADERS } from "../../../../lib/sheets";

export const runtime = "nodejs";

function escapeCsv(value: string) {
  const needsQuotes = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export async function GET(request: Request) {
  const ip =
    headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limiter = rateLimit(`csv:${ip}`, 20, 60 * 1000);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sheetId = url.searchParams.get("sheetId");
  if (!sheetId) {
    return NextResponse.json({ error: "Missing sheetId" }, { status: 400 });
  }

  const auth = getOAuthClient({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken
  });

  try {
    const rows = await getAllRows(auth, sheetId);
    const csvRows = rows.length > 0 ? rows : [SHEET_HEADERS];
    const csv = csvRows
      .map((row) => row.map((cell) => escapeCsv(String(cell || ""))).join(","))
      .join("\n");

    logger.info({
      message: "CSV export generated",
      data: { sheetId, rows: csvRows.length }
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="creatorscout.csv"'
      }
    });
  } catch (error) {
    logger.error({
      message: "CSV export failed",
      data: { error: error instanceof Error ? error.message : "unknown" }
    });
    return NextResponse.json(
      { error: "Failed to export CSV" },
      { status: 500 }
    );
  }
}
