import 'dotenv/config';
import { getTelemetry, TelemetryEventType } from '~/lib/telemetry/telemetry-manager';
import { normalizeError } from '~/lib/telemetry/error-utils';
import { execSync } from 'child_process';

const runApp = async (): Promise<void> => {
  console.log(`
★═══════════════════════════════════════★
          🦙 liblab builder 🦙
★═══════════════════════════════════════★
`);

  // Run migrations first
  console.log('⏳ Running database migrations...');
  execSync('tsx run-migrations.ts', { stdio: 'inherit' });

  // Setup tunnel if in local environment
  if (process.env.NEXT_PUBLIC_ENV_NAME === 'local') {
    console.log('⏳ Setting up tunnel...');
    execSync('tsx setup-tunnel.ts', { stdio: 'inherit' });
  }

  console.log('⏳  Please wait until the URL appears here');
  console.log('★═══════════════════════════════════════★');
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

// Add error handling for the entire runApp function
const runAppWithErrorHandling = async (): Promise<void> => {
  try {
    await runApp();
  } catch (error) {
    await trackAppError(error);

    process.exit(1);
  }
};

runAppWithErrorHandling();
