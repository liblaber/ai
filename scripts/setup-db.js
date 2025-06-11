import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setupDatabase() {
  try {
    // Open database connection
    const db = await open({
      filename: './examples.db',
      driver: sqlite3.Database,
    });

    // Quick check if tables exist
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");

    if (tables.length > 0) {
      console.log('✅ Database already initialized');
      await db.close();

      return;
    }

    // Read and execute the init SQL file
    const initSql = fs.readFileSync(path.join(__dirname, '..', 'init', '01-init.sql'), 'utf-8');
    await db.exec(initSql);

    console.log('✅ Database initialized successfully');
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}

setupDatabase();
