import { DeprecatedRole, PermissionAction, PermissionResource, PrismaClient } from '@prisma/client';
import type { Account, Environment, Organization, Role, User } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  const organization = await seedOrganization();
  const initialUser = await seedInitialUser(organization.id);
  await seedInitialAccount(initialUser);
  await seedDefaultAdmin(initialUser.id, organization.id);
  await seedDefaultEnvironment(organization.id);

  console.log('🎉 Database seed completed successfully');
}

seed()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

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
    }

    return account;
  } catch (error) {
    console.error('❌ Error creating account for anonymous user:', error);
    throw error;
  }
}

async function seedDefaultEnvironment(organizationId: string): Promise<Environment> {
  try {
    let environment = await prisma.environment.findFirst({
      where: { name: 'Default' },
    });

    if (!environment) {
      environment = await prisma.environment.create({
        data: {
          name: 'Default',
          description: 'Default environment',
          organizationId,
          createdAt: new Date(),
        },
      });
    }

    return environment;
  } catch (error) {
    console.error('❌ Error creating default environment:', error);
    throw error;
  }
}

async function seedDefaultAdmin(userId: string, organizationId: string): Promise<void> {
  try {
    const adminRole = await seedAdminRole(organizationId);
    await seedAdminUserRole(userId, adminRole.id);
    await seedAdminPermissions(adminRole.id);
  } catch (error) {
    console.error('❌ Error seeding default admin user:', error);
    throw error;
  }
}

async function seedAdminRole(organizationId: string): Promise<Role> {
  try {
    let adminRole = await prisma.role.findFirst({
      where: { name: 'Admin' },
    });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: 'Admin',
          description: 'Administrator role with full access',
          organizationId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    return adminRole;
  } catch (error) {
    console.error('❌ Error creating admin role:', error);
    throw error;
  }
}

async function seedAdminUserRole(userId: string, adminRoleId: string): Promise<void> {
  try {
    let userAdminRole = await prisma.userRole.findFirst({
      where: { userId, roleId: adminRoleId },
    });

    if (!userAdminRole) {
      userAdminRole = await prisma.userRole.create({
        data: {
          userId,
          roleId: adminRoleId,
          createdAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error('❌ Error creating admin role:', error);
    throw error;
  }
}

async function seedAdminPermissions(roleId: string): Promise<void> {
  try {
    const existingPermission = await prisma.permission.findFirst({
      where: { roleId, resource: PermissionResource.all, action: PermissionAction.manage },
    });

    if (!existingPermission) {
      await prisma.permission.create({
        data: {
          roleId,
          resource: PermissionResource.all,
          action: PermissionAction.manage,
          createdAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error('❌ Error creating initial permissions:', error);
    throw error;
  }
}
