import { cloneElement, ReactElement } from 'react';

type Props<T extends ReactElement, C extends boolean> = {
  condition: C;
  className?: string;
  wrapper?: (children: T) => React.ReactNode;
  children: T;
};

const ConditionalWrapper = <T extends ReactElement, C extends boolean>({
  condition,
  wrapper,
  children,
  className,
}: Props<T, C>) =>
  condition && wrapper
    ? wrapper(children)
    : cloneElement(children, {
        ...((children.props as object) || {}),
        ...(className && { className }),
      });

export { ConditionalWrapper };
