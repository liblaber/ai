import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { env } from '~/lib/config/env';

export async function loader({ request: _request }: LoaderFunctionArgs) {
  const netlifyEnabled = !!env.NETLIFY_AUTH_TOKEN;

  return json({
    netlify: {
      enabled: netlifyEnabled,
    },
  });
}
