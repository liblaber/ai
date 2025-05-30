import { executePostgresQuery } from '@/db/execute-query';
import { json } from '@remix-run/cloudflare';
import {
  BuildCountData,
  BuildData,
  buildsCountQuery,
  buildsQuery,
  BuildStatus,
} from '@/routes/analytics-dashboard/components/BuildsTable';

export async function action({ request }: { request: Request }) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const status = formData.get('status') as BuildStatus;
    const page = parseInt(formData.get('page') as string) || 1;
    const limit = parseInt(formData.get('limit') as string) || 10;
    const offset = (page - 1) * limit;

    if (!status) {
      return json({
        isError: true,
        errorMessage: 'Status is required',
      });
    }

    const buildsCount = await executePostgresQuery<BuildCountData>(buildsCountQuery, [status]);
    if (buildsCount.isError) {
      return json(buildsCount);
    }

    const builds = await executePostgresQuery<BuildData>(buildsQuery, [status, limit.toString(), offset.toString()]);
    if (builds.isError) {
      return json(builds);
    }

    return json({
      data: {
        builds: builds.data,
        buildsCount: buildsCount.data[0].total,
      },
      isError: false,
    });
  } catch (error) {
    console.error('Error fetching builds:', error);
    return json({ error: 'Failed to fetch builds' }, { status: 500 });
  }
}
