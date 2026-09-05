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
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrescriptions = useCallback(async () => {
    if (!token) {
      setPrescriptions([]);
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const isDoc =
        String((user as any)?.roleName || (user as any)?.role_name || (user as any)?.role || '')
          .toLowerCase()
          .includes('doctor') ||
        Number((user as any)?.roleId || (user as any)?.role_id) === 3 ||
        Number((user as any)?.is_doctor) === 1;
      const doctorId = (user as any)?.id || (user as any)?.userId;

      const res = await getPrescriptionsApi(token, patientId);
      if (res.success && res.data) {
        const rawList = Array.isArray(res.data)
          ? res.data
          : (res.data as any).prescriptions || (res.data as any).data || [];

        if (Array.isArray(rawList)) {
          const detailedList = await Promise.all(
            rawList.map(async (rx: any) => {
              try {
                if (rx.id) {
                  const detailRes = await getPrescriptionByIdApi(token, rx.id);
                  if (detailRes.success && detailRes.data) {
                    const detailObj = (detailRes.data as any).prescription || detailRes.data;
                    return {
                      ...rx,
                      ...detailObj,
                      items: Array.isArray(detailObj.items) ? detailObj.items : rx.items || [],
                    };
                  }
                }
              } catch (e) {
                // Fallback to basic rx
              }
              return {
                ...rx,
                items: Array.isArray(rx.items) ? rx.items : [],
              };
            })
          );

          let sanitized = detailedList;
          if (isDoc && doctorId && !patientId) {
            sanitized = sanitized.filter(
              (rx: any) => !rx.doctor_id || Number(rx.doctor_id) === Number(doctorId)
            );
          }
          setPrescriptions(sanitized);
        }
      } else {
        setPrescriptions([]);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load prescriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user, patientId]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPrescriptions();
  };

  const addPrescription = async (prescriptionData: Partial<Prescription>) => {
    if (!token) {
      return { success: false, message: 'Authentication required' };
    }

    try {
      const res = await createPrescriptionApi(token, prescriptionData);
      if (res.success) {
        await fetchPrescriptions();
        return res;
      } else {
        return {
          success: false,
          message: res.message || 'Failed to create prescription',
          errors: (res as any).errors,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Error occurred while saving prescription',
      };
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
