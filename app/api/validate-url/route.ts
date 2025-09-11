import { NextRequest, NextResponse } from 'next/server';
import { validateDeploymentUrl } from '~/lib/utils/app-url';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL parameter is required' }, { status: 400 });
    }

    // Validate the URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 });
    }

    // Validate the deployment URL
    const result = await validateDeploymentUrl(url);

    return NextResponse.json({
      success: true,
      valid: result.valid,
      error: result.error,
    });
  } catch (error) {
    console.error('URL validation error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
