import React from 'react';
import StaffMedicineBillingScreen from '../staff/MedicineBillingScreen';

interface Props { onOpenDrawer?: () => void; initialBillId?: string }

export const MedicineBillingScreen: React.FC<Props> = ({ onOpenDrawer, initialBillId }) => (
  <StaffMedicineBillingScreen patientMode initialBillId={initialBillId} onOpenDrawer={onOpenDrawer || (() => {})} />
);

export default MedicineBillingScreen;
