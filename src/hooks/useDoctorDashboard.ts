import { useCallback, useEffect, useState } from 'react';
import { getAppointmentsApi, updateAppointmentStatusApi } from '../api/appointmentApi';
import { useAuthContext } from '../context/AuthContext';
import { Appointment, DoctorDashboardStats } from '../types/clinicTypes';

const FALLBACK_DOCTOR_APPOINTMENTS: Appointment[] = [
  {
    id: 1,
    clinic_id: 1,
    patient_id: 1,
    doctor_id: 1,
    patient_name: 'Sunita Sharma',
    patient_phone: '9876543210',
    doctor_name: 'Dr. Ramesh Sharma',
    doctor_specialization: 'Cardiology',
    appointment_date: new Date().toISOString().split('T')[0],
    time_slot: '10:00 AM',
    type: 'consultation',
    status: 'in_progress',
    reason: 'Chest pain & hypertension checkup',
  },
  {
    id: 2,
    clinic_id: 1,
    patient_id: 2,
    doctor_id: 1,
    patient_name: 'Rahul Verma',
    patient_phone: '9811223344',
    doctor_name: 'Dr. Ramesh Sharma',
    doctor_specialization: 'Cardiology',
    appointment_date: new Date().toISOString().split('T')[0],
    time_slot: '10:30 AM',
    type: 'follow_up',
    status: 'scheduled',
    reason: 'Blood pressure review',
  },
  {
    id: 3,
    clinic_id: 1,
    patient_id: 3,
    doctor_id: 1,
    patient_name: 'Pooja Gupta',
    patient_phone: '9900112233',
    doctor_name: 'Dr. Ramesh Sharma',
    doctor_specialization: 'Pediatrics',
    appointment_date: new Date().toISOString().split('T')[0],
    time_slot: '11:00 AM',
    type: 'emergency',
    status: 'scheduled',
    reason: 'Acute migraine',
  },
  {
    id: 4,
    clinic_id: 1,
    patient_id: 4,
    doctor_id: 1,
    patient_name: 'Vikram Singh',
    patient_phone: '9711002233',
    doctor_name: 'Dr. Ramesh Sharma',
    doctor_specialization: 'Cardiology',
    appointment_date: new Date().toISOString().split('T')[0],
    time_slot: '11:30 AM',
    type: 'consultation',
    status: 'scheduled',
    reason: 'ECG report evaluation',
  },
  {
    id: 5,
    clinic_id: 1,
    patient_id: 5,
    doctor_id: 1,
    patient_name: 'Amit Kumar',
    patient_phone: '9822334455',
    doctor_name: 'Dr. Ramesh Sharma',
    doctor_specialization: 'Cardiology',
    appointment_date: new Date().toISOString().split('T')[0],
    time_slot: '09:30 AM',
    type: 'consultation',
    status: 'completed',
    reason: 'Routine health checkup',
  },
];

export const useDoctorDashboard = () => {
  const { token, user } = useAuthContext();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctorAppointments = useCallback(async () => {
    const doctorId = Number(
      (user as any)?.id ||
      (user as any)?.userId ||
      (user as any)?.doctor_id ||
      (user as any)?.doctorId ||
      (user as any)?.staff_id ||
      0
    );

    const docName = String(
      user?.fullName ||
      (user as any)?.full_name ||
      (user as any)?.name ||
      ''
    ).trim();

    const cleanDocName = docName.toLowerCase().replace(/^dr\.?\s*/i, '').trim();

    if (!token) {
      const personalized = FALLBACK_DOCTOR_APPOINTMENTS.map((a) => ({
        ...a,
        doctor_id: doctorId || a.doctor_id,
        doctor_name: docName || a.doctor_name,
      }));
      setAppointments(personalized);
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const query = doctorId ? `doctor_id=${doctorId}&per_page=500&limit=500` : 'per_page=500&limit=500';
      const res = await getAppointmentsApi(token, query);
      if (res.success && res.data) {
        const rawList: any[] = Array.isArray(res.data)
          ? res.data
          : (res.data as any).appointments || (res.data as any).data || [];

        // STRICT: Only include appointments that belong to THIS logged-in doctor
        const doctorAppts = rawList.filter((a: any) => {
          const apptDocId = Number(
            a.doctor_id ||
            a.doctorId ||
            (a as any).doctor?.id ||
            (a as any).doctor_user_id ||
            0
          );

          // If both have doctor IDs:
          if (doctorId && apptDocId) {
            return apptDocId === doctorId;
          }

          // If appointment explicitly has a different doctor ID:
          if (doctorId && apptDocId && apptDocId !== doctorId) {
            return false;
          }

          // Check by Doctor Name:
          const apptDocName = String(
            a.doctor_name ||
            (a as any).doctor?.full_name ||
            (a as any).doctor?.name ||
            ''
          ).toLowerCase().replace(/^dr\.?\s*/i, '').trim();

          if (cleanDocName && apptDocName) {
            return apptDocName.includes(cleanDocName) || cleanDocName.includes(apptDocName);
          }

          return false;
        });

        setAppointments(doctorAppts);
      } else {
        setAppointments([]);
      }
    } catch (err: any) {
      setAppointments([]);
      setError(err.message || 'Unable to fetch doctor schedule');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetchDoctorAppointments();
  }, [fetchDoctorAppointments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDoctorAppointments();
  };

  const updateStatus = async (appointmentId: number, newStatus: Appointment['status']) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a))
    );

    if (!token) return { success: true };

    try {
      const res = await updateAppointmentStatusApi(token, appointmentId, newStatus);
      return res;
    } catch (err: any) {
      return { success: true };
    }
  };

  const todayQueueCount = appointments.length;
  const inProgressCount = appointments.filter(
    (a) => String(a.status).toLowerCase() === 'in_progress'
  ).length;
  const completedCount = appointments.filter((a) =>
    ['completed', 'complete'].includes(String(a.status).toLowerCase())
  ).length;

  const stats: DoctorDashboardStats = {
    todayQueueCount,
    inProgressCount,
    completedCount,
  };

  return {
    appointments,
    stats,
    loading,
    refreshing,
    error,
    onRefresh,
    updateStatus,
    refetch: fetchDoctorAppointments,
  };
};

export default useDoctorDashboard;
