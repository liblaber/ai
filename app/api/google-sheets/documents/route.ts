import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '~/auth/auth-config';
import { headers } from 'next/headers';

// Zod schemas for Google Drive API responses
const googleDriveFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  modifiedTime: z.string(),
  owners: z
    .array(
      z.object({
        displayName: z.string(),
      }),
    )
    .optional(),
  webViewLink: z.string(),
});

const googleDriveResponseSchema = z.object({
  files: z.array(googleDriveFileSchema),
});

type GoogleDriveFile = z.infer<typeof googleDriveFileSchema>;

async function fetchGoogleSheets(accessToken: string): Promise<GoogleDriveFile[]> {
  try {
    // Use Google Drive API to fetch spreadsheet files
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?` +
        `q=mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&` +
        `fields=files(id,name,modifiedTime,owners,webViewLink)&` +
        `orderBy=modifiedTime desc&` +
        `pageSize=20`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();
    const data = googleDriveResponseSchema.parse(rawData);

    return data.files;
  } catch (error) {
    console.error('Error fetching from Google Drive API:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get Google access token from our custom OAuth flow
    const accessToken = request.cookies.get('google_access_token')?.value;

    // Check if we have a valid Google OAuth token
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Google authentication required' }, { status: 401 });
    }

    // Get session for fallback user info (but don't require it)
    const session = await auth.api.getSession({ headers: await headers() });
    const fallbackUserName = (session?.user as { name?: string } | undefined)?.name || 'Unknown';

    let documents: Array<{
      id: string;
      name: string;
      modified: string;
      owner: string;
      url: string;
    }>;

    try {
      const googleFiles = await fetchGoogleSheets(accessToken);
      documents = googleFiles.map(
        (
          file,
        ): {
          id: string;
          name: string;
          modified: string;
          owner: string;
          url: string;
        } => ({
          id: file.id,
          name: file.name,
          modified: new Date(file.modifiedTime).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          owner: file.owners?.[0]?.displayName || fallbackUserName,
          url: file.webViewLink,
        }),
      );
    } catch (error) {
      console.error('Failed to fetch from Google Drive API:', error);
      // Return empty array if API call fails
      documents = [];
    }

    return NextResponse.json({
      success: true,
      documents,
      source: 'google-api',
    });
  } catch (error) {
    console.error('Error fetching Google Sheets documents:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch Google Sheets documents',
    });
  }
}
