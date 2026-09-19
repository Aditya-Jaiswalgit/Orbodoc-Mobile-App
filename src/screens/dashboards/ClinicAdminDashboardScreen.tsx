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
      onNavigate={(path) => {
        if (path === '/patients') onNavigateScreen('patients');
        else if (path === '/medicines') onNavigateScreen('pharmacy_inventory');
        else if (path === '/lab/tests') onNavigateScreen('lab_management');
        else if (path === '/wallet') onNavigateScreen('treatment_billing');
        else onNavigateScreen(path);
      }}
    />
  );
};

export default ClinicAdminDashboardScreen;
