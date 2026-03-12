/**
 * Sanitize message content to prevent XSS and injection attacks.
 * Strips HTML tags, trims whitespace, limits length.
 */
export function sanitizeContent(input: string): string {
  if (!input || typeof input !== "string") return "";

  return (
    input
      // Remove HTML tags
      .replace(/<[^>]*>/g, "")
      // Remove null bytes
      .replace(/\0/g, "")
      // Trim
      .trim()
      // Max 4000 chars
      .slice(0, 4000)
  );
}

/**
 * Sanitize display name
 */
export function sanitizeDisplayName(name: string): string {
  if (!name || typeof name !== "string") return "";

  return (
    name
      .replace(/<[^>]*>/g, "")
      .replace(/\0/g, "")
      .trim()
      // Max 50 chars for display names
      .slice(0, 50)
  );
}
