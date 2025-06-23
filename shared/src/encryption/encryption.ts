import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const AES_ALGORITHM = 'aes-256-gcm';
const IV_SIZE = 12; // 96 bits for GCM

export function encryptData(encryptionKey: string, data: Buffer): string {
  if (!encryptionKey) {
    throw new Error('Encryption key must be set and must be a base64-encoded 32-byte key.');
  }

  const iv = randomBytes(IV_SIZE);
  const cipher = createCipheriv(AES_ALGORITHM, Buffer.from(encryptionKey, 'base64'), iv);

  const encryptedData = Buffer.concat([cipher.update(data), cipher.final()]);

  const authTag = cipher.getAuthTag();

  const result = {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    encryptedData: encryptedData.toString('base64'),
  };

  return JSON.stringify(result);
}

export function decryptData(encryptionKey: string, encryptedData: string) {
  const { iv, authTag, encryptedData: data } = JSON.parse(encryptedData);

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY must be set and must be a base64-encoded 32-byte key.');
  }

  // Create decipher
  const decipher = createDecipheriv(AES_ALGORITHM, Buffer.from(encryptionKey, 'base64'), Buffer.from(iv, 'base64'));

  // Set auth tag
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  // Decrypt the data
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]);
}
