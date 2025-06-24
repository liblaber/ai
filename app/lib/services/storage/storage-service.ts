import type { StorageType } from '@prisma/client';

export interface StorageService {
  /**
   * Returns the storage type of the service.
   * @returns {StorageType} The storage type of the service.
   */
  getStorageType(): StorageType;

  /**
   * Saves the data to the storage service.
   * @param {string} key - The key to save the data to.
   * @param {Buffer} data - The data to save.
   * @returns {Promise<Buffer>} The saved data.
   */
  save(key: string, data: Buffer): Promise<void>;

  /**
   * Gets the data from the storage service.
   * @param {string} key - The key to get the data from.
   * @returns {Promise<Buffer>} The data.
   */
  get(key: string): Promise<Buffer>;

  /**
   * Deletes the data from the storage service.
   * @param {string} key - The key to delete the data from.
   * @returns {Promise<void>} The deleted data.
   */
  delete(key: string): Promise<void>;

  /**
   * Deletes all the data from the storage service.
   * @param {string} parentKey - The parent key to delete the data from.
   * @returns {Promise<void>} The deleted data.
   */
  deleteAll(parentKey: string): Promise<void>;
}
