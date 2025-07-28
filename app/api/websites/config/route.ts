import { NextResponse } from 'next/server';
import { env } from '~/lib/config/env';

export async function GET() {
  const netlifyEnabled = !!env.NETLIFY_AUTH_TOKEN;

  return NextResponse.json({
    netlify: {
      enabled: netlifyEnabled,
    },
  });
}
