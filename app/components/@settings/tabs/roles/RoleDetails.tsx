import { useEffect } from 'react';
import { resetControlPanelHeader, setControlPanelHeader } from '~/lib/stores/settings';
import type { Role } from './types';

interface RoleDetailsProps {
  role: Role;
  onBack(): void;
}

export default function RoleDetails({ role, onBack }: RoleDetailsProps) {
  useEffect(() => {
    setControlPanelHeader({
      title: `Edit "${role.name}"`,
      onBack,
    });

    // Return a cleanup function to clear the header when the component unmounts
    return () => {
      resetControlPanelHeader();
    };
  }, [role.name]);

  return <div className="space-y-6">Role Details</div>;
}
