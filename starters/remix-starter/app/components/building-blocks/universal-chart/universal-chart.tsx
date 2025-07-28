import { ChartConfig, ChartContainer } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { PropsWithChildren } from 'react';

type UniversalChartProps = {
  chartConfig: ChartConfig;
  className?: string;
  // children is the recharts component with data already passed in
  children: React.ComponentProps<typeof ChartContainer>['children'];
};

const UniversalChart = ({
  chartConfig,
  className,
  // children is the recharts component with data already passed in
  children,
}: PropsWithChildren<UniversalChartProps>) => {
  return (
    <ChartContainer config={chartConfig} className={cn('min-h-0', className)}>
      {children}
    </ChartContainer>
  );
};

export { UniversalChart };
