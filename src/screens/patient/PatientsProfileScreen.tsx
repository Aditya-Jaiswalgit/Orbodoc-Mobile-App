import React from 'react';
import MyProfileScreen from '../staff/MyProfileScreen';

interface PatientsProfileScreenProps {
  onOpenDrawer?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const PatientsProfileScreen: React.FC<PatientsProfileScreenProps> = ({
  onOpenDrawer = () => {},
  onNavigateScreen,
}) => {
  return (
    <MyProfileScreen onOpenDrawer={onOpenDrawer} onNavigateScreen={onNavigateScreen} />
  );
};

export default PatientsProfileScreen;
