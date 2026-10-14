// src/utils/notificationNavigation.ts

export interface NavigableNotification {
  entity_type?: string | null;
  entity_id?: string | number | null;
  not_cat_name?: string | null;
  title?: string | null;
  message?: string | null;
}

interface NotificationNavigationContext {
  role?: string | null;
  currentUserId?: string | number | null;
  userType?: 'staff' | 'patient';
}

export function getMobileNotificationDestination(
  notification: NavigableNotification,
  context: NotificationNavigationContext = {},
): string {
  const entityType = String(notification.entity_type || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const entityId = notification.entity_id;
  const isPatient = context.userType === 'patient' || context.role === 'patient';
  const isOwnEntity =
    entityId != null &&
    context.currentUserId != null &&
    String(entityId) === String(context.currentUserId);

  if (['appointment', 'appointments'].includes(entityType)) {
    return 'appointments';
  }

  if (['patient', 'patients'].includes(entityType)) {
    return isPatient || isOwnEntity ? 'profile' : 'patients';
  }

  if (['staff', 'user', 'staff_user'].includes(entityType)) {
    return isOwnEntity ? 'profile' : 'staff';
  }

  if (['treatment_bill', 'treatment_billing'].includes(entityType)) {
    return 'treatment_billing';
  }

  if (['medicine_bill', 'pharmacy_bill'].includes(entityType)) {
    return 'medicine_billing';
  }

  if (['lab_report', 'lab_test', 'lab_order'].includes(entityType)) {
    return isPatient ? 'lab_tests' : 'lab_reports';
  }

  if (['clinic', 'clinics'].includes(entityType)) {
    return 'clinics';
  }

  if (['subscription', 'subscription_plan', 'plan'].includes(entityType)) {
    return 'subscription_plans';
  }

  if (['wallet', 'recharge'].includes(entityType)) {
    return 'wallet';
  }

  if (['video', 'video_call'].includes(entityType)) {
    return 'video_services';
  }

  // Fallback keyword scanning
  const text = `${notification.not_cat_name || ''} ${notification.title || ''} ${notification.message || ''}`.toLowerCase();
  if (text.includes('appointment')) return 'appointments';
  if (text.includes('prescription')) return isPatient ? 'appointments' : 'prescriptions';
  if (text.includes('patient')) return isPatient ? 'profile' : 'patients';
  if (text.includes('profile') || text.includes('password')) return 'profile';
  if (text.includes('lab') || text.includes('report') || text.includes('test')) return isPatient ? 'lab_tests' : 'lab_reports';
  if (text.includes('medicine') || text.includes('pharmacy')) return 'medicine_billing';
  if (text.includes('treatment') || text.includes('bill') || text.includes('payment')) return 'treatment_billing';
  if (text.includes('wallet') || text.includes('payout')) return 'wallet';
  if (text.includes('video') || text.includes('consult')) return 'video_services';
  if (text.includes('clinic')) return 'clinics';
  if (text.includes('user') || text.includes('staff')) return 'staff';

  return 'dashboard';
}
