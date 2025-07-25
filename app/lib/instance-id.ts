import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const INSTANCE_ID_PATH = path.resolve(process.cwd(), '.instanceid');

export function getInstanceId(): string {
  if (!fs.existsSync(INSTANCE_ID_PATH)) {
    const uuid = randomUUID();
    fs.writeFileSync(INSTANCE_ID_PATH, uuid, 'utf-8');

    return uuid;
  }

  return fs.readFileSync(INSTANCE_ID_PATH, 'utf-8').trim();
}
