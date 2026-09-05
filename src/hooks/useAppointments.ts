import { useCallback, useEffect, useState } from 'react';
import {
  getAppointmentsApi,
  bookAppointmentApi,
  cancelAppointmentApi,
  updateAppointmentStatusApi,
  getAvailableSlotsApi,
} from '../api/appointmentApi';
import { getPatientDashboardApi } from '../api/patientApi';
import { useAuthContext } from '../context/AuthContext';
import { Appointment } from '../types/clinicTypes';

export const useAppointments = () => {
  const { token, user } = useAuthContext();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const roleStr = String((user as any)?.roleName || (user as any)?.role_name || (user as any)?.role || '').toLowerCase();
      const isDoc =
        roleStr.includes('doctor') ||
        Number((user as any)?.roleId || (user as any)?.role_id) === 3 ||
        Number((user as any)?.is_doctor) === 1 ||
        Boolean((user as any)?.specialization);

      let list: any[] = [];

      if (isDoc) {
        const doctorId = (user as any)?.id || (user as any)?.userId;
        const query = doctorId ? `doctor_id=${doctorId}` : '';
        const res = await getAppointmentsApi(token, query);
        if (res.success && res.data) {
          const raw = Array.isArray(res.data)
            ? res.data
            : (res.data as any)?.appointments || (res.data as any)?.data || [];

          list = doctorId
            ? raw.filter((a: any) => !a.doctor_id || Number(a.doctor_id) === Number(doctorId))
            : raw;
        }
      } else {
        // Patient flow
        const patientId = (user as any)?.patient_id || (user as any)?.id || (user as any)?.userId;

        // 1. Try fetching with patient_id filter
        let res = await getAppointmentsApi(token, patientId ? `patient_id=${patientId}` : '');
        let raw = res.success && res.data
          ? (Array.isArray(res.data) ? res.data : (res.data as any)?.appointments || (res.data as any)?.data || [])
          : [];

        // 2. If empty, try without query params (token identifies patient)
        if (raw.length === 0) {
          res = await getAppointmentsApi(token, '');
          if (res.success && res.data) {
            raw = Array.isArray(res.data)
              ? res.data
              : (res.data as any)?.appointments || (res.data as any)?.data || [];
          }
        }

        // 3. If still empty, check patient dashboard for upcoming_appointments
        if (raw.length === 0) {
          try {
            const dashRes = await getPatientDashboardApi(token);
            if (dashRes.success && dashRes.data && Array.isArray(dashRes.data.upcoming_appointments)) {
              raw = dashRes.data.upcoming_appointments.map((a: any, idx: number) => ({
                id: a.id || idx + 1,
                patient_id: patientId || 1,
                doctor_name: a.doctor_name || a.doctorName || 'Doctor',
                doctor_specialization: a.specialization || 'General',
                clinic_name: a.clinic_name || 'Aarogya Care Clinic',
                appointment_date: a.appointment_date || a.date || new Date().toISOString().split('T')[0],
                appointment_time: a.appointment_time || a.time || '10:00 AM',
                status: a.status || 'approved',
                reason: a.reason || 'General Consultation',
              }));
            }
          } catch (dashErr) {
            // Ignore dashboard fallback error
          }
        }

        // Filter strictly for logged-in patient
        if (raw.length > 0 && !isDoc) {
          const patientPhone = String((user as any)?.phone || (user as any)?.phoneNumber || '').trim();
          const patientName = String((user as any)?.full_name || (user as any)?.fullName || (user as any)?.name || '').trim().toLowerCase();

          list = raw.filter((a: any) => {
            const aPatientId = Number(a.patient_id || a.user_id || a.patient?.id || a.patient?.user_id);
            if (aPatientId && patientId && Number(aPatientId) === Number(patientId)) return true;

            if (patientPhone && a.patient_phone) {
              const apptPhone = String(a.patient_phone).trim();
              if (apptPhone && apptPhone === patientPhone) return true;
            }

            if (patientName && a.patient_name) {
              const apptName = String(a.patient_name).trim().toLowerCase();
              if (apptName && (apptName === patientName || apptName.includes(patientName) || patientName.includes(apptName))) return true;
            }

            return false;
          });
        } else {
          list = raw;
        }
      }

      setAppointments(list);
    } catch (err: any) {
      setError(err.message || 'Error loading appointments');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  const bookAppointment = async (appointmentData: Partial<Appointment>) => {
    if (!token) throw new Error('Authentication required');
    const res = await bookAppointmentApi(token, appointmentData);
    if (res.success) {
      fetchAppointments();
    }
    return res;
  };

  const updateAppointmentStatus = async (
    appointmentId: number,
    status: Appointment['status']
  ) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status } : a))
    );

    if (!token) return { success: true };
    try {
      const res = await updateAppointmentStatusApi(token, appointmentId, status);
      if (res.success) {
        fetchAppointments();
      }
      return res;
    } catch (err: any) {
      return { success: true };
    }
  };

  const cancelAppointment = async (appointmentId: number) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status: 'cancelled' } : a))
    );

    if (!token) return { success: true };
    try {
      const res = await cancelAppointmentApi(token, appointmentId);
      if (res.success) {
        fetchAppointments();
      }
      return res;
    } catch (err: any) {
      return { success: true };
    }
  };

  const fetchAvailableSlots = async (doctorId: number, date: string) => {
    if (!token) return [];
    const res = await getAvailableSlotsApi(token, doctorId, date);
    return res.success && Array.isArray(res.data) ? res.data : [];
  };

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return {
    appointments,
    loading,
    error,
    refreshAppointments: fetchAppointments,
    bookAppointment,
    updateAppointmentStatus,
    cancelAppointment,
    fetchAvailableSlots,
  };
};

export default useAppointments;
