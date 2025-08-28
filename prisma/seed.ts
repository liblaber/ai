import type { Account, Environment, Organization, Role, User } from '@prisma/client';
import { DeprecatedRole, PermissionAction, PermissionResource, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  const organization = await seedOrganization();
  const initialUser = await seedInitialUser(organization.id);
  await seedInitialAccount(initialUser);
  await seedDefaultAdmin(initialUser.id, organization.id);
  await seedDefaultEnvironments(organization.id);
  await seedBuilderRole(organization.id);
  await seedOperatorRole(organization.id);

  console.log('🎉 Database seed completed successfully');
}

async function seedOrganization(): Promise<Organization> {
  try {
    const anonymousOrganization = {
      name: 'Anonymous',
      domain: 'anonymous.com',
    };

    let organization = await prisma.organization.findUnique({
      where: { domain: anonymousOrganization.domain },
    });

    if (!organization) {
      organization = await prisma.organization.create({
        data: anonymousOrganization,
      });
      console.log('✅ Created anonymous organization');
    } else {
      console.log('✅ Anonymous organization already exists');
    }

    return organization;
  } catch (error) {
    console.error('❌ Error creating organization:', error);
    throw error;
  }
}

async function seedInitialUser(organizationId: string): Promise<User> {
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
        organizationId,
        role: DeprecatedRole.ADMIN,
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

async function seedDefaultEnvironments(organizationId: string): Promise<void> {
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
        where: { name: envData.name, organizationId },
      });

      if (!environment) {
        environment = await prisma.environment.create({
          data: {
            name: envData.name,
            description: envData.description,
            organizationId,
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

async function seedDefaultAdmin(userId: string, organizationId: string): Promise<void> {
  try {
    const adminRole = await seedRole(organizationId, 'Admin', 'Full system administrator with all privileges');
    await seedUserRole(userId, adminRole.id);

    const permissions = [{ resource: PermissionResource.all, action: PermissionAction.manage }];
    await seedPermissions(adminRole.id, permissions);
  } catch (error) {
    console.error('❌ Error seeding default admin user:', error);
    throw error;
  }
}

async function seedBuilderRole(organizationId: string): Promise<void> {
  try {
    const builderRole = await seedRole(organizationId, 'Builder', 'Application developer and app user');

    // All permissions except admin app
    const permissions = [
      { resource: PermissionResource.Environment, action: PermissionAction.manage },
      { resource: PermissionResource.DataSource, action: PermissionAction.manage },
      { resource: PermissionResource.Website, action: PermissionAction.manage },
      { resource: PermissionResource.BuilderApp, action: PermissionAction.manage },
    ];
    await seedPermissions(builderRole.id, permissions);
  } catch (error) {
    console.error('❌ Error seeding builder role:', error);
    throw error;
  }
}

async function seedOperatorRole(organizationId: string): Promise<void> {
  try {
    const operatorRole = await seedRole(organizationId, 'App User', 'End user with app-only access');

    // Access only to websites
    const permissions = [{ resource: PermissionResource.Website, action: PermissionAction.manage }];
    await seedPermissions(operatorRole.id, permissions);
  } catch (error) {
    console.error('❌ Error seeding operator role:', error);
    throw error;
  }
}

async function seedRole(organizationId: string, name: string, description: string | null = null): Promise<Role> {
  try {
    let role = await prisma.role.findFirst({
      where: { organizationId, name },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name,
          description,
          organizationId,
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

seed()
  .catch((e) => {
    console.error('❌ Fatal seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Ensure the connection is properly closed
    await prisma.$disconnect();
  });
