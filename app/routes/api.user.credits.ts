import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { userService } from '~/lib/services/userService';
import { requireUserId } from '~/session';
import { env } from '~/lib/config/env';

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  const userCredits = await userService.getUserCredits(userId);

  return json({
    credits: userCredits,
    maxCredits: env.MAX_CREDITS_PER_DAY,
  });
}
