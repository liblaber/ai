import { json } from '@remix-run/cloudflare';
import { DataAccessor } from '@liblab/data-access/dataAccessor';

export async function loader() {
  const databaseTypes = DataAccessor.getAvailableDatabaseTypes();
  return json(databaseTypes);
}
