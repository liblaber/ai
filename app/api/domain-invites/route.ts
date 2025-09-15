import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  // Return empty array for now since domain invites are "Coming Soon"
  return NextResponse.json({ success: true, domainInvites: [] });
}

export async function POST(_request: NextRequest) {
  // Return error since domain invites are not implemented yet
  return NextResponse.json({ success: false, error: 'Domain invites are coming soon' }, { status: 501 });
}
