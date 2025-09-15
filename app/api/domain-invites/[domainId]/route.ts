import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(_request: NextRequest) {
  // Return error since domain invites are not implemented yet
  return NextResponse.json({ success: false, error: 'Domain invites are coming soon' }, { status: 501 });
}
