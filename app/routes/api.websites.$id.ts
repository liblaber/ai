import { json } from '@remix-run/cloudflare';
import { requireUserId } from '~/session';
import { prisma } from '~/lib/prisma';
import { logger } from '~/utils/logger';

export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const userId = await requireUserId(request);
  const websiteId = params.id;

  if (!websiteId) {
    return json({ error: 'Website ID is required' }, { status: 400 });
  }

  // Only allow PATCH requests
  if (request.method !== 'PATCH') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const website = await prisma.website.findFirst({
      where: {
        id: websiteId,
        userId, // Ensure user can only update their own websites
      },
    });

    if (!website) {
      return json({ error: 'Website not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const updateData: any = {};

    if (formData.has('isPublic')) {
      const isPublic = formData.get('isPublic') === 'true';
      updateData.isPublic = isPublic;
    }

    if (formData.has('allowedUserEmails')) {
      updateData.allowedUserEmails = JSON.parse(formData.get('allowedUserEmails') as string);
    }

    const updatedWebsite = await prisma.website.update({
      where: {
        id: websiteId,
      },
      data: updateData,
    });

    return json({ website: updatedWebsite });
  } catch (error) {
    logger.error(
      'Error updating website',
      JSON.stringify({
        websiteId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );

    const errorMessage = error instanceof Error ? error.message : 'Failed to update website';

    return json({ error: errorMessage }, { status: 500 });
  }
}
