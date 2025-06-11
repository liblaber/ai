import { executeQuery } from '@/db/execute-query';
import {
  BuildCountData,
  BuildData,
  buildsCountQuery,
  buildsQuery,
  BuildStatus,
} from '@/routes/analytics-dashboard/components/BuildsTable';

export async function action({ request }: { request: Request }) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const status = formData.get('status') as BuildStatus;
    const page = parseInt(formData.get('page') as string) || 1;
    const limit = parseInt(formData.get('limit') as string) || 10;
    const offset = (page - 1) * limit;

    if (!status) {
      return Response.json({
        isError: true,
        errorMessage: 'Status is required',
      });
    }

    const buildsCount = await executeQuery<BuildCountData>(buildsCountQuery, [status]);

    if (buildsCount.isError) {
      return Response.json(buildsCount);
    }

    const builds = await executeQuery<BuildData>(buildsQuery, [status, limit.toString(), offset.toString()]);

    if (builds.isError) {
      return Response.json(builds);
    }

    return Response.json({
      data: {
        builds: builds.data,
        buildsCount: buildsCount.data[0].total,
      },
      isError: false,
    });
  } catch (error) {
    console.error('Error fetching builds:', error);
    return Response.json({ error: 'Failed to fetch builds' }, { status: 500 });
  }
}
