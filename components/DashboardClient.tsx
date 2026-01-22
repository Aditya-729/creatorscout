"use client";

import { useState } from "react";
import type { DiscoverResponse, SubscriberRange } from "../types";

const categories = [
  "Education",
  "Business",
  "Technology",
  "Fitness",
  "Entertainment",
  "Lifestyle",
  "Music",
  "Gaming",
  "Beauty",
  "Food",
  "Travel",
  "Science",
  "DIY",
  "News"
];

const subscriberRanges: { label: string; range: SubscriberRange }[] = [
  { label: "Any", range: { min: null, max: null } },
  { label: "0 - 1k", range: { min: 0, max: 1000 } },
  { label: "1k - 10k", range: { min: 1000, max: 10000 } },
  { label: "10k - 100k", range: { min: 10000, max: 100000 } },
  { label: "100k - 1M", range: { min: 100000, max: 1000000 } },
  { label: "1M+", range: { min: 1000000, max: null } }
];

export default function DashboardClient() {
  const [category, setCategory] = useState(categories[0]);
  const [subcategory, setSubcategory] = useState("");
  const [query, setQuery] = useState("creator tips");
  const [rangeLabel, setRangeLabel] = useState(subscriberRanges[0].label);
  const [minVideoCount, setMinVideoCount] = useState(5);
  const [maxResults, setMaxResults] = useState(20);
  const [maxPages, setMaxPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DiscoverResponse | null>(null);

  const selectedRange =
    subscriberRanges.find((item) => item.label === rangeLabel)?.range ||
    subscriberRanges[0].range;

  async function handleDiscover() {
    setError(null);
    setStats(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          category,
          subscriberRange: selectedRange,
          minVideoCount,
          maxResults,
          maxPages,
          subcategory: subcategory || undefined
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Request failed");
      }
      const data: DiscoverResponse = await res.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  const results = stats?.results ?? [];

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("en-US").format(value);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">CreatorScout</h1>
          <p className="text-slate-400">
            Discover YouTube creators instantly from the public API.
          </p>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Subcategory</span>
            <input
              value={subcategory}
              onChange={(event) => setSubcategory(event.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
              placeholder="Optional (e.g. podcasts, AI tools)"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Subscriber range</span>
            <select
              value={rangeLabel}
              onChange={(event) => setRangeLabel(event.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
            >
              {subscriberRanges.map((item) => (
                <option key={item.label} value={item.label}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">
              Minimum video count
            </span>
            <input
              type="number"
              min={0}
              value={minVideoCount}
              onChange={(event) => setMinVideoCount(Number(event.target.value))}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Search topic</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
              placeholder="e.g. creator tips, budgeting, fitness"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Max results</span>
            <input
              type="number"
              min={1}
              max={50}
              value={maxResults}
              onChange={(event) => setMaxResults(Number(event.target.value))}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Pages per run</span>
            <input
              type="number"
              min={1}
              max={5}
              value={maxPages}
              onChange={(event) => setMaxPages(Number(event.target.value))}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            onClick={handleDiscover}
            disabled={isLoading}
            className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {isLoading ? "Discovering..." : "Discover Creators"}
          </button>
        </div>

        {isLoading && (
          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
            Processing: searching videos → fetching channels → AI analysis →
            saving to sheet.
            <div className="mt-2 text-xs text-slate-400">
              Pages configured: {maxPages}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        {stats && (
          <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            Found {stats.added} creators · Pages {stats.pagesProcessed}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
            <div className="max-h-[520px] overflow-auto">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="sticky top-0 bg-slate-950">
                  <tr className="text-left text-slate-300">
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Subscribers</th>
                    <th className="px-4 py-3">Videos</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {results.map((item) => (
                    <tr key={item.channelId} className="text-slate-200">
                      <td className="px-4 py-3 font-medium">
                        {item.channelTitle || "Untitled"}
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(item.subscriberCount)}
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(item.videoCount)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {item.description || "No description"}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={item.channelUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-300 underline"
                        >
                          Open
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
