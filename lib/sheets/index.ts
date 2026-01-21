import { google } from "googleapis";

export const SHEET_HEADERS = [
  "Channel Name",
  "YouTube Channel URL",
  "One-line Description",
  "Subscriber Count",
  "Video Count",
  "Instagram",
  "TikTok",
  "Blog / Website",
  "Newsletter",
  "Category",
  "Subcategory",
  "Confidence",
  "Last Updated"
];

export type SheetInfo = {
  sheetId: string;
  sheetUrl: string;
};

export async function createSheet(auth: any): Promise<SheetInfo> {
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: `CreatorScout ${new Date().toISOString()}`
      }
    }
  });

  const sheetId = spreadsheet.data.spreadsheetId || "";
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "Sheet1!A1:M1",
    valueInputOption: "RAW",
    requestBody: { values: [SHEET_HEADERS] }
  });

  return {
    sheetId,
    sheetUrl: spreadsheet.data.spreadsheetUrl || ""
  };
}

export async function getExistingRows(auth: any, sheetId: string) {
  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Sheet1!A:M"
  });
  const rows = response.data.values || [];
  const map = new Map<string, { rowIndex: number; row: string[] }>();
  rows.slice(1).forEach((row, index) => {
    const channelUrl = row[1];
    if (channelUrl) {
      map.set(channelUrl, { rowIndex: index + 2, row });
    }
  });
  return { rows, map };
}

export async function getAllRows(auth: any, sheetId: string) {
  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Sheet1!A:M"
  });
  return response.data.values || [];
}

export async function appendRows(
  auth: any,
  sheetId: string,
  values: string[][]
) {
  if (values.length === 0) return;
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Sheet1!A:M",
    valueInputOption: "USER_ENTERED",
    requestBody: { values }
  });
}

export async function updateSubscriberCounts(
  auth: any,
  sheetId: string,
  updates: { rowIndex: number; subscriberCount: number; lastUpdated: string }[]
) {
  if (updates.length === 0) return;
  const sheets = google.sheets({ version: "v4", auth });
  const data = updates.flatMap((update) => [
    {
      range: `Sheet1!D${update.rowIndex}`,
      values: [[String(update.subscriberCount)]]
    },
    {
      range: `Sheet1!M${update.rowIndex}`,
      values: [[update.lastUpdated]]
    }
  ]);

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data
    }
  });
}
