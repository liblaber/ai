import { NextResponse } from 'next/server';
import { env } from '~/env';

export async function GET() {
  const netlifyEnabled = !!env.server.NETLIFY_AUTH_TOKEN;

  return NextResponse.json({
    netlify: {
      enabled: netlifyEnabled,
    },
  });
}
