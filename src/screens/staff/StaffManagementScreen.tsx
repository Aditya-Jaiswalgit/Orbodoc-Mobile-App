import React from 'react';
import { UserManagement } from './UserManagement';

interface Props {
  onOpenDrawer: () => void;
}

export const StaffManagementScreen: React.FC<Props> = ({ onOpenDrawer }) => {
  return <UserManagement onOpenDrawer={onOpenDrawer} />;
};

export default StaffManagementScreen;
