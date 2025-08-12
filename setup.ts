import 'dotenv/config';
import { execSync } from 'child_process';
import { config } from 'dotenv';
import path from 'path';

/**
 * Setup for the liblab.ai builder
 */
const runSetup = async (): Promise<void> => {
  try {
    execSync('tsx ./scripts/setup.ts', { stdio: 'inherit' });

    reloadEnvFile();

    try {
      const telemetryModule = await import('~/lib/telemetry/telemetry-manager');
      const telemetry = await telemetryModule.getTelemetry();
      await telemetry.trackTelemetryEvent({ eventType: telemetryModule.TelemetryEventType.SETUP_SUCCESS });
    } catch (telemetryError) {
      console.warn('Failed to track setup success:', (telemetryError as Error).message);
    }
  } catch (error) {
    await trackSetupError(error);

    process.exit(1);
  }
};

runSetup();

function reloadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  config({ path: envPath });
}

async function trackSetupError(error: any) {
  try {
    const telemetryModule = await import('~/lib/telemetry/telemetry-manager');
    const errorUtilsModule = await import('~/lib/telemetry/error-utils');

    const telemetry = await telemetryModule.getTelemetry();
    const errorInfo = errorUtilsModule.normalizeError(error);

    await telemetry.trackTelemetryEvent({
      eventType: telemetryModule.TelemetryEventType.SETUP_ERROR,
      properties: {
        errorMessage: errorInfo.message,
        error: errorInfo,
      },
    });

    telemetry.shutdown();

    // Leave some time for telemetry to flush the event before the process exits
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (telemetryError) {
    console.warn('Failed to track setup error:', (telemetryError as Error).message);
  }
}
