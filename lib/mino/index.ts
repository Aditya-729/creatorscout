import { cacheGet, cacheSet } from "../utils/cache";
import { minoResponseSchema, linkClassificationSchema } from "../validators/mino";
import type { MinoResult } from "../../types";

const MINO_API_URL = "https://api.mino.ai/v1/chat/completions";

function assertMinoKey() {
  const key = process.env.MINO_API_KEY;
  if (!key) {
    throw new Error("Missing MINO_API_KEY");
  }
  return key;
}

function buildHeaders() {
  return {
    Authorization: `Bearer ${assertMinoKey()}`,
    "Content-Type": "application/json"
  };
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  throw new Error("Mino response did not include JSON");
}

async function minoChat(prompt: string) {
  const res = await fetch(MINO_API_URL, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      model: "mino-latest",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a precise classifier. Output JSON only, no markdown."
        },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mino API error: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    content?: string;
  };

  const content =
    data.choices?.[0]?.message?.content ||
    data.content ||
    JSON.stringify(data);
  return extractJson(content);
}

export async function analyzeChannel(
  title: string,
  description: string
): Promise<MinoResult | null> {
  const cacheKey = `mino:${title}:${description.slice(0, 200)}`;
  const cached = cacheGet<MinoResult | null>(cacheKey);
  if (cached) return cached;

  const prompt = [
    "Return JSON only. No markdown, no explanations, no emojis.",
    "Do not include personal claims.",
    "If unsure about any field, use null.",
    "One-line description must be max 20 words.",
    "If confidence is below 0.85, set category, subcategory, one_liner to null.",
    "JSON schema:",
    "{",
    '  "category": string | null,',
    '  "subcategory": string | null,',
    '  "one_liner": string | null,',
    '  "confidence": number',
    "}",
    "",
    `Channel title: ${title}`,
    `Channel description: ${description || "No description."}`
  ].join("\n");

  try {
    const jsonText = await minoChat(prompt);
    const parsed = minoResponseSchema.parse(JSON.parse(jsonText));
    const result: MinoResult =
      parsed.confidence < 0.85
        ? { ...parsed, category: null, subcategory: null, one_liner: null }
        : parsed;
    cacheSet(cacheKey, result, 12 * 60 * 60 * 1000);
    return result;
  } catch (error) {
    cacheSet(cacheKey, null, 10 * 60 * 1000);
    return null;
  }
}

export async function classifyLinksWithAI(links: string[]) {
  if (links.length === 0) {
    return { blog: null, newsletter: null };
  }

  const prompt = [
    "Return JSON only. No markdown, no explanations, no emojis.",
    "Do not include personal claims.",
    "Pick at most one blog/website link and one newsletter link.",
    "If unsure, use null.",
    "JSON schema:",
    "{",
    '  "blog": string | null,',
    '  "newsletter": string | null',
    "}",
    "Links:",
    links.join("\n")
  ].join("\n");

  try {
    const jsonText = await minoChat(prompt);
    const parsed = linkClassificationSchema.parse(JSON.parse(jsonText));
    return parsed;
  } catch {
    return { blog: null, newsletter: null };
  }
}
