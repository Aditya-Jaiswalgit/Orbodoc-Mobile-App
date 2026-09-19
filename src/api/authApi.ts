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

/**
 * Switch Active Clinic API call (Multi-clinic)
 * Route: POST /api/auth/switch-clinic
 * Body: { clinicId }
 */
export async function switchClinicApi(
  clinicId: number
): Promise<ApiResponse<AuthResponseData>> {
  return apiFetch<AuthResponseData>('/auth/switch-clinic', {
    method: 'POST',
    body: JSON.stringify({ clinicId }),
  });
}

/**
 * Fetch User Profile API call
 * Route: GET /api/auth/profile
 */
export async function fetchProfileApi(): Promise<ApiResponse<any>> {
  return apiFetch('/auth/profile', {
    method: 'GET',
  });
}

/**
 * Fetch My Assigned Clinics API call
 * Route: GET /api/clinics/my-clinics
 */
export async function fetchMyClinicsApi(): Promise<ApiResponse<any>> {
  return apiFetch('/clinics/my-clinics', {
    method: 'GET',
  });
}

