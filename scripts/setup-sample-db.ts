#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { spinner, log, intro, outro } from '@clack/prompts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface TableInfo {
  name: string;
}

async function setupSampleDatabase(): Promise<void> {
  intro('🗄️  Sample Database Setup');

  const setupSpinner = spinner();
  setupSpinner.start('🔧 Setting up sample database');

  try {
    // Open database connection
    const db = new Database('./sample.db');

    // Quick check if tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as TableInfo[];

    if (tables.length > 0) {
      setupSpinner.stop('✅ Database already initialized');
      db.close();
      outro('🎉 Sample database is ready to use!');

      return;
    }

    // Read and execute the init SQL file
    const initSql = fs.readFileSync(path.join(__dirname, '..', 'init', '01-init.sql'), 'utf-8');
    db.exec(initSql);

    setupSpinner.stop('✅ Database initialized successfully');
    db.close();

    outro('🎉 Sample database setup complete!');
    process.exit(0);
  } catch (error) {
    setupSpinner.stop('❌ Failed to initialize database');
    log.error(`Error: ${error}`);
    process.exit(1);
  }
}

setupSampleDatabase();
