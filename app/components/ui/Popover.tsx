import * as Popover from '@radix-ui/react-popover';
import type { PropsWithChildren, ReactNode } from 'react';

export default ({
  children,
  trigger,
  side,
  align,
}: PropsWithChildren<{
  trigger: ReactNode;
  side: 'top' | 'right' | 'bottom' | 'left' | undefined;
  align: 'center' | 'start' | 'end' | undefined;
}>) => (
  <Popover.Root>
    <Popover.Trigger asChild>{trigger}</Popover.Trigger>
    <Popover.Anchor />
    <Popover.Portal>
      <Popover.Content
        sideOffset={10}
        side={side}
        align={align}
        className="bg-liblab-elements-bg-depth-2 text-liblab-elements-item-contentAccent p-2 rounded-md shadow-xl z-workbench"
      >
        {children}
        <Popover.Arrow className="bg-liblab-elements-item-bg-depth-2" />
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
);
