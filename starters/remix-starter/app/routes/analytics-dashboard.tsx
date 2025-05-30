import { useFetcher } from '@remix-run/react';
import { KeyMetrics, KeyMetricsData, keyMetricsQuery } from '@/routes/analytics-dashboard/components/KeyMetrics';
import {
  SignupMethodChart,
  SignupMethodData,
  signupMethodQuery,
} from '@/routes/analytics-dashboard/components/SignupMethodChart';
import {
  UserGrowthChart,
  UserGrowthData,
  userGrowthQuery,
} from '@/routes/analytics-dashboard/components/UserGrowthChart';
import { BuildData, BuildsTable, BuildStatus } from '@/routes/analytics-dashboard/components/BuildsTable';
import { executePostgresQuery, QueryData } from '@/db/execute-query';
import { LoaderError } from '@/types/loader-error';
import { WithErrorHandling } from '@/components/hoc/error-handling-wrapper/error-handling-wrapper';
import { useEffect } from 'react';

export async function loader(): Promise<AnalyticsDashboardProps | LoaderError> {
  try {
    const [keyMetrics, usersBySignupMethod, userGrowth] = await Promise.all([
      executePostgresQuery<KeyMetricsData>(keyMetricsQuery),
      executePostgresQuery<SignupMethodData>(signupMethodQuery),
      executePostgresQuery<UserGrowthData>(userGrowthQuery),
    ]);

    return {
      keyMetrics,
      usersBySignupMethod,
      userGrowth,
    };
  } catch (error) {
    console.error('Error in dashboard loader:', error);
    return { error: error instanceof Error ? error.message : 'Failed to load dashboard data' };
  }
}

interface AnalyticsDashboardProps {
  keyMetrics: QueryData<KeyMetricsData[]>;
  userGrowth: QueryData<UserGrowthData[]>;
  usersBySignupMethod: QueryData<SignupMethodData[]>;
}

export function AnalyticsDashboard({ keyMetrics, userGrowth, usersBySignupMethod }: AnalyticsDashboardProps) {
  const buildsFetcher = useFetcher<QueryData<{ builds: BuildData[]; buildsCount: number }>>();

  useEffect(() => {
    buildsFetcher.submit({ status: 'SUCCESS' }, { method: 'post', action: '/resources/builds' });
  }, []);

  const handleBuildsTableFiltersChange = (filters: { page: number; status: BuildStatus }): void => {
    buildsFetcher.submit(
      {
        status: filters.status,
        page: filters.page,
      },
      { method: 'post', action: '/resources/builds' },
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>
      <WithErrorHandling queryData={keyMetrics} render={(keyMetricsData) => <KeyMetrics data={keyMetricsData} />} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WithErrorHandling
          queryData={userGrowth}
          render={(userGrowthData) => <UserGrowthChart data={userGrowthData} />}
        />
        <WithErrorHandling
          queryData={usersBySignupMethod}
          render={(usersBySignupMethodData) => <SignupMethodChart data={usersBySignupMethodData} />}
        />
      </div>
      <WithErrorHandling
        queryData={buildsFetcher.data}
        render={(buildsData) => (
          <BuildsTable
            builds={buildsData.builds}
            buildsCount={buildsData.buildsCount}
            isLoading={buildsFetcher.state === 'submitting'}
            onFiltersChange={handleBuildsTableFiltersChange}
          />
        )}
      />
    </div>
  );
}
