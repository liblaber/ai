import 'dotenv/config';
import { getTelemetry, TelemetryEventType } from '~/lib/telemetry/telemetry-manager';
import { normalizeError } from '~/lib/telemetry/error-utils';
import { execSync } from 'child_process';
import { config } from 'dotenv';
import path from 'path';
import { getInstanceId } from '~/lib/instance-id';

/**
 * Setup for the liblab.ai builder
 */
const runSetup = async (): Promise<void> => {
  try {
    execSync('sh ./scripts/setup.sh', { stdio: 'inherit' });

    const instanceId = getInstanceId();

    reloadEnvFile();

    try {
      const telemetry = await getTelemetry(instanceId);
      await telemetry.trackEvent({ eventType: TelemetryEventType.SETUP_SUCCESS });
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
  const telemetry = await getTelemetry(getInstanceId());

  try {
    const errorInfo = normalizeError(error);

    await telemetry.trackEvent({
      eventType: TelemetryEventType.SETUP_ERROR,
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
