import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { requireUserId } from '~/auth/session';
import { organizationService } from '~/lib/services/organizationService';
import { userService } from '~/lib/services/userService';
import { UserRole } from '@prisma/client';

type UpdateRoleBody = {
  memberId: string;
  role: UserRole;
};

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const userId = await requireUserId(request);

    try {
      const organization = await organizationService.getOrganizationByUser(userId);

      if (!organization) {
        return json({ success: false, error: 'Organization not found' }, { status: 404 });
      }

      const members = await userService.getUsersByOrganization(organization.id);

      return json({
        members,
      });
    } catch (error) {
      return json({ success: false, error }, { status: 404 });
    }
  } catch {
    return json({ success: false, error: 'Failed to fetch organization members' }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'PATCH') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const userId = await requireUserId(request);
    const body = (await request.json()) as UpdateRoleBody;

    const currentUser = await userService.getUser(userId);

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const organization = await organizationService.getOrganizationByUser(userId);

    if (!organization) {
      return json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    const targetMember = await userService.updateUserRole(body.memberId, organization.id, body.role);

    return json({ success: true, member: targetMember });
  } catch (error) {
    console.error('Failed to update member role:', error);
    return json({ success: false, error: 'Failed to update member role' }, { status: 500 });
  }
}
