import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '~/lib/prisma';
import { getSession } from '~/auth/session';

export async function GET(request: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  try {
    const { chatId } = await params;
    const session = await getSession(request);

    // Find the website by chatId
    const website = await prisma.website.findFirst({
      where: {
        chatId,
        // Only show public websites or websites created by the current user
        OR: [{ isPublic: true }, ...(session?.user?.id ? [{ createdById: session.user.id }] : [])],
      },
    });

    if (!website || !website.siteUrl) {
      return NextResponse.json({ success: false, error: 'Website not found or not deployed' }, { status: 404 });
    }

    // Get the path from the request URL
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    const targetUrl = new URL(path, website.siteUrl).toString();

    // Fetch the content from the target URL
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        // Forward relevant headers
        'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0',
        Accept: request.headers.get('accept') || '*/*',
        'Accept-Language': request.headers.get('accept-language') || 'en-US,en;q=0.9',
        'Accept-Encoding': request.headers.get('accept-encoding') || 'gzip, deflate, br',
        'Cache-Control': request.headers.get('cache-control') || 'no-cache',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch content from target URL' },
        { status: response.status },
      );
    }

    // Get the content type
    const contentType = response.headers.get('content-type') || 'text/html';

    // Create response with proper headers
    const proxyResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
    });

    // Copy relevant headers from the target response
    const headersToForward = [
      'content-type',
      'content-length',
      'content-encoding',
      'cache-control',
      'etag',
      'last-modified',
      'expires',
    ];

    headersToForward.forEach((header) => {
      const value = response.headers.get(header);

      if (value) {
        proxyResponse.headers.set(header, value);
      }
    });

    // Add CORS headers
    proxyResponse.headers.set('Access-Control-Allow-Origin', '*');
    proxyResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    proxyResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // If it's HTML, we might want to modify it to fix relative URLs
    if (contentType.includes('text/html')) {
      const html = await response.text();

      // Replace relative URLs with proxy URLs
      const modifiedHtml = html
        .replace(/src="(?!https?:\/\/)([^"]+)"/g, `src="/api/proxy/${chatId}?path=$1"`)
        .replace(/href="(?!https?:\/\/)([^"]+)"/g, `href="/api/proxy/${chatId}?path=$1"`)
        .replace(/action="(?!https?:\/\/)([^"]+)"/g, `action="/api/proxy/${chatId}?path=$1"`);

      return new NextResponse(modifiedHtml, {
        status: response.status,
        statusText: response.statusText,
        headers: proxyResponse.headers,
      });
    }

    return proxyResponse;
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  try {
    const { chatId } = await params;
    const session = await getSession(request);

    // Find the website by chatId
    const website = await prisma.website.findFirst({
      where: {
        chatId,
        OR: [{ isPublic: true }, ...(session?.user?.id ? [{ createdById: session.user.id }] : [])],
      },
    });

    if (!website || !website.siteUrl) {
      return NextResponse.json({ success: false, error: 'Website not found or not deployed' }, { status: 404 });
    }

    // Get the path from the request URL
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    const targetUrl = new URL(path, website.siteUrl).toString();

    // Get the request body
    const body = await request.text();

    // Forward the POST request
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('content-type') || 'application/x-www-form-urlencoded',
        'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0',
      },
      body,
    });

    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || 'text/html';

    return new NextResponse(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Proxy POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
