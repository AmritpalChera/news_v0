import { createHash } from "crypto";

/**
 * Generate SHA-256 hash of a URL for deduplication
 */
export function hashUrl(url: string): string {
  // Normalize URL before hashing
  const normalized = normalizeUrl(url);
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Normalize URL for consistent hashing
 * - Lowercase
 * - Remove trailing slashes
 * - Remove common tracking parameters
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Remove common tracking parameters
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "source",
      "fbclid",
      "gclid",
    ];

    trackingParams.forEach((param) => {
      parsed.searchParams.delete(param);
    });

    // Rebuild URL without fragment
    let normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;

    // Add remaining search params if any
    const remainingParams = parsed.searchParams.toString();
    if (remainingParams) {
      normalized += `?${remainingParams}`;
    }

    // Lowercase and remove trailing slash
    return normalized.toLowerCase().replace(/\/$/, "");
  } catch {
    // If URL parsing fails, just lowercase and trim
    return url.toLowerCase().trim();
  }
}
