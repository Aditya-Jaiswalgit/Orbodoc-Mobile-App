import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RolePermissions } from '../src/screens/staff/RolePermissions';
import { apiFetch } from '../src/api/apiConfig';
import { showErrorToast } from '../src/utils/toast';

const mockRefreshPermissions = jest.fn(async () => {});
let mockRole = 'clinic_admin';
let mockMultiClinic = true;
let mockRoleMenuY = 400;
let mockAccess = { view: true, add: true, edit: true, delete: true, execute: true };
jest.mock('../src/context/AuthContext', () => ({ useAuthContext: () => ({
  token: 'token', user: { id: 10, roleId: 2 }, role: mockRole, activeClinicId: 71, isMultiClinic: mockMultiClinic, isMultiPlan: mockMultiClinic,
  assignedClinics: [{ id: 71, name: 'First Clinic' }, { id: 72, name: 'Second Clinic' }],
  permissionsMap: { staff_users: mockAccess }, refreshPermissions: mockRefreshPermissions,
}) }));
jest.mock('../src/api/apiConfig', () => ({ apiFetch: jest.fn() }));
jest.mock('../src/utils/toast', () => ({ showSuccessToast: jest.fn(), showErrorToast: jest.fn() }));
jest.mock('../src/components/common/StaffHeader', () => ({ StaffHeader: () => null }));
jest.mock('lucide-react-native', () => Object.fromEntries(
  ['ShieldCheck', 'Check', 'RefreshCw', 'Plus', 'Pencil', 'ChevronDown', 'X', 'Shield'].map(name => [name, name])));

const fetchMock = jest.mocked(apiFetch);
const ok = (data: any): any => ({ success: true, message: 'OK', data });
let screen: Renderer.ReactTestRenderer;
let roles: any[];
let permissions: any[];
let nextId: number;
let rejectedObject: string;
let failPlan: boolean;
beforeEach(() => {
  jest.clearAllMocks(); mockRole = 'clinic_admin'; mockMultiClinic = true; mockRoleMenuY = 400;
  mockAccess = { view: true, add: true, edit: true, delete: true, execute: true };
  nextId = 100; permissions = []; rejectedObject = ''; failPlan = false;
  roles = [
    { role_id: 23, role_name: 'billing_staff', clinic_id: 71, is_system: 0 },
    { role_id: 3, role_name: 'doctor', clinic_id: null, is_system: 1 },
    { role_id: 2, role_name: 'clinic_admin', clinic_id: null, is_system: 1 },
    { role_id: 1, role_name: 'super_admin', clinic_id: null, is_system: 1 },
  ];
  fetchMock.mockImplementation(async (url, options) => {
    const body = options?.body ? JSON.parse(String(options.body)) : {};
    if (url.startsWith('/user_role/list')) return ok(roles);
    if (url === '/user_role/add') {
      const created = { ...body, role_id: nextId++, is_system: 0 };
      roles.unshift(created); return ok(created);
    }
    if (url.startsWith('/user_role/update/')) {
      const row = roles.find(r => String(r.role_id) === url.split('/').pop());
      Object.assign(row, body); return ok(row);
    }
    if (url === '/system_object/list') return ok([
      { sys_obj_id: 11, object_name: 'patients', display_name: 'Patients' },
      { sys_obj_id: 12, object_name: 'appointments', system_object_name: 'Appointments' },
      { sys_obj_id: 13, object_name: 'medicines', display_name: 'Medicines' },
    ]);
    if (url.startsWith('/role_per/list')) return ok(permissions.filter(p => String(p.clinic_id) === url.split('=').pop()));
    if (url === '/role_per/add') {
      if (body.sys_obj_id === rejectedObject) return { success: false, message: 'Save rejected' };
      const row = { ...body, permission_id: nextId++ };
      permissions.unshift(row); return ok(row);
    }
    if (url.startsWith('/role_per/update/')) {
      const row = permissions.find(p => String(p.permission_id) === url.split('/').pop());
      Object.assign(row, body); return ok(row);
    }
    if (url === '/clinics/my-clinics') return ok({ clinics: [{ id: 71, name: 'First Clinic' }, { id: 72, name: 'Second Clinic' }] });
    if (url.startsWith('/clinics/')) return ok({ clinic: { plan_id: 4 } });
    if (url === '/planFeatures/') {
      if (failPlan) throw new Error('Offline');
      return ok([
        { plan_id: 4, sys_obj_id: 11, is_enabled: '1' },
        { plan_id: 4, sys_obj_id: 12, is_enabled: true },
        { plan_id: 4, sys_obj_id: 13, is_enabled: 0 },
      ]);
    }
    if (url.startsWith('/staff?')) return ok({ total: url.includes('is_active=0') ? 2 : 5, data: [{ id: 99 }], page: 1, limit: 1 });
    throw new Error('Unexpected request ' + url);
  });
});
afterEach(async () => { await act(async () => screen?.unmount()); });
const textValues = () => screen.root.findAllByType(Text).map(t => t.props.children);
function button(label: string) {
  return screen.root.findAllByType(TouchableOpacity).find(b => b.props.accessibilityLabel === label ||
    b.findAllByType(Text).some(t => t.props.children === label))!;
}
async function press(label: string) {
  if (label === 'Select permission role') {
    type Measurement = (x: number, y: number, width: number, height: number) => void;
    const views = screen.root.findAllByType(View);
    views.find(node => node.props.testID === 'role-permissions-screen')!.instance.measureInWindow =
      (callback: Measurement) => callback(0, 20, 390, 760);
    views.find(node => node.props.testID === 'permission-role-anchor')!.instance.measureInWindow =
      (callback: Measurement) => callback(30, mockRoleMenuY, 300, 42);
  }
  await act(async () => button(label).props.onPress());
}
async function render() { await act(async () => { screen = Renderer.create(<RolePermissions />); }); }
async function matrix() { await render(); await press('Permissions'); }
async function selectRole(name: string) { await press('Select permission role'); await press('Manage role ' + name); }
async function toggle(label: string) {
  await act(async () => screen.root.findAllByType(Switch).find(s => s.props.accessibilityLabel === label)!.props.onValueChange(true));
}
const writes = () => fetchMock.mock.calls.filter(([, options]) => ['POST', 'PUT'].includes(options?.method || ''));
async function name(value: string) {
  await act(async () => screen.root.findByType(TextInput).props.onChangeText(value));
}

test('roles, counts and modules come from the chosen clinic and plan', async () => {
  await render();
  expect(textValues()).toContain('7 users');
  expect(textValues()).not.toContain('Super Admin');
  expect(textValues()).not.toContain('Clinic Admin');
  await press('Permissions');
  expect(screen.root.findAllByType(Switch)).toHaveLength(10);
  expect(textValues()).not.toContain('Medicines');
  expect(fetchMock).toHaveBeenCalledWith('/user_role/list?clinic_id=71');
  expect(fetchMock).toHaveBeenCalledWith('/role_per/list?clinic_id=71');
});

test('duplicate legacy permission rows are updated together', async () => {
  permissions = [88, 87].map(permission_id => ({ permission_id, clinic_id: 71, role_id: 23, sys_obj_id: 11,
    can_view: 0, can_add: 0, can_edit: 0, can_delete: 0, can_execute: 0 }));
  await matrix(); await selectRole('Billing Staff');
  await act(async () => screen.root.findAllByType(Switch)[1].props.onValueChange(true));
  await press('Save Changes');
  expect(permissions.every(p => p.can_view === 1)).toBe(true);
  expect(writes().map(([url]) => url)).toEqual(['/role_per/update/88', '/role_per/update/87']);
});

test('existing rows normalize all five flags and update their permission ID', async () => {
  permissions = [{ permission_id: 88, clinic_id: 71, role_id: 23, sys_obj_id: 11,
    can_view: 'true', can_add: '0', can_edit: '1', can_delete: false, can_execute: 'yes' }];
  await matrix(); await selectRole('Billing Staff');
  expect(screen.root.findAllByType(Switch).slice(0, 5).map(s => s.props.value)).toEqual([false, true, true, false, true]);
  await toggle('Patients delete');
  await press('Save Changes');
  expect(writes()).toHaveLength(1);
  expect(writes()[0][0]).toBe('/role_per/update/88');
  expect(JSON.parse(String(writes()[0][1]?.body))).toEqual({ can_view: 1, can_add: 0, can_edit: 1, can_delete: 1, can_execute: 1 });
  expect(mockRefreshPermissions).toHaveBeenCalled();
});

test('saving one role keeps other role drafts unsaved', async () => {
  await matrix(); await selectRole('Billing Staff'); await toggle('Patients create');
  await selectRole('Doctor'); await toggle('Appointments execute');
  await press('Save Changes');
  expect(permissions).toHaveLength(1);
  expect(permissions[0]).toMatchObject({ role_id: '3', sys_obj_id: '12', can_execute: 1 });
  await selectRole('Billing Staff');
  expect(screen.root.findAllByType(Switch)[0].props.value).toBe(true);
  await press('Save Changes');
  expect(permissions).toHaveLength(2);
});

test('create selects the new role and saves denied rows for untouched plan modules', async () => {
  await render(); await press('Add Role'); await name(' Ward Helper '); await press('Save Role');
  expect(textValues()).toContain('Role Permissions Matrix');
  expect(button('Select permission role').findAllByType(Text)[0].props.children).toBe('Ward Helper');
  expect(JSON.parse(String(writes()[0][1]?.body))).toEqual({ role_name: 'Ward Helper', clinic_id: 71 });
  await toggle('Patients read'); await press('Save Changes');
  expect(permissions).toHaveLength(2);
  expect(permissions.find(p => p.sys_obj_id === '12')).toMatchObject({ role_id: '100', clinic_id: 71, can_view: 0, can_add: 0, can_edit: 0, can_delete: 0, can_execute: 0 });
});

test('duplicate role names are rejected across spaces, hyphens and case', async () => {
  await render(); await press('Add Role'); await name(' BILLING-STAFF '); await press('Save Role');
  expect(writes()).toHaveLength(0);
  expect(showErrorToast).toHaveBeenCalledWith('Validation Error', 'Role already exists.');
});

test('role rename persists through the existing update endpoint', async () => {
  await render(); await press('Edit role Billing Staff'); await name('Billing Assistant'); await press('Save Role');
  expect(writes()[0][0]).toBe('/user_role/update/23');
  expect(textValues()).toContain('Billing Assistant');
});

test.each(['Super Admin', 'admin', 'superadmin'])('hidden administrator role %s is still rejected as a duplicate', async value => {
  await render(); await press('Add Role'); await name(value); await press('Save Role');
  expect(writes()).toHaveLength(0);
  expect(showErrorToast).toHaveBeenCalledWith('Validation Error', 'Role already exists.');
});

test('partial permission failure preserves only failed drafts and retry avoids duplicate inserts', async () => {
  await matrix(); await toggle('Patients create'); await toggle('Appointments execute');
  rejectedObject = '12'; await press('Save Changes');
  expect(permissions).toHaveLength(1);
  expect(screen.root.findAllByType(Switch)[9].props.value).toBe(true);
  rejectedObject = ''; await press('Save Changes');
  expect(permissions).toHaveLength(2);
  expect(writes().filter(([, opts]) => JSON.parse(String(opts?.body)).sys_obj_id === '11')).toHaveLength(1);
});

test('changing clinics discards drafts and sends subsequent writes to the selected clinic', async () => {
  await matrix(); await toggle('Patients create');
  await press('Select permission clinic'); await press('Manage clinic Second Clinic');
  expect(screen.root.findAllByType(Switch).every(s => !s.props.value)).toBe(true);
  await toggle('Patients read'); await press('Save Changes');
  expect(permissions).toHaveLength(1);
  expect(permissions[0]).toMatchObject({ clinic_id: 72, can_add: 0, can_view: 1 });
});

test('plan load failure never presents unrestricted modules and refresh retries', async () => {
  failPlan = true; await matrix();
  expect(screen.root.findAllByType(Switch)).toHaveLength(0);
  expect(button('Save Changes').props.disabled).toBe(true);
  failPlan = false; await press('Refresh Data');
  expect(screen.root.findAllByType(Switch)).toHaveLength(10);
});

test('read-only managers cannot create roles or write permission changes', async () => {
  mockAccess.add = false; mockAccess.edit = false;
  await render(); expect(button('Add Role').props.disabled).toBe(true);
  await press('Add Role');
  expect(screen.root.findByType(Modal).props.visible).toBe(false);
  await press('Permissions');
  expect(screen.root.findAllByType(Switch).every(s => s.props.disabled)).toBe(true);
  await toggle('Patients create'); await press('Save Changes');
  expect(writes()).toHaveLength(0);
});


test.each([
  ['super_admin', ['Super Admin', 'Clinic Admin', 'Doctor', 'Billing Staff']],
  ['clinic_admin', ['Doctor', 'Billing Staff']],
  ['billing_manager', ['Super Admin', 'Clinic Admin', 'Doctor', 'Billing Staff']],
])('%s receives the web role order and filtering', async (role, expected) => {
  mockRole = role;
  await render();
  const roleButtons = screen.root.findAllByType(TouchableOpacity).filter(node => String(node.props.accessibilityLabel || '').startsWith('Edit role '));
  expect(roleButtons.map(node => node.props.accessibilityLabel.replace('Edit role ', ''))).toEqual(expected);
});

test('clinic-specific duplicate role overrides global ID without changing web catalog order', async () => {
  roles.unshift({ role_id: 99, role_name: 'DOCTOR', clinic_id: 71, is_system: 0 });
  await matrix();
  expect(button('Select permission role').findAllByType(Text)[0].props.children).toBe('DOCTOR');
  await toggle('Patients read'); await press('Save Changes');
  expect(permissions[0]).toMatchObject({ role_id: '99', clinic_id: 71, user_id: 10 });
});

test('protected roles reappear in the permission selector only for existing matrix rows, as on web', async () => {
  permissions = [{ role_id: 2, clinic_id: 71, sys_obj_id: 11, permission_id: 92, can_view: 1 }];
  await render();
  expect(button('Edit role Clinic Admin')).toBeUndefined();
  await press('Permissions'); await press('Select permission role');
  expect(button('Manage role Clinic Admin')).toBeDefined();
  expect(button('Manage role Super Admin')).toBeUndefined();
  await press('Manage role Clinic Admin');
  expect(screen.root.findAllByType(Switch)[1].props.value).toBe(true);
});

test('single-plan administrators cannot switch management clinics even with multiple assignments', async () => {
  mockMultiClinic = false;
  await render();
  expect(button('Select permission clinic').props.disabled).toBe(true);
  await press('Select permission clinic');
  expect(button('Manage clinic Second Clinic')).toBeUndefined();
  expect(fetchMock.mock.calls.some(([url]) => url === '/clinics/my-clinics')).toBe(false);
});

test('denied view permission prevents role, plan and clinic requests', async () => {
  mockAccess.view = false;
  await render();
  expect(textValues()).toContain('You do not have permission to view roles and permissions.');
  expect(fetchMock).not.toHaveBeenCalled();
});

test('role loading failure shows a retry state and does not substitute a hardcoded list', async () => {
  const original = fetchMock.getMockImplementation()!;
  let fail = true;
  fetchMock.mockImplementation(async (url, options) => url.startsWith('/user_role/list') && fail
    ? { success: false, message: 'Offline' } : original(url, options));
  await render();
  expect(textValues()).toContain('Unable to load roles and permissions. Use Refresh Data to retry.');
  expect(button('Edit role Doctor')).toBeUndefined();
  fail = false; await press('Refresh Data');
  expect(button('Edit role Doctor')).toBeDefined();
});

test('saving a role without renaming preserves the original API spelling', async () => {
  await render(); await press('Edit role Billing Staff');
  expect(screen.root.findByType(TextInput).props.value).toBe('billing_staff');
  await press('Save Role');
  expect(JSON.parse(String(writes()[0][1]?.body))).toEqual({ role_name: 'billing_staff' });
});

test('a long role picker retains the last option and applies its permissions after selection', async () => {
  roles.unshift(...Array.from({ length: 24 }, (_, index) => ({
    role_id: 1000 + index, role_name: 'extra_role_' + index, clinic_id: 71, is_system: 0,
  })));
  await matrix();
  await press('Select permission role');
  const list = screen.root.findAllByType(ScrollView).find(node => node.props.testID === 'permission-role-options')!;
  const options = list.findAllByType(TouchableOpacity);
  expect(options).toHaveLength(26);
  expect(options.at(-1)?.props.accessibilityLabel).toBe('Manage role Extra Role 0');
  await press('Manage role Extra Role 0');
  expect(button('Select permission role').props.accessibilityState.expanded).toBe(false);
  expect(button('Select permission role').findAllByType(Text)[0].props.children).toBe('Extra Role 0');
  expect(screen.root.findAllByType(ScrollView).some(node => node.props.testID === 'permission-role-options')).toBe(false);
  await toggle('Patients read'); await press('Save Changes');
  expect(permissions[0]).toMatchObject({ role_id: '1000', sys_obj_id: '11', can_view: 1 });
  await press('Select permission role');
  expect(button('Manage role Extra Role 0').props.accessibilityState.selected).toBe(true);
  await press('Select permission role');
  expect(button('Select permission role').props.accessibilityState.expanded).toBe(false);
});


test('role options float at the original trigger offset without enlarging page content', async () => {
  await matrix();
  await press('Select permission role');
  const page = () => screen.root.findAllByType(ScrollView).find(node => node.props.testID === 'role-permissions-page')!;
  expect(page().findAllByType(ScrollView).some(node => node.props.testID === 'permission-role-options')).toBe(false);
  const card = screen.root.findAllByType(View).find(node => node.props.testID === 'permission-role-menu')!;
  expect(StyleSheet.flatten(card.props.style)).toMatchObject({ position: 'absolute', left: 30, top: 428, width: 200, maxHeight: 294 });
  expect(page().props.scrollEnabled).toBe(false);
  await press('Close permission role list');
  expect(button('Select permission role').props.accessibilityState.expanded).toBe(false);
  expect(page().props.scrollEnabled).toBe(true);
});

test('role overlay stays inside the screen when the trigger is near the bottom', async () => {
  mockRoleMenuY = 740;
  await matrix();
  await press('Select permission role');
  const card = screen.root.findAllByType(View).find(node => node.props.testID === 'permission-role-menu')!;
  expect(StyleSheet.flatten(card.props.style)).toMatchObject({ bottom: 46, width: 200, maxHeight: 294 });
  await press('Manage role Billing Staff');
  expect(button('Select permission role').findAllByType(Text)[0].props.children).toBe('Billing Staff');
});
