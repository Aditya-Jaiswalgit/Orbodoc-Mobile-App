import { apiFetch } from './apiConfig';
import {
  ApiResponse,
  AuthResponseData,
  PatientLoginPayload,
  StaffLoginPayload,
} from '../types/auth';

/**
 * Staff Login API call
 * Route: POST /api/auth/staff/login
 * Body: { email, password }
 */
export async function loginStaffApi(
  payload: StaffLoginPayload
): Promise<ApiResponse<AuthResponseData>> {
  return apiFetch<AuthResponseData>('/auth/staff/login', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
    }),
  });
}

/**
 * Patient Login API call
 * Route: POST /api/auth/patient/login
 * Body: { phone, password }
 */
export async function loginPatientApi(
  payload: PatientLoginPayload
): Promise<ApiResponse<AuthResponseData>> {
  return apiFetch<AuthResponseData>('/auth/patient/login', {
    method: 'POST',
    body: JSON.stringify({
      phone: payload.phone.trim(),
      password: payload.password,
    }),
  });
}
