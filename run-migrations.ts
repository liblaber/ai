import 'dotenv/config';
import { getTelemetry, TelemetryEventType } from '~/lib/telemetry/telemetry-manager';
import { normalizeError } from '~/lib/telemetry/error-utils';
import { execSync } from 'child_process';

const runMigrations = async (): Promise<void> => {
  console.log(`
★═══════════════════════════════════════★
        🦙 liblab migrations 🦙
★═══════════════════════════════════════★
`);

  // Run Prisma migrations
  console.log('⏳ Running Prisma migrations...');

  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('✅ Prisma migrations completed successfully');

  if (process.env.NEXT_PUBLIC_ENV_NAME === 'local') {
    console.log('⏳ Setting up sample database...');

    execSync('tsx scripts/setup-sample-db.ts', { stdio: 'inherit' });

    console.log('🌱 Running database seed...');

    execSync('npm run prisma:seed', { stdio: 'inherit' });
  }

  console.log('⏳  Migrations completed successfully');
};

async function trackAppError(error: any) {
  const telemetry = await getTelemetry();

  try {
    const errorInfo = normalizeError(error);

    await telemetry.trackTelemetryEvent({
      eventType: TelemetryEventType.APP_ERROR,
      properties: {
        errorMessage: errorInfo.message,
        error: errorInfo,
      },
    });

    telemetry.shutdown();

    // Leave some time for telemetry to flush the event before the process exits
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (telemetryError) {
    console.warn('Failed to track start error:', (telemetryError as Error).message);
  }
}

// Add error handling for the entire runMigrations function
const runMigrationsWithErrorHandling = async (): Promise<void> => {
  try {
    await runMigrations();
  } catch (error) {
    await trackAppError(error);

    process.exit(1);
  }
};

runMigrationsWithErrorHandling();
