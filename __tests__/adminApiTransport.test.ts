import { apiFetch, BASE_URL, setGlobalAuthToken } from '../src/api/apiConfig';
import { resetStaffPasswordApi } from '../src/api/userManagementApi';
import { fetchUserRolesApi } from '../src/api/roleManagementApi';

const originalFetch = globalThis.fetch;
const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  setGlobalAuthToken('session-token');
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  setGlobalAuthToken(null);
});
const response = (status: number, payload: unknown) => ({
  ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(payload),
});

test('role requests use the active Bearer token and unwrap the backend envelope', async () => {
  fetchMock.mockResolvedValue(response(200, { success: true, data: [{ role_id: 23, role_name: 'billing_staff' }] }));
  const result = await fetchUserRolesApi(71);
  expect(fetchMock).toHaveBeenCalledWith(BASE_URL + '/user_role/list?clinic_id=71', expect.objectContaining({
    headers: expect.objectContaining({ Authorization: 'Bearer session-token', 'Content-Type': 'application/json' }),
  }));
  expect(result.data?.[0]).toMatchObject({ id: '23', role_name: 'billing_staff' });
});

test('password reset sends only newPassword and returns the server error', async () => {
  fetchMock.mockResolvedValue(response(403, { success: false, message: 'Access denied' }));
  const result = await resetStaffPasswordApi(25, 'Example-password');
  expect(fetchMock).toHaveBeenCalledWith(BASE_URL + '/staff/25/reset-password', expect.objectContaining({
    method: 'POST', body: JSON.stringify({ newPassword: 'Example-password' }),
    headers: expect.objectContaining({ Authorization: 'Bearer session-token' }),
  }));
  expect(result).toMatchObject({ success: false, message: 'Access denied', error: 'HTTP_403' });
});

test('clinic session token replacement and logout do not reuse the previous Bearer token', async () => {
  fetchMock.mockResolvedValue(response(200, { success: true, data: [] }));
  setGlobalAuthToken('switched-clinic-token');
  await fetchUserRolesApi(72);
  expect(fetchMock.mock.calls.at(-1)![1].headers.Authorization).toBe('Bearer switched-clinic-token');
  setGlobalAuthToken(null);
  await apiFetch('/user_role/list');
  expect(fetchMock.mock.calls.at(-1)![1].headers.Authorization).toBeUndefined();
});

test('malformed and offline responses are failures, not successful empty lists', async () => {
  fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '<html>unavailable</html>' });
  expect(await fetchUserRolesApi(71)).toMatchObject({ success: false, error: 'InvalidResponse' });
  fetchMock.mockRejectedValue(new Error('Offline'));
  expect(await fetchUserRolesApi(71)).toMatchObject({ success: false, error: 'NetworkError' });
});
