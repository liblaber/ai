#!/usr/bin/env tsx

import { DockerContainerManager } from '~/lib/docker/container-manager';
import type { DockerContainer, DockerContainerCreateRequest, DockerContainerEvent } from '~/types/docker';

// Simple logger for testing
const logger = {
  info: (...args: any[]) => console.log('🔵 INFO:', ...args),
  warn: (...args: any[]) => console.log('🟡 WARN:', ...args),
  error: (...args: any[]) => console.log('🔴 ERROR:', ...args),
  debug: (...args: any[]) => console.log('🟣 DEBUG:', ...args),
};

class DockerContainerTester {
  private _containerManager: DockerContainerManager;
  private _containers: Map<string, DockerContainer> = new Map();
  private _monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private _isRunning = true;

  constructor() {
    this._containerManager = new DockerContainerManager();
    this._setupEventListeners();
  }

  private _setupEventListeners(): void {
    // Listen to all container events
    this._containerManager.on('container-created', (event: DockerContainerEvent) => {
      if (event.type === 'container-created') {
        logger.info(`🎉 Container created: ${event.container.name} (${event.container.id})`);
        this._logContainerInfo(event.container);
      }
    });

    this._containerManager.on('container-started', (event: DockerContainerEvent) => {
      if (event.type === 'container-started') {
        logger.info(`🚀 Container started: ${event.container.name} (${event.container.id})`);
        this._logContainerInfo(event.container);
        // Start detailed monitoring for this container
        this._startDetailedMonitoring(event.container.id);
      }
    });

    this._containerManager.on('container-stopped', (event: DockerContainerEvent) => {
      if (event.type === 'container-stopped') {
        logger.warn(`⏹️  Container stopped: ${event.container.name} (${event.container.id})`);
        this._logContainerInfo(event.container);
        // Stop detailed monitoring for this container
        this._stopDetailedMonitoring(event.container.id);
      }
    });

    this._containerManager.on('container-error', (event: DockerContainerEvent) => {
      if (event.type === 'container-error') {
        logger.error(`❌ Container error: ${event.container.name} (${event.container.id})`);
        logger.error(`Error: ${event.error}`);
        this._logContainerInfo(event.container);
      }
    });

    this._containerManager.on('port-ready', (event: DockerContainerEvent) => {
      if (event.type === 'port-ready') {
        logger.info(`🌐 Port ready: ${event.container.name} port ${event.port} -> ${event.url}`);
      }
    });

    this._containerManager.on('logs', (event: DockerContainerEvent) => {
      if (event.type === 'logs') {
        logger.info(`📝 New logs for ${event.container.name}:`);
        event.logs.forEach((log) => {
          const timestamp = log.timestamp.toISOString();
          const stream = log.stream === 'stdout' ? '📤' : '📥';
          logger.info(`  ${stream} [${timestamp}] ${log.message}`);
        });
      }
    });
  }

  private _logContainerInfo(container: DockerContainer): void {
    logger.info(`Container Info:
    📋 ID: ${container.id}
    🏷️  Name: ${container.name}
    🖼️  Image: ${container.image}
    📊 Status: ${container.status}
    🔌 Ports: ${container.ports.map((p) => `${p.containerPort}:${p.hostPort}/${p.protocol}`).join(', ')}
    💬 Conversation ID: ${container.conversationId}
    📅 Created: ${container.createdAt.toISOString()}
    🔄 Updated: ${container.updatedAt.toISOString()}
    ${container.snapshotId ? `📸 Snapshot: ${container.snapshotId}` : ''}
    `);
  }

  private _startDetailedMonitoring(containerId: string): void {
    logger.info(`🔍 Starting detailed monitoring for container: ${containerId}`);

    const interval = setInterval(async () => {
      if (!this._isRunning) {
        clearInterval(interval);

        return;
      }

      try {
        const container = this._containerManager.getContainer(containerId);

        if (!container) {
          logger.warn(`Container ${containerId} not found, stopping monitoring`);
          clearInterval(interval);

          return;
        }

        // Log current status
        logger.debug(
          `📊 Monitoring ${container.name}: Status=${container.status}, Updated=${container.updatedAt.toISOString()}`,
        );

        // Get recent logs if container is running
        if (container.status === 'running') {
          try {
            const logs = await this._containerManager.getContainerLogs(containerId, 5);

            if (logs.length > 0) {
              logger.debug(`📝 Recent logs for ${container.name}:`);
              logs.slice(-3).forEach((log) => {
                const timestamp = log.timestamp.toISOString();
                const stream = log.stream === 'stdout' ? '📤' : '📥';
                logger.debug(`  ${stream} [${timestamp}] ${log.message}`);
              });
            }
          } catch (error) {
            logger.debug(`Failed to get logs for ${container.name}: ${error}`);
          }

          // Test port connectivity
          for (const port of container.ports) {
            try {
              const response = await fetch(`http://localhost:${port.hostPort}`, {
                method: 'HEAD',
                signal: AbortSignal.timeout(2000),
              });
              logger.debug(`🌐 Port ${port.hostPort} status: ${response.status} ${response.statusText}`);
            } catch (error) {
              logger.debug(
                `🔌 Port ${port.hostPort} not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`,
              );
            }
          }
        }
      } catch (error) {
        logger.error(`Error monitoring container ${containerId}:`, error);
      }
    }, 10000); // Monitor every 10 seconds

    this._monitoringIntervals.set(containerId, interval);
  }

  private _stopDetailedMonitoring(containerId: string): void {
    const interval = this._monitoringIntervals.get(containerId);

    if (interval) {
      clearInterval(interval);
      this._monitoringIntervals.delete(containerId);
      logger.info(`🔍 Stopped detailed monitoring for container: ${containerId}`);
    }
  }

  async createAndTestContainer(conversationId: string, snapshotId?: string): Promise<DockerContainer> {
    logger.info(`\n🔨 Creating container for conversation: ${conversationId}`);

    const request: DockerContainerCreateRequest = {
      conversationId,
      snapshotId,
    };

    try {
      const container = await this._containerManager.createContainer(request);
      this._containers.set(container.id, container);
      logger.info(`✅ Successfully created container: ${container.name}`);

      return container;
    } catch (error) {
      logger.error(`❌ Failed to create container for conversation ${conversationId}:`, error);
      throw error;
    }
  }

  async startContainer(containerId: string): Promise<DockerContainer> {
    logger.info(`\n🚀 Starting container: ${containerId}`);

    try {
      const container = await this._containerManager.startContainer(containerId);
      this._containers.set(container.id, container);
      logger.info(`✅ Successfully started container: ${container.name}`);

      return container;
    } catch (error) {
      logger.error(`❌ Failed to start container ${containerId}:`, error);
      throw error;
    }
  }

  async testContainerExecution(containerId: string): Promise<void> {
    logger.info(`\n🔧 Testing command execution in container: ${containerId}`);

    const commands = [
      { command: 'pwd', description: 'Check working directory' },
      { command: 'ls -la', description: 'List files' },
      { command: 'node --version', description: 'Check Node.js version' },
      { command: 'npm --version', description: 'Check npm version' },
      { command: 'echo "Hello from container!"', description: 'Test echo command' },
    ];

    for (const cmd of commands) {
      try {
        logger.info(`🔧 Executing: ${cmd.command} (${cmd.description})`);

        const result = await this._containerManager.executeCommand(containerId, {
          command: cmd.command,
          workingDirectory: '/app',
        });

        logger.info(`✅ Command executed successfully:
        Exit Code: ${result.exitCode}
        Stdout: ${result.stdout || '(empty)'}
        Stderr: ${result.stderr || '(empty)'}
        `);
      } catch (error) {
        logger.error(`❌ Command execution failed: ${error}`);
      }
    }
  }

  async testFileUpdates(containerId: string): Promise<void> {
    logger.info(`\n📝 Testing file updates in container: ${containerId}`);

    const newPageContent = `import { HelloWorldTitle } from '@/components/HelloWorldTitle';


interface TitleData {
  title: string;
}


export default async function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center space-y-6 p-8">
        <HelloWorldTitle data={[{ title: 'Update directly to Docker' }]} />
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md mx-auto">
          Welcome to your new Next.js application! This title is dynamically loaded from the database.
        </p>
        <div className="flex justify-center space-x-4">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </main>
  );
}`;

    try {
      // First, let's explore the directory structure
      logger.info(`📂 Exploring directory structure in container ${containerId}`);

      const exploreResult = await this._containerManager.executeCommand(containerId, {
        command: 'ls -la && echo "--- app directory ---" && ls -la app/',
        workingDirectory: '/app',
      });
      logger.info(`📋 Directory structure:\n${exploreResult.stdout}`);

      // Check if the Next.js app/page.tsx file exists
      logger.info(`📂 Checking if app/page.tsx exists in container ${containerId}`);

      const checkResult = await this._containerManager.executeCommand(containerId, {
        command: 'ls -la app/page.tsx',
        workingDirectory: '/app',
      });

      if (checkResult.exitCode === 0) {
        logger.info(`✅ Found existing app/page.tsx file`);
      } else {
        logger.info(`📄 app/page.tsx not found, will create it`);
        // Create the app directory if it doesn't exist
        await this._containerManager.executeCommand(containerId, {
          command: 'mkdir -p app',
          workingDirectory: '/app',
        });
      }

      // Create a backup of the original file (if it exists)
      logger.info(`💾 Creating backup of original app/page.tsx`);
      await this._containerManager.executeCommand(containerId, {
        command: 'cp app/page.tsx app/page.tsx.backup 2>/dev/null || echo "No original file to backup"',
        workingDirectory: '/app',
      });

      // Write the new content to app/page.tsx using a here document
      logger.info(`✏️  Writing new content to app/page.tsx`);

      const writeResult = await this._containerManager.executeCommand(containerId, {
        command: `cat > app/page.tsx << 'EOF'
${newPageContent}
EOF`,
        workingDirectory: '/app',
      });

      if (writeResult.exitCode === 0) {
        logger.info(`✅ Successfully wrote new content to page.tsx`);
      } else {
        logger.error(`❌ Failed to write to page.tsx: ${writeResult.stderr}`);
        return;
      }

      // Verify the file was updated by checking its content
      logger.info(`🔍 Verifying file content was updated`);

      const verifyResult = await this._containerManager.executeCommand(containerId, {
        command: 'head -10 app/page.tsx',
        workingDirectory: '/app',
      });

      if (verifyResult.exitCode === 0) {
        logger.info(`✅ File content verification:
${verifyResult.stdout}`);
      } else {
        logger.error(`❌ Failed to verify file content: ${verifyResult.stderr}`);
      }

      // Check file size and modification time
      logger.info(`📊 Checking file stats`);

      const statsResult = await this._containerManager.executeCommand(containerId, {
        command: 'ls -lh app/page.tsx',
        workingDirectory: '/app',
      });

      if (statsResult.exitCode === 0) {
        logger.info(`📈 File stats: ${statsResult.stdout}`);
      }

      // Test if the file contains our specific content
      logger.info(`🔎 Searching for specific content in the file`);

      const searchResult = await this._containerManager.executeCommand(containerId, {
        command: 'grep -n "Update directly to Docker" app/page.tsx',
        workingDirectory: '/app',
      });

      if (searchResult.exitCode === 0) {
        logger.info(`✅ Found expected content: ${searchResult.stdout}`);
      } else {
        logger.warn(`⚠️  Expected content not found in file`);
      }
    } catch (error) {
      logger.error(`❌ File update test failed: ${error}`);
    }
  }

  async logAllContainersStatus(): Promise<void> {
    logger.info(`\n📊 Current status of all containers:`);

    const allContainers = this._containerManager.getAllContainers();

    if (allContainers.length === 0) {
      logger.info('No containers found');

      return;
    }

    allContainers.forEach((container: DockerContainer, index: number) => {
      logger.info(`\n📦 Container ${index + 1}:`);
      this._logContainerInfo(container);
    });
  }

  async cleanup(): Promise<void> {
    logger.info(`\n🧹 Cleaning up containers...`);
    this._isRunning = false;

    // Stop all monitoring intervals
    for (const [containerId, interval] of this._monitoringIntervals) {
      clearInterval(interval);
      logger.info(`Stopped monitoring for container: ${containerId}`);
    }
    this._monitoringIntervals.clear();

    // Stop and destroy all containers
    for (const [containerId, container] of this._containers) {
      try {
        logger.info(`🛑 Stopping and destroying container: ${container.name}`);
        await this._containerManager.destroyContainer(containerId);
        logger.info(`✅ Successfully destroyed container: ${container.name}`);
      } catch (error) {
        logger.error(`❌ Failed to destroy container ${container.name}:`, error);
      }
    }

    this._containers.clear();

    logger.info(`🧹 Cleanup completed`);
  }

  async runTest(): Promise<void> {
    logger.info(`🚀 Starting Docker Container Manager Test`);
    logger.info(`====================================\n`);

    try {
      // Test 1: Create two containers with different conversation IDs
      logger.info(`🧪 Test 1: Creating containers`);

      const container1 = await this.createAndTestContainer('conversation-1', 'snapshot-abc123');
      const container2 = await this.createAndTestContainer('conversation-2', 'snapshot-def456');

      // Wait a bit before starting
      await this._sleep(2000);

      // Test 2: Start both containers
      logger.info(`\n🧪 Test 2: Starting containers`);
      await this.startContainer(container1.id);
      await this.startContainer(container2.id);

      // Wait for containers to start up
      await this._sleep(20000);

      // Test 3: Log status of all containers
      await this.logAllContainersStatus();

      // Test 4: Execute commands in both containers
      logger.info(`\n🧪 Test 4: Testing command execution`);
      await this.testContainerExecution(container1.id);
      await this.testContainerExecution(container2.id);

      // Test 5: Test file updates in both containers
      logger.info(`\n🧪 Test 5: Testing file updates`);
      await this.testFileUpdates(container1.id);
      await this.testFileUpdates(container2.id);

      // Test 6: Monitor containers for a while
      logger.info(`\n🧪 Test 6: Monitoring containers for 30 seconds...`);
      logger.info(`(You can see real-time monitoring data above)`);
      await this._sleep(30000);

      // Final status check
      await this.logAllContainersStatus();
    } catch (error) {
      logger.error(`❌ Test failed:`, error);
    } finally {
      // Always cleanup
      await this.cleanup();
    }
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Main execution
async function main() {
  const tester = new DockerContainerTester();

  try {
    await tester.runTest();
  } catch (error) {
    logger.error('Test execution failed:', error);
    process.exit(1);
  }
}

// Run the test
main().catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});

export { DockerContainerTester };
