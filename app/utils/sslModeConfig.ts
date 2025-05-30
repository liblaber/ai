import { SSL_MODE } from '~/types/database';

export function getSslModeConfig(sslMode: string) {
  switch (sslMode.toUpperCase()) {
    case SSL_MODE.DISABLE:
      return undefined;
    case SSL_MODE.ALLOW:
    case SSL_MODE.PREFER:
      return { rejectUnauthorized: false };
    case SSL_MODE.REQUIRE:
      return { rejectUnauthorized: true };
    case SSL_MODE.VERIFY_CA:
      return { rejectUnauthorized: true };
    case SSL_MODE.VERIFY_FULL:
      return { rejectUnauthorized: true };
    default:
      return undefined;
  }
}
