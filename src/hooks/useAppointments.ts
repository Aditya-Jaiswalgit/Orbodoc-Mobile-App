import { useCallback, useEffect, useState } from 'react';
import {
  getAppointmentsApi,
  bookAppointmentApi,
  cancelAppointmentApi,
  updateAppointmentStatusApi,
  getAvailableSlotsApi,
} from '../api/appointmentApi';
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
      const isDoc =
        String((user as any)?.roleName || (user as any)?.role_name || (user as any)?.role || '')
          .toLowerCase()
          .includes('doctor') ||
        Number((user as any)?.roleId || (user as any)?.role_id) === 3 ||
        Number((user as any)?.is_doctor) === 1 ||
        Boolean((user as any)?.specialization);
      const doctorId = (user as any)?.id || (user as any)?.userId;
      const query = doctorId ? `doctor_id=${doctorId}` : '';
      const res = await getAppointmentsApi(token, query);
      if (res.success && res.data) {
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.appointments || (res.data as any)?.data || [];

        const filteredList = (isDoc || doctorId) && doctorId
          ? list.filter((a: any) => !a.doctor_id || Number(a.doctor_id) === Number(doctorId))
          : list;

        setAppointments(filteredList);
      } else {
        setError(res.message || 'Failed to fetch appointments');
      }
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
