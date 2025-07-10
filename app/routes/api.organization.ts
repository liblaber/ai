import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { requireUserId } from '~/auth/session';
import { organizationService } from '~/lib/services/organizationService';

interface UpdateOrganizationRequest {
  name: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const userId = await requireUserId(request);
    const organization = await organizationService.getOrganizationByUser(userId);

    if (!organization) {
      return json({ error: 'Organization not found' }, { status: 404 });
    }

    return json({ success: true, organization });
  } catch {
    return json({ success: false, error: 'Failed to fetch organization details' }, { status: 500 });
  }
}

export async function action({ request }: LoaderFunctionArgs) {
  if (request.method !== 'PUT') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const userId = await requireUserId(request);
    const data = (await request.json()) as UpdateOrganizationRequest;

    if (!data.name || typeof data.name !== 'string') {
      return json({ success: false, error: 'Organization name is required' }, { status: 400 });
    }

    try {
      const updatedOrganization = await organizationService.updateOrganizationByUser(userId, data.name);
      return json({
        success: true,
        organization: updatedOrganization,
      });
    } catch (error) {
      return json({ error }, { status: 403 });
    }
  } catch {
    return json({ success: false, error: 'Failed to update organization' }, { status: 500 });
  }
}
