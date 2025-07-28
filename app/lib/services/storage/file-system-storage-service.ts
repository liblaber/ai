import type { StorageService } from './storage-service';
import { StorageType } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { decryptData, encryptData } from '@liblab/encryption/encryption';
import '~/lib/config/env';

export class LocalSystemStorageService implements StorageService {
  private readonly _baseDir: string;

  constructor(baseDir: string = process.cwd()) {
    this._baseDir = baseDir;
  }

  getStorageType() {
    return StorageType.FILE_SYSTEM;
  }

  async save(key: string, data: Buffer): Promise<void> {
    const filePath = this._getFilePath(key);
    const dirPath = path.dirname(filePath);

    await fs.mkdir(dirPath, { recursive: true });

    const encryptedData = encryptData(process.env.ENCRYPTION_KEY as string, data);

    await fs.writeFile(filePath, encryptedData);
  }

  async get(key: string): Promise<Buffer> {
    const filePath = this._getFilePath(key);
    const encryptedData = await fs.readFile(filePath);

    return decryptData(process.env.ENCRYPTION_KEY as string, encryptedData.toString());
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

  async deleteAll(parentKey: string): Promise<void> {
    const filePath = this._getFilePath(parentKey);
    await fs.rm(filePath, { recursive: true });
  }

  private _getFilePath(key: string): string {
    return path.join(this._baseDir, key);
  }
}
