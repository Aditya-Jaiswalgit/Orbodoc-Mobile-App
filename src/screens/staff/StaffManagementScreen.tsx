import React from 'react';
import { UserManagement } from './UserManagement';

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
  initialUserId?: string;
}

export const StaffManagementScreen: React.FC<Props> = ({ onOpenDrawer, onNavigateScreen, initialUserId }) => {
  return <UserManagement onOpenDrawer={onOpenDrawer} onNavigateScreen={onNavigateScreen} initialUserId={initialUserId} />;
};

export default StaffManagementScreen;
