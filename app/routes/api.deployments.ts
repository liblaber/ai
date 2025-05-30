import { json } from '@remix-run/cloudflare';
import { prisma } from '~/lib/prisma';

export async function loader() {
  const websites = await prisma.website.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  return json({ websites });
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'delete') {
    const websiteId = formData.get('websiteId') as string;

    await prisma.website.delete({
      where: {
        id: websiteId,
      },
    });

    return json({ success: true });
  }

  return json({ error: 'Invalid intent' }, { status: 400 });
}
