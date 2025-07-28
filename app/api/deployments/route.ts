import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '~/lib/prisma';
import { requireUserId } from '~/auth/session';

export async function GET(request: NextRequest) {
  const userId = await requireUserId(request);

  const websites = await prisma.website.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return NextResponse.json({ websites });
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'delete') {
    const websiteId = formData.get('websiteId') as string;

    await prisma.website.delete({
      where: {
        id: websiteId,
        userId,
      },
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid intent' }, { status: 400 });
}
