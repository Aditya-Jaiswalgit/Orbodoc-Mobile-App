import React from 'react';
import { PatientsScreen } from '../patient/PatientsScreen';

interface Props {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
}

export const PatientsManagementScreen: React.FC<Props> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
}) => {
  return (
    <PatientsScreen
      onOpenDrawer={onOpenDrawer}
      onOpenNotifications={onOpenNotifications}
    />
  );
};

export default PatientsManagementScreen;
