import React from 'react';
import { RolePermissions } from './RolePermissions';

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const RolePermissionsScreen: React.FC<Props> = ({ onOpenDrawer, onNavigateScreen }) => {
  return <RolePermissions onOpenDrawer={onOpenDrawer} onNavigateScreen={onNavigateScreen} />;
};

export default RolePermissionsScreen;
