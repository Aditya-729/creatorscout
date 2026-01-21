const urlRegex =
  /(https?:\/\/(?:www\.)?[^\s)]+)|((?:www\.)[^\s)]+)/gi;

const instagramRegex = /https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._-]+\/?/i;
const tiktokRegex = /https?:\/\/(www\.)?tiktok\.com\/[@a-zA-Z0-9._-]+\/?/i;

const newsletterHosts = [
  "substack.com",
  "beehiiv.com",
  "convertkit.com",
  "mailchi.mp",
  "campaign-archive.com",
  "tinyletter.com"
];

export type LinkBuckets = {
  instagram: string | null;
  tiktok: string | null;
  newsletter: string | null;
  website: string | null;
  remaining: string[];
};

export function extractLinks(text: string) {
  const matches = text.match(urlRegex) || [];
  const normalized = matches.map((link) => {
    if (link.startsWith("http")) return link;
    return `https://${link}`;
  });
  return Array.from(new Set(normalized));
}

export function preClassifyLinks(links: string[]): LinkBuckets {
  let instagram: string | null = null;
  let tiktok: string | null = null;
  let newsletter: string | null = null;
  let website: string | null = null;
  const remaining: string[] = [];

  for (const link of links) {
    if (!instagram && instagramRegex.test(link)) {
      instagram = link;
      continue;
    }
    if (!tiktok && tiktokRegex.test(link)) {
      tiktok = link;
      continue;
    }

    try {
      const url = new URL(link);
      if (
        !newsletter &&
        newsletterHosts.some((host) => url.hostname.includes(host))
      ) {
        newsletter = link;
        continue;
      }
      if (!website) {
        website = link;
        continue;
      }
      remaining.push(link);
    } catch {
      remaining.push(link);
    }
  }

  return { instagram, tiktok, newsletter, website, remaining };
}
