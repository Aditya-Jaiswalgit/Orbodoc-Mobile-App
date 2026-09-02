import { useCallback, useEffect, useState } from 'react';
import { createPrescriptionApi, getPrescriptionsApi } from '../api/prescriptionApi';
import { useAuthContext } from '../context/AuthContext';
import { Prescription } from '../types/clinicTypes';

const INITIAL_FALLBACK_PRESCRIPTIONS: Prescription[] = [
  {
    id: 101,
    clinic_id: 1,
    patient_id: 1,
    patient_name: 'Sunita Sharma',
    patient_age: 34,
    patient_gender: 'Female',
    doctor_id: 1,
    doctor_name: 'Dr. Ramesh Sharma',
    diagnosis: 'Hypertension & Angina Peculia',
    symptoms: 'Chest tightness, elevated BP',
    vital_bp: '140/90',
    vital_pulse: '78 bpm',
    vital_temp: '98.4 F',
    vital_weight: '62 kg',
    created_at: '2025-01-15',
    items: [
      { id: 1, medicine_name: 'Amlodipine 5mg', dosage: '5mg', frequency: '1-0-0 (Morning)', duration: '30 Days', quantity: 30 },
      { id: 2, medicine_name: 'Atorvastatin 10mg', dosage: '10mg', frequency: '0-0-1 (Night)', duration: '30 Days', quantity: 30 },
    ],
  },
  {
    id: 102,
    clinic_id: 1,
    patient_id: 2,
    patient_name: 'Rahul Verma',
    patient_age: 45,
    patient_gender: 'Male',
    doctor_id: 1,
    doctor_name: 'Dr. Ramesh Sharma',
    diagnosis: 'Type 2 Diabetes Mellitus',
    symptoms: 'Polyuria, fatigue',
    vital_bp: '128/82',
    vital_pulse: '72 bpm',
    vital_temp: '98.6 F',
    vital_weight: '74 kg',
    created_at: '2025-01-14',
    items: [
      { id: 3, medicine_name: 'Metformin 500mg', dosage: '500mg', frequency: '1-0-1 (After meals)', duration: '15 Days', quantity: 30 },
    ],
  },
];

export const usePrescriptions = (patientId?: number) => {
  const { token, user } = useAuthContext();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(INITIAL_FALLBACK_PRESCRIPTIONS);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrescriptions = useCallback(async () => {
    if (!token) {
      setPrescriptions(INITIAL_FALLBACK_PRESCRIPTIONS);
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const res = await getPrescriptionsApi(token, patientId);
      if (res.success && res.data) {
        const rawList = Array.isArray(res.data)
          ? res.data
          : (res.data as any).prescriptions || (res.data as any).data || [];

        if (Array.isArray(rawList) && rawList.length > 0) {
          const sanitized = rawList.map((rx: any) => ({
            ...rx,
            items: Array.isArray(rx.items) ? rx.items : [],
          }));
          setPrescriptions(sanitized);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load prescriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, patientId]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPrescriptions();
  };

  const addPrescription = async (prescriptionData: Partial<Prescription>) => {
    const newRx: Prescription = {
      id: Math.floor(100 + Math.random() * 900),
      clinic_id: Number(user?.clinicId || user?.clinic_id || 1),
      patient_id: Number(prescriptionData.patient_id || 1),
      patient_name: prescriptionData.patient_name || 'Patient',
      patient_age: prescriptionData.patient_age || 30,
      patient_gender: prescriptionData.patient_gender || 'General',
      doctor_id: Number(user?.userId || user?.id || 1),
      doctor_name: user?.fullName || user?.full_name || 'Dr. Ramesh Sharma',
      diagnosis: prescriptionData.diagnosis || 'General Consultation',
      symptoms: prescriptionData.symptoms || '',
      vital_bp: prescriptionData.vital_bp || '',
      vital_pulse: prescriptionData.vital_pulse || '',
      vital_temp: prescriptionData.vital_temp || '',
      vital_weight: prescriptionData.vital_weight || '',
      created_at: new Date().toISOString().split('T')[0],
      items: prescriptionData.items || [],
    };

    setPrescriptions((prev) => [newRx, ...prev]);

    if (!token) return { success: true, data: newRx };

    try {
      const res = await createPrescriptionApi(token, prescriptionData);
      if (res.success) {
        fetchPrescriptions();
      }
      return res;
    } catch (err: any) {
      return { success: true, data: newRx };
    }
  };

  return {
    prescriptions,
    loading,
    refreshing,
    error,
    onRefresh,
    addPrescription,
    refetch: fetchPrescriptions,
  };
};

export default usePrescriptions;
