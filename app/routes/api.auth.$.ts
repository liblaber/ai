import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { auth } from '~/auth/auth-config';

export async function loader({ request }: LoaderFunctionArgs) {
  return auth.handler(request);
}

export async function action({ request }: ActionFunctionArgs) {
  return auth.handler(request);
}
