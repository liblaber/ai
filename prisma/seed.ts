import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  // Create organization
  const anonymousOrganization = {
    name: 'Anonymous',
    domain: 'anonymous.com',
  };

  try {
    const existingOrganization = await prisma.organization.findUnique({
      where: { domain: anonymousOrganization.domain },
    });

    if (existingOrganization) {
      console.log('✅ Anonymous already exists');
      return;
    }

    const organization = await prisma.organization.create({
      data: anonymousOrganization,
    });

    // Create anonymous user
    const anonymousUser = {
      id: 'TYOjutAGl9gxV4b2jbBG2loaohynFnFs',
      email: 'anonymous@anonymous.com',
      name: 'Anonymous',
      emailVerified: false,
      organizationId: organization.id,
      role: UserRole.ADMIN,
      isAnonymous: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const user = await prisma.user.create({
      data: anonymousUser,
    });

    console.log('✅ Created anonymous user:', user.email);

    await prisma.account.create({
      data: {
        id: 'kOK6L1dtMXjn9I09QtBFDYoX0aIT1ZL6',
        accountId: user.id,
        providerId: 'credential',
        userId: user.id,
        password:
          '7545921c88db4437a061a113885545fd:6485b22048dc74d8548c1af7528a2b7cebaa921789f4ed95afc2616963172999fa5751c48829760b20d4bd48876ba9d2451c33ddb9bd3255b9842a1bbc89d0f3',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('❌ Error creating anonymous user:', error);
    throw error;
  }

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
