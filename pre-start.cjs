require('dotenv').config();

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

const LOCALTUNNEL_LOG_FILE = './localtunnel.log';
const LOCALTUNNEL_PROCESS_PORT = 3000;

const setupLocaltunnelTunnel = () => {
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
    let forwardingUrl;

    while (attempts < 10 && !forwardingUrl) {
      try {
        const logContent = fs.readFileSync(LOCALTUNNEL_LOG_FILE, 'utf8');

        const logLines = logContent.trim().split('\n');

        for (const line of logLines) {
          try {
            // Look for the localtunnel URL in the log output
            // localtunnel typically outputs something like: "your url is: https://abc123.loca.lt"
            if (line.includes('your url is:') || line.includes('https://')) {
              const urlMatch = line.match(/https:\/\/[^\s]+/);
              if (urlMatch) {
                forwardingUrl = urlMatch[0];
                break;
              }
            }
          } catch (e) {
            console.error('Error parsing log line:', e.message);
            console.error(e);
          }
        }

        if (forwardingUrl) {
          console.log(`🌐 Localtunnel Forwarding URL: ${forwardingUrl}`);
          return forwardingUrl;
        }
      } catch (err) {
        console.error('Error reading localtunnel log file:', err.message);
        console.error(err);
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
    console.error('Error setting up localtunnel:', error.message);
    return null;
  }
};

const killPreviousLocaltunnelProcessAndClearLogFile = () => {
  try {
    let processId = null;

    if (os.platform() === 'win32') {
      // Windows: Find process ID by port
      const result = execSync(`netstat -ano | findstr :${LOCALTUNNEL_PROCESS_PORT}`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      }).trim();

      if (result) {
        processId = result.split(/\s+/).pop(); // Last column is the PID
        execSync(`taskkill /PID ${processId} /F`);
        console.log(`Killed process ${processId} on port ${LOCALTUNNEL_PROCESS_PORT}`);
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
    console.warn(`No process found on port ${LOCALTUNNEL_PROCESS_PORT} or failed to kill:`, error.message);
  }

  // Remove log file safely
  try {
    if (fs.existsSync(LOCALTUNNEL_LOG_FILE)) {
      fs.unlinkSync(LOCALTUNNEL_LOG_FILE);
      console.log(`🗡️ Deleted log file: ${LOCALTUNNEL_LOG_FILE}`);
    }
  } catch (error) {
    console.error('Error deleting log file:', error.message);
  }
};

const updateEnvFile = (localtunnelUrl) => {
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

  if (process.env.NEXT_PUBLIC_ENV_NAME === 'local') {
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

    console.log('⏳  Setting up localtunnel...');

    const localtunnelUrl = setupLocaltunnelTunnel();

    if (localtunnelUrl) {
      updateEnvFile(localtunnelUrl);
    }
  }

  console.log('⏳  Please wait until the URL appears here');
  console.log('★═══════════════════════════════════════★');
};

runApp();
