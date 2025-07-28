import { logger } from './logger';

export function injectEnvVariable(content: string, envName: string, envValue: string | undefined) {
  logger.debug(`Updating ${envName} in .env file`);

  if (!envValue) {
    logger.debug(`${envName} not found in environment variables`);
    return content;
  }

  logger.debug(`Updating ${envName} in .env file`);

  if (content.includes(envName)) {
    content = content.replace(new RegExp(`${envName}=.*`), `${envName}=${envValue}`);
  } else {
    content += `\n${envName}=${envValue}`;
  }

  return content.trim() + '\n';
}
