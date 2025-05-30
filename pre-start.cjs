require('dotenv').config();

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

const NGROK_LOG_FILE = './ngrok.log';
const NGROK_PROCESS_PORT = 4040;

const setupNgrokTunnel = () => {
  const port = process.env.PORT || 5173;

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
    let forwardingUrl;

    while (attempts < 10 && !forwardingUrl) {
      try {
        const logContent = fs.readFileSync(NGROK_LOG_FILE, 'utf8');

        const logLines = logContent.trim().split('\n');

        for (const line of logLines) {
          try {
            const logEntry = JSON.parse(line);

            if (logEntry.addr && logEntry.url) {
              forwardingUrl = logEntry.url;
              break;
            }
          } catch (e) {
            console.error('Error parsing log line:', e.message);
            console.error(e);
          }
        }

        if (forwardingUrl) {
          console.log(`🌐 Ngrok Forwarding URL: ${forwardingUrl}`);
          return forwardingUrl;
        }
      } catch (err) {
        console.error('Error reading ngrok log file:', err.message);
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
    console.error('Error setting up ngrok tunnel:', error.message);
    return null;
  }
};

const killPreviousNgrokProcessAndClearLogFile = () => {
  try {
    let processId = null;

    if (os.platform() === 'win32') {
      // Windows: Find process ID by port
      const result = execSync(`netstat -ano | findstr :${NGROK_PROCESS_PORT}`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      }).trim();

      if (result) {
        processId = result.split(/\s+/).pop(); // Last column is the PID
        execSync(`taskkill /PID ${processId} /F`);
        console.log(`Killed process ${processId} on port ${NGROK_PROCESS_PORT}`);
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
    console.warn(`No process found on port ${NGROK_PROCESS_PORT} or failed to kill:`, error.message);
  }

  // Remove log file safely
  try {
    if (fs.existsSync(NGROK_LOG_FILE)) {
      fs.unlinkSync(NGROK_LOG_FILE);
      console.log(`🗡️ Deleted log file: ${NGROK_LOG_FILE}`);
    }
  } catch (error) {
    console.error('Error deleting log file:', error.message);
  }
};

const updateEnvFile = (ngrokUrl) => {
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

const runApp = async () => {
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
    console.log('⏳  Setting up ngrok tunnel...');

    const ngrokUrl = await setupNgrokTunnel();

    if (ngrokUrl) {
      updateEnvFile(ngrokUrl);
    }
  }

  console.log('⏳  Please wait until the URL appears here');
  console.log('★═══════════════════════════════════════★');
};

runApp();
