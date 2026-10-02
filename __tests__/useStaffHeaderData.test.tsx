import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import { useStaffHeaderData } from '../src/hooks/useStaffHeaderData';
import { fetchProfileApi } from '../src/api/authApi';
import { markAllNotificationsReadApi } from '../src/api/notificationApi';
import { clearHeaderNotifications, fetchClinicPlans, fetchHeaderInbox, fetchHeaderUnreadCount, updateVideoAvailability } from '../src/api/staffHeaderApi';

let mockClinicId = 71;
jest.mock('../src/context/AuthContext', () => ({
  useAuthContext: () => ({ user: { id: 1 }, token: 'test-token', activeClinicId: mockClinicId }),
}));
jest.mock('../src/api/authApi', () => ({ fetchProfileApi: jest.fn() }));
jest.mock('../src/api/notificationApi', () => ({ markAllNotificationsReadApi: jest.fn() }));
jest.mock('../src/api/staffHeaderApi', () => ({
  fetchHeaderInbox: jest.fn(), fetchHeaderUnreadCount: jest.fn(), fetchClinicPlans: jest.fn(),
  clearHeaderNotifications: jest.fn(), updateVideoAvailability: jest.fn(),
}));

let state: ReturnType<typeof useStaffHeaderData>;
let renderer: ReactTestRenderer.ReactTestRenderer;
function Harness() {
  state = useStaffHeaderData(true, true, true);
  return null;
}
const success = { success: true, message: 'Success' };
const failure = { success: false, message: 'Unavailable' };

beforeEach(() => {
  jest.clearAllMocks();
  mockClinicId = 71;
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(fetchProfileApi).mockResolvedValue({ ...success, data: { user: { role_name: 'clinic_admin', is_video_enabled: 1 } } });
  jest.mocked(fetchHeaderInbox).mockResolvedValue({ ...success, data: { total: 1, data: [
    { not_rec_id: 12, title: 'Backend notice', message: 'Actual notification', is_read: '0' },
  ] } });
  jest.mocked(fetchHeaderUnreadCount).mockResolvedValue({ ...success, data: { count: '6' } });
  jest.mocked(fetchClinicPlans).mockResolvedValue({ ...success, data: { clinics: [
    { id: 70, plan_name: 'Other clinic plan', plan_price: 999 },
    { id: 71, plan_name: 'Live plan', plan_price: '0', billing_cycle: 'yearly', plan_status: 'active', plan_started_at: '2026-01-01' },
  ] } });
  jest.mocked(markAllNotificationsReadApi).mockResolvedValue(success);
  jest.mocked(clearHeaderNotifications).mockResolvedValue(success);
  jest.mocked(updateVideoAvailability).mockResolvedValue(success);
});

afterEach(async () => {
  await act(async () => renderer?.unmount());
  jest.restoreAllMocks();
});

test('uses backend inbox/count and selects only the active clinic subscription', async () => {
  await act(async () => { renderer = ReactTestRenderer.create(<Harness />); });
  expect(state.notifications[0].message).toBe('Actual notification');
  expect(state.unreadCount).toBe(6);
  expect(state.plan?.plan_name).toBe('Live plan');
  expect(state.plan?.plan_price).toBe('0');
  expect(state.canManageVideoCalling).toBe(false);
});

test('clinic changes and failed APIs clear previous plan, notifications, and badge', async () => {
  await act(async () => { renderer = ReactTestRenderer.create(<Harness />); });
  mockClinicId = 72;
  jest.mocked(fetchHeaderInbox).mockResolvedValue(failure);
  jest.mocked(fetchHeaderUnreadCount).mockResolvedValue(failure);
  jest.mocked(fetchClinicPlans).mockResolvedValue(failure);
  await act(async () => renderer.update(<Harness />));
  expect(state.plan).toBeNull();
  expect(state.planError).toBe(true);
  expect(state.notifications).toEqual([]);
  expect(state.unreadCount).toBeNull();
  expect(state.notificationsError).toBe(true);
});

test('empty backend data does not substitute sample notifications or another clinic plan', async () => {
  mockClinicId = 72;
  jest.mocked(fetchHeaderInbox).mockResolvedValue({ ...success, data: { total: 0, data: [] } });
  jest.mocked(fetchHeaderUnreadCount).mockResolvedValue({ ...success, data: { count: 0 } });
  await act(async () => { renderer = ReactTestRenderer.create(<Harness />); });
  expect(state.plan).toBeNull();
  expect(state.planError).toBe(false);
  expect(state.notifications).toEqual([]);
  expect(state.unreadCount).toBe(0);
  expect(state.notificationsError).toBe(false);
});

test('notification actions persist and failed clear leaves the list intact', async () => {
  await act(async () => { renderer = ReactTestRenderer.create(<Harness />); });
  jest.mocked(clearHeaderNotifications).mockResolvedValueOnce(failure);
  await act(async () => state.clearAll());
  expect(state.notifications).toHaveLength(1);
  expect(Alert.alert).toHaveBeenCalled();
  jest.mocked(fetchHeaderUnreadCount).mockResolvedValue({ ...success, data: { count: 0 } });
  await act(async () => state.markAllRead());
  expect(markAllNotificationsReadApi).toHaveBeenCalledTimes(1);
  expect(state.unreadCount).toBe(0);
  jest.mocked(fetchHeaderInbox).mockResolvedValue({ ...success, data: { total: 0, data: [] } });
  await act(async () => state.clearAll());
  expect(clearHeaderNotifications).toHaveBeenCalledTimes(2);
  expect(state.notifications).toEqual([]);
});

test('doctor video availability changes only after backend success', async () => {
  jest.mocked(fetchProfileApi).mockResolvedValue({ ...success, data: { user: { role_name: 'doctor', is_video_enabled: 0 } } });
  await act(async () => { renderer = ReactTestRenderer.create(<Harness />); });
  expect(state.canManageVideoCalling).toBe(true);
  expect(state.videoCallingEnabled).toBe(false);
  jest.mocked(updateVideoAvailability).mockResolvedValueOnce(failure);
  await act(async () => state.toggleVideo(true));
  expect(state.videoCallingEnabled).toBe(false);
  jest.mocked(fetchProfileApi).mockResolvedValue({ ...success, data: { user: { role_name: 'doctor', is_video_enabled: 1 } } });
  await act(async () => state.toggleVideo(true));
  expect(updateVideoAvailability).toHaveBeenCalledWith(true);
  expect(state.videoCallingEnabled).toBe(true);
});
