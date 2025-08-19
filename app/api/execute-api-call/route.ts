import { NextRequest, NextResponse } from 'next/server';

/*
  This proxy endpoint exists to enable making server-side calls from the webcontainer environment and bypass CORS restrictions.
  It is not intended to be used for general purpose API calls. It is only intended to be used for making server-side calls to the API.
  Deployed built apps will not use this proxy endpoint.
*/

export async function GET(request: NextRequest) {
  return handleApiCall(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleApiCall(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return handleApiCall(request, 'PUT');
}

export async function PATCH(request: NextRequest) {
  return handleApiCall(request, 'PATCH');
}

export async function DELETE(request: NextRequest) {
  return handleApiCall(request, 'DELETE');
}

export async function HEAD(request: NextRequest) {
  return handleApiCall(request, 'HEAD');
}

export async function OPTIONS() {
  // Preflight requests are browser-enforced, and this proxy exists only to enable making server-side calls from
  // the webcontainer environment (which is still client-side because it goes through the browser)
  return new NextResponse(null, { status: 200 });
}

async function handleApiCall(request: NextRequest, method: string) {
  try {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json({ error: 'Missing required query parameter: url' }, { status: 400 });
    }

    let targetUrlObj: URL;

    try {
      targetUrlObj = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL provided' }, { status: 400 });
    }

    if (isPrivateIP(targetUrlObj.hostname)) {
      return NextResponse.json({ error: 'Access to private IP addresses is not allowed' }, { status: 403 });
    }

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      // Filter out headers that shouldn't be forwarded
      if (!['host', 'origin', 'referer'].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });

    let body: string | undefined;

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        body = await request.text();
      } catch {
        // Body might not exist, continue without it
      }
    }

    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
      redirect: 'manual',
    });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      // Filter out headers that shouldn't be forwarded back
      if (!['set-cookie', 'content-encoding', 'content-length'].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    const responseBody = await response.text();

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function isPrivateIP(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }

  const privateRanges = [/^10\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./, /^192\.168\./, /^169\.254\./, /^fc00:/, /^fe80:/];

  return privateRanges.some((range) => range.test(hostname));
}
