import { NextResponse } from 'next/server';
import fs from 'fs';
import { env } from '~/env';

const TUNNEL_CONFIG_FILE = './tunnel.config';

export async function GET() {
  try {
    // Check if we're in local environment
    if (env.client.NEXT_PUBLIC_ENV_NAME === 'local') {
      // Try to read from tunnel.config file
      if (fs.existsSync(TUNNEL_CONFIG_FILE)) {
        const tunnelUrl = fs.readFileSync(TUNNEL_CONFIG_FILE, 'utf8').trim();

        if (tunnelUrl) {
          return NextResponse.json({ url: tunnelUrl });
        }
      }
    }
  } catch (error) {
    console.error('Failed to read tunnel config:', error);
  }

  // Fallback to BASE_URL environment variable
  const baseUrl = env.server.BASE_URL || '';

  return NextResponse.json({ url: baseUrl });
}
