import { cacheGet, cacheSet } from "../utils/cache";

export type YouTubeChannel = {
  channelId: string;
  title: string;
  description: string;
  subscriberCount: number;
  videoCount: number;
};

type SearchItem = {
  snippet?: {
    channelId?: string;
  };
};

type ChannelItem = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
  };
  statistics?: {
    subscriberCount?: string;
    videoCount?: string;
  };
};

const YOUTUBE_BASE = "https://www.googleapis.com/youtube/v3";

function assertApiKey() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error("Missing YOUTUBE_API_KEY");
  }
  return key;
}

async function youtubeFetch<T>(path: string, params: Record<string, string>) {
  const key = assertApiKey();
  const url = new URL(`${YOUTUBE_BASE}/${path}`);
  url.search = new URLSearchParams({ ...params, key }).toString();
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube API error: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

export async function searchVideoChannelIdsPage(
  query: string,
  maxResults: number,
  pageToken?: string
) {
  const data = await youtubeFetch<{
    items?: SearchItem[];
    nextPageToken?: string;
  }>("search", {
    part: "snippet",
    type: "video",
    q: query,
    order: "date",
    maxResults: String(maxResults),
    ...(pageToken ? { pageToken } : {})
  });

  const ids = (data.items || [])
    .map((item) => item.snippet?.channelId)
    .filter((id): id is string => Boolean(id));

  return {
    channelIds: Array.from(new Set(ids)),
    nextPageToken: data.nextPageToken
  };
}

export async function fetchChannels(channelIds: string[]) {
  if (channelIds.length === 0) return [];

  const cacheKey = `channels:${channelIds.sort().join(",")}`;
  const cached = cacheGet<YouTubeChannel[]>(cacheKey);
  if (cached) return cached;

  const data = await youtubeFetch<{ items?: ChannelItem[] }>("channels", {
    part: "snippet,statistics",
    id: channelIds.join(","),
    maxResults: "50"
  });

  const channels =
    data.items?.map((item) => ({
      channelId: item.id || "",
      title: item.snippet?.title || "",
      description: item.snippet?.description || "",
      subscriberCount: Number(item.statistics?.subscriberCount || 0),
      videoCount: Number(item.statistics?.videoCount || 0)
    })) ?? [];

  cacheSet(cacheKey, channels, 5 * 60 * 1000);
  return channels;
}
