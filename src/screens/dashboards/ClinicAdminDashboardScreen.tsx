import React from 'react';
import { AdminDashboard } from './AdminDashboard';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const ClinicAdminDashboardScreen: React.FC<Props> = ({
  onOpenDrawer,
  onOpenNotifications,
  onNavigateScreen = () => {},
}) => {
  return (
    <AdminDashboard
      onOpenDrawer={onOpenDrawer}
      onOpenNotifications={onOpenNotifications}
      onNavigate={path => onNavigateScreen(path)}
    />
  );
};

export default ClinicAdminDashboardScreen;
