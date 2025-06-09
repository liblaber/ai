import { json } from '@remix-run/cloudflare';
import { prisma } from '~/lib/prisma';
import * as jose from 'jose';
import { logger } from '~/utils/logger';
import { env } from '~/lib/config/env';

interface RequestBody {
  token: string;
  url: string;
}

export async function action({ request }: { request: Request }) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // Get token from request body
    const { token, url } = (await request.json()) as RequestBody;

    if (!token) {
      return json({ error: 'Token is required' }, { status: 400 });
    }

    // Verify JWT
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);

    const userEmail = payload.email as string;

    if (!userEmail) {
      return json({ error: 'Invalid token: missing email claim' }, { status: 401 });
    }

    // Find the website by URL and include the user who created it
    const website = await prisma.website.findFirst({
      where: { siteUrl: url },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!website) {
      return json({ error: 'Website not found' }, { status: 404 });
    }

    // If website is public, allow access without checking emails
    if (website.isPublic) {
      return json({ allowed: true, email: userEmail });
    }

    // Check if user is the website creator
    const isCreator = website.user.email === userEmail;

    // Check if user has access through allowed emails
    const hasAccess = website.allowedUserEmails.includes(userEmail);

    if (!isCreator && !hasAccess) {
      return json({ allowed: false, message: 'Forbidden' }, { status: 403 });
    }

    return json({ allowed: true, email: userEmail });
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      return json({ error: 'Token expired' }, { status: 401 });
    }

    if (error instanceof jose.errors.JWTInvalid) {
      return json({ error: 'Invalid token' }, { status: 401 });
    }

    throw error;
  }
}

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const siteUrl = url.searchParams.get('url');
  const decodedUrl = decodeURIComponent(siteUrl || '');

  if (!decodedUrl) {
    return json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const website = await prisma.website.findFirst({
      where: {
        siteUrl: decodedUrl,
      },
      select: {
        isPublic: true,
      },
    });

    if (!website) {
      return json({ error: 'Website not found' }, { status: 404 });
    }

    return json({ isPublic: website.isPublic });
  } catch (error) {
    logger.error(
      'Error checking website access',
      JSON.stringify({
        siteUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );

    return json({ error: 'Failed to check website access' }, { status: 500 });
  }
}
