import React from 'react';
import StaffTreatmentBillingScreen from '../staff/TreatmentBillingScreen';

interface Props { onOpenDrawer?: () => void; initialBillId?: string }

export const TreatmentBillingScreen: React.FC<Props> = ({ onOpenDrawer, initialBillId }) => (
  <StaffTreatmentBillingScreen patientMode initialBillId={initialBillId} onOpenDrawer={onOpenDrawer || (() => {})} />
);

export default TreatmentBillingScreen;
