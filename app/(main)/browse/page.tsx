"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/utils/trpc/react";
import Link from "next/link";

// Group articles by date
function groupArticlesByDate(
  articles: Array<{
    id: string;
    title: string;
    description: string | null;
    url: string;
    imageUrl: string | null;
    publisherName: string | null;
    publishedAt: Date;
    topic: { name: string; slug: string } | null;
  }>
) {
  const groups: Record<string, typeof articles> = {};

  for (const article of articles) {
    const dateKey = new Date(article.publishedAt).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(article);
  }

  return groups;
}

// Infinite scroll hook
function useInfiniteScroll(callback: () => void, hasMore: boolean) {
  const [isFetching, setIsFetching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isFetching) {
          setIsFetching(true);
          callback();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "200px",
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [callback, hasMore, isFetching]);

  const resetFetching = () => setIsFetching(false);

  return { ref, isFetching, resetFetching };
}

export default function BrowsePage() {
  const [allArticles, setAllArticles] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);

  const { data, isLoading, isFetching } = api.article.browse.useQuery(
    { limit: 20, cursor },
    { placeholderData: (prev) => prev }
  );

  // Update articles when data changes
  useEffect(() => {
    if (data?.items) {
      if (cursor) {
        // Append new articles
        setAllArticles((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const newArticles = data.items.filter((a) => !existingIds.has(a.id));
          return [...prev, ...newArticles];
        });
      } else {
        // Initial load
        setAllArticles(data.items);
      }
      setHasMore(!!data.nextCursor);
    }
  }, [data, cursor]);

  const loadMore = useCallback(() => {
    if (data?.nextCursor && !isFetching) {
      setCursor(data.nextCursor);
    }
  }, [data?.nextCursor, isFetching]);

  const { ref: loadMoreRef, resetFetching } = useInfiniteScroll(
    loadMore,
    hasMore && !isFetching
  );

  useEffect(() => {
    if (!isFetching) {
      resetFetching();
    }
  }, [isFetching, resetFetching]);

  const groupedArticles = groupArticlesByDate(allArticles);
  const dateKeys = Object.keys(groupedArticles);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
          >
            &larr; Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold">Browse All Articles</h1>
          <p className="text-muted-foreground mt-1">
            {data?.totalCount || 0} total articles
          </p>
        </div>

        {/* Loading state for initial load */}
        {isLoading && allArticles.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading articles...</p>
            </div>
          </div>
        )}

        {/* Articles grouped by date */}
        {dateKeys.map((dateKey) => (
          <div key={dateKey} className="mb-8">
            {/* Date Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-3 mb-4 border-b border-border z-10">
              <h2 className="text-lg font-semibold text-foreground">
                {dateKey}
              </h2>
            </div>

            {/* Articles for this date */}
            <div className="space-y-4">
              {groupedArticles[dateKey].map((article) => (
                <article
                  key={article.id}
                  className="border border-border rounded-lg overflow-hidden hover:bg-secondary/30 transition-colors"
                >
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-4"
                  >
                    {/* Article Image */}
                    {article.imageUrl && (
                      <div className="w-32 h-24 flex-shrink-0 bg-secondary">
                        <img
                          src={article.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    {/* Article Content */}
                    <div className="flex-1 py-3 pr-4">
                      <h3 className="font-medium text-base hover:underline line-clamp-2">
                        {article.title}
                      </h3>
                      {article.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {article.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                        {article.publisherName && (
                          <span className="bg-secondary px-2 py-0.5 rounded">
                            {article.publisherName}
                          </span>
                        )}
                        {article.topic && (
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {article.topic.name}
                          </span>
                        )}
                        <span>
                          {new Date(article.publishedAt).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    </div>
                  </a>
                </article>
              ))}
            </div>
          </div>
        ))}

        {/* Infinite scroll trigger */}
        <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
          {isFetching && hasMore && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Loading more articles...</span>
            </div>
          )}
        </div>

        {/* End of results */}
        {!hasMore && allArticles.length > 0 && (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-full">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <span className="text-sm text-muted-foreground">
                You've reached the end
              </span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && allArticles.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No articles found.</p>
            <Link
              href="/dashboard"
              className="text-primary hover:underline mt-2 inline-block"
            >
              Go to dashboard to fetch articles
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
