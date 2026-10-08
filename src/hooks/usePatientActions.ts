import { useCallback, useState } from 'react';
import {
  createPatientApi,
  fetchPatientByIdApi,
  getPatientBillingSummaryApi,
  getPatientConsultationsApi,
  PatientBillingSummary,
  PatientConsultation,
  updatePatientApi,
} from '../api/patientApi';
import { PatientModel } from '../types/clinicTypes';
import { showErrorToast, showSuccessToast } from '../utils/toast';
import {
  calculateAge,
  extractPatient,
} from '../screens/staff/patients/patientUtils';
import { PatientFormValues } from '../screens/staff/patients/PatientManagementComponents';

type Params = {
  token: string | null;
  clinicId: number | string | null;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  loadPatients: () => Promise<unknown>;
  loadStats: () => Promise<unknown>;
};

function getErrorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

export function usePatientActions({
  token,
  clinicId,
  canView,
  canAdd,
  canEdit,
  loadPatients,
  loadStats,
}: Params) {
  const [saving, setSaving] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientModel | null>(
    null,
  );
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientModel | null>(
    null,
  );
  const [billingSummary, setBillingSummary] =
    useState<PatientBillingSummary | null>(null);
  const [consultations, setConsultations] = useState<PatientConsultation[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const openPatientDetails = useCallback(
    async (patient: PatientModel) => {
      if (!canView) return;
      setDetailsVisible(true);
      setDetailsLoading(true);
      setSelectedPatient(patient);
      setBillingSummary(null);
      setConsultations([]);
      if (!token) {
        setDetailsLoading(false);
        return;
      }
      try {
        const [detailsResponse, summaryResponse, consultationsResponse] =
          await Promise.all([
            fetchPatientByIdApi(patient.id, token),
            getPatientBillingSummaryApi(patient.id, token).catch(() => null),
            getPatientConsultationsApi(patient.id, token).catch(() => null),
          ]);
        if (!detailsResponse.success)
          throw new Error(
            detailsResponse.message || 'Could not load full patient profile.',
          );
        setSelectedPatient(extractPatient(detailsResponse.data) ?? patient);
        const summaryData = summaryResponse?.data as
          | { summary?: PatientBillingSummary }
          | PatientBillingSummary
          | undefined;
        const summary =
          summaryData && 'summary' in summaryData
            ? summaryData.summary ?? null
            : (summaryData as PatientBillingSummary | undefined) ?? null;
        setBillingSummary(summary);
        const consultationsData = consultationsResponse?.data as
          | { consultations?: PatientConsultation[] }
          | PatientConsultation[]
          | undefined;
        const rows =
          consultationsData && !Array.isArray(consultationsData)
            ? consultationsData.consultations
            : consultationsData;
        setConsultations(Array.isArray(rows) ? rows : []);
      } catch (cause) {
        showErrorToast(
          'Patient profile',
          getErrorMessage(cause, 'Could not load patient profile.'),
        );
      } finally {
        setDetailsLoading(false);
      }
    },
    [canView, token],
  );

  const openEditForm = useCallback(async () => {
    if (!canEdit || !selectedPatient || !token) return;
    try {
      const response = await fetchPatientByIdApi(selectedPatient.id, token);
      if (!response.success)
        throw new Error(response.message || 'Could not load patient details.');
      setEditingPatient(extractPatient(response.data) ?? selectedPatient);
    } catch {
      setEditingPatient(selectedPatient);
    }
    setDetailsVisible(false);
    setFormVisible(true);
  }, [canEdit, selectedPatient, token]);

  const openCreateForm = useCallback(() => {
    if (!canAdd) return;
    setEditingPatient(null);
    setFormVisible(true);
  }, [canAdd]);

  const editPatient = useCallback(
    (patient: PatientModel) => {
      if (!canEdit) return;
      setEditingPatient(patient);
      setFormVisible(true);
    },
    [canEdit],
  );

  const savePatient = useCallback(
    async (values: PatientFormValues) => {
      if (editingPatient ? !canEdit : !canAdd) {
        showErrorToast(
          'Permission denied',
          'You do not have permission to save patient details.',
        );
        return;
      }
      if (!token) {
        showErrorToast(
          'Sign in required',
          'Please sign in again to save patient details.',
        );
        return;
      }

      setSaving(true);
      const payload: Partial<PatientModel> = {
        ...values,
        full_name: values.full_name.trim(),
        gender: values.gender || 'other',
        phone: values.phone.trim(),
        email: values.email.trim() || undefined,
        clinic_id: editingPatient
          ? undefined
          : clinicId
          ? Number(clinicId)
          : undefined,
        date_of_birth: values.date_of_birth.trim() || undefined,
        age: calculateAge(values.date_of_birth),
        blood_group: values.blood_group.trim() || undefined,
        address: values.address.trim() || undefined,
        city: values.city.trim() || undefined,
        state: values.state.trim() || undefined,
        emergency_contact: values.emergency_contact.trim() || undefined,
        emergency_contact_name:
          values.emergency_contact_name.trim() || undefined,
        emergency_relation: values.emergency_relation.trim() || undefined,
        allergies: values.allergies.trim() || undefined,
        medical_history: values.medical_history.trim() || undefined,
      };
      try {
        const response = editingPatient
          ? await updatePatientApi(editingPatient.id, payload, token)
          : await createPatientApi(payload, token);
        if (!response.success)
          throw new Error(response.message || 'Could not save patient.');
        showSuccessToast(
          editingPatient ? 'Patient updated' : 'Patient registered',
          editingPatient
            ? 'Patient details have been updated.'
            : 'Patient has been registered successfully.',
        );
        setFormVisible(false);
        setEditingPatient(null);
        await Promise.all([loadPatients(), loadStats()]);
      } catch (cause) {
        showErrorToast(
          editingPatient ? 'Update failed' : 'Registration failed',
          getErrorMessage(cause, 'Could not save patient.'),
        );
      } finally {
        setSaving(false);
      }
    },
    [canAdd, canEdit, clinicId, editingPatient, loadPatients, loadStats, token],
  );

  const togglePatientStatus = useCallback(
    async (patient = selectedPatient) => {
      if (!canEdit || !patient || !token) return;
      const nextValue = Number(patient.is_active ?? 1) === 1 ? 0 : 1;
      try {
        const response = await updatePatientApi(
          patient.id,
          { is_active: nextValue },
          token,
        );
        if (!response.success)
          throw new Error(
            response.message || 'Could not update patient status.',
          );
        showSuccessToast(
          'Status updated',
          `${patient.full_name} is now ${nextValue ? 'active' : 'inactive'}.`,
        );
        setSelectedPatient(previous =>
          previous?.id === patient.id
            ? { ...previous, is_active: nextValue }
            : previous,
        );
        await Promise.all([loadPatients(), loadStats()]);
      } catch (cause) {
        showErrorToast(
          'Status update failed',
          getErrorMessage(cause, 'Could not update patient status.'),
        );
      }
    },
    [canEdit, loadPatients, loadStats, selectedPatient, token],
  );

  return {
    billingSummary,
    consultations,
    detailsLoading,
    detailsVisible,
    editPatient,
    editingPatient,
    formVisible,
    openCreateForm,
    openEditForm,
    openPatientDetails,
    savePatient,
    saving,
    selectedPatient,
    setDetailsVisible,
    setEditingPatient,
    setFormVisible,
    setSelectedPatient,
    togglePatientStatus,
  };
}
