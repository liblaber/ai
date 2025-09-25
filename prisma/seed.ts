import {
  type Account,
  DataSourcePropertyType,
  DataSourceType,
  PermissionAction,
  PermissionResource,
  PrismaClient,
  type Role,
  type User,
} from '@prisma/client';
import { decryptEnvironmentVariable } from '~/lib/services/environmentVariablesService';

const prisma = new PrismaClient();

async function seedOIDCSSOProvider(): Promise<void> {
  try {
    // Check if OIDC environment variables are configured
    const oidcIssuer = process.env.OIDC_ISSUER;
    const oidcClientId = process.env.OIDC_CLIENT_ID;
    const oidcClientSecret = process.env.OIDC_CLIENT_SECRET;
    const oidcDomain = process.env.OIDC_DOMAIN;
    const oidcProviderId = process.env.OIDC_PROVIDER_ID;

    if (!oidcIssuer || !oidcClientId || !oidcClientSecret || !oidcDomain || !oidcProviderId) {
      console.log('⚠️  OIDC SSO not configured - skipping SSO provider seeding');
      return;
    }

    // Check if SSO provider already exists
    const existingProvider = await prisma.ssoProvider.findFirst({
      where: { providerId: oidcProviderId },
    });

    if (existingProvider) {
      console.log('✅ OIDC SSO provider already exists');
      return;
    }

    // Create the OIDC SSO provider with enhanced configuration
    const formattedIssuer = oidcIssuer.endsWith('/') ? oidcIssuer : `${oidcIssuer}/`;
    const formattedDomain = oidcDomain.endsWith('/') ? oidcDomain : `${oidcDomain}/`;

    const oidcConfig = {
      clientId: oidcClientId,
      clientSecret: oidcClientSecret,
      issuer: formattedIssuer,
      scopes: ['openid', 'profile', 'email'],
      discoveryEndpoint: `${formattedIssuer}.well-known/openid-configuration`,
      authorizationEndpoint: `${formattedIssuer}authorize`,
      tokenEndpoint: `${formattedIssuer}oauth/token`,
      userInfoEndpoint: `${formattedIssuer}userinfo`,
      jwksEndpoint: `${formattedIssuer}.well-known/jwks.json`,
      pkce: true,
    };

    await prisma.ssoProvider.create({
      data: {
        providerId: oidcProviderId,
        friendlyName: process.env.OIDC_FRIENDLY_NAME || 'Continue with SSO',
        issuer: formattedIssuer,
        domain: formattedDomain,
        oidcConfig: JSON.stringify(oidcConfig),
      },
    });

    console.log('✅ Created OIDC SSO provider');
  } catch (error) {
    console.error('❌ Error seeding OIDC SSO provider:', error);
    // Don't throw error to avoid breaking the entire seed process
  }
}

async function seed() {
  if (process.env.LICENSE_KEY !== 'premium') {
    const initialUser = await seedInitialUser();
    await seedInitialAccount(initialUser);
    await seedDefaultAdmin(initialUser.id);
  } else {
    await seedDefaultAdmin();
  }

  await seedDefaultEnvironments();
  await seedBuilderRole();
  await seedOperatorRole();
  await seedOIDCSSOProvider();
  await inferDataSourceTypes();

  console.log('🎉 Database seed completed successfully');
}

async function seedInitialUser(): Promise<User> {
  try {
    let initialUser = await prisma.user.findUnique({
      where: {
        email: 'anonymous@anonymous.com',
      },
    });

    if (!initialUser) {
      const anonymousUser = {
        email: 'anonymous@anonymous.com',
        name: 'Anonymous',
        emailVerified: false,
        isAnonymous: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      initialUser = await prisma.user.create({
        data: anonymousUser,
      });
      console.log('✅ Created anonymous user');
    } else {
      console.log('✅ Anonymous user already exists');
    }

    return initialUser;
  } catch (error) {
    console.error('❌ Error creating anonymous user:', error);
    throw error;
  }
}

async function seedInitialAccount(initialUser: User): Promise<Account> {
  try {
    let account = await prisma.account.findFirst({
      where: { accountId: initialUser.id, providerId: 'credential', userId: initialUser.id },
    });

    if (!account) {
      account = await prisma.account.create({
        data: {
          accountId: initialUser.id,
          providerId: 'credential',
          userId: initialUser.id,
          password:
            '7545921c88db4437a061a113885545fd:6485b22048dc74d8548c1af7528a2b7cebaa921789f4ed95afc2616963172999fa5751c48829760b20d4bd48876ba9d2451c33ddb9bd3255b9842a1bbc89d0f3',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log('✅ Created account for anonymous user');
    } else {
      console.log('✅ Account exists for anonymous user');
    }

    return account;
  } catch (error) {
    console.error('❌ Error creating account for anonymous user:', error);
    throw error;
  }
}

async function seedDefaultEnvironments(): Promise<void> {
  try {
    const environments = [
      {
        name: 'Development',
        description: 'Default development environment',
      },
      {
        name: 'Production',
        description: 'Default production environment',
      },
    ];

    for (const envData of environments) {
      let environment = await prisma.environment.findFirst({
        where: { name: envData.name },
      });

      if (!environment) {
        environment = await prisma.environment.create({
          data: {
            name: envData.name,
            description: envData.description,
          },
        });
        console.log(`✅ Created default ${envData.name} environment`);
      } else {
        console.log(`✅ ${envData.name} environment already exists`);
      }
    }
  } catch (error) {
    console.error('❌ Error creating default environments:', error);
    throw error;
  }
}

async function seedDefaultAdmin(userId?: string): Promise<void> {
  try {
    const adminRole = await seedRole('Admin', 'Full system administrator with all privileges');

    if (userId) {
      await seedUserRole(userId, adminRole.id);
    }

    const permissions = [{ resource: PermissionResource.all, action: PermissionAction.manage }];
    await seedPermissions(adminRole.id, permissions);
  } catch (error) {
    console.error('❌ Error seeding default admin user:', error);
    throw error;
  }
}

async function seedBuilderRole(): Promise<void> {
  try {
    const builderRole = await seedRole('Builder', 'Application developer and app user');

    // All permissions except admin app
    const permissions = [
      { resource: PermissionResource.Environment, action: PermissionAction.manage },
      { resource: PermissionResource.DataSource, action: PermissionAction.manage },
      { resource: PermissionResource.Website, action: PermissionAction.manage },
      { resource: PermissionResource.Conversation, action: PermissionAction.manage },
      { resource: PermissionResource.BuilderApp, action: PermissionAction.manage },
    ];
    await seedPermissions(builderRole.id, permissions);
  } catch (error) {
    console.error('❌ Error seeding builder role:', error);
    throw error;
  }
}

async function seedOperatorRole(): Promise<void> {
  try {
    const operatorRole = await seedRole('App User', 'End user with app-only access');

    // Access only to websites
    const permissions = [{ resource: PermissionResource.Website, action: PermissionAction.manage }];
    await seedPermissions(operatorRole.id, permissions);
  } catch (error) {
    console.error('❌ Error seeding operator role:', error);
    throw error;
  }
}

async function seedRole(name: string, description: string | null = null): Promise<Role> {
  try {
    let role = await prisma.role.findFirst({
      where: { name },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name,
          description,
        },
      });
      console.log(`✅ Created ${name} role`);
    } else {
      console.log(`✅ ${name} role already exists`);
    }

    return role;
  } catch (error) {
    console.error(`❌ Error creating ${name} role:`, error);
    throw error;
  }
}

async function seedUserRole(userId: string, roleId: string): Promise<void> {
  try {
    const userRole = await prisma.userRole.findFirst({
      where: { userId, roleId },
    });

    if (!userRole) {
      await prisma.userRole.create({
        data: {
          userId,
          roleId,
        },
      });
    }
  } catch (error) {
    console.error('❌ Error creating user role:', error);
    throw error;
  }
}

async function seedPermissions(
  roleId: string,
  permissions: { resource: PermissionResource; action: PermissionAction }[],
): Promise<void> {
  try {
    for (const { resource, action } of permissions) {
      const existingPermission = await prisma.permission.findFirst({
        where: { roleId, resource, action },
      });

      if (!existingPermission) {
        await prisma.permission.create({
          data: {
            roleId,
            resource,
            action,
          },
        });
      }
    }
  } catch (error) {
    console.error('❌ Error creating permissions:', error);
    throw error;
  }
}

async function inferDataSourceTypes(): Promise<void> {
  try {
    const connectionProps = await prisma.dataSourceProperty.findMany({
      where: { type: DataSourcePropertyType.CONNECTION_URL },
      select: {
        dataSourceId: true,
        environmentVariable: true,
      },
    });

    const dataSourceIdToType = new Map<string, DataSourceType>();

    for (const property of connectionProps) {
      const { value: connectionUrl } = decryptEnvironmentVariable(property.environmentVariable);

      let inferredType: DataSourceType = DataSourceType.SQLITE;

      if (connectionUrl.includes('postgres')) {
        inferredType = DataSourceType.POSTGRES;
      } else if (connectionUrl.includes('mysql')) {
        inferredType = DataSourceType.MYSQL;
      } else if (connectionUrl.includes('mongodb')) {
        inferredType = DataSourceType.MONGODB;
      } else if (connectionUrl.includes('hubspot')) {
        inferredType = DataSourceType.HUBSPOT;
      } else if (connectionUrl.includes('sheets')) {
        inferredType = DataSourceType.GOOGLE_SHEETS;
      } else if (connectionUrl.includes('docs')) {
        inferredType = DataSourceType.GOOGLE_DOCS;
      }

      dataSourceIdToType.set(property.dataSourceId, inferredType);
    }

    for (const [dataSourceId, inferredType] of dataSourceIdToType.entries()) {
      await prisma.dataSource.update({
        where: { id: dataSourceId },
        data: { type: inferredType },
      });
    }
  } catch (error) {
    console.error('❌ Error inferring data source types:', error);
    throw error;
  }
}

seed()
  .catch((e) => {
    console.error('❌ Fatal seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Ensure the connection is properly closed
    await prisma.$disconnect();
  });
