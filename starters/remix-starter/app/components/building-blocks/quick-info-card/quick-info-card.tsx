import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PropsWithChildren } from 'react';
import { UniversalTitle } from '../universal-title/universal-title';
import { LoaderComponent } from '../loader-component/loader-component';

type QuickInfoCardProps = {
  title: string | React.ReactNode;
  description?: string;
  isLoading?: boolean;
  icon?: React.ReactNode;
  footerText?: string;
  className?: string;
};

const QuickInfoCard = ({
  title,
  description,
  isLoading,
  icon,
  footerText,
  children,
  className,
}: PropsWithChildren<QuickInfoCardProps>) => {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <UniversalTitle
          title={<CardTitle className="text-sm font-medium">{title}</CardTitle>}
          description={<CardDescription>{description}</CardDescription>}
        >
          {icon}
        </UniversalTitle>
      </CardHeader>
      <CardContent>{isLoading ? <LoaderComponent /> : children}</CardContent>
      {footerText && <CardFooter>{footerText}</CardFooter>}
    </Card>
  );
};

export { QuickInfoCard };
