"use client";

import { useEffect, useState } from "react";
import { api } from "@/utils/trpc/react";
import Link from "next/link";

export default function DashboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: topics } = api.topic.list.useQuery();
  const { data: stats } = api.fetcher.stats.useQuery();
  const { data: latestDigest, isLoading: isLoadingDigest } =
    api.digest.latest.useQuery();
  const { data: recentArticles, isLoading: isLoadingArticles } =
    api.article.recent.useQuery({ hours: 24 });

  const fetchMutation = api.fetcher.fetch.useMutation();
  const digestMutation = api.digest.generate.useMutation();

  // Check if digest is stale (> 24 hours old or doesn't exist)
  const isDigestStale = () => {
    if (!latestDigest) return true;
    const digestDate = new Date(latestDigest.date);
    const hoursSinceDigest =
      (Date.now() - digestDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceDigest > 24;
  };

  // Auto-fetch if no recent digest
  useEffect(() => {
    if (isLoadingDigest) return;

    if (isDigestStale() && !isRefreshing) {
      handleRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingDigest, latestDigest]);

  // Refresh: fetch articles + generate digest
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshStatus("Fetching articles...");

    try {
      // Step 1: Fetch new articles
      const fetchResult = await fetchMutation.mutateAsync({
        max: 50,
        useAI: true,
      });
      const statusMsg =
        fetchResult.inserted > 0
          ? `${fetchResult.inserted} new articles (${fetchResult.duplicates} duplicates skipped). Generating digest...`
          : `No new articles (${fetchResult.fetched} fetched, all duplicates). Regenerating digest...`;
      setRefreshStatus(statusMsg);

      // Step 2: Generate digest (force regenerate to get fresh content)
      await digestMutation.mutateAsync({ forceRegenerate: true });
      setRefreshStatus("Done!");

      // Invalidate queries to refresh UI
      await utils.invalidate();

      // Clear status after a moment
      setTimeout(() => setRefreshStatus(null), 3000);
    } catch (error) {
      setRefreshStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Tech News Dashboard</h1>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Refresh Status */}
        {refreshStatus && (
          <div className="mb-6 p-4 bg-secondary rounded-lg">
            <p className="text-sm">{refreshStatus}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="border border-border rounded-lg p-4">
            <p className="text-2xl font-bold">{stats?.totalArticles || 0}</p>
            <p className="text-sm text-muted-foreground">Total Articles</p>
          </div>
          <div className="border border-border rounded-lg p-4">
            <p className="text-2xl font-bold">{topics?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Topics</p>
          </div>
          <div className="border border-border rounded-lg p-4">
            <p className="text-2xl font-bold">{recentArticles?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Last 24h</p>
          </div>
          <div className="border border-border rounded-lg p-4">
            <p className="text-2xl font-bold">
              {isLoadingDigest ? "..." : latestDigest ? "✓" : "—"}
            </p>
            <p className="text-sm text-muted-foreground">Latest Digest</p>
          </div>
        </div>

        {/* Latest Digest */}
        {isLoadingDigest ? (
          <div className="border border-border rounded-lg p-6 mb-8">
            <p className="text-muted-foreground">Loading digest...</p>
          </div>
        ) : latestDigest ? (
          <div className="border border-border rounded-lg p-6 mb-8">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold">
                {latestDigest.title || "Daily Digest"}
              </h2>
              <span className="text-xs text-muted-foreground">
                {new Date(latestDigest.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{latestDigest.content}</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg p-6 mb-8 border-dashed">
            <p className="text-muted-foreground text-center">
              {isRefreshing
                ? "Generating your first digest..."
                : "No digest yet. Click Refresh to generate one."}
            </p>
          </div>
        )}

        {/* Topics */}
        <div className="border border-border rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Topics</h2>
          {stats?.byTopic && stats.byTopic.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stats.byTopic.map((t) => (
                <Link
                  key={t.slug}
                  href={`/topic/${t.slug}`}
                  className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm hover:bg-secondary/80"
                >
                  {t.topic} ({t.count})
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No topics yet. Refresh to fetch articles.
            </p>
          )}
        </div>

        {/* Recent Articles */}
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Articles</h2>
          {isLoadingArticles ? (
            <p className="text-muted-foreground">Loading articles...</p>
          ) : recentArticles?.length === 0 ? (
            <p className="text-muted-foreground">
              No articles yet. Click Refresh to fetch the latest tech news.
            </p>
          ) : (
            <ul className="space-y-3">
              {recentArticles?.slice(0, 10).map((article) => (
                <li key={article.id} className="border-b border-border pb-3">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline font-medium"
                  >
                    {article.title}
                  </a>
                  <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{article.publisherName}</span>
                    {article.topic && (
                      <>
                        <span>•</span>
                        <span>{article.topic.name}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>
                      {new Date(article.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
