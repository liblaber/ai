import { SSLMode } from '@prisma/client';

export function getSslModeConfig(sslMode: string) {
  switch (sslMode.toUpperCase()) {
    case SSLMode.DISABLE:
      return undefined;
    case SSLMode.ALLOW:
    case SSLMode.PREFER:
      return { rejectUnauthorized: false };
    case SSLMode.REQUIRE:
      return { rejectUnauthorized: true };
    case SSLMode.VERIFY_CA:
      // TODO: Implement verify-ca mode in future. This will require additional CA certificate configuration.
      return { rejectUnauthorized: true };
    case SSLMode.VERIFY_FULL:
      // TODO: Implement verify-full mode in future. This will require additional CA certificate and hostname verification.
      return { rejectUnauthorized: true };
    default:
      return undefined;
  }
}
