import { useCallback, useEffect, useState } from 'react';
import { getPatientProfileApi, PatientProfileData, updatePatientProfileApi } from '../api/patientProfileApi';
import { useAuthContext } from '../context/AuthContext';

export const usePatientProfile = () => {
  const { token, user } = useAuthContext();
  const [profile, setProfile] = useState<PatientProfileData>({
    full_name: user?.fullName || user?.full_name || 'Patient',
    email: user?.email || '',
    phone: user?.phone || '',
    gender: user?.gender || 'Not specified',
    dob: user?.dob || 'Not specified',
    age: user?.age ? `${user.age} years` : 'Not specified',
    blood_group: user?.blood_group || 'Not specified',
    allergies: 'None reported',
    chronic_conditions: 'None reported',
    medical_history: 'None reported',
    current_medications: 'None reported',
    emergency_contact: 'Not specified',
    emergency_phone: 'Not specified',
    relation: 'Not specified',
    clinic_name: user?.clinic_name || user?.clinicName || 'Clinic',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const patientId = Number(user?.userId || user?.id || user?.patient_id || 1);
      const res = await getPatientProfileApi(token, patientId);
      if (res.success && res.data) {
        const d: any = (res.data as any).user || res.data;
        const emName = d.emergency_contact_name || (typeof d.emergency_contact === 'string' && isNaN(Number(d.emergency_contact)) ? d.emergency_contact : 'Not specified');
        const emPhone = d.emergency_phone || (typeof d.emergency_contact === 'string' && /^\d+$/.test(d.emergency_contact) ? d.emergency_contact : 'Not specified');
        const emRelation = d.emergency_relation || d.relation || 'Not specified';

        setProfile({
          id: d.id || user?.userId || user?.id,
          full_name: d.full_name || d.fullName || user?.fullName || user?.full_name || 'Patient',
          email: d.email || user?.email || '',
          phone: d.phone || user?.phone || '',
          role: 'Patient',
          gender: d.gender || 'Not specified',
          dob: d.date_of_birth || d.dob ? String(d.date_of_birth || d.dob).split('T')[0] : 'Not specified',
          age: d.age ? `${d.age} years` : 'Not specified',
          blood_group: d.blood_group || 'Not specified',
          allergies: d.allergies || 'None reported',
          chronic_conditions: d.chronic_conditions || 'None reported',
          medical_history: d.medical_history || 'None reported',
          current_medications: d.current_medications || 'None reported',
          emergency_contact: emName,
          emergency_phone: emPhone,
          relation: emRelation,
          clinic_name: d.clinic_name || d.clinicName || user?.clinicName || user?.clinic_name || 'Clinic',
        });
      }
    } catch (err: any) {
      setError(err.message || 'Unable to fetch patient profile');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updatedData: Partial<PatientProfileData>) => {
    setProfile((prev) => ({ ...prev, ...updatedData }));
    if (!token) return { success: true };
    try {
      const patientId = Number(user?.userId || user?.id || user?.patient_id || 1);
      const apiPayload = {
        ...updatedData,
        emergency_contact_name: updatedData.emergency_contact,
        emergency_contact: updatedData.emergency_phone,
        emergency_relation: updatedData.relation,
      };
      const res = await updatePatientProfileApi(token, patientId, apiPayload);
      if (res.success) {
        fetchProfile();
      }
      return res;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
    updateProfile,
  };
};
