import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseUrl } from '~/lib/services/datasourceService';
import { requireUserId } from '~/auth/session';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);
  const { id } = await params;
  const url = await getDatabaseUrl(userId, id);

  return NextResponse.json({ url, success: true });
}
