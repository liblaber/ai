import { NextResponse } from 'next/server';
import { DeploymentMethodCredentialsType, DeploymentProvider } from '@prisma/client';
import { deploymentProviderInfoSchema } from '~/lib/validation/deploymentMethods';

export async function GET() {
  const providers = [
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

  // Validate the response with Zod
  const validationResult = deploymentProviderInfoSchema.array().safeParse(providers);

  if (!validationResult.success) {
    return NextResponse.json({ success: false, error: 'Invalid provider data structure' }, { status: 500 });
  }

  return NextResponse.json(validationResult.data);
}
