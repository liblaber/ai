import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    await prisma.$transaction(async (tx) => {
      const anonymousOrganization = {
        name: 'Anonymous',
        domain: 'anonymous.com',
      };

      let organization = await tx.organization.findUnique({
        where: { domain: anonymousOrganization.domain },
      });

      if (!organization) {
        organization = await tx.organization.create({
          data: anonymousOrganization,
        });
        console.log('✅ Created anonymous organization');
      } else {
        console.log('✅ Anonymous organization already exists');
      }

      let anonUser = await tx.user.findUnique({
        where: { email: 'anonymous@anonymous.com' },
      });

      if (!anonUser) {
        const anonymousUser = {
          email: 'anonymous@anonymous.com',
          name: 'Anonymous',
          emailVerified: false,
          organizationId: organization.id,
          role: UserRole.ADMIN,
          isAnonymous: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        anonUser = await tx.user.create({
          data: anonymousUser,
        });
        console.log('✅ Created anonymous user:', anonUser.id);
      } else {
        console.log('✅ Anonymous user exists:', anonUser.id);
      }

      const account = await tx.account.findFirst({
        where: { accountId: anonUser.id, providerId: 'credential', userId: anonUser.id },
      });

      if (!account) {
        await tx.account.create({
          data: {
            accountId: anonUser.id,
            providerId: 'credential',
            userId: anonUser.id,
            password:
              '7545921c88db4437a061a113885545fd:6485b22048dc74d8548c1af7528a2b7cebaa921789f4ed95afc2616963172999fa5751c48829760b20d4bd48876ba9d2451c33ddb9bd3255b9842a1bbc89d0f3',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        console.log('✅ Created account for anonymous user:', anonUser.id);
      } else {
        console.log('✅ Account exists for anonymous user:', anonUser.id);
      }
    });

    console.log('🔍 Verifying anonymous user...');

    const verifyUser = await prisma.user.findUnique({
      where: { email: 'anonymous@anonymous.com' },
      include: {
        organization: true,
        accounts: true,
      },
    });

    if (verifyUser) {
      console.log('✅ Verification success! Anonymous user confirmed in database.');
    } else {
      throw new Error('❌ Verification failed. Anonymous user not found in database.');
    }

    // Force connection flush
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }

  console.log('🎉 Database seed completed and verified successfully');
}

seed()
  .catch((e) => {
    console.error('❌ Fatal seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Ensure connection is properly closed
    await prisma.$disconnect();
  });
