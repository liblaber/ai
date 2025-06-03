import { cleanupDatabaseConnection } from '@/db/execute-query.direct';

let isShuttingDown = false;

export function setupServerLifecycle() {
  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;

    console.log('Received SIGTERM. Cleaning up...');

    try {
      await cleanupDatabaseConnection();
      console.log('Database connection closed successfully');
    } catch (error) {
      console.error('Error during database cleanup:', error);
    }
    process.exit(0);
  });

  // Handle Ctrl+C
  process.on('SIGINT', async () => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;

    console.log('Received SIGINT. Cleaning up...');

    try {
      await cleanupDatabaseConnection();
      console.log('Database connection closed successfully');
    } catch (error) {
      console.error('Error during database cleanup:', error);
    }
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);

    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;

    try {
      await cleanupDatabaseConnection();
      console.log('Database connection closed successfully');
    } catch (cleanupError) {
      console.error('Error during database cleanup:', cleanupError);
    }
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason) => {
    console.error('Unhandled Rejection:', reason);

    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;

    try {
      await cleanupDatabaseConnection();
      console.log('Database connection closed successfully');
    } catch (error) {
      console.error('Error during database cleanup:', error);
    }
    process.exit(1);
  });
}
