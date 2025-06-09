import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { auth } from '~/lib/auth';

export async function loader({ request }: LoaderFunctionArgs) {
  return auth.handler(request);
}

export async function action({ request }: ActionFunctionArgs) {
  return auth.handler(request);
}
