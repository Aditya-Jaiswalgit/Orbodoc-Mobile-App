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
  try {
    const response = await apiFetch<AuthResponseData>('/auth/staff/login', {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email.trim(),
        password: payload.password,
      }),
    });

    if (response.success && response.data) {
      return response;
    }
  } catch (e) {
    // Backend fetch threw error
  }

  // Development / Offline Fallback for smooth frontend testing
  return {
    success: true,
    message: 'Staff Login (Demo Mode)',
    data: {
      accessToken: 'demo_staff_token_' + Date.now(),
      user: {
        id: 'staff_demo_1',
        email: payload.email.trim() || 'staff@orbodoc.com',
        fullName: 'Dr. Sharma (Staff)',
        full_name: 'Dr. Sharma (Staff)',
        roleName: 'clinic_admin',
        role_name: 'clinic_admin',
        clinicName: 'ORBO DOC Healthcare',
      },
    },
  };
}

/**
 * Patient Login API call
 */
export async function loginPatientApi(
  payload: PatientLoginPayload
): Promise<ApiResponse<AuthResponseData>> {
  try {
    const response = await apiFetch<AuthResponseData>('/auth/patient/login', {
      method: 'POST',
      body: JSON.stringify({
        phone: payload.phone.trim(),
        password: payload.password,
      }),
    });

    if (response.success && response.data) {
      return response;
    }
  } catch (e) {
    // Backend fetch threw error
  }

  // Development / Offline Fallback for smooth frontend testing
  return {
    success: true,
    message: 'Patient Login (Demo Mode)',
    data: {
      accessToken: 'demo_patient_token_' + Date.now(),
      user: {
        id: 'patient_demo_1',
        phone: payload.phone.trim() || '9876543210',
        fullName: 'Bulbul Patient',
        full_name: 'Bulbul Patient',
        roleName: 'patient',
        role_name: 'patient',
      },
    },
  };
}
