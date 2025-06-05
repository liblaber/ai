import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const AES_ALGORITHM = 'aes-256-gcm';
const IV_SIZE = 12; // 96 bits for GCM

export function encryptData(data: any): string {
  // Create cipher

  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY must be set and must be a base64-encoded 32-byte key.');
  }

  const iv = randomBytes(IV_SIZE);
  const cipher = createCipheriv(AES_ALGORITHM, Buffer.from(encryptionKey, 'base64'), iv);

  // Encrypt the data
  const dataBuffer = Buffer.from(JSON.stringify(data));
  const encryptedData = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);

  // Get the auth tag
  const authTag = cipher.getAuthTag();

  // Combine all components
  const result = {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    encryptedData: encryptedData.toString('base64'),
  };

  return JSON.stringify(result);
}

export function decryptData(encryptedData: string): any {
  const { iv, authTag, encryptedData: data } = JSON.parse(encryptedData);

  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY must be set and must be a base64-encoded 32-byte key.');
  }

  // Create decipher
  const decipher = createDecipheriv(AES_ALGORITHM, Buffer.from(encryptionKey, 'base64'), Buffer.from(iv, 'base64'));

  // Set auth tag
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  // Decrypt the data
  const decrypted = Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]);

  return JSON.parse(decrypted.toString());
}
