import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity, Switch, Modal } from 'react-native';
import { UserManagement } from '../src/screens/staff/UserManagement';
import { RolePermissions } from '../src/screens/staff/RolePermissions';
import { SuperAdminDashboardScreen } from '../src/screens/dashboards/SuperAdminDashboardScreen';
import { ClinicsManagementScreen } from '../src/screens/staff/ClinicsManagementScreen';
import { apiFetch } from '../src/api/apiConfig';
import { showSuccessToast, showErrorToast } from '../src/utils/toast';

let mockClinicId = 71;
let mockRole = 'clinic_admin';
let mockCanAdd = true;
let mockCanEdit = true;
let mockMultiClinic = false;
let mockWidth = 390;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true, default: () => ({ width: mockWidth, height: 800, scale: 1, fontScale: 1 }),
}));
jest.mock('../src/context/AuthContext', () => ({ useAuthContext: () => ({
  token: 'test-token', user: { id: 10, roleId: 2 }, activeClinicId: mockClinicId,
  role: mockRole, permissionsMap: { staff_users: { view: true, add: mockCanAdd, edit: mockCanEdit, delete: true, execute: true } },
  isMultiClinic: mockMultiClinic,
  activeClinicName: 'Test Clinic', assignedClinics: [{ id: mockClinicId, name: 'Test Clinic' }, ...(mockMultiClinic ? [{ id: 72, name: 'Second Clinic' }] : [])],
}) }));
jest.mock('../src/api/apiConfig', () => ({ apiFetch: jest.fn() }));
jest.mock('../src/utils/toast', () => ({ showSuccessToast: jest.fn(), showErrorToast: jest.fn() }));
jest.mock('../src/components/common/StaffHeader', () => ({ StaffHeader: () => null }));
jest.mock('../src/components/common/CustomCalendarPicker', () => ({ CustomCalendarPicker: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('lucide-react-native', () => Object.fromEntries([
  'UserPlus', 'RefreshCw', 'Columns', 'Search', 'Eye', 'EyeOff', 'Edit2', 'X', 'Mail', 'Phone',
  'Clock', 'Building', 'Stethoscope', 'GraduationCap', 'Award', 'Calendar', 'IndianRupee', 'MapPin',
  'Lock', 'ChevronDown', 'ChevronLeft', 'ChevronRight', 'ChevronsLeft', 'ChevronsRight',
  'ShieldCheck', 'Check', 'Plus', 'Pencil', 'Shield',
  'MoreVertical', 'CheckCircle', 'XCircle', 'Users', 'ClipboardList', 'Pill', 'Trash2', 'Camera', 'ChevronsUpDown',
].map(name => [name, name])));

const fetchMock = jest.mocked(apiFetch);
let screen: Renderer.ReactTestRenderer;
let failUsers = false;
let failSave = false;
let savedPermissions: any[] = [];
const success = (data: unknown) => ({ success: true, message: 'OK', data });

beforeEach(() => {
  jest.clearAllMocks(); mockClinicId = 71; failUsers = false; failSave = false; savedPermissions = [];
  mockRole = 'clinic_admin'; mockCanAdd = true; mockCanEdit = true; mockMultiClinic = false;
  mockWidth = 390;
  fetchMock.mockImplementation(async (endpoint, options) => {
    if (options?.method === 'PUT' || options?.method === 'POST') {
      if (failSave) return { success: false, message: 'Save rejected' };
      if (endpoint === '/role_per/add') savedPermissions = [{ ...JSON.parse(String(options.body)), permission_id: 81 }];
      return success({}) as any;
    }
    if (endpoint.startsWith('/staff?')) {
      if (failUsers) return { success: false, message: 'Offline' };
      const inactive = endpoint.includes('is_active=0');
      return success({ total: inactive ? 0 : 1, data: inactive ? [] : [{ id: 25, role_id: 23, role_name: 'billing_staff',
        full_name: 'Real User', phone: '9876543210', email: 'test@example.com', is_active: 1 }] }) as any;
    }
    if (endpoint === '/staff/25') return success({ staff: {
      id: 25, role_id: 23, role_name: 'billing_staff', full_name: 'Real User',
      phone: '9876543210', email: 'test@example.com', is_active: 1,
      address: '42 Clinic Road, Jaipur',
    } }) as any;
    if (endpoint === '/clinics/my-clinics') return success({ clinics: [{ id: mockClinicId, name: 'Test Clinic' }, { id: 72, name: 'Second Clinic' }] }) as any;
    if (endpoint === '/dashboard/super-admin') return success({ stats: {
      total_clinics: 6, active_clinics: 5, active_staff: 17, active_patients: 41,
      treatment_revenue: '150.25', medicine_revenue: '30.75',
    } }) as any;
    if (endpoint.startsWith('/dashboard?')) return success({ stats: {
      appointments_today: 3, completed_today: 2, cancelled_today: 1,
      treatment_revenue_today: 17, medicine_revenue_today: 5,
      total_active_patients: 4, pending_lab_tests: 0, low_stock_medicines: 2,
    } }) as any;
    if (endpoint.startsWith('/user_role/list')) return success([
      { role_id: 23, role_name: 'billing_staff', clinic_id: mockClinicId },
      { role_id: 3, role_name: 'doctor', clinic_id: null },
      { role_id: 8, role_name: 'nurse', clinic_id: null },
    ]) as any;
    if (endpoint === '/system_object/list') return success([{ sys_obj_id: 11, object_name: 'Dashboard' }]) as any;
    if (endpoint === '/clinics/' + mockClinicId) return success({ clinic: { plan_id: 4 } }) as any;
    if (endpoint === '/planFeatures/') return success([{ plan_id: 4, sys_obj_id: 11, is_enabled: 1 }]) as any;
    if (endpoint.startsWith('/role_per/list')) return success(savedPermissions) as any;
    throw new Error('Unexpected endpoint: ' + endpoint);
  });
});
afterEach(async () => { await act(async () => screen?.unmount()); });
function button(label: string) {
  return screen.root.findAllByType(TouchableOpacity).find(node => node.findAllByType(Text)
    .some(text => text.props.children === label))!;
}

test('user API failure renders an error and never substitutes sample users', async () => {
  failUsers = true;
  await act(async () => { screen = Renderer.create(<UserManagement />); });
  const texts = screen.root.findAllByType(Text).map(node => node.props.children).join(' ');
  expect(texts).toContain('Unable to load users');
  expect(texts).not.toContain('Rahul');
  expect(texts).not.toContain('Real User');
});

test('failed edit keeps the form open and reports an error instead of success', async () => {
  await act(async () => { screen = Renderer.create(<UserManagement />); });
  const edit = screen.root.findAllByType(TouchableOpacity).find(node => node.findAllByType('Edit2' as any).length > 0)!;
  await act(async () => edit.props.onPress());
  failSave = true;
  const save = screen.root.findAllByType(TouchableOpacity).find(node => node.findAllByType(Text)
    .some(text => text.props.children === 'Update User'))!;
  expect(save).toBeDefined();
  await act(async () => save.props.onPress());
  expect(showErrorToast).toHaveBeenCalledWith('Unable to save', 'Save rejected');
  expect(showSuccessToast).not.toHaveBeenCalled();
  expect(screen.root.findAllByType(Text).some(t => t.props.children === 'Edit User')).toBe(true);
});

async function openUserView() {
  await act(async () => { screen = Renderer.create(<UserManagement />); });
  const view = screen.root.findAllByType(TouchableOpacity)
    .find(node => node.findAllByType('Eye' as any).length > 0)!;
  await act(async () => view.props.onPress());
}

test('view loads the saved address missing from the staff list', async () => {
  await openUserView();
  expect(fetchMock).toHaveBeenCalledWith('/staff/25');
  expect(screen.root.findAllByType(Text).some(node => node.props.children === '42 Clinic Road, Jaipur')).toBe(true);
  expect(screen.root.findAllByType(Text).some(node => node.props.children === 'No address provided')).toBe(false);
});

test('failed address loading shows retry instead of claiming there is no address', async () => {
  const original = fetchMock.getMockImplementation()!;
  let failDetails = true;
  fetchMock.mockImplementation(async (endpoint, options) => {
    if (endpoint === '/staff/25' && failDetails) throw new Error('Offline');
    return original(endpoint, options);
  });
  await openUserView();
  expect(screen.root.findAllByType(Text).some(node => node.props.children === 'Unable to load user details. Please retry.')).toBe(true);
  expect(screen.root.findAllByType(Text).some(node => node.props.children === 'No address provided')).toBe(false);
  failDetails = false;
  await act(async () => button('Retry').props.onPress());
  expect(screen.root.findAllByType(Text).some(node => node.props.children === '42 Clinic Road, Jaipur')).toBe(true);
});

test('editing another field preserves the saved address omitted by the list API', async () => {
  await act(async () => { screen = Renderer.create(<UserManagement />); });
  const edit = screen.root.findAllByType(TouchableOpacity)
    .find(node => node.findAllByType('Edit2' as any).length > 0)!;
  await act(async () => edit.props.onPress());
  expect(screen.root.findAllByType(TextInput).some(node => node.props.value === '42 Clinic Road, Jaipur')).toBe(true);
  await act(async () => button('Update User').props.onPress());
  const save = fetchMock.mock.calls.find(([url, options]) => url === '/staff/25' && options?.method === 'PUT')!;
  expect(JSON.parse(String(save[1]?.body)).address).toBe('42 Clinic Road, Jaipur');
});

test('a closed user view is not reopened by a late details response', async () => {
  const original = fetchMock.getMockImplementation()!;
  let resolveDetails!: (value: any) => void;
  fetchMock.mockImplementation((endpoint, options) => endpoint === '/staff/25'
    ? new Promise(resolve => { resolveDetails = resolve; })
    : original(endpoint, options));
  await openUserView();
  expect(screen.root.findAllByType(Text).some(node => node.props.children === 'Loading address…')).toBe(true);
  await act(async () => button('Close').props.onPress());
  await act(async () => resolveDetails(success({ staff: { id: 25, address: 'Late address' } })));
  expect(screen.root.findAllByType(Modal).some(node => node.props.visible)).toBe(false);
});

async function pressAccessible(label: string) {
  await act(async () => screen.root.findAllByType(TouchableOpacity)
    .find(node => node.props.accessibilityLabel === label)!.props.onPress());
}
async function fillCreateInput(label: string, value: string) {
  await act(async () => screen.root.findAllByType(TextInput)
    .find(node => node.props.accessibilityLabel === label)!.props.onChangeText(value));
}
async function openCreateUser(role = 'Doctor') {
  await act(async () => { screen = Renderer.create(<UserManagement />); });
  await act(async () => button('Create User').props.onPress());
  await pressAccessible('Select role');
  await pressAccessible('Select role ' + role);
  await fillCreateInput('Full name', ' Test Doctor ');
  await fillCreateInput('Email address', 'doctor@example.com');
  await fillCreateInput('Phone number', '+91 9876543210');
  await fillCreateInput('Temporary password', 'User-pass-123');
}
function staffCreates() {
  return fetchMock.mock.calls.filter(([url, options]) => url === '/staff' && options?.method === 'POST');
}
function visibleCreateError() {
  const modal = screen.root.findAllByType(Modal).find(node => node.props.visible &&
    node.findAllByType(TouchableOpacity).some(buttonNode => buttonNode.props.accessibilityLabel === 'Submit create user'));
  return modal?.findAllByType(Text).find(node => node.props.accessibilityRole === 'alert')?.props.children;
}

test('create doctor sends all web form fields and selected clinic to the staff API', async () => {
  await openCreateUser();
  for (const [label, value] of Object.entries({
    Department: ' Cardiology ', Specialization: 'General Medicine', Qualification: 'MBBS',
    'Registration number': 'REG-123', 'Experience (years)': '5', 'Consultation fee': '500.50',
    'Available days': 'Mon, Tue, Fri', Address: 'Test address',
  })) await fillCreateInput(label, value);
  await pressAccessible('Submit create user');
  expect(staffCreates()).toHaveLength(1);
  expect(JSON.parse(String(staffCreates()[0][1]?.body))).toEqual({
    full_name: 'Test Doctor', email: 'doctor@example.com', phone: '9876543210',
    password: 'User-pass-123', role_id: 3, clinic_id: 71, is_doctor: 1,
    department: 'Cardiology', specialization: 'General Medicine', qualification: 'MBBS',
    registration_number: 'REG-123', experience_years: 5, consultation_fee: 500.5,
    available_days: 'Mon, Tue, Fri', address: 'Test address',
  });
  expect(showSuccessToast).toHaveBeenCalledWith('User Created', 'User created successfully.');
});

test('changing doctor to nurse hides doctor-only inputs and excludes their values from save', async () => {
  await openCreateUser();
  await fillCreateInput('Registration number', 'NURSE-123');
  await fillCreateInput('Consultation fee', '500');
  await fillCreateInput('Available days', 'Monday');
  await pressAccessible('Select role');
  await pressAccessible('Select role Nurse');
  const labels = screen.root.findAllByType(TextInput).map(node => node.props.accessibilityLabel);
  expect(labels).toContain('Registration number');
  expect(labels).not.toContain('Consultation fee');
  expect(labels).not.toContain('Available days');
  await pressAccessible('Submit create user');
  expect(JSON.parse(String(staffCreates()[0][1]?.body))).toMatchObject({
    role_id: 8, registration_number: 'NURSE-123', consultation_fee: 0, available_days: null, is_doctor: 0,
  });
});

test.each([
  ['Temporary password', 'short', 'Password must be at least 8 characters long.'],
  ['Experience (years)', '-1', 'Experience must be 0 or greater.'],
  ['Consultation fee', '-1', 'Consultation fee must be 0 or greater.'],
])('create rejects invalid %s without sending a request', async (label, value, message) => {
  await openCreateUser();
  await fillCreateInput(label, value);
  await pressAccessible('Submit create user');
  expect(staffCreates()).toHaveLength(0);
  expect(showErrorToast).toHaveBeenCalledWith('Validation Error', message);
  expect(visibleCreateError()).toBe(message);
});

test('failed create retains entered details and retry succeeds', async () => {
  await openCreateUser('Billing Staff');
  await fillCreateInput('Address', 'Keep this address');
  failSave = true;
  await pressAccessible('Submit create user');
  expect(showSuccessToast).not.toHaveBeenCalled();
  expect(visibleCreateError()).toBe('Save rejected');
  expect(screen.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === 'Address')?.props.value).toBe('Keep this address');
  failSave = false;
  await pressAccessible('Submit create user');
  expect(staffCreates()).toHaveLength(2);
  await act(async () => button('Create User').props.onPress());
  expect(screen.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === 'Temporary password')?.props.value).toBe('');
  expect(screen.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === 'Address')?.props.value).toBe('');
});

test('create uses the active clinic automatically without a clinic input', async () => {
  mockClinicId = 72;
  await openCreateUser();
  expect(screen.root.findAllByType(TouchableOpacity).some(node => node.props.accessibilityLabel === 'Select clinic')).toBe(false);
  expect(fetchMock.mock.calls.some(([url]) => url === '/user_role/list?clinic_id=72')).toBe(true);
  await pressAccessible('Submit create user');
  expect(JSON.parse(String(staffCreates()[0][1]?.body))).toMatchObject({ clinic_id: 72, role_id: 3 });
});

test.each([
  'Email already registered',
  'Access denied for selected clinic',
  'Request timed out. Please try again.',
])('create displays API rejection inside the modal: %s', async message => {
  await openCreateUser();
  fetchMock.mockResolvedValueOnce({ success: false, message });
  await pressAccessible('Submit create user');
  expect(staffCreates()).toHaveLength(1);
  expect(visibleCreateError()).toBe(message);
  expect(showSuccessToast).not.toHaveBeenCalled();
});

test('failed roles loading explains why create cannot proceed and provides a working retry', async () => {
  await act(async () => { screen = Renderer.create(<UserManagement />); });
  fetchMock.mockResolvedValueOnce({ success: false, message: 'Offline' });
  await act(async () => button('Create User').props.onPress());
  const submit = screen.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === 'Submit create user')!;
  expect(submit.props.disabled).toBe(false);
  await pressAccessible('Submit create user');
  expect(visibleCreateError()).toBe('Unable to load roles. Tap Retry roles and try again.');
  expect(staffCreates()).toHaveLength(0);
  await pressAccessible('Retry roles');
  await pressAccessible('Select role');
  expect(screen.root.findAllByType(TouchableOpacity).some(node => node.props.accessibilityLabel === 'Select role Doctor')).toBe(true);
});

test('create shows progress while awaiting the API and prevents duplicate submissions', async () => {
  await openCreateUser();
  let complete!: (value: any) => void;
  fetchMock.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  const submit = () => screen.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === 'Submit create user')!;
  let request!: Promise<void>;
  await act(async () => { request = submit().props.onPress(); });
  expect(submit().props.disabled).toBe(true);
  expect(submit().findAllByType(Text).some(node => node.props.children === 'Creating...')).toBe(true);
  await act(async () => { await submit().props.onPress(); });
  expect(staffCreates()).toHaveLength(1);
  await act(async () => { complete(success({})); await request; });
  expect(showSuccessToast).toHaveBeenCalledWith('User Created', 'User created successfully.');
});

function overrideStaffDetails(fields: Record<string, unknown>) {
  const original = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async (url, options) => {
    const result = await original(url, options);
    if (url === '/staff/25' && !options?.method) {
      return success({ staff: { ...(result as any).data.staff, ...fields } }) as any;
    }
    return result;
  });
}
async function openUserEdit() {
  await act(async () => { screen = Renderer.create(<UserManagement />); });
  await pressAccessible('Edit user Real User');
}
function staffUpdates() {
  return fetchMock.mock.calls.filter(([url, options]) => url === '/staff/25' && options?.method === 'PUT');
}
const doctorDetails = {
  role_id: 3, role_name: 'doctor', is_doctor: 1, department: 'Medicine', specialization: 'General',
  qualification: 'MBBS', registration_number: 'OLD-1', experience_years: 4,
  consultation_fee: 200, available_days: 'Monday',
};

test('edit saves registration, fee, available days and the dropdown status together', async () => {
  overrideStaffDetails(doctorDetails);
  await openUserEdit();
  await fillCreateInput('Edit registration number', ' NEW-2 ');
  await fillCreateInput('Edit consultation fee', '350.50');
  await fillCreateInput('Edit available days', ' Monday, Friday ');
  await pressAccessible('Edit status');
  await pressAccessible('Edit status Inactive');
  await act(async () => button('Update User').props.onPress());
  expect(staffUpdates()).toHaveLength(1);
  expect(JSON.parse(String(staffUpdates()[0][1]?.body))).toMatchObject({
    role_id: 3, registration_number: 'NEW-2', consultation_fee: 350.5,
    available_days: 'Monday, Friday', is_doctor: 1, is_active: 0, experience_years: 4,
  });
});

test.each(['-5', 'abc', ''])('edit rejects invalid doctor fee %s without saving', async fee => {
  overrideStaffDetails(doctorDetails);
  await openUserEdit();
  await fillCreateInput('Edit consultation fee', fee);
  await act(async () => button('Update User').props.onPress());
  expect(staffUpdates()).toHaveLength(0);
  expect(showErrorToast).toHaveBeenCalled();
});

test.each(['clinic_admin', 'super_admin'])('protected %s retains its role while enabling a doctor profile', async roleName => {
  const roleId = roleName === 'super_admin' ? 1 : 2;
  overrideStaffDetails({ role_id: roleId, role_name: roleName, is_doctor: 0 });
  await openUserEdit();
  const trigger = screen.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === 'Edit role')!;
  expect(trigger.props.disabled).toBe(true);
  await act(async () => trigger.props.onPress());
  expect(screen.root.findAllByType(TouchableOpacity).some(node => node.props.accessibilityLabel === 'Edit role Doctor')).toBe(false);
  await act(async () => screen.root.findByType(Switch).props.onValueChange(true));
  for (const [label, value] of Object.entries({
    'Edit department': 'Medicine', 'Edit specialization': 'General', 'Edit qualification': 'MBBS',
    'Edit registration number': 'REG-1', 'Edit experience': '0', 'Edit consultation fee': '0',
    'Edit available days': 'Monday',
  })) await fillCreateInput(label, value);
  await act(async () => button('Update User').props.onPress());
  expect(JSON.parse(String(staffUpdates()[0][1]?.body))).toMatchObject({
    role_id: roleId, is_doctor: 1, experience_years: 0, consultation_fee: 0,
  });
});

test('disabling the admin doctor profile clears doctor fields without changing the admin role', async () => {
  overrideStaffDetails({ ...doctorDetails, role_id: 2, role_name: 'clinic_admin' });
  await openUserEdit();
  await act(async () => screen.root.findByType(Switch).props.onValueChange(false));
  await act(async () => button('Update User').props.onPress());
  expect(JSON.parse(String(staffUpdates()[0][1]?.body))).toMatchObject({
    role_id: 2, is_doctor: 0, registration_number: null, consultation_fee: 0, available_days: null,
  });
});

test('changing doctor to nurse keeps registration but clears doctor-only values', async () => {
  overrideStaffDetails(doctorDetails);
  await openUserEdit();
  await pressAccessible('Edit role');
  await pressAccessible('Edit role Nurse');
  expect(screen.root.findAllByType(TextInput).some(node => node.props.accessibilityLabel === 'Edit consultation fee')).toBe(false);
  await act(async () => button('Update User').props.onPress());
  expect(JSON.parse(String(staffUpdates()[0][1]?.body))).toMatchObject({
    role_id: 8, registration_number: 'OLD-1', is_doctor: 0, consultation_fee: 0, available_days: null,
  });
});

test('deactivate uses saved status even when the dropdown has an unsaved change', async () => {
  await openUserEdit();
  await pressAccessible('Edit status');
  await pressAccessible('Edit status Inactive');
  await act(async () => button('Deactivate User').props.onPress());
  expect(JSON.parse(String(staffUpdates()[0][1]?.body))).toEqual({ is_active: 0 });
  expect(button('Activate User')).toBeDefined();
});

test('view-only permission blocks create and edit even if handlers are invoked', async () => {
  mockCanAdd = false; mockCanEdit = false;
  await act(async () => { screen = Renderer.create(<UserManagement />); });
  expect(button('Create User').props.disabled).toBe(true);
  await act(async () => button('Create User').props.onPress());
  const edit = screen.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === 'Edit user Real User')!;
  expect(edit.props.disabled).toBe(true);
  await act(async () => edit.props.onPress());
  expect(screen.root.findAllByType(Modal).some(node => node.props.visible)).toBe(false);
  expect(staffCreates()).toHaveLength(0);
  expect(staffUpdates()).toHaveLength(0);
});

test('revoked edit permission blocks update, status and password reset in an already open form', async () => {
  await openUserEdit();
  await act(async () => button('Reset Password').props.onPress());
  const resetModal = () => screen.root.findAllByType(Modal).find(node => node.props.visible &&
    node.findAllByType(TextInput).some(input => input.props.placeholder === 'Enter at least 8 characters'))!;
  const inputs = resetModal().findAllByType(TextInput);
  await act(async () => { inputs[0].props.onChangeText('New-pass-123'); inputs[1].props.onChangeText('New-pass-123'); });
  mockCanEdit = false;
  await act(async () => screen.update(<UserManagement />));
  await act(async () => button('Update User').props.onPress());
  await act(async () => button('Deactivate User').props.onPress());
  const resetButton = resetModal().findAllByType(TouchableOpacity).find(node => node.findAllByType(Text).some(t => t.props.children === 'Reset Password'))!;
  expect(resetButton.props.disabled).toBe(true);
  await act(async () => resetButton.props.onPress());
  expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'PUT' || options?.method === 'POST')).toHaveLength(0);
});

test.each([390, 1024])('Columns hides email and loads the actual address at width %s', async width => {
  mockWidth = width;
  await act(async () => { screen = Renderer.create(<UserManagement />); });
  await pressAccessible('Choose user columns');
  const toggle = (label: string) => screen.root.findAllByType(Switch).find(node => node.props.accessibilityLabel === label)!;
  await act(async () => toggle('Show Email').props.onValueChange(false));
  await act(async () => toggle('Show Address').props.onValueChange(true));
  await pressAccessible('Close columns');
  const text = screen.root.findAllByType(Text).map(node => node.props.children).join(' ');
  expect(text).not.toContain('test@example.com');
  expect(text).toContain('42 Clinic Road, Jaipur');
  await pressAccessible('Choose user columns');
  await act(async () => toggle('Show Email').props.onValueChange(true));
  await pressAccessible('Close columns');
  expect(screen.root.findAllByType(Text).map(node => node.props.children).join(' ')).toContain('test@example.com');
});

test.each(['clinic_admin', 'super_admin'])('%s can create in another allowed clinic with that clinic role ID', async roleName => {
  mockRole = roleName; mockMultiClinic = roleName === 'clinic_admin';
  const original = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async (url, options) => url === '/user_role/list?clinic_id=72'
    ? success([{ role_id: 99, role_name: 'billing_staff', clinic_id: 72 }]) as any : original(url, options));
  await openCreateUser('Billing Staff');
  await pressAccessible('Select user clinic');
  await pressAccessible('Create user in Second Clinic');
  await pressAccessible('Submit create user');
  expect(staffCreates()).toHaveLength(0);
  await pressAccessible('Select role');
  await pressAccessible('Select role Billing Staff');
  await pressAccessible('Submit create user');
  expect(JSON.parse(String(staffCreates()[0][1]?.body))).toMatchObject({ clinic_id: 72, role_id: 99 });
});

test('permission drafts are denied by default and saved with clinic and execute flags', async () => {
  await act(async () => { screen = Renderer.create(<RolePermissions />); });
  await act(async () => button('Permissions').props.onPress());
  const switches = screen.root.findAllByType(Switch);
  expect(switches).toHaveLength(5);
  expect(switches.every(node => node.props.value === false)).toBe(true);
  await act(async () => switches[4].props.onValueChange(true));
  expect(fetchMock.mock.calls.filter(([, opts]) => opts?.method === 'POST')).toHaveLength(0);
  const save = screen.root.findAllByType(TouchableOpacity).find(node => node.findAllByType(Text)
    .some(text => String(text.props.children).includes('Save')))!;
  await act(async () => save.props.onPress());
  expect(savedPermissions[0]).toMatchObject({ clinic_id: 71, role_id: '23', sys_obj_id: '11', can_execute: 1, can_view: 0 });
  expect(showSuccessToast).toHaveBeenCalledWith('Matrix Saved', 'Role permissions saved successfully.');
});

test('failed permission save retains drafts for retry', async () => {
  await act(async () => { screen = Renderer.create(<RolePermissions />); });
  await act(async () => button('Permissions').props.onPress());
  await act(async () => screen.root.findAllByType(Switch)[0].props.onValueChange(true));
  failSave = true;
  const save = screen.root.findAllByType(TouchableOpacity).find(node => node.findAllByType(Text)
    .some(text => String(text.props.children).includes('Save')))!;
  await act(async () => save.props.onPress());
  expect(showSuccessToast).not.toHaveBeenCalled();
  expect(showErrorToast).toHaveBeenCalled();
  expect(screen.root.findAllByType(Switch)[0].props.value).toBe(true);
});

test('Super Admin uses backend totals and billed revenue instead of samples', async () => {
  await act(async () => { screen = Renderer.create(<SuperAdminDashboardScreen onOpenDrawer={() => {}} />); });
  const texts = screen.root.findAllByType(Text).map(node => node.props.children);
  expect(texts).toContain(6);
  expect(texts).toContain(17);
  expect(texts).toContain(41);
  expect(texts).toContain('₹181.00');
  expect(texts).not.toContain('₹12.4L');
});

test('clinic performance uses the selected clinic API and does not preload fake administrators', async () => {
  await act(async () => { screen = Renderer.create(<ClinicsManagementScreen onOpenDrawer={() => {}} />); });
  const texts = screen.root.findAllByType(Text).map(node => node.props.children);
  expect(texts).toContain(3);
  expect(texts).toContain('₹22.00');
  expect(texts.join(' ')).not.toContain('Rahul Sharma');
  expect(fetchMock.mock.calls.some(([url]) => url.startsWith('/dashboard?clinic_id=71&date='))).toBe(true);
  expect(fetchMock.mock.calls.some(([url]) => url.includes('admin-network'))).toBe(false);
});
