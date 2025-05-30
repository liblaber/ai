// Database enum constants to replace Prisma enums for SQLite compatibility

export const MESSAGE_ROLE = {
  USER: 'USER',
  AGENT: 'AGENT',
} as const;

export type MessageRole = (typeof MESSAGE_ROLE)[keyof typeof MESSAGE_ROLE];

export const SSL_MODE = {
  DISABLE: 'DISABLE',
  ALLOW: 'ALLOW',
  PREFER: 'PREFER',
  REQUIRE: 'REQUIRE',
  VERIFY_CA: 'VERIFY_CA',
  VERIFY_FULL: 'VERIFY_FULL',
} as const;

export type SSLMode = (typeof SSL_MODE)[keyof typeof SSL_MODE];
