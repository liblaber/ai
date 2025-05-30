import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ConditionalWrapper } from '@/components/hoc/conditional-wrapper/conditional-wrapper';
import React from 'react';

type UniversalTableCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  CardHeaderComponent?: React.ReactElement;
  CardFooterComponent?: React.ReactElement;
  className?: string;
};

const UniversalTableCard = ({
  title,
  description,
  children,
  CardHeaderComponent,
  CardFooterComponent,
  className,
}: UniversalTableCardProps) => {
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
        <div className="rounded-md border">{children}</div>
      </CardContent>
      {CardFooterComponent && <CardFooter>{CardFooterComponent}</CardFooter>}
    </Card>
  );
};

export { UniversalTableCard };
