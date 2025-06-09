import { json } from '@remix-run/cloudflare';
import { requireUserId } from '~/session';
import { getDatabaseUrl } from '~/lib/services/datasourceService';

export async function loader({ request, params }: { request: Request; params: { id: string } }) {
  const userId = await requireUserId(request);
  const url = await getDatabaseUrl(userId, params.id);

  return json({ url, success: true });
}
