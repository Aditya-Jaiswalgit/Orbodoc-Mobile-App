import React from 'react';
import { RolePermissions } from './RolePermissions';

interface Props {
  onOpenDrawer: () => void;
}

export const RolePermissionsScreen: React.FC<Props> = ({ onOpenDrawer }) => {
  return <RolePermissions onOpenDrawer={onOpenDrawer} />;
};

export default RolePermissionsScreen;
