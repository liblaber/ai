import { NextResponse } from 'next/server';
import { env } from '~/env/server';

export async function GET() {
  return NextResponse.json({ encryptionKey: env.ENCRYPTION_KEY });
}
