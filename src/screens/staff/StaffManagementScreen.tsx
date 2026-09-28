import React from 'react';
import { UserManagement } from './UserManagement';

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const StaffManagementScreen: React.FC<Props> = ({ onOpenDrawer, onNavigateScreen }) => {
  return <UserManagement onOpenDrawer={onOpenDrawer} onNavigateScreen={onNavigateScreen} />;
};

export default StaffManagementScreen;
