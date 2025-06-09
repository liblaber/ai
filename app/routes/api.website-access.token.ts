import { json } from '@remix-run/cloudflare';
import { requireUserId } from '~/session';
import { logger } from '~/utils/logger';
import { prisma } from '~/lib/prisma';
import * as jose from 'jose';
import { env } from '~/lib/config/env';

export async function loader({ request }: { request: Request }) {
  try {
    const userId = await requireUserId(request);

    // Get user's email from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate JWT
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const jwt = await new jose.SignJWT({ email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('14d')
      .sign(secret);

    return json({
      authenticated: true,
      token: jwt,
    });
  } catch (e) {
    logger.error('User not authenticated', e);
    return json({ authenticated: false }, { status: 401 });
  }
}
