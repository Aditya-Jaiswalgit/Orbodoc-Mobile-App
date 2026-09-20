import { apiFetch } from './apiConfig';
import {
  ApiResponse,
  AuthResponseData,
  PatientLoginPayload,
  StaffLoginPayload,
} from '../types/auth';

/**
 * 1️⃣ Primary Authentication API - Staff / Admin Login
 * Route: POST /api/auth/staff/login (Fallback: POST /api/auth/login)
 */
export async function loginStaffApi(
  payload: StaffLoginPayload
): Promise<ApiResponse<AuthResponseData>> {
  const staffRes = await apiFetch<AuthResponseData>('/auth/staff/login', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
    }),
  });

  if (staffRes.success || staffRes.message !== 'Route GET /api/auth/staff/login not found.') {
    return staffRes;
  }

  // Fallback to legacy /auth/login if /auth/staff/login returns 404
  return apiFetch<AuthResponseData>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
    }),
  });
}

/**
 * 1️⃣ Primary Authentication API - Patient Login
 * Route: POST /api/auth/patient/login
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
 * 2️⃣ Post-Login Data Initialization API 1 - Fetch Profile
 * Route: GET /api/auth/profile
 */
export async function fetchProfileApi(): Promise<ApiResponse<any>> {
  return apiFetch<any>('/auth/profile', {
    method: 'GET',
  });
}

/**
 * 2️⃣ Post-Login Data Initialization API 2 - Fetch Assigned Clinics List
 * Route: GET /api/clinics/my-clinics (Fallback: GET /api/clinics)
 */
export async function fetchMyClinicsApi(): Promise<ApiResponse<any>> {
  const res = await apiFetch<any>('/clinics/my-clinics', {
    method: 'GET',
  });

  if (res.success && res.data) {
    return res;
  }

  // Fallback to /clinics
  return apiFetch<any>('/clinics', {
    method: 'GET',
  });
}

/**
 * 2️⃣ Post-Login Data Initialization API 3 - Fetch Role Permissions Access Map
 * Route: GET /api/role_per/permission/{roleId} (Fallback: GET /api/role_per/list)
 */
export async function fetchRolePermissionsByRoleIdApi(
  roleId: number | string
): Promise<ApiResponse<any>> {
  const res = await apiFetch<any>(`/role_per/permission/${roleId}`, {
    method: 'GET',
  });

  if (res.success && res.data) {
    return res;
  }

  // Fallback to /role_per/list
  return apiFetch<any>('/role_per/list', {
    method: 'GET',
  });
}

/**
 * 3️⃣ Optional API - Send Staff OTP
 * Route: POST /api/staff/otp
 */
export async function sendStaffOtpApi(email: string): Promise<ApiResponse<any>> {
  return apiFetch<any>('/staff/otp', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim() }),
  });
}

/**
 * 3️⃣ Optional API - Verify Staff OTP
 * Route: POST /api/staff/verify-otp
 */
export async function verifyStaffOtpApi(
  email: string,
  otp: string
): Promise<ApiResponse<AuthResponseData>> {
  return apiFetch<AuthResponseData>('/staff/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim(),
      otp: otp.trim(),
    }),
  });
}

/**
 * 3️⃣ Optional API - Reset Password
 * Route: POST /api/auth/reset-password
 */
export async function resetAuthPasswordApi(payload: {
  token?: string;
  email?: string;
  newPassword?: string;
  password?: string;
}): Promise<ApiResponse<any>> {
  return apiFetch<any>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      token: payload.token,
      email: payload.email,
      newPassword: payload.newPassword || payload.password,
    }),
  });
}

/**
 * Switch Active Clinic
 * Route: POST /api/auth/switch-clinic
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
 * Update Profile API
 * Route: PUT /api/auth/profile
 */
export async function updateProfileApi(payload: {
  fullName?: string;
  phone?: string;
  address?: string;
}): Promise<ApiResponse<any>> {
  return apiFetch<any>('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Change Password API
 * Route: POST /api/auth/change-password
 */
export async function changePasswordApi(payload: {
  currentPassword?: string;
  current_password?: string;
  newPassword?: string;
  new_password?: string;
}): Promise<ApiResponse<any>> {
  return apiFetch<any>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      currentPassword: payload.currentPassword || payload.current_password,
      current_password: payload.current_password || payload.currentPassword,
      newPassword: payload.newPassword || payload.new_password,
      new_password: payload.new_password || payload.newPassword,
    }),
  });
}


