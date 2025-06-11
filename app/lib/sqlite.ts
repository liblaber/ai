import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function initExampleDb() {
  const db = await open({
    filename: './examples.db',
    driver: sqlite3.Database,
  });

  return db;
}
