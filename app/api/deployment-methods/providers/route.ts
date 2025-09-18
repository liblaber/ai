import { type NextRequest, NextResponse } from 'next/server';
import { DeploymentMethodCredentialsType, DeploymentProvider } from '@prisma/client';
import { deploymentProviderInfoSchema } from '~/lib/validation/deploymentMethods';
import { requireUserId } from '~/auth/session';
import PluginManager from '~/lib/plugins/plugin-manager';
import { PluginType } from '~/lib/plugins/types';

export async function GET(request: NextRequest) {
  try {
    // Get user ID and ability
    await requireUserId(request);

    // Initialize plugin manager
    const pluginManager = PluginManager.getInstance();
    await pluginManager.initialize();

    // Get all possible providers
    const allProviders = [
      {
        id: DeploymentProvider.VERCEL,
        name: 'Vercel',
        description: 'Deploy to Vercel platform',
        requiredCredentials: [DeploymentMethodCredentialsType.API_KEY],
      },
      {
        id: DeploymentProvider.NETLIFY,
        name: 'Netlify',
        description: 'Deploy to Netlify platform',
        requiredCredentials: [DeploymentMethodCredentialsType.API_KEY],
      },
      {
        id: DeploymentProvider.AWS,
        name: 'AWS',
        description: 'Deploy to Amazon Web Services',
        requiredCredentials: [
          DeploymentMethodCredentialsType.ACCESS_KEY,
          DeploymentMethodCredentialsType.SECRET_KEY,
          DeploymentMethodCredentialsType.REGION,
        ],
      },
    ];

    const availableProviders = allProviders.filter((provider) => {
      return pluginManager.isPluginAvailable(PluginType.DEPLOYMENT, provider.id as any);
    });

    const validationResult = deploymentProviderInfoSchema.array().safeParse(availableProviders);

    if (!validationResult.success) {
      return NextResponse.json({ success: false, error: 'Invalid provider data structure' }, { status: 500 });
    }

    return NextResponse.json(validationResult.data);
  } catch (error) {
    console.error('Error fetching deployment providers:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch providers' }, { status: 500 });
  }
}
