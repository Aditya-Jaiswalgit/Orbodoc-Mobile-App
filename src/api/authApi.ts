import { apiFetch } from './apiConfig';
import {
  ApiResponse,
  AuthResponseData,
  PatientLoginPayload,
  StaffLoginPayload,
} from '../types/auth';

/**
 * Staff Login API call
 */
export async function loginStaffApi(
  payload: StaffLoginPayload
): Promise<ApiResponse<AuthResponseData>> {
  const response = await apiFetch<AuthResponseData>('/auth/staff/login', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
    }),
  });

  return normalizeAuthResponse(response);
}

export async function loginPatientApi(
  payload: PatientLoginPayload
): Promise<ApiResponse<AuthResponseData>> {
  const response = await apiFetch<AuthResponseData>('/auth/patient/login', {
    method: 'POST',
    body: JSON.stringify({
      phone: payload.phone.trim(),
      password: payload.password,
    }),
  });

  return normalizeAuthResponse(response);
}

export async function changePasswordApi(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<ApiResponse<void>> {
  return apiFetch<void>('/auth/change-password', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

/** The API has older and newer auth response shapes; expose one mobile shape. */
function normalizeAuthResponse(
  response: ApiResponse<AuthResponseData>,
): ApiResponse<AuthResponseData> {
  if (!response.success || !response.data) return response;

  const payload = response.data as AuthResponseData & {
    staff?: AuthResponseData['user'];
    patient?: AuthResponseData['user'];
  };
  const user = payload.user || payload.staff || payload.patient;
  const token = payload.accessToken || payload.token;

  if (!user || !token) {
    return {
      success: false,
      message: 'The server returned an incomplete login response.',
    };
  }

  return {
    ...response,
    data: {
      ...payload,
      accessToken: token,
      user: {
        ...user,
        fullName: user.fullName || user.full_name || '',
        roleName: user.roleName || user.role_name || user.role,
      },
    },
  };
}
