import { apiFetch } from '../src/api/apiConfig';
import { fetchAllUsersApi, createClinicUserApi, updateClinicUserApi, resetStaffPasswordApi, deactivateStaffApi } from '../src/api/userManagementApi';

jest.mock('../src/api/apiConfig', () => ({ apiFetch: jest.fn() }));
const fetchMock = jest.mocked(apiFetch);
beforeEach(() => jest.clearAllMocks());

function backend(active: number, inactive: number) {
  fetchMock.mockImplementation(async endpoint => {
    const query = new URL('https://test.local' + endpoint).searchParams;
    const status = query.get('is_active');
    expect(['0', '1']).toContain(status);
    const total = status === '1' ? active : inactive;
    const page = Number(query.get('page'));
    const limit = Number(query.get('limit'));
    return { success: true, message: 'OK', data: {
      total, page, limit, data: Array.from({ length: total }, (_, id) => ({ id: status + ':' + id }))
        .slice((page - 1) * limit, page * limit),
    } } as any;
  });
}

test.each([[7, 9], [0, 12], [12, 0], [0, 0], [5, 5], [1, 19]])(
  'all-status pagination has no duplicates or omissions (%i active, %i inactive)', async (active, inactive) => {
    backend(active, inactive);
    const ids: string[] = [];
    for (let page = 1; page <= Math.max(1, Math.ceil((active + inactive) / 5)); page++) {
      const response = await fetchAllUsersApi({ page, limit: 5, is_active: 'all', clinic_id: 71 });
      expect(response.success).toBe(true);
      expect(response.data?.total).toBe(active + inactive);
      ids.push(...response.data!.data.map(row => row.id));
    }
    expect(ids).toHaveLength(active + inactive);
    expect(new Set(ids).size).toBe(ids.length);
  },
);

test('a failed status request is not reported as an empty successful list', async () => {
  fetchMock.mockResolvedValue({ success: false, message: 'Forbidden' });
  expect((await fetchAllUsersApi({ page: 1, limit: 5, is_active: 'all' })).success).toBe(false);
});

test('writes use the backend staff contract without invented IDs or passwords', async () => {
  fetchMock.mockResolvedValue({ success: true, message: 'OK' });
  await createClinicUserApi({ full_name: 'Example', role_id: 23, clinic_id: 71 });
  expect(fetchMock).toHaveBeenLastCalledWith('/staff', { method: 'POST', body: JSON.stringify({ full_name: 'Example', role_id: 23, clinic_id: 71 }) });
  await updateClinicUserApi(19, { is_active: 0 });
  expect(fetchMock).toHaveBeenLastCalledWith('/staff/19', { method: 'PUT', body: '{"is_active":0}' });
  await resetStaffPasswordApi(19, 'Test-password-123');
  expect(fetchMock).toHaveBeenLastCalledWith('/staff/19/reset-password', { method: 'POST', body: '{"newPassword":"Test-password-123"}' });
  await deactivateStaffApi(19);
  expect(fetchMock).toHaveBeenLastCalledWith('/staff/19', { method: 'DELETE' });
});
