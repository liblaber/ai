import type { StorageService } from './storage-service';
import { StorageType } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

export class LocalSystemStorage implements StorageService {
  private readonly _baseDir: string;

  constructor(baseDir: string = process.cwd()) {
    this._baseDir = baseDir;
  }

  private _getFilePath(key: string): string {
    return path.join(this._baseDir, key);
  }

  getStorageType() {
    return StorageType.FILE_SYSTEM;
  }

  async save(key: string, data: Buffer): Promise<void> {
    const filePath = this._getFilePath(key);
    const dirPath = path.dirname(filePath);

    await fs.mkdir(dirPath, { recursive: true });

    await fs.writeFile(filePath, data);
  }

  async get(key: string): Promise<Buffer> {
    const filePath = this._getFilePath(key);
    return await fs.readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = this._getFilePath(key);
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
