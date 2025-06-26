import { type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { default as ChatRoute } from './chat';
import { requireAuth } from '~/auth/auth-middleware';

export const loader = requireAuth(async (args: LoaderFunctionArgs) => ({ id: args.params.id }));

export default ChatRoute;
