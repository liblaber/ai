import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '~/auth/auth-config';
import { prisma } from '~/lib/prisma';
import { userService } from '~/lib/services/userService';
import { logger } from '~/utils/logger';

// IMPORTANT: This should not be used in production.
// This endpoint is specifically for testing purposes to simulate a login, bypassing OIDC.

const postRequestSchema = z.object({
  email: z.string().email().default('test.user@liblab.com'),
  name: z.string().optional().default('Test User'),
  password: z.string().optional().default('password1234'),
  picture: z.string().url().optional(),
  telemetryEnabled: z.boolean().optional().default(false),
  role: z.string().optional().default('Admin'),
});

export async function POST(request: Request) {
  // Prevent usage in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const body = await request.json();
  const parsedBody = postRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ success: false, error: parsedBody.error.flatten().fieldErrors }, { status: 400 });
  }

  const { email, name, password, picture, telemetryEnabled, role: roleName } = parsedBody.data;

  try {
    // In a real scenario, this would be handled by the OIDC provider and associated hooks.
    // Here we simulate that process.
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      await auth.api.signUpEmail({
        body: {
          email,
          name,
          password,
        },
      });

      user = await prisma.user.update({
        where: { email },
        data: {
          image: picture || null,
          emailVerified: true,
          telemetryEnabled,
          isAnonymous: false,
          updatedAt: new Date(),
        },
      });

      await handleUserRole(user.id, roleName);
    }

    // Simulate sign-in
    return auth.api.signInEmail({
      body: {
        email,
        password,
      },
      asResponse: true,
      returnHeaders: true,
    });
  } catch (error) {
    logger.error('Test login failed:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

async function handleUserRole(userId: string, roleName: string) {
  try {
    // Assign role if specified
    const role = await prisma.role.findFirst({ where: { name: roleName } });

    if (!role) {
      throw new Error(`Role "${roleName}" not found`);
    }

    await userService.addUserToRole(userId, role.id);
  } catch (error) {
    logger.warn(`Role assignment failed during test login:`, error);

    // Simulate post-authentication hooks to ensure at least one admin user exists
    const nonAnonymousCount = await prisma.user.count({ where: { isAnonymous: false } });

    if (nonAnonymousCount === 1) {
      await userService.grantSystemAdminAccess(userId);
    }
  }
}
