import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import { StaffMainContainer } from '../src/navigation/StaffMainContainer';
import { navigateStaffScreen } from '../src/utils/navigationEvents';
import { permissionFlags, PermissionMap } from '../src/utils/rolePermissions';

let mockPermissions: PermissionMap;
let mockRole = 'billing_assistant';
jest.mock('../src/context/AuthContext', () => ({ useAuthContext: () => ({
  role: mockRole, user: { id: 10, full_name: 'Custom User' }, token: 'token',
  activeClinicId: 71, activeClinicName: 'Clinic', assignedClinics: [],
  permissionsMap: mockPermissions, refreshPermissions: jest.fn(),
}) }));
jest.mock('../src/api/apiConfig', () => ({ apiFetch: jest.fn(async () => ({ success: true, data: { count: 0 } })) }));
jest.mock('../src/components/common/StaffHeader', () => ({ StaffHeader: ({ onOpenDrawer }: any) => {
  const RN = require('react-native');
  return <RN.TouchableOpacity onPress={onOpenDrawer}><RN.Text>Open menu</RN.Text></RN.TouchableOpacity>;
} }));
jest.mock('../src/screens/staff/MedicineBillingScreen', () => ({ __esModule: true, default: () => {
  const RN = require('react-native'); return <RN.Text>Medicine billing screen</RN.Text>;
} }));
jest.mock('../src/screens/staff/PatientsManagementScreen', () => ({ __esModule: true, default: () => {
  const RN = require('react-native'); return <RN.Text>Patients screen</RN.Text>;
} }));
jest.mock('../src/screens/staff/ProviderWalletScreen', () => ({ ProviderWalletScreen: () => {
  const RN = require('react-native'); return <RN.Text>Wallet Overview</RN.Text>;
} }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));

let screen: Renderer.ReactTestRenderer;
const texts = () => screen.root.findAllByType(Text).map(node => node.props.children);
beforeEach(() => { mockRole = 'billing_assistant'; mockPermissions = { medicine_bills: permissionFlags({ view: true }) }; });
afterEach(async () => { await act(async () => screen?.unmount()); });
async function render() { await act(async () => { screen = Renderer.create(<StaffMainContainer />); }); }

test('custom-role menu lists granted screens and omits ungranted screens', async () => {
  await render();
  await act(async () => screen.root.findAllByType(TouchableOpacity)
    .find(node => node.findAllByType(Text).some(text => text.props.children === 'Open menu'))!.props.onPress());
  expect(texts()).toContain('Medicine Billing');
  expect(texts()).not.toContain('Patients');
  expect(texts()).not.toContain('Role Permissions');
});

test('direct navigation cannot bypass permission checks', async () => {
  await render();
  await act(async () => navigateStaffScreen('patients'));
  expect(texts()).not.toContain('Patients screen');
  expect(texts()).toContain('You do not have permission to open this screen.');
  await act(async () => navigateStaffScreen('medicine_billing'));
  expect(texts()).toContain('Medicine billing screen');
});

test('revoking a grant blocks an already-open screen on the next permission update', async () => {
  await render(); await act(async () => navigateStaffScreen('medicine_billing'));
  mockPermissions = {};
  await act(async () => screen.update(<StaffMainContainer />));
  expect(texts()).not.toContain('Medicine billing screen');
  expect(texts()).toContain('You do not have permission to open this screen.');
});

test('the header wallet destination opens for a clinic admin with dashboard permission', async () => {
  await render();
  mockRole = 'clinic_admin';
  mockPermissions = { dashboard: permissionFlags({ view: true }) };
  await act(async () => { navigateStaffScreen('/wallet'); screen.update(<StaffMainContainer />); });
  expect(texts()).toContain('Wallet Overview');
  expect(texts()).not.toContain('You do not have permission to open this screen.');
});
