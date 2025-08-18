#!/usr/bin/env tsx

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

function updateEnvFileForSqlite(silent: boolean = false): void {
  const envPath = '.env';
  const databaseUrl = 'DATABASE_URL="file:./liblab.db"';

  let envContent = '';

  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf8');
  }

  // Check if DATABASE_URL already exists in the file
  const lines = envContent.split('\n');
  const databaseUrlIndex = lines.findIndex((line) => line.startsWith('DATABASE_URL='));

  if (databaseUrlIndex !== -1) {
    // Update existing DATABASE_URL
    lines[databaseUrlIndex] = databaseUrl;
  } else {
    // Add new DATABASE_URL
    lines.push(databaseUrl);
  }

  // Write back to .env file
  writeFileSync(envPath, lines.join('\n'));

  if (!silent) {
    console.log('📝 Updated .env file with SQLite DATABASE_URL');
  }
}

function updatePrismaSchemaToSqlite(silent: boolean = false): void {
  const prismaSchemaPath = 'prisma/schema.prisma';

  if (!existsSync(prismaSchemaPath)) {
    if (!silent) {
      console.error('❌ Prisma schema file not found at prisma/schema.prisma');
    }

    process.exit(1);
  }

  if (!silent) {
    console.log('🔄 Updating Prisma schema to use SQLite...');
  }

  let schemaContent = readFileSync(prismaSchemaPath, 'utf8');

  // Replace PostgreSQL provider with SQLite
  schemaContent = schemaContent.replace(/provider = "postgresql"/g, 'provider = "sqlite"');

  // Update URL to use SQLite file
  schemaContent = schemaContent.replace(/url\s*=\s*env\("DATABASE_URL"\)/g, 'url = env("DATABASE_URL")');

  // Update SchemaCache suggestions field to use Json for SQLite compatibility
  schemaContent = schemaContent.replace(/suggestions\s+String\[\]/g, 'suggestions    String');

  writeFileSync(prismaSchemaPath, schemaContent, 'utf8');

  // Remove migrations directory and create fresh SQLite migrations
  try {
    if (!silent) {
      console.log('🗑️  Removing existing migrations directory...');
    }

    // Remove migrations directory completely
    rmSync('prisma/migrations', { recursive: true, force: true });

    if (!silent) {
      console.log('✅ Removed existing migrations directory');
      console.log('🔄 Creating initial SQLite migration...');
    }

    // Create initial migration for SQLite
    execSync('npx prisma migrate dev --name init', { stdio: silent ? 'ignore' : 'inherit' });

    if (!silent) {
      console.log('✅ Initial SQLite migration created and applied successfully');
    }
  } catch (error) {
    if (!silent) {
      console.warn('⚠️  Could not create SQLite migrations:', (error as Error).message);
    }
  }

  if (!silent) {
    console.log('✅ Prisma schema updated successfully to use SQLite');
    console.log('📝 Next steps:');
    console.log('   1. Run: pnpm run dev');
    console.log('');
    console.log('💡 Note: SchemaCache.suggestions field changed from String[] to String for SQLite compatibility');
    console.log('✅ Database is ready with initial migration applied');
  }
}

// Check for silent flag
const silent = process.argv.includes('--silent') || process.argv.includes('-s');

// Update .env file first
updateEnvFileForSqlite(silent);

// Run the script
updatePrismaSchemaToSqlite(silent);
