import { apiFetch } from '../src/api/apiConfig';
import {
  fetchUserRolesApi, fetchRolePermissionsApi, fetchPermissionMapByRoleApi,
  createUserRoleApi, updateUserRoleApi, createRolePermissionApi, updateRolePermissionApi,
} from '../src/api/roleManagementApi';
import { buildRoleCatalog, getManageableRoles } from '../src/utils/roleManagement';

jest.mock('../src/api/apiConfig', () => ({ apiFetch: jest.fn() }));
const fetchMock = jest.mocked(apiFetch);
beforeEach(() => { jest.clearAllMocks(); });

test.each(['array', 'data', 'rows'])('role loading supports the web %s envelope and normalizes IDs/names/flags', async shape => {
  const rows = [
    { role_id: 99, role_name: 'billing_staff', clinic_id: 71, is_system: '0' },
    { id: 3, role: 'doctor', is_system: '1' },
    { id: 2, name: 'admin', is_system: true },
    { role_name: 'missing_id' }, { id: 88 },
  ];
  fetchMock.mockResolvedValue({ success: true, message: 'OK', data: shape === 'array' ? rows : { [shape]: rows } } as any);
  const result = await fetchUserRolesApi(71);
  expect(fetchMock).toHaveBeenCalledWith('/user_role/list?clinic_id=71');
  expect(result.data?.map(row => [row.id, row.role_name, row.is_system])).toEqual([
    ['99', 'billing_staff', false], ['3', 'doctor', true], ['2', 'admin', true],
  ]);
  expect(getManageableRoles(buildRoleCatalog(result.data!), 'clinic_admin').map(row => row.id)).toEqual(['3', '99']);
});

test('role catalog keeps clinic-specific IDs for normalized duplicate names', async () => {
  fetchMock.mockResolvedValue({ success: true, message: 'OK', data: [
    { role_id: 99, role_name: ' Billing-Staff ', clinic_id: 71 },
    { role_id: 23, role_name: 'billing_staff', clinic_id: null },
    { role_id: 3, role_name: 'doctor', clinic_id: null },
  ] } as any);
  const result = await fetchUserRolesApi(71);
  expect(buildRoleCatalog(result.data!).map(row => row.id)).toEqual(['3', '99']);
});

test('role and permission writes use the web methods, IDs and actor payload', async () => {
  fetchMock.mockResolvedValue({ success: true, message: 'OK' });
  await createUserRoleApi({ role_name: 'Ward Helper', clinic_id: 71 });
  expect(fetchMock).toHaveBeenLastCalledWith('/user_role/add', { method: 'POST', body: JSON.stringify({ role_name: 'Ward Helper', clinic_id: 71 }) });
  await updateUserRoleApi(23, 'Ward Manager');
  expect(fetchMock).toHaveBeenLastCalledWith('/user_role/update/23', { method: 'PUT', body: JSON.stringify({ role_name: 'Ward Manager' }) });
  const flags = { can_view: 1, can_add: 0, can_edit: 1, can_delete: 0, can_execute: 1 };
  await createRolePermissionApi({ ...flags, role_id: 23, sys_obj_id: 11, clinic_id: 71, user_id: 10 });
  const [url, options] = fetchMock.mock.calls.at(-1)!;
  expect(url).toBe('/role_per/add');
  expect(options?.method).toBe('POST');
  expect(JSON.parse(String(options?.body))).toEqual({ ...flags, role_id: '23', sys_obj_id: '11', clinic_id: 71, user_id: 10 });
  await updateRolePermissionApi(92, flags);
  expect(fetchMock).toHaveBeenLastCalledWith('/role_per/update/92', { method: 'PUT', body: JSON.stringify(flags) });
});

test('management matrix and login access use their distinct web endpoints', async () => {
  fetchMock.mockResolvedValue({ success: true, message: 'OK', data: [{ permission_id: 92, role_id: 23, sys_obj_id: 11, view: true, add: '0', edit: '1', delete: false, execute: 'yes' }] } as any);
  const result = await fetchRolePermissionsApi(71);
  expect(fetchMock).toHaveBeenLastCalledWith('/role_per/list?clinic_id=71');
  expect(result.data?.[0]).toMatchObject({ id: 92, can_view: 1, can_add: 0, can_edit: 1, can_delete: 0, can_execute: 1 });
  await fetchPermissionMapByRoleApi(23);
  expect(fetchMock).toHaveBeenLastCalledWith('/role_per/permission/23');
});

test('failed role loads retain the failure and no clinic does not load an unscoped matrix', async () => {
  fetchMock.mockResolvedValue({ success: false, message: 'Access denied' });
  expect(await fetchUserRolesApi(71)).toMatchObject({ success: false, message: 'Access denied', data: undefined });
  fetchMock.mockClear();
  expect((await fetchRolePermissionsApi()).success).toBe(false);
  expect(fetchMock).not.toHaveBeenCalled();
});
