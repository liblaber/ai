import { NextResponse } from 'next/server';
import '~/lib/config/env';

export async function GET() {
  const netlifyEnabled = !!process.env.NETLIFY_AUTH_TOKEN;

  return NextResponse.json({
    netlify: {
      enabled: netlifyEnabled,
    },
  });
}
