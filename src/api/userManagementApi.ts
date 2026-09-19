import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { StaffMember } from '../types/clinicTypes';

export interface CreateClinicUserPayload {
  clinic_id?: string | number;
  email: string;
  password?: string;
  role_id?: string | number;
  role_name?: string;
  full_name: string;
  phone?: string;
  department?: string;
  specialization?: string;
  consultation_fee?: number;
}

/**
 * Fetch Users by Role
 * Route: GET /api/clinic-admin/users/:role
 */
export async function fetchUsersByRoleApi(
  role?: string
): Promise<ApiResponse<StaffMember[]>> {
  const roleToFetch = role && role !== 'all' ? role : 'all';
  
  if (roleToFetch === 'all') {
    const rolesToFetch = [
      'patient',
      'doctor',
      'lab_technician',
      'pharmacist',
      'accountant',
      'receptionist',
      'nurse',
      'super_admin',
      'clinic_admin',
    ];
    try {
      const results = await Promise.all(
        rolesToFetch.map(async r => {
          const res = await apiFetch<StaffMember[]>(`/clinic-admin/users/${r}`);
          return res.success && Array.isArray(res.data) ? res.data : [];
        })
      );
      const combined = results.flat();
      return {
        success: true,
        message: 'Success',
        data: combined,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to fetch users',
        data: [],
      };
    }
  }

  return apiFetch<StaffMember[]>(`/clinic-admin/users/${roleToFetch}`);
}

/**
 * Create Staff / Clinic User
 * Route: POST /api/staff
 */
export async function createClinicUserApi(
  payload: CreateClinicUserPayload
): Promise<ApiResponse<StaffMember>> {
  return apiFetch<StaffMember>('/staff', {
    method: 'POST',
    body: JSON.stringify({
      clinic_id: payload.clinic_id,
      email: payload.email.trim(),
      password: payload.password || 'TempPass123!',
      role_id: payload.role_id,
      role_name: payload.role_name,
      full_name: payload.full_name.trim(),
      phone: payload.phone?.trim(),
      department: payload.department,
      specialization: payload.specialization,
      consultation_fee: payload.consultation_fee,
    }),
  });
}

/**
 * Update Staff User
 * Route: PUT /api/staff/:userId
 */
export async function updateClinicUserApi(
  userId: string | number,
  payload: Partial<CreateClinicUserPayload>
): Promise<ApiResponse<StaffMember>> {
  return apiFetch<StaffMember>(`/staff/${encodeURIComponent(String(userId))}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Delete Staff Account
 * Route: DELETE /api/staff/:userId
 */
export async function deleteStaffApi(
  userId: string | number
): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/staff/${encodeURIComponent(String(userId))}`, {
    method: 'DELETE',
  });
}

/**
 * Reset Staff Password
 * Route: POST /api/staff/:userId/reset-password
 */
export async function resetStaffPasswordApi(
  userId: string | number,
  newPassword: string
): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/staff/${encodeURIComponent(String(userId))}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  });
}
