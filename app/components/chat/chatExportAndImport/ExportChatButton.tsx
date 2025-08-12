import WithTooltip from '~/components/ui/Tooltip';
import { IconButton } from '~/components/ui/IconButton';
import React from 'react';
import { Download } from 'lucide-react';

export const ExportChatButton = ({ exportChat }: { exportChat?: () => void }) => {
  return (
    <WithTooltip tooltip="Export Chat">
      <IconButton title="Export Chat" onClick={() => exportChat?.()}>
        <Download className="text-xl" />
      </IconButton>
    </WithTooltip>
  );
};
