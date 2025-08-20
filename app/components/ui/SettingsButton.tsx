import { memo } from 'react';
import { Settings } from 'lucide-react';
import { IconButton } from '~/components/ui/IconButton';

interface SettingsButtonProps {
  onClick: () => void;
}

export const SettingsButton = memo(({ onClick }: SettingsButtonProps) => {
  return (
    <IconButton
      onClick={onClick}
      size="xl"
      title="Settings"
      className="text-[#666] hover:text-primary hover:bg-depth-3/10 transition-colors"
      dataTestId="settings-button"
    >
      <Settings className="w-5 h-5" />
    </IconButton>
  );
});
