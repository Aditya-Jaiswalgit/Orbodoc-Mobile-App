import React from 'react';
import { AppointmentsManagerScreen } from '../staff/AppointmentsManagerScreen';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onToggleTabBar?: (hide: boolean) => void;
  onNavigateScreen?: (screen: string) => void;
}

/**
 * Patient appointments use the same filterable, paginated workspace as the
 * web reference. `useAppointments` automatically scopes its API request to
 * the logged-in patient, so no staff appointments are exposed here.
 */
const PatientAppointmentsManagerScreen: React.FC<Props> = (props) => (
  <AppointmentsManagerScreen {...props} isPatientView />
);

export default PatientAppointmentsManagerScreen;
