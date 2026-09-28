import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity, Switch } from 'react-native';
import { UserManagement } from '../src/screens/staff/UserManagement';
import { RolePermissions } from '../src/screens/staff/RolePermissions';
import { SuperAdminDashboardScreen } from '../src/screens/dashboards/SuperAdminDashboardScreen';
import { ClinicsManagementScreen } from '../src/screens/staff/ClinicsManagementScreen';
import { apiFetch } from '../src/api/apiConfig';
import { showSuccessToast, showErrorToast } from '../src/utils/toast';

let mockClinicId = 71;
jest.mock('../src/context/AuthContext', () => ({ useAuthContext: () => ({
  token: 'test-token', user: { id: 10, roleId: 2 }, activeClinicId: mockClinicId,
  activeClinicName: 'Test Clinic', assignedClinics: [{ id: mockClinicId, name: 'Test Clinic' }],
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
    if (endpoint === '/clinics/my-clinics') return success({ clinics: [{ id: mockClinicId, name: 'Test Clinic' }] }) as any;
    if (endpoint === '/dashboard/super-admin') return success({ stats: {
      total_clinics: 6, active_clinics: 5, active_staff: 17, active_patients: 41,
      treatment_revenue: '150.25', medicine_revenue: '30.75',
    } }) as any;
    if (endpoint.startsWith('/dashboard?')) return success({ stats: {
      appointments_today: 3, completed_today: 2, cancelled_today: 1,
      treatment_revenue_today: 17, medicine_revenue_today: 5,
      total_active_patients: 4, pending_lab_tests: 0, low_stock_medicines: 2,
    } }) as any;
    if (endpoint.startsWith('/user_role/list')) return success([{ role_id: 23, role_name: 'billing_staff', clinic_id: mockClinicId }]) as any;
    if (endpoint === '/system_object/list') return success([{ sys_obj_id: 11, object_name: 'Dashboard' }]) as any;
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
