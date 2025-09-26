import { prisma } from '@/lib/prisma';

/**
 * Generates a URL-safe slug from a given string
 * @param input - The string to convert to a slug
 * @returns A URL-safe slug
 */
export function generateSlug(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      // Replace spaces and special characters with hyphens
      .replace(/[\s\W-]+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
      // Ensure it's not empty
      .substring(0, 50) || 'untitled-app'
  );
}

/**
 * Client-side function to generate a unique slug via API
 * @param baseSlug - The base slug to make unique
 * @param chatId - The chat ID for fallback generation
 * @param siteName - Optional site name for fallback generation
 * @param existingSlug - Optional existing slug to exclude from uniqueness check
 * @returns A unique slug
 */
export async function generateUniqueSlugClient(
  baseSlug: string,
  chatId?: string,
  siteName?: string,
  existingSlug?: string,
): Promise<string> {
  try {
    const response = await fetch('/api/slugs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        baseSlug,
        chatId,
        siteName,
        existingSlug,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate unique slug');
    }

    const data = await response.json<{ slug: string }>();

    return data.slug;
  } catch (error) {
    console.error('Error generating unique slug:', error);
    // Fallback to basic slug generation
    return generateSlug(baseSlug || chatId || 'untitled-app');
  }
}

/**
 * Server-side function to generate a unique slug (requires Prisma)
 * @param baseSlug - The base slug to make unique
 * @param existingSlug - Optional existing slug to exclude from uniqueness check
 * @returns A unique slug
 */
export async function generateUniqueSlug(baseSlug: string, existingSlug?: string): Promise<string> {
  // Import Prisma only on server-side

  let slug = generateSlug(baseSlug);
  let counter = 1;
  const originalSlug = slug;

  while (true) {
    const existing = await prisma.website.findFirst({
      where: {
        slug,
        ...(existingSlug && { slug: { not: existingSlug } }),
      },
    });

    if (!existing) {
      return slug;
    }

    slug = `${originalSlug}-${counter}`;
    counter++;
  }
}

/**
 * Validates if a slug is valid (URL-safe, not empty, etc.)
 * @param slug - The slug to validate
 * @returns True if valid, false otherwise
 */
export function isValidSlug(slug: string): boolean {
  // Check if slug is empty or too long
  if (!slug || slug.length > 50) {
    return false;
  }

  // Check if slug contains only valid characters (lowercase letters, numbers, hyphens)
  const validSlugRegex = /^[a-z0-9-]+$/;

  if (!validSlugRegex.test(slug)) {
    return false;
  }

  // Check if slug doesn't start or end with hyphen
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return false;
  }

  // Check if slug is not a reserved word
  const reservedWords = ['admin', 'api', 'app', 'apps', 'www', 'mail', 'ftp', 'blog', 'help', 'support'];

  if (reservedWords.includes(slug)) {
    return false;
  }

  return true;
}

/**
 * Generates a default slug from chatId and siteName
 * @param chatId - The chat ID
 * @param siteName - Optional site name
 * @returns A generated slug
 */
export function generateDefaultSlug(chatId: string, siteName?: string): string {
  if (siteName) {
    return generateSlug(siteName);
  }

  // Fallback to using first 8 characters of chatId
  return generateSlug(`app-${chatId.substring(0, 8)}`);
}
