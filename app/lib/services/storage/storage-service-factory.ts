import { StorageType } from '@prisma/client';
import type { StorageService } from './storage-service';
import { LocalSystemStorageService } from './file-system-storage-service';

export class StorageServiceFactory {
  private static _instances: Map<StorageType, StorageService> = new Map();

  private static _storageType: StorageType = (process.env.STORAGE_TYPE as StorageType) || StorageType.FILE_SYSTEM;

  static get(): StorageService {
    if (!this._instances.has(this._storageType)) {
      switch (this._storageType) {
        case StorageType.FILE_SYSTEM:
          this._instances.set(this._storageType, new LocalSystemStorageService());
          break;
        default:
          throw new Error(`Unsupported storage type: ${this._storageType}`);
      }
    }

    return this._instances.get(this._storageType)!;
  }
}
