import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { UniversalChartCard } from '@/components/building-blocks/universal-chart-card/universal-chart-card';

export const userGrowthQuery = `
  SELECT
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as new_users
  FROM users
  WHERE
    created_at >= NOW() - INTERVAL '6 months'
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY month ASC
`;

export type UserGrowthData = {
  month: string;
  new_users: number;
};

interface UserGrowthChartProps {
  data: UserGrowthData[];
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
  }));

  const chartConfig = {
    new_users: {
      label: 'New Users',
      color: 'var(--chart-1)',
    },
  };

  return (
    <UniversalChartCard
      title="User Growth Over Time"
      description="New user registrations by month"
      chartConfig={chartConfig}
    >
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="new_users"
            stroke="var(--chart-1-stroke)"
            fill="var(--chart-1)"
            fillOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </UniversalChartCard>
  );
}
