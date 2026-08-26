import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { StaffMember } from '../types/clinicTypes';

export async function getDoctorsByClinicApi(
  token: string,
  clinicId: number
): Promise<ApiResponse<StaffMember[]>> {
  // 1. Fetch from Public Providers endpoint
  try {
    const publicRes = await apiFetch<any>('/public/providers?category=clinic', {
      method: 'GET',
    });

    if (publicRes.success && publicRes.data) {
      const rawProviders = Array.isArray(publicRes.data)
        ? publicRes.data
        : (publicRes.data.providers || publicRes.data.data || []);

      const targetClinic = rawProviders.find((p: any) => Number(p.id || p.source_id) === Number(clinicId));
      if (targetClinic && Array.isArray(targetClinic.doctors) && targetClinic.doctors.length > 0) {
        const mappedDoctors: StaffMember[] = targetClinic.doctors.map((d: any) => ({
          id: Number(d.id),
          clinic_id: Number(clinicId),
          full_name: String(d.name || d.full_name || 'Doctor'),
          email: d.email || 'doctor@clinic.com',
          phone: d.phone || '9876543210',
          role_name: 'doctor',
          specialization: d.specialty || d.specialization || 'General Physician',
          qualification: d.qualification || '',
          consultation_fee: Number(d.consultation_fee ?? d.fee ?? d.consultationFee ?? 0),
          is_active: true,
        }));
        return {
          success: true,
          message: 'Doctors fetched for assigned clinic',
          data: mappedDoctors,
        };
      }
    }
  } catch (err: any) {}

  // 2. Try GET /staff/doctors/clinic/:clinicId
  try {
    const res = await apiFetch<any>(`/staff/doctors/clinic/${clinicId}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (res.success && res.data) {
      const rawList = Array.isArray(res.data) ? res.data : (res.data.doctors || res.data.data || []);
      const matched = rawList
        .filter((d: any) => Number(d.clinic_id) === Number(clinicId))
        .map((d: any) => ({
          ...d,
          qualification: d.qualification || '',
          consultation_fee: Number(d.consultation_fee ?? d.fee ?? d.consultationFee ?? 0),
        }));

      if (matched.length > 0) {
        return {
          success: true,
          message: 'Doctors fetched from staff API',
          data: matched,
        };
      }
    }
  } catch (err: any) {}

  // 3. Try GET /staff/doctors?clinic_id=:clinicId
  try {
    const res = await apiFetch<any>(`/staff/doctors?clinic_id=${clinicId}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (res.success && res.data) {
      const rawList = Array.isArray(res.data) ? res.data : (res.data.doctors || res.data.data || []);
      const matched = rawList
        .filter((d: any) => Number(d.clinic_id) === Number(clinicId))
        .map((d: any) => ({
          ...d,
          qualification: d.qualification || '',
          consultation_fee: Number(d.consultation_fee ?? d.fee ?? d.consultationFee ?? 0),
        }));

      if (matched.length > 0) {
        return {
          success: true,
          message: 'Doctors fetched from query API',
          data: matched,
        };
      }
    }
  } catch (err: any) {}

  return {
    success: false,
    message: 'No doctors returned from backend for this clinic',
    data: [],
  };
}
