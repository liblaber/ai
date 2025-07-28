import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ encryptionKey: process.env.ENCRYPTION_KEY });
}
