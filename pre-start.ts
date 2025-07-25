import 'dotenv/config';
import { getTelemetry, TelemetryEventType } from '~/lib/telemetry/telemetry-manager';
import { normalizeError } from '~/lib/telemetry/error-utils';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import { getInstanceId } from '~/lib/instance-id';

const NGROK_LOG_FILE = './ngrok.log';
const NGROK_PROCESS_PORT = 4040;

const setupNgrokTunnel = (): string | null => {
  const port = process.env.PORT || '3000';

  try {
    killPreviousNgrokProcessAndClearLogFile();
    execSync('sleep 3');
  } catch {
    // no-op
  }

  console.log(`⚙️ Setting up ngrok tunnel for port ${port}...`);

  if (!process.env.NGROK_AUTHTOKEN) {
    console.error('❌ NGROK_AUTHTOKEN is required but not found in environment variables');

    process.exit(1);
  }

  execSync(`ngrok config add-authtoken ${process.env.NGROK_AUTHTOKEN || ''}`, { stdio: 'pipe' });

  execSync(
    `ngrok http ${port} --response-header-add "Access-Control-Allow-Origin: *" --log=stdout --log-format=json > ${NGROK_LOG_FILE} 2>&1 &`,
  );

  console.log('⏳  Waiting for ngrok to initialize...');
  execSync('sleep 2');

  let attempts = 0;
  let forwardingUrl: string | null = null;

  while (attempts < 10 && !forwardingUrl) {
    try {
      const logContent = fs.readFileSync(NGROK_LOG_FILE, 'utf8');

      const logLines = logContent.trim().split('\n');

      for (const line of logLines) {
        try {
          const logEntry = JSON.parse(line) as { addr?: string; url?: string };

          if (logEntry.addr && logEntry.url) {
            forwardingUrl = logEntry.url;
            break;
          }
        } catch (e) {
          console.error('Error parsing log line:', (e as Error).message);
          console.error(e);
        }
      }

      if (forwardingUrl) {
        console.log(`🌐 Ngrok Forwarding URL: ${forwardingUrl}`);
        return forwardingUrl;
      }
    } catch (err) {
      console.error('Error reading ngrok log file:', (err as Error).message);
      console.error(err);
    }

    console.log('Waiting for ngrok URL...');
    execSync('sleep 1');
    attempts++;
  }

  if (!forwardingUrl) {
    console.log('Could not get ngrok URL after multiple attempts. Check if ngrok is running properly.');
    return null;
  }

  return forwardingUrl;
};

const killPreviousNgrokProcessAndClearLogFile = (): void => {
  try {
    let processId: string | null = null;

    if (os.platform() === 'win32') {
      // Windows: Find process ID by port
      const result = execSync(`netstat -ano | findstr :${NGROK_PROCESS_PORT}`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      }).trim();

      if (result) {
        processId = result.split(/\s+/).pop() || null; // The Last column is the PID

        if (processId) {
          execSync(`taskkill /PID ${processId} /F`);
          console.log(`Killed process ${processId} on port ${NGROK_PROCESS_PORT}`);
        }
      }
    } else {
      // Unix/macOS: Find process ID and kill
      processId = execSync(`lsof -t -i:${NGROK_PROCESS_PORT} || echo ""`, { encoding: 'utf-8' }).trim();

      if (processId) {
        execSync(`kill ${processId}`);
        console.log(`Killed process ${processId} on port ${NGROK_PROCESS_PORT}`);
      }
    }
  } catch (error) {
    console.warn(`No process found on port ${NGROK_PROCESS_PORT} or failed to kill:`, (error as Error).message);
  }

  // Remove log file safely
  try {
    if (fs.existsSync(NGROK_LOG_FILE)) {
      fs.unlinkSync(NGROK_LOG_FILE);
      console.log(`🗡️ Deleted log file: ${NGROK_LOG_FILE}`);
    }
  } catch (error) {
    console.error('Error deleting log file:', (error as Error).message);
  }
};

const updateEnvFile = (ngrokUrl: string): void => {
  let envContent = '';

  if (fs.existsSync('.env')) {
    envContent = fs.readFileSync('.env', 'utf8');
  }

  // Replace existing NEXT_PUBLIC_TUNNEL_FORWARDING_URL or add new one
  const newEnvContent = envContent.replace(
    /^NEXT_PUBLIC_TUNNEL_FORWARDING_URL=.*/m,
    `NEXT_PUBLIC_TUNNEL_FORWARDING_URL=${ngrokUrl}`,
  );

  if (newEnvContent === envContent) {
    // If no replacement was made, append the new variable
    envContent = `${envContent}\nNEXT_PUBLIC_TUNNEL_FORWARDING_URL=${ngrokUrl}`;
  } else {
    envContent = newEnvContent;
  }

  fs.writeFileSync('.env', envContent.trim() + '\n');
  console.log('👍  Updated .env file with ngrok URL');
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

    const ngrokUrl = setupNgrokTunnel();

    if (ngrokUrl) {
      updateEnvFile(ngrokUrl);
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
