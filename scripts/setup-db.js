import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setupDatabase() {
  try {
    // Open database connection
    const db = new Database('./example.db');

    // Quick check if tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

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
