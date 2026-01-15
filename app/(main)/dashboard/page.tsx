"use client";

import { api } from "@/utils/trpc/react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: topics } = api.topic.list.useQuery();
  const { data: stats } = api.fetcher.stats.useQuery();
  const { data: latestDigest } = api.digest.latest.useQuery();
  const { data: recentArticles, isLoading } = api.article.recent.useQuery({
    hours: 24,
  });

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Tech News Dashboard</h1>

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
            <p className="text-2xl font-bold">{latestDigest ? "✓" : "—"}</p>
            <p className="text-sm text-muted-foreground">Latest Digest</p>
          </div>
        </div>

        {/* Latest Digest */}
        {latestDigest && (
          <div className="border border-border rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold mb-2">
              {latestDigest.title || "Daily Digest"}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {new Date(latestDigest.date).toLocaleDateString()}
            </p>
            <p className="text-sm whitespace-pre-wrap line-clamp-6">
              {latestDigest.content}
            </p>
          </div>
        )}

        {/* Topics */}
        <div className="border border-border rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Topics</h2>
          <div className="flex flex-wrap gap-2">
            {stats?.byTopic.map((t) => (
              <Link
                key={t.slug}
                href={`/topic/${t.slug}`}
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm hover:bg-secondary/80"
              >
                {t.topic} ({t.count})
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Articles */}
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Articles</h2>
          {isLoading ? (
            <p className="text-muted-foreground">Loading articles...</p>
          ) : recentArticles?.length === 0 ? (
            <p className="text-muted-foreground">
              No articles yet. Run the fetcher to get started.
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
