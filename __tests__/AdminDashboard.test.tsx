import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import { AdminDashboard } from '../src/screens/dashboards/AdminDashboard';
import { getAppointmentChartApi, getDashboardKpiApi, getRevenueChartApi } from '../src/api/dashboardApi';
import { getProviderWalletSummaryApi } from '../src/api/providerWalletApi';

let mockClinicId = 71;
jest.mock('../src/context/AuthContext', () => ({
  useAuthContext: () => ({ user: { fullName: 'Test Admin' }, role: 'clinic_admin', activeClinicId: mockClinicId }),
}));
jest.mock('../src/components/common/StaffHeader', () => ({ StaffHeader: () => null }));
jest.mock('../src/api/dashboardApi', () => ({
  getAppointmentChartApi: jest.fn(),
  getDashboardKpiApi: jest.fn(),
  getRevenueChartApi: jest.fn(),
}));
jest.mock('../src/api/providerWalletApi', () => ({ getProviderWalletSummaryApi: jest.fn() }));
jest.mock('lucide-react-native', () => Object.fromEntries(
  ['Calendar', 'CalendarCheck', 'CalendarX', 'IndianRupee', 'Pill', 'TestTube', 'Users', 'WalletCards'].map(name => [name, name]),
));
jest.mock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Circle: 'Circle', G: 'G' }));

let screen: ReactTestRenderer.ReactTestRenderer;
const chartApi = jest.mocked(getAppointmentChartApi);

function cardValue(label: string) {
  const labelNode = screen.root.findAllByType(Text).find(node => node.props.children === label)!;
  return labelNode.parent!.findAllByType(Text)[0].props.children;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 8, 28));
  jest.clearAllMocks();
  mockClinicId = 71;
  jest.mocked(getDashboardKpiApi).mockResolvedValue({ success: true, message: 'Success', data: {
    stats: { appointments_today: 0, completed_today: 0, cancelled_today: 0, total_active_patients: '9', low_stock_medicines: '0', pending_lab_tests: '2' },
  } } as any);
  jest.mocked(getRevenueChartApi).mockResolvedValue({ success: true, message: 'Success', data: { revenue: [] } });
  jest.mocked(getProviderWalletSummaryApi).mockResolvedValue({ success: true, message: 'Success', data: { wallet: { available_balance: '123.45' } } });
  chartApi.mockResolvedValue({ success: true, message: 'Success', data: { appointmentStats: [
    { appointment_date: '2026-09-01', status: 'approved', count: '3' },
    { appointment_date: '2026-09-15', status: 'complete', count: '2' },
    { appointment_date: '2026-09-24', status: 'cancel', count: '1' },
  ] } });
});

afterEach(async () => {
  await act(async () => screen?.unmount());
  jest.useRealTimers();
});

test('monthly cards show chart totals even when all today counters are zero', async () => {
  await act(async () => { screen = ReactTestRenderer.create(<AdminDashboard />); });
  expect(chartApi).toHaveBeenCalledWith(71, expect.any(AbortSignal));
  expect(cardValue('Appointments This Month')).toBe(6);
  expect(cardValue('Completed This Month')).toBe(2);
  expect(cardValue('Cancelled This Month')).toBe(1);
});

test('switching to a clinic with no appointments clears previous totals', async () => {
  await act(async () => { screen = ReactTestRenderer.create(<AdminDashboard />); });
  mockClinicId = 72;
  chartApi.mockResolvedValue({ success: true, message: 'Success', data: { appointmentStats: [] } });
  await act(async () => { screen.update(<AdminDashboard />); });
  expect(chartApi).toHaveBeenLastCalledWith(72, expect.any(AbortSignal));
  expect(cardValue('Appointments This Month')).toBe(0);
  expect(cardValue('Completed This Month')).toBe(0);
  expect(cardValue('Cancelled This Month')).toBe(0);
  expect(screen.root.findAllByType(Text).some(node => node.props.children === 'No appointments this month.')).toBe(true);
});

test('failed chart requests show unavailable values and retry loads actual totals', async () => {
  chartApi.mockResolvedValueOnce({ success: false, message: 'Network error' });
  await act(async () => { screen = ReactTestRenderer.create(<AdminDashboard />); });
  expect(cardValue('Appointments This Month')).toBe('—');
  expect(cardValue('Completed This Month')).toBe('—');
  expect(cardValue('Cancelled This Month')).toBe('—');
  const retry = screen.root.findAllByType(TouchableOpacity).find(node =>
    node.findAllByType(Text).some(text => text.props.children === 'Retry'),
  )!;
  await act(async () => { retry.props.onPress(); });
  expect(cardValue('Appointments This Month')).toBe(6);
});

test('wallet and operations show backend values including real zero', async () => {
  await act(async () => { screen = ReactTestRenderer.create(<AdminDashboard />); });
  expect(getProviderWalletSummaryApi).toHaveBeenCalledWith(71, expect.any(AbortSignal));
  expect(cardValue('Wallet Overview')).toBe('₹123.45');
  expect(cardValue('Active Patients')).toBe(9);
  expect(cardValue('Low Stock Medicines')).toBe(0);
  expect(cardValue('Pending Lab Tests')).toBe(2);
  expect(cardValue('Revenue This Month')).toBe('₹0.00');
  expect(screen.root.findAllByType(Text).some(node => node.props.children === 'No revenue this month.')).toBe(true);
});

test('monthly revenue excludes previous month and uses billed revenue rather than collected', async () => {
  jest.mocked(getRevenueChartApi).mockResolvedValue({ success: true, message: 'Success', data: { revenue: [
    { month: '2026-08', type: 'treatment', revenue: '900' },
    { month: '2026-09', type: 'treatment', revenue: '0', collected: '500' },
    { month: '2026-09', type: 'medicine', revenue: '35.50' },
  ] } });
  await act(async () => { screen = ReactTestRenderer.create(<AdminDashboard />); });
  expect(cardValue('Revenue This Month')).toBe('₹35.50');
});

test('failed requests on clinic switch do not keep old wallet or sample metrics', async () => {
  await act(async () => { screen = ReactTestRenderer.create(<AdminDashboard />); });
  mockClinicId = 72;
  const failure = { success: false, message: 'Unavailable' };
  jest.mocked(getProviderWalletSummaryApi).mockResolvedValue(failure);
  jest.mocked(getDashboardKpiApi).mockResolvedValue(failure);
  jest.mocked(getRevenueChartApi).mockResolvedValue(failure);
  await act(async () => { screen.update(<AdminDashboard />); });
  for (const label of ['Wallet Overview', 'Revenue This Month', 'Active Patients', 'Low Stock Medicines', 'Pending Lab Tests']) {
    expect(cardValue(label)).toBe('—');
  }
  expect(cardValue('Appointments This Month')).toBe(6);
});
