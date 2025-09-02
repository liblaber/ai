/**
 * Handles double URL encoding by repeatedly decoding until we get a stable result.
 * This prevents issues with environment variables that may be encoded multiple times.
 *
 * @param url - The potentially encoded URL string
 * @returns The fully decoded URL string
 */
export function decodeUrlCompletely(url: string): string {
  let decoded = url;

  // Handle double URL encoding - decode until we get a valid URL format
  while (decoded.includes('%')) {
    const nextDecoded = decodeURIComponent(decoded);
    if (nextDecoded === decoded) break; // No more decoding needed
    decoded = nextDecoded;
  }

  return decoded;
}
