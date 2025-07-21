import { config } from 'dotenv';
import { execSync } from 'child_process';
import fs, { existsSync, readFileSync, unlinkSync } from 'fs';
import { platform } from 'os';
import 'dotenv/config';
import { getTelemetry, TelemetryEventType } from '~/lib/telemetry/telemetry-manager';
import { normalizeError } from '~/lib/telemetry/error-utils';
import { getInstanceId } from '~/lib/instance-id';

config();

const LOCALTUNNEL_LOG_FILE = './localtunnel.log';
const LOCALTUNNEL_PROCESS_PORT = 3000;

const setupLocaltunnelTunnel = (): string | null => {
  const port = 3000;

  try {
    killPreviousLocaltunnelProcessAndClearLogFile();
    execSync('sleep 3');
  } catch {
    // no-op
  }

  try {
    console.log(`⚙️ Setting up localtunnel for port ${port}...`);

    execSync(`lt --port ${port} --log=stdout > ${LOCALTUNNEL_LOG_FILE} 2>&1 &`);

    console.log('⏳  Waiting for localtunnel to initialize...');
    execSync('sleep 2');

    let attempts = 0;
    let forwardingUrl: string | undefined;

    while (attempts < 10 && !forwardingUrl) {
      try {
        const logContent = readFileSync(LOCALTUNNEL_LOG_FILE, 'utf8');

        const logLines = logContent.trim().split('\n');

        for (const line of logLines) {
          try {
            /*
             * Look for the localtunnel URL in the log output
             * localtunnel typically outputs something like: "your url is: https://abc123.loca.lt"
             */
            if (line.includes('your url is:') || line.includes('https://')) {
              const urlMatch = line.match(/https:\/\/[^\s]+/);

              if (urlMatch) {
                forwardingUrl = urlMatch[0];
                break;
              }
            }
          } catch (e) {
            const error = e as Error;
            console.error('Error parsing log line:', error.message);
            console.error(error);
          }
        }

        if (forwardingUrl) {
          console.log(`🌐 Localtunnel Forwarding URL: ${forwardingUrl}`);
          return forwardingUrl;
        }
      } catch (err) {
        const error = err as Error;
        console.error('Error reading localtunnel log file:', error.message);
        console.error(error);
      }

      console.log('Waiting for localtunnel URL...');
      execSync('sleep 1');
      attempts++;
    }

    if (!forwardingUrl) {
      console.log('Could not get localtunnel URL after multiple attempts. Check if localtunnel is running properly.');
      return null;
    }

    return forwardingUrl;
  } catch (error) {
    const err = error as Error;
    console.error('Error setting up localtunnel:', err.message);

    return null;
  }
};

const killPreviousLocaltunnelProcessAndClearLogFile = (): void => {
  try {
    let processId: string | null = null;

    if (platform() === 'win32') {
      // Windows: Find process ID by port
      const result = execSync(`netstat -ano | findstr :${LOCALTUNNEL_PROCESS_PORT}`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      }).trim();

      if (result) {
        processId = result.split(/\s+/).pop() || null; // Last column is the PID

        if (processId) {
          execSync(`taskkill /PID ${processId} /F`);
          console.log(`Killed process ${processId} on port ${LOCALTUNNEL_PROCESS_PORT}`);
        }
      }
    } else {
      // Unix/macOS: Find process ID and kill
      processId = execSync(`lsof -t -i:${LOCALTUNNEL_PROCESS_PORT} || echo ""`, { encoding: 'utf-8' }).trim();

      if (processId) {
        execSync(`kill ${processId}`);
        console.log(`Killed process ${processId} on port ${LOCALTUNNEL_PROCESS_PORT}`);
      }
    }
  } catch (error) {
    const err = error as Error;
    console.warn(`No process found on port ${LOCALTUNNEL_PROCESS_PORT} or failed to kill:`, err.message);
  }

  // Remove log file safely
  try {
    if (existsSync(LOCALTUNNEL_LOG_FILE)) {
      unlinkSync(LOCALTUNNEL_LOG_FILE);
      console.log(`🗡️ Deleted log file: ${LOCALTUNNEL_LOG_FILE}`);
    }
  } catch (error) {
    const err = error as Error;
    console.error('Error deleting log file:', err.message);
  }
};

const updateEnvFile = (localtunnelUrl: string) => {
  try {
    let envContent = '';

    if (fs.existsSync('.env')) {
      envContent = fs.readFileSync('.env', 'utf8');
    }

    // Replace existing NEXT_PUBLIC_TUNNEL_FORWARDING_URL or add new one
    const newEnvContent = envContent.replace(
      /^NEXT_PUBLIC_TUNNEL_FORWARDING_URL=.*/m,
      `NEXT_PUBLIC_TUNNEL_FORWARDING_URL=${localtunnelUrl}`,
    );

    if (newEnvContent === envContent) {
      // If no replacement was made, append the new variable
      envContent = `${envContent}\nNEXT_PUBLIC_TUNNEL_FORWARDING_URL=${localtunnelUrl}`;
    } else {
      envContent = newEnvContent;
    }

    fs.writeFileSync('.env', envContent.trim() + '\n');
    console.log('👍  Updated .env file with localtunnel URL');
  } catch (error) {
    console.error('👎  Error updating .env file:', error);
  }
};

const runApp = async (): Promise<void> => {
  console.log(`
★═══════════════════════════════════════★
          🦙 liblab builder 🦙
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

    console.log('✅ Database seed completed successfully');

    const url = setupLocaltunnelTunnel();

    if (url) {
      updateEnvFile(url);
    }
  }

  console.log('⏳  Please wait until the URL appears here');
  console.log('★═══════════════════════════════════════★');
};

async function trackAppError(error: any) {
  const instanceId = getInstanceId();
  const telemetry = await getTelemetry(instanceId);

  try {
    const errorInfo = normalizeError(error);

    await telemetry.trackEvent({
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
