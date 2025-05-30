import { ConditionalWrapper } from '@/components/hoc/conditional-wrapper/conditional-wrapper';
import React from 'react';
import { PropsWithChildren } from 'react';

type UniversalTitleProps = {
  // Can pass basically anything as ReactNode, but main intention is to pass in a string or html title element other than h1
  title: React.ReactNode | string;
  description?: React.ReactNode | string;
  IconComponent?: React.ComponentType;
  // Can be use to render stuff on the far right side of the title
  children?: React.ReactNode;
};

const UniversalTitle = ({ title, description, IconComponent, children }: PropsWithChildren<UniversalTitleProps>) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <ConditionalWrapper
        condition={!!IconComponent}
        wrapper={(children) => (
          <div className="flex items-center gap-2">
            {IconComponent && <IconComponent />}
            {children}
          </div>
        )}
      >
        <div>
          <Title title={title} />
          {description && <Description description={description} />}
        </div>
      </ConditionalWrapper>
      {children}
    </div>
  );
};

const Description = ({ description }: { description: React.ReactNode | string }) => {
  return typeof description === 'string' ? <p className="text-sm text-muted-foreground">{description}</p> : description;
};

const Title = ({ title }: { title: React.ReactNode | string }) => {
  return typeof title === 'string' ? <h1 className="text-2xl font-bold">{title}</h1> : title;
};

export { UniversalTitle };
