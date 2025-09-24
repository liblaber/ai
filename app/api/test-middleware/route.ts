import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Middleware test endpoint - if you can see this, middleware is working',
    timestamp: new Date().toISOString(),
  });
}
