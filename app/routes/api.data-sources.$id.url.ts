import { json } from '@remix-run/cloudflare';
import { getDatabaseUrl } from '~/lib/services/datasourceService';

export async function loader({ params }: { request: Request; params: { id: string } }) {
  const url = await getDatabaseUrl(params.id);

  return json({ url, success: true });
}
