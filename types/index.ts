export type SubscriberRange = {
  min: number | null;
  max: number | null;
};

export type DiscoverRequest = {
  query: string;
  category: string;
  subcategory?: string;
  subscriberRange: SubscriberRange;
  minVideoCount: number;
  maxResults: number;
  maxPages: number;
  sheetId?: string;
};

export type MinoResult = {
  category: string | null;
  subcategory: string | null;
  one_liner: string | null;
  confidence: number;
};

export type ChannelResult = {
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  description: string;
  subscriberCount: number;
  videoCount: number;
  instagram: string | null;
  tiktok: string | null;
  website: string | null;
  newsletter: string | null;
  ai: MinoResult | null;
  lastUpdated: string;
};

export type DiscoverResponse = {
  sheetId: string;
  sheetUrl: string;
  added: number;
  updated: number;
  skipped: number;
  pagesProcessed: number;
  results: ChannelResult[];
  warnings: string[];
};
