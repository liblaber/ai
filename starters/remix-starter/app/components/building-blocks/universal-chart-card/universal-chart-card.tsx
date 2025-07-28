import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer } from '@/components/ui/chart';
import { UniversalChart } from '../universal-chart/universal-chart';
import { ConditionalWrapper } from '@/components/hoc/conditional-wrapper/conditional-wrapper';
import React from 'react';

type UniversalChartCardProps = {
  title: string;
  description?: string;
  chartConfig?: ChartConfig;
  children: React.ComponentProps<typeof ChartContainer>['children'];
  CardHeaderComponent?: React.ReactElement;
  CardFooterComponent?: React.ReactElement;
  className?: string;
};

const UniversalChartCard = ({
  title,
  description,
  children,
  chartConfig,
  CardHeaderComponent,
  CardFooterComponent,
  className,
}: UniversalChartCardProps) => {
  const shouldDisplayCardHeader = !!CardHeaderComponent || !!title || !!description;
  const shouldJustfyWrap = (!!CardHeaderComponent && !!title) || (!!CardHeaderComponent && !!description);
  return (
    <Card className={className}>
      {shouldDisplayCardHeader && (
        <CardHeader>
          <ConditionalWrapper
            condition={shouldJustfyWrap}
            wrapper={(children) => <div className="flex gap-2 justify-between items-center">{children}</div>}
          >
            <React.Fragment>
              <div>
                <CardTitle className="leading-relaxed">{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
              </div>
              {CardHeaderComponent}
            </React.Fragment>
          </ConditionalWrapper>
        </CardHeader>
      )}
      <CardContent>
        <ConditionalWrapper
          condition={!!chartConfig}
          wrapper={(children) => <UniversalChart chartConfig={chartConfig!}>{children}</UniversalChart>}
        >
          {children}
        </ConditionalWrapper>
      </CardContent>
      {CardFooterComponent && <CardFooter>{CardFooterComponent}</CardFooter>}
    </Card>
  );
};

export { UniversalChartCard };
