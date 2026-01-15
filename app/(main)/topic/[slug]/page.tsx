"use client";

import { use, useEffect, useState } from "react";
import { api } from "@/utils/trpc/react";
import Link from "next/link";

export default function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [isGenerating, setIsGenerating] = useState(false);

  const utils = api.useUtils();

  const { data: topic, isLoading } = api.topic.getWithArticles.useQuery({
    slug,
    limit: 50,
  });

  const {
    data: digest,
    isLoading: isLoadingDigest,
  } = api.digest.latest.useQuery(
    { topicId: topic?.id },
    { enabled: !!topic?.id }
  );

  const digestMutation = api.digest.generate.useMutation();

  // Auto-generate digest if none exists and topic has articles
  useEffect(() => {
    if (isLoadingDigest || isGenerating) return;
    if (!topic?.id || !topic.articles?.length) return;
    if (digest) return;

    const generateDigest = async () => {
      setIsGenerating(true);
      try {
        await digestMutation.mutateAsync({ topicId: topic.id });
        await utils.digest.latest.invalidate();
      } catch (error) {
        console.error("Failed to generate topic digest:", error);
      } finally {
        setIsGenerating(false);
      }
    };

    generateDigest();
  }, [topic?.id, topic?.articles?.length, digest, isLoadingDigest, isGenerating]);

  if (isLoading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  if (!topic) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Topic not found</h1>
          <Link href="/dashboard" className="text-primary hover:underline">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

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
          <h1 className="text-3xl font-bold">{topic.name}</h1>
          {topic.description && (
            <p className="text-muted-foreground mt-1">{topic.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            {topic.articles?.length || 0} articles
          </p>
        </div>

        {/* Topic Digest */}
        {isGenerating ? (
          <div className="border border-border rounded-lg p-6 mb-8 bg-secondary/30">
            <p className="text-muted-foreground text-sm">
              Generating {topic.name} digest...
            </p>
          </div>
        ) : digest ? (
          <div className="border border-border rounded-lg p-6 mb-8 bg-secondary/30">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold">
                {digest.title || `${topic.name} Digest`}
              </h2>
              <span className="text-xs text-muted-foreground">
                {new Date(digest.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{digest.content}</p>
          </div>
        ) : topic.articles && topic.articles.length > 0 ? (
          <div className="border border-border border-dashed rounded-lg p-6 mb-8">
            <p className="text-muted-foreground text-sm text-center">
              No digest yet for this topic.
            </p>
          </div>
        ) : null}

        {/* Articles */}
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Articles</h2>
          {topic.articles && topic.articles.length > 0 ? (
            <div className="space-y-4">
              {topic.articles.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-4 border-b border-border pb-4 last:border-0 last:pb-0 hover:bg-secondary/30 -mx-2 px-2 py-2 rounded transition-colors"
                >
                  {article.imageUrl && (
                    <div className="w-28 h-20 flex-shrink-0 rounded overflow-hidden bg-secondary">
                      <img
                        src={article.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.parentElement!.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-base hover:underline line-clamp-2">
                      {article.title}
                    </h3>
                    {article.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {article.description}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                      {article.publisherName && (
                        <span className="bg-secondary px-2 py-0.5 rounded">
                          {article.publisherName}
                        </span>
                      )}
                      <span>
                        {new Date(article.publishedAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No articles yet for this topic.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
