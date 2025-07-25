import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '~/auth/session';
import { organizationService } from '~/lib/services/organizationService';
import { userService } from '~/lib/services/userService';
type UpdateRoleBody = {
  memberId: string;
  role: 'ADMIN' | 'MEMBER';
};

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId(request);

    try {
      const organization = await organizationService.getOrganizationByUser(userId);

      if (!organization) {
        return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
      }

      const members = await userService.getUsersByOrganization(organization.id);

      return NextResponse.json({
        members,
      });
    } catch (error) {
      return NextResponse.json({ success: false, error }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch organization members' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    const body = (await request.json()) as UpdateRoleBody;

    const currentUser = await userService.getUser(userId);

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const organization = await organizationService.getOrganizationByUser(userId);

    if (!organization) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    const targetMember = await userService.updateUserRole(body.memberId, organization.id, body.role);

    return NextResponse.json({ success: true, member: targetMember });
  } catch (error) {
    console.error('Failed to update member role:', error);
    return NextResponse.json({ success: false, error: 'Failed to update member role' }, { status: 500 });
  }
}
