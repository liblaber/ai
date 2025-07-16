import 'dotenv/config';
import { getTelemetry, TelemetryEventType } from '~/lib/telemetry/telemetry-manager';
import { normalizeError } from '~/lib/telemetry/error-utils';
import { execSync } from 'child_process';

const runSetup = async (): Promise<void> => {
  console.log('⏳ Running setup script...');

  execSync('sh ./scripts/setup.sh', { stdio: 'inherit' });

  console.log('✅ Setup completed successfully');
};

async function trackSetupError(error: any) {
  const telemetry = await getTelemetry();

  try {
    const errorInfo = normalizeError(error);

    await telemetry.trackEvent({
      eventType: TelemetryEventType.SETUP_ERROR,
      properties: {
        errorMessage: errorInfo.message,
        error: errorInfo,
      },
    });

    await telemetry.flushAndShutdown();

    // Leave some time for telemetry to flush the event before the process exits
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (telemetryError) {
    console.warn('Failed to track setup error:', (telemetryError as Error).message);
  }
}

// Add error handling for the entire runSetup function
const runSetupWithErrorHandling = async (): Promise<void> => {
  try {
    await runSetup();

    try {
      const telemetry = await getTelemetry();
      await telemetry.trackEvent({ eventType: TelemetryEventType.SETUP_SUCCESS });
    } catch (telemetryError) {
      console.warn('Failed to track setup success:', (telemetryError as Error).message);
    }
  } catch (error) {
    console.error('❌ Setup terminated with error:', error);
    await trackSetupError(error);

    process.exit(1);
  }
};

runSetupWithErrorHandling();
