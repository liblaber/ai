/**
 * Extracts the protocol from a database connection string
 * @param connectionString - The database connection string
 * @returns The protocol without the colon (e.g., 'postgres', 'mysql', 'mongodb')
 */
export function getConnectionProtocol(connectionString: string): string {
  const connectionDetails = new URL(connectionString);
  return connectionDetails.protocol.replace(':', '');
}
