import { canUseStaffScreen } from '../src/navigation/staffAccess';
import { buildPermissionMap, normalizePermissionMap, permissionFlags } from '../src/utils/rolePermissions';

test('permissions use only the current role and clinic, including explicit deny flags', () => {
  const map = buildPermissionMap([
    { role_id: 23, clinic_id: 72, object_name: 'patients', can_view: 1 },
    { role_id: 3, clinic_id: 71, object_name: 'patients', can_view: 1 },
    { role_id: 23, clinic_id: 71, object_name: 'Patients', can_view: 0, can_add: 'true' },
    { role_id: 23, clinic_id: 71, object_name: 'Patients', can_view: 1 },
  ], 23, 71);
  expect(map.patients).toEqual({ view: false, add: true, edit: false, delete: false, execute: false });
  expect(canUseStaffScreen('custom_role', map, 'patients')).toBe(false);
});

test('custom roles gain only screens granted by live permissions', () => {
  const map = { medicine_bills: permissionFlags({ can_view: 1 }), staff_users: permissionFlags({ can_view: 0 }) };
  expect(canUseStaffScreen('billing_assistant', map, 'medicine_billing')).toBe(true);
  expect(canUseStaffScreen('billing_assistant', map, 'role_permissions')).toBe(false);
  expect(canUseStaffScreen('billing_assistant', map, 'patients')).toBe(false);
  expect(canUseStaffScreen('billing_assistant', map, 'unknown_route')).toBe(false);
});

test('clinic administrators obey permission flags and super administrators retain full access', () => {
  expect(canUseStaffScreen('clinic_admin', {}, 'staff')).toBe(false);
  expect(canUseStaffScreen('super_admin', {}, 'staff')).toBe(true);
  expect(canUseStaffScreen('custom_role', {}, 'dashboard')).toBe(true);
});

test('book appointment requires add permission and role mutation requires the requested action', () => {
  const map = { appointments: permissionFlags({ view: true }), staff_users: permissionFlags({ view: true, edit: true }) };
  expect(canUseStaffScreen('receptionist', map, 'appointments')).toBe(true);
  expect(canUseStaffScreen('receptionist', map, 'book_appointment')).toBe(false);
  expect(canUseStaffScreen('custom_role', map, 'role_permissions', 'add')).toBe(false);
  expect(canUseStaffScreen('custom_role', map, 'role_permissions', 'edit')).toBe(true);
});

test('wallet follows the web dashboard grant for clinic admins and custom roles', () => {
  const granted = { dashboard: permissionFlags({ view: 1 }) };
  expect(canUseStaffScreen('clinic_admin', granted, 'wallet')).toBe(true);
  expect(canUseStaffScreen('custom_role', granted, 'wallet')).toBe(true);
  expect(canUseStaffScreen('clinic_admin', {}, 'wallet')).toBe(false);
  expect(canUseStaffScreen('doctor', { dashboard: permissionFlags({ view: 0 }) }, 'wallet')).toBe(false);
});

test('web-shaped permissions resolve display names and mixed API flags', () => {
  const map = normalizePermissionMap({ clinic_dashboard: { can_view: '1', execute: true }, patients: { view: 'false' } },
    [{ object_name: 'clinic_dashboard', display_name: 'Dashboard' }]);
  expect(map.dashboard.view).toBe(true);
  expect(map.clinic_dashboard.execute).toBe(true);
  expect(map.patients.view).toBe(false);
  expect(normalizePermissionMap({ data: { dashboard: { view: true } } }).dashboard.view).toBe(true);
  expect(normalizePermissionMap(null)).toEqual({});
});
