import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { UniversalChartCard } from '@/components/building-blocks/universal-chart-card/universal-chart-card';

export const signupMethodQuery = `
        SELECT
          signup_method,
          COUNT(*) as count
        FROM users
        GROUP BY signup_method
      `;

export type SignupMethodData = {
  signup_method: string;
  count: number;
};

interface SignupMethodChartProps {
  data: SignupMethodData[];
}

export function SignupMethodChart({ data }: SignupMethodChartProps) {
  const chartConfig = {
    count: {
      label: 'Users',
      color: 'var(--chart-7)',
    },
  };

  return (
    <UniversalChartCard
      title="Users by Signup Method"
      description="Distribution of user signup methods"
      chartConfig={chartConfig}
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="signup_method" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" stroke="var(--chart-7-stroke)" fill="var(--chart-7)" />
        </BarChart>
      </ResponsiveContainer>
    </UniversalChartCard>
  );
}
