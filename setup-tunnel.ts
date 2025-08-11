import 'dotenv/config';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';

const CF_LOG_FILE = './cloudflared.log';
const TUNNEL_CONFIG_FILE = './tunnel.config';

const setupCloudflaredTunnel = (): string | null => {
  const port = process.env.PORT || '3000';

  try {
    killPreviousCloudflaredProcessAndClearLogFile();
    execSync('sleep 3');
  } catch {
    // no-op
  }

  console.log(`⚙️ Setting up Cloudflared quick tunnel for port ${port}...`);

  // Start a Cloudflared quick tunnel and redirect logs to a file for parsing
  execSync(`cloudflared tunnel --url http://localhost:${port} --no-autoupdate --loglevel info > ${CF_LOG_FILE} 2>&1 &`);

  console.log('⏳  Waiting for Cloudflared to initialize...');
  execSync('sleep 2');

  let attempts = 0;
  let forwardingUrl: string | null = null;

  while (attempts < 10 && !forwardingUrl) {
    try {
      const logContent = fs.readFileSync(CF_LOG_FILE, 'utf8');

      const logLines = logContent.trim().split('\n');

      for (const line of logLines) {
        const match = line.match(/https?:\/\/[^\s]+\.trycloudflare\.com/);

        if (match && match[0]) {
          forwardingUrl = match[0];
          break;
        }
      }

      if (forwardingUrl) {
        console.log(`🌐 Cloudflared Forwarding URL: ${forwardingUrl}`);
        return forwardingUrl;
      }
    } catch (error) {
      console.error('Error reading cloudflared log file:', error);
    }

    console.log('Waiting for Cloudflared URL...');
    execSync('sleep 1');
    attempts++;
  }

  if (!forwardingUrl) {
    console.log('Could not get Cloudflared URL after multiple attempts. Check if cloudflared is running properly.');
    return null;
  }

  return forwardingUrl;
};

const killPreviousCloudflaredProcessAndClearLogFile = (): void => {
  try {
    if (os.platform() === 'win32') {
      // Best-effort kill on Windows
      execSync('taskkill /IM cloudflared.exe /F', { stdio: 'ignore' });
    } else {
      // Best-effort kill on Unix/macOS
      execSync('pkill -f cloudflared || true', { stdio: 'ignore' });
    }
  } catch {
    // ignore errors
  }

  // Remove log file safely
  try {
    if (fs.existsSync(CF_LOG_FILE)) {
      fs.unlinkSync(CF_LOG_FILE);
      console.log(`🗡️ Deleted log file: ${CF_LOG_FILE}`);
    }
  } catch (error) {
    console.error('Error deleting log file:', (error as Error).message);
  }
};

const updateTunnelConfigFile = (tunnelUrl: string): void => {
  fs.writeFileSync(TUNNEL_CONFIG_FILE, tunnelUrl.trim());
  console.log('👍  Updated tunnel.config file with Cloudflared URL');
};

const runTunnelSetup = async (): Promise<void> => {
  if (process.env.NEXT_PUBLIC_ENV_NAME === 'local') {
    console.log(`
★═══════════════════════════════════════★
        🦙 liblab tunnel setup 🦙
★═══════════════════════════════════════★
`);

    const tunnelUrl = setupCloudflaredTunnel();

    if (tunnelUrl) {
      updateTunnelConfigFile(tunnelUrl);
    }
  }

  console.log('⏳  Tunnel setup completed');
  console.log('★═══════════════════════════════════════★');
};

runTunnelSetup();
