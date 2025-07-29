import 'dotenv/config';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';

const NGROK_LOG_FILE = './ngrok.log';
const NGROK_PROCESS_PORT = 4040;
const TUNNEL_CONFIG_FILE = './tunnel.config';

const setupNgrokTunnel = (): string | null => {
  const port = process.env.PORT || '3000';

  try {
    killPreviousNgrokProcessAndClearLogFile();
    execSync('sleep 3');
  } catch {
    // no-op
  }

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

const updateTunnelConfigFile = (ngrokUrl: string): void => {
  fs.writeFileSync(TUNNEL_CONFIG_FILE, ngrokUrl.trim());
  console.log('👍  Updated tunnel.config file with ngrok URL');
};

const runTunnelSetup = async (): Promise<void> => {
  console.log(`
★═══════════════════════════════════════★
        🦙 liblab tunnel setup 🦙
★═══════════════════════════════════════★
`);

  if (process.env.NEXT_PUBLIC_ENV_NAME === 'local') {
    const ngrokUrl = setupNgrokTunnel();

    if (ngrokUrl) {
      updateTunnelConfigFile(ngrokUrl);
    }
  }

  console.log('⏳  Tunnel setup completed');
  console.log('★═══════════════════════════════════════★');
};

runTunnelSetup();
