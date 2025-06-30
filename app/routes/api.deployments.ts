import { json } from '@remix-run/cloudflare';
import { prisma } from '~/lib/prisma';
import { requireUserId } from '~/auth/session';

export async function loader({ request }: { request: Request }) {
  const userId = await requireUserId(request);

  const websites = await prisma.website.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return json({ websites });
}

export async function action({ request }: { request: Request }) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'delete') {
    const websiteId = formData.get('websiteId') as string;

    await prisma.website.delete({
      where: {
        id: websiteId,
        userId,
      },
    });

    return json({ success: true });
  }

  return json({ error: 'Invalid intent' }, { status: 400 });
}
