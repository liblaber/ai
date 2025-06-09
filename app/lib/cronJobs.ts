import cron from 'node-cron';
import { logger } from '~/utils/logger';
import { userService } from './services/userService';
import { env } from '~/lib/config/env';
import pg from 'pg';

let isInitialized = false;

export function initializeCronJobs() {
  if (isInitialized) {
    console.log('Cron jobs already initialized, skipping...');
    return;
  }

  // Schedule the credits reset to run at midnight every day
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('Starting nightly credits reset...');
      await userService.resetUsersCredits();
      logger.info('Nightly credits reset completed successfully');
    } catch (error) {
      logger.error('Failed to reset credits:', error);
    }
  });

  // Schedule the revenue insertion
  cron.schedule('0 0 * * *', async () => {
    let client: pg.Client | undefined;

    try {
      logger.info('Starting revenue insertion...');

      // Create a client for the example database
      client = new pg.Client({
        host: env.EXAMPLE_DB_HOST,
        port: parseInt(env.EXAMPLE_DB_PORT || '5432'),
        user: env.EXAMPLE_DB_USER,
        password: env.EXAMPLE_DB_PASSWORD,
        database: env.EXAMPLE_DB_DATABASE,
      });

      await client.connect();

      // Insert revenue for each organization
      await client.query(
        `
        WITH org_data AS (
          SELECT organization_id
          FROM organizations
        )
        INSERT INTO revenue (
          organization_id,
          date,
          total_revenue,
          total_cost,
          gross_profit,
          net_profit,
          subscription_revenue,
          product_revenue
        )
        SELECT
          org.organization_id,
          CURRENT_DATE,
          -- Total revenue
          FLOOR(RANDOM() * 4000 + 1000)::DECIMAL(10,2),
          -- Total cost
          FLOOR(RANDOM() * 2200 + 300)::DECIMAL(10,2),
          -- Gross profit
          FLOOR(RANDOM() * 2500 + 500)::DECIMAL(10,2),
          -- Net profit
          FLOOR(RANDOM() * 2000 + 400)::DECIMAL(10,2),
          -- Subscription revenue
          FLOOR(RANDOM() * 500 + 499.99)::DECIMAL(10,2),
          -- Product revenue
          FLOOR(RANDOM() * 4000 + 500)::DECIMAL(10,2)
        FROM org_data org
      `,
      );

      logger.info('Revenue insertion completed successfully');
    } catch (error) {
      logger.error('Failed to insert revenue:', error);
    } finally {
      await client?.end();
    }
  });

  isInitialized = true;

  logger.info('Cron jobs initialized successfully');
}
