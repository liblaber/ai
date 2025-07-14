import 'dotenv/config';
import { getTelemetry, getTelemetrySync, TelemetryEventType } from '~/lib/telemetry/telemetry-manager';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';

const NGROK_LOG_FILE = './ngrok.log';
const NGROK_PROCESS_PORT = 4040;

const setupNgrokTunnel = (): string | null => {
  const port = process.env.PORT || '5173';

  try {
    killPreviousNgrokProcessAndClearLogFile();
    execSync('sleep 3');
  } catch {
    // no-op
  }

  try {
    console.log(`⚙️ Setting up ngrok tunnel for port ${port}...`);

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
  } catch (error) {
    console.error('Error setting up ngrok tunnel:', (error as Error).message);
    return null;
  }
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
  try {
    let envContent = '';

    if (fs.existsSync('.env')) {
      envContent = fs.readFileSync('.env', 'utf8');
    }

    // Replace existing VITE_NGROK_FORWARDING_URL or add new one
    const newEnvContent = envContent.replace(
      /^VITE_TUNNEL_FORWARDING_URL=.*/m,
      `VITE_TUNNEL_FORWARDING_URL=${ngrokUrl}`,
    );

    if (newEnvContent === envContent) {
      // If no replacement was made, append the new variable
      envContent = `${envContent}\nVITE_TUNNEL_FORWARDING_URL=${ngrokUrl}`;
    } else {
      envContent = newEnvContent;
    }

    fs.writeFileSync('.env', envContent.trim() + '\n');
    console.log('👍  Updated .env file with ngrok URL');
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

  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Prisma migrations completed successfully');
  } catch (error) {
    console.error('❌ Error running Prisma migrations:', error);
    process.exit(1);
  }

  if (process.env.VITE_ENV_NAME === 'local') {
    console.log('⏳ Setting up example database...');

    try {
      execSync('node scripts/setup-db.js', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Error setting up example database:', error);
      process.exit(1);
    }

    console.log('🌱 Running database seed...');

    try {
      execSync('npm run prisma:seed', { stdio: 'inherit' });
      console.log('✅ Database seed completed successfully');
    } catch (error) {
      console.error('❌ Error running database seed:', error);
      process.exit(1);
    }

    console.log('⏳  Setting up ngrok tunnel...');

    const ngrokUrl = setupNgrokTunnel();

    if (ngrokUrl) {
      updateEnvFile(ngrokUrl);
    }
  }

  console.log('⏳  Please wait until the URL appears here');
  console.log('★═══════════════════════════════════════★');

  // Track start success
  try {
    const telemetry = await getTelemetry();
    await telemetry.trackEvent(TelemetryEventType.START_SUCCESS);
  } catch (error) {
    console.warn('Failed to track start success:', (error as Error).message);
  }
};

// Add error handling for the entire runApp function
const runAppWithErrorHandling = async (): Promise<void> => {
  try {
    await runApp();
  } catch (error) {
    console.error('❌ Error during app startup:', error);

    try {
      const telemetry = await getTelemetry();
      await telemetry.trackEvent(TelemetryEventType.APP_ERROR, {
        error: (error as Error).message || 'Unknown error',
      });
      await telemetry.shutdown();
    } catch (telemetryError) {
      console.warn('Failed to track start error:', (telemetryError as Error).message);
    }

    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  try {
    const telemetry = getTelemetrySync();

    if (telemetry) {
      await telemetry.shutdown();
    }
  } catch (error) {
    console.warn('Failed to shutdown telemetry:', (error as Error).message);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  try {
    const telemetry = getTelemetrySync();

    if (telemetry) {
      await telemetry.shutdown();
    }
  } catch (error) {
    console.warn('Failed to shutdown telemetry:', (error as Error).message);
  }
  process.exit(0);
});

runAppWithErrorHandling();
