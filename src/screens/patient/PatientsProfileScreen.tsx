import React from 'react';
import MyProfileScreen from '../staff/MyProfileScreen';

interface PatientsProfileScreenProps {
  onOpenDrawer?: () => void;
  onNavigateScreen?: (screen: string) => void;
  patientMode?: boolean;
}

export const PatientsProfileScreen: React.FC<PatientsProfileScreenProps> = ({
  onOpenDrawer = () => {},
  onNavigateScreen,
  patientMode = true,
}) => {
  return (
    <MyProfileScreen patientMode={patientMode} onOpenDrawer={onOpenDrawer} onNavigateScreen={onNavigateScreen} />
  );
};

export default PatientsProfileScreen;
