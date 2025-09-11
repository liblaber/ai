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
        OR: [{ isPublic: true }, ...(session?.user?.id ? [{ createdById: session.user.id }] : [])],
      },
    });

    if (!website || !website.siteUrl) {
      return NextResponse.json({ success: false, error: 'Website not found or not deployed' }, { status: 404 });
    }

    // Get the path from the request URL
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';

    // Construct the target URL
    const targetUrl = new URL(path, website.siteUrl).toString();

    // Set up headers for the request
    const headers: Record<string, string> = {
      'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0 (compatible; LibLab-Proxy/1.0)',
    };

    // Forward relevant headers
    const headersToForward = [
      'accept',
      'accept-language',
      'accept-encoding',
      'cache-control',
      'if-modified-since',
      'if-none-match',
    ];

    headersToForward.forEach((header) => {
      const value = request.headers.get(header);

      if (value) {
        headers[header] = value;
      }
    });

    // Fetch the content from the target URL
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      // Add timeout
      signal: AbortSignal.timeout(30000), // 30 seconds timeout
    });

    if (!response.ok) {
      // Handle different error cases
      if (response.status === 404) {
        return NextResponse.json({ success: false, error: 'Content not found' }, { status: 404 });
      }

      if (response.status >= 500) {
        return NextResponse.json({ success: false, error: 'Target server error' }, { status: 502 });
      }

      return NextResponse.json({ success: false, error: 'Failed to fetch content' }, { status: response.status });
    }

    // Get the content type
    const contentType = response.headers.get('content-type') || 'text/html';

    // Create response headers
    const responseHeaders = new Headers();

    // Copy relevant headers from the target response
    const headersToCopy = [
      'content-type',
      'content-length',
      'content-encoding',
      'cache-control',
      'etag',
      'last-modified',
      'expires',
      'content-disposition',
    ];

    headersToCopy.forEach((header) => {
      const value = response.headers.get(header);

      if (value) {
        responseHeaders.set(header, value);
      }
    });

    // Add CORS headers
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    // Handle different content types
    if (contentType.includes('text/html')) {
      const html = await response.text();

      // Process HTML to fix relative URLs
      const processedHtml = processHtmlUrls(html, chatId);

      return new NextResponse(processedHtml, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    if (contentType.includes('application/json')) {
      const json = await response.text();

      // Process JSON to fix relative URLs
      const processedJson = processJsonUrls(json, chatId);

      return new NextResponse(processedJson, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    // For other content types (images, CSS, JS, etc.), stream the response
    const stream = new ReadableStream({
      start(controller) {
        const reader = response.body?.getReader();

        function pump(): Promise<void> {
          return reader!.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return undefined;
            }

            controller.enqueue(value);

            return pump();
          });
        }

        return pump();
      },
    });

    return new NextResponse(stream, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Proxy content error:', error);

    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({ success: false, error: 'Request timeout' }, { status: 504 });
    }

    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

function processHtmlUrls(html: string, chatId: string): string {
  const baseUrl = `/api/proxy-content/${chatId}`;

  return (
    html
      // Fix relative URLs in src attributes
      .replace(/src="(?!https?:\/\/|\/\/)([^"]+)"/g, (match, url) => {
        const encodedUrl = encodeURIComponent(url);
        return `src="${baseUrl}?path=${encodedUrl}"`;
      })
      // Fix relative URLs in href attributes
      .replace(/href="(?!https?:\/\/|\/\/)([^"]+)"/g, (match, url) => {
        const encodedUrl = encodeURIComponent(url);
        return `href="${baseUrl}?path=${encodedUrl}"`;
      })
      // Fix relative URLs in action attributes
      .replace(/action="(?!https?:\/\/|\/\/)([^"]+)"/g, (match, url) => {
        const encodedUrl = encodeURIComponent(url);
        return `action="${baseUrl}?path=${encodedUrl}"`;
      })
      // Fix relative URLs in CSS url() functions
      .replace(/url\(['"]?(?!https?:\/\/|\/\/)([^'"]+)['"]?\)/g, (match, url) => {
        const encodedUrl = encodeURIComponent(url);
        return `url("${baseUrl}?path=${encodedUrl}")`;
      })
  );
}

function processJsonUrls(json: string, chatId: string): string {
  try {
    const data = JSON.parse(json);
    const processedData = processJsonObject(data, chatId);

    return JSON.stringify(processedData);
  } catch {
    // If JSON parsing fails, return original
    return json;
  }
}

function processJsonObject(obj: any, chatId: string): any {
  if (typeof obj === 'string') {
    // Check if it looks like a relative URL
    if (obj.startsWith('/') && !obj.startsWith('//')) {
      const encodedUrl = encodeURIComponent(obj);
      return `/api/proxy-content/${chatId}?path=${encodedUrl}`;
    }

    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => processJsonObject(item, chatId));
  }

  if (obj && typeof obj === 'object') {
    const processed: any = {};

    for (const [key, value] of Object.entries(obj)) {
      processed[key] = processJsonObject(value, chatId);
    }

    return processed;
  }

  return obj;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    },
  });
}
