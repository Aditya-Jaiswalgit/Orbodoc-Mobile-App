import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AuthProvider, normalizeAppRole, useAuthContext } from '../src/context/AuthContext';
import { apiFetch } from '../src/api/apiConfig';
import { AuthContextType } from '../src/types/auth';

jest.mock('../src/api/apiConfig', () => ({ apiFetch: jest.fn(), setGlobalAuthToken: jest.fn() }));
const fetchMock = jest.mocked(apiFetch);
const ok = (data: any): any => ({ success: true, message: 'OK', data });
let context: AuthContextType;
let screen: Renderer.ReactTestRenderer;
let rows: any[];
let serverClinicId: number;
const user = { id: 10, fullName: 'Test', role_id: 23, role: 'billing_assistant', clinic_id: 71 };
function Probe() { context = useAuthContext(); return null; }
beforeEach(() => {
  jest.clearAllMocks();
  serverClinicId = 71;
  rows = [
    { role_id: 23, clinic_id: 71, object_name: 'medicine_bills', can_view: 1 },
    { role_id: 23, clinic_id: 72, object_name: 'patients', can_view: 1 },
  ];
  fetchMock.mockImplementation(async (url, options) => {
    if (url === '/auth/profile') return ok({ user });
    if (url === '/clinics/my-clinics') return ok({ clinics: [{ id: 71, name: 'First' }, { id: 72, name: 'Second' }] });
    if (url === '/role_per/permission/23') return ok(Object.fromEntries(rows
      .filter(row => row.clinic_id === serverClinicId)
      .map(row => [row.object_name, { view: row.can_view }])));
    if (url === '/system_object/list') return ok([]);
    if (url === '/auth/switch-clinic') {
      serverClinicId = JSON.parse(String(options?.body)).clinicId;
      return ok({ token: 'next-token', user: { ...user, clinic_id: serverClinicId } });
    }
    throw new Error('Unexpected ' + url);
  });
});
afterEach(async () => { await act(async () => screen?.unmount()); });
async function login(permissions?: Record<string, any>) {
  await act(async () => { screen = Renderer.create(<AuthProvider><Probe /></AuthProvider>); });
  await act(async () => context.saveAuthSession({ token: 'token', user, permissions }, 'staff'));
}

test('login uses the same role access endpoint as web, not the management list', async () => {
  await login();
  expect(context.role).toBe('billing_assistant');
  expect(context.permissionsMap?.medicine_bills.view).toBe(true);
  expect(context.permissionsMap?.patients).toBeUndefined();
  expect(fetchMock).toHaveBeenCalledWith('/role_per/permission/23');
  expect(fetchMock.mock.calls.some(([url]) => url.startsWith('/role_per/list'))).toBe(false);
});

test('permission refresh reflects revoked access without logging in again', async () => {
  await login();
  rows = [{ role_id: 23, clinic_id: 71, object_name: 'medicine_bills', can_view: 0 }];
  await act(async () => context.refreshPermissions!());
  expect(context.permissionsMap?.medicine_bills.view).toBe(false);
});

test('switching clinics replaces the previous clinic permissions', async () => {
  await login();
  await act(async () => { expect(await context.switchClinic(72)).toBe(true); });
  expect(context.permissionsMap?.medicine_bills).toBeUndefined();
  expect(context.permissionsMap?.patients.view).toBe(true);
});

test('permission load failure denies access and retry restores it', async () => {
  await login();
  const original = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async (url, options) => url.startsWith('/role_per/permission/')
    ? { success: false, message: 'Offline' } : original(url, options));
  await act(async () => context.refreshPermissions!());
  expect(context.permissionsMap).toEqual({});
  expect(context.permissionsError).toBeTruthy();
  fetchMock.mockImplementation(original);
  await act(async () => context.refreshPermissions!());
  expect(context.permissionsMap?.medicine_bills.view).toBe(true);
});

test('late permission response cannot restore access after logout', async () => {
  await login();
  let resolve!: (value: any) => void;
  const original = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation((url, options) => url.startsWith('/role_per/permission/')
    ? new Promise(done => { resolve = done; }) : original(url, options));
  let pending!: Promise<void>;
  await act(async () => { pending = context.refreshPermissions!(); });
  await act(async () => context.logout());
  await act(async () => { resolve(ok({ medicine_bills: { view: true } })); await pending; });
  expect(context.permissionsMap).toEqual({});
  expect(context.isAuthenticated).toBe(false);
});

test('login permissions provide the web fallback when the role map is empty', async () => {
  rows = [];
  await login({ dashboard: { can_view: true } });
  expect(context.permissionsMap?.dashboard.view).toBe(true);
  await act(async () => { await context.switchClinic(72); });
  expect(context.permissionsMap).toEqual({});
});

test('an explicit server denial overrides an older login grant', async () => {
  rows = [{ clinic_id: 71, object_name: 'dashboard', can_view: 0 }];
  await login({ dashboard: { can_view: true } });
  expect(context.permissionsMap?.dashboard.view).toBe(false);
});

test('custom role names containing admin or doctor do not become privileged built-in roles', () => {
  expect(normalizeAppRole({ ...user, role: 'admin_assistant' })).toBe('admin_assistant');
  expect(normalizeAppRole({ ...user, role: 'doctor_assistant' })).toBe('doctor_assistant');
  expect(normalizeAppRole({ ...user, role: 'Super Admin' })).toBe('super_admin');
  expect(normalizeAppRole({ ...user, role: 'Admin' })).toBe('clinic_admin');
  expect(normalizeAppRole({ id: 10, fullName: 'Unknown' })).toBe('staff');
});


test.each([
  [{ plan_type: ' MULTI ' }, true],
  [{ planType: 'multi' }, true],
  [{ max_clinics: '3' }, true],
  [{ maxClinics: 2 }, true],
  [{ plan_type: 'single', max_clinics: 1 }, false],
  [undefined, false],
])('management clinic selection follows the login plan %j, not assignment count', async (plan, expected) => {
  await act(async () => { screen = Renderer.create(<AuthProvider><Probe /></AuthProvider>); });
  await act(async () => context.saveAuthSession({ token: 'token', user, plan }, 'staff'));
  expect(context.isMultiClinic).toBe(true);
  expect(context.isMultiPlan).toBe(expected);
  await act(async () => context.logout());
  expect(context.isMultiPlan).toBe(false);
});

test('switching clinic replaces the management plan entitlement', async () => {
  await act(async () => { screen = Renderer.create(<AuthProvider><Probe /></AuthProvider>); });
  await act(async () => context.saveAuthSession({ token: 'token', user, plan: { plan_type: 'multi' } }, 'staff'));
  expect(context.isMultiPlan).toBe(true);
  const original = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async (url, options) => {
    const result = await original(url, options);
    return url === '/auth/switch-clinic' ? ok({ ...(result.data as object), plan: { plan_type: 'single', max_clinics: 1 } }) : result;
  });
  await act(async () => { await context.switchClinic(72); });
  expect(context.isMultiPlan).toBe(false);
});
