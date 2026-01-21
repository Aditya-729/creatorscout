import type { OAuth2Client } from "google-auth-library";
import type { DiscoverRequest, DiscoverResponse, ChannelResult } from "../../types";
import { searchVideoChannelIdsPage, fetchChannels } from "../youtube";
import { analyzeChannel, classifyLinksWithAI } from "../mino";
import { extractLinks, preClassifyLinks } from "../utils/links";
import { nowIso } from "../utils/time";
import { logger } from "../utils/logger";
import {
  appendRows,
  createSheet,
  getExistingRows,
  updateSubscriberCounts
} from "../sheets";

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  handler: (item: T) => Promise<R>
) {
  const results: R[] = [];
  const queue = [...items];

  const workers = Array.from({ length: limit }).map(async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) return;
      results.push(await handler(item));
    }
  });

  await Promise.all(workers);
  return results;
}

export async function runDiscovery(
  input: DiscoverRequest,
  auth: OAuth2Client,
  sheetIdOverride?: string
): Promise<DiscoverResponse> {
  const warnings: string[] = [];
  let sheetId = sheetIdOverride || input.sheetId;
  let sheetUrl = "";

  if (!sheetId) {
    const created = await createSheet(auth);
    sheetId = created.sheetId;
    sheetUrl = created.sheetUrl;
  }

  const { map } = await getExistingRows(auth, sheetId);

  const queryParts = [input.category, input.subcategory, input.query]
    .filter(Boolean)
    .join(" ")
    .trim();

  const channelIdSet = new Set<string>();
  let nextPageToken: string | undefined = undefined;
  let pagesProcessed = 0;

  for (let page = 1; page <= input.maxPages; page += 1) {
    const result = await searchVideoChannelIdsPage(
      queryParts,
      input.maxResults,
      nextPageToken
    );
    pagesProcessed += 1;
    result.channelIds.forEach((id) => channelIdSet.add(id));
    logger.info({
      message: "YouTube search page processed",
      data: {
        page,
        channelIds: result.channelIds.length,
        nextPageToken: result.nextPageToken ? "present" : "none"
      }
    });
    if (!result.nextPageToken) break;
    nextPageToken = result.nextPageToken;
  }

  const channels = await fetchChannels(Array.from(channelIdSet));
  logger.info({
    message: "YouTube channels fetched",
    data: { count: channels.length }
  });

  const filtered = channels.filter((channel) => {
    const minOk =
      input.subscriberRange.min === null ||
      channel.subscriberCount >= input.subscriberRange.min;
    const maxOk =
      input.subscriberRange.max === null ||
      channel.subscriberCount <= input.subscriberRange.max;
    return channel.videoCount >= input.minVideoCount && minOk && maxOk;
  });

  const results = await mapWithConcurrency(filtered, 3, async (channel) => {
    const links = extractLinks(channel.description);
    const buckets = preClassifyLinks(links);
    const aiLink = await classifyLinksWithAI(buckets.remaining);

    const ai = await analyzeChannel(channel.title, channel.description);
    const channelUrl = `https://www.youtube.com/channel/${channel.channelId}`;
    return {
      channelId: channel.channelId,
      channelTitle: channel.title,
      channelUrl,
      description: channel.description,
      subscriberCount: channel.subscriberCount,
      videoCount: channel.videoCount,
      instagram: buckets.instagram,
      tiktok: buckets.tiktok,
      website: buckets.website || aiLink.blog,
      newsletter: buckets.newsletter || aiLink.newsletter,
      ai,
      lastUpdated: nowIso()
    } satisfies ChannelResult;
  });

  const toAppend: string[][] = [];
  const updates: {
    rowIndex: number;
    subscriberCount: number;
    lastUpdated: string;
  }[] = [];
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const result of results) {
    const existing = map.get(result.channelUrl);
    if (existing) {
      updates.push({
        rowIndex: existing.rowIndex,
        subscriberCount: result.subscriberCount,
        lastUpdated: result.lastUpdated
      });
      updated += 1;
      continue;
    }

    const ai = result.ai;

    toAppend.push([
      result.channelTitle,
      result.channelUrl,
      ai?.one_liner || "",
      String(result.subscriberCount),
      String(result.videoCount),
      result.instagram || "",
      result.tiktok || "",
      result.website || "",
      result.newsletter || "",
      ai?.category || "",
      ai?.subcategory || "",
      ai ? String(ai.confidence) : "",
      result.lastUpdated
    ]);
    added += 1;
  }

  await updateSubscriberCounts(auth, sheetId, updates);
  await appendRows(auth, sheetId, toAppend);

  if (!sheetUrl) {
    sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`;
  }

  logger.info({
    message: "Sheet updates complete",
    data: { added, updated, skipped }
  });

  return {
    sheetId,
    sheetUrl,
    added,
    updated,
    skipped,
    pagesProcessed,
    results,
    warnings
  };
}
