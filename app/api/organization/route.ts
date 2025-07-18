import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '~/auth/session';
import { organizationService } from '~/lib/services/organizationService';

interface UpdateOrganizationRequest {
  name: string;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    const organization = await organizationService.getOrganizationByUser(userId);

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, organization });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch organization details' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    const data = (await request.json()) as UpdateOrganizationRequest;

    if (!data.name || typeof data.name !== 'string') {
      return NextResponse.json({ success: false, error: 'Organization name is required' }, { status: 400 });
    }

    try {
      const updatedOrganization = await organizationService.updateOrganizationByUser(userId, data.name);
      return NextResponse.json({
        success: true,
        organization: updatedOrganization,
      });
    } catch (error) {
      return NextResponse.json({ error }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update organization' }, { status: 500 });
  }
}
