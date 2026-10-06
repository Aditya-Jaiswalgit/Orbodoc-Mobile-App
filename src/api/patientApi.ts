import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { PatientModel } from '../types/clinicTypes';

export interface PatientDashboardData {
  upcoming_appointments: any[];
  recent_lab_reports: any[];
  recent_bills: any[];
  walletBalance?: number;
  notificationsCount?: number;
}

export interface PatientStats {
  total_patients: number;
  active_patients: number;
  inactive_patients: number;
  today_visits: number;
  new_this_week: number;
}

export interface PatientListResponseData {
  total: number;
  page: number;
  limit: number;
  data: PatientModel[];
  stats?: PatientStats;
}

export interface FetchPatientsParams {
  clinic_id?: number | string | null;
  page?: number;
  limit?: number;
  search?: string;
  is_active?: number;
}

export interface PatientBillingSummary {
  treatment_bills_count?: number;
  treatment_total_amount?: number;
  treatment_paid?: number;
  treatment_due?: number;
  medicine_bills_count?: number;
  medicine_total_amount?: number;
  medicine_paid?: number;
  medicine_due?: number;
  grand_total_amount?: number;
  total_bills?: number;
  total_paid?: number;
  total_due?: number;
  total_visits?: number;
  last_visit?: string | null;
}

export interface PatientConsultation {
  appointment_id: number | string;
  appointment_date?: string | null;
  appointment_time?: string | null;
  status?: string | null;
  reason?: string | null;
  notes?: string | null;
  doctor_name?: string | null;
  specialization?: string | null;
  consultation_fee?: number | string | null;
  prescription_id?: number | string | null;
  diagnosis?: string | null;
  symptoms?: string | null;
  advice?: string | null;
  consultation_created_at?: string | null;
}

export interface MedicalHistoryPayload {
  patient: {
    id?: number | string | null;
    full_name?: string | null;
    patient_code?: string | null;
    clinic_name?: string | null;
    gender?: string | null;
    date_of_birth?: string | null;
    blood_group?: string | null;
    allergies?: string | null;
    emergency_contact?: string | null;
    emergency_contact_name?: string | null;
    emergency_relation?: string | null;
  };
  visits: Array<PatientConsultation & {
    appointment_time?: string | null;
    medicines?: Array<{
      prescription_item_id: number | string;
      medicine_name?: string | null;
      dosage?: string | null;
      frequency?: string | null;
      duration?: string | null;
      instruction?: string | null;
    }>;
  }>;
  labReports: Array<{
    lab_test_id: number | string;
    test_name?: string | null;
    test_type?: string | null;
    sample_type?: string | null;
    price?: number | string | null;
    status?: string | null;
    created_at?: string | null;
    report_id?: number | string | null;
    report_file_url?: string | null;
    report_data?: Record<string, unknown> | string | null;
    remarks?: string | null;
    reference_range?: string | null;
    is_abnormal?: number | null;
    uploaded_at?: string | null;
    technician_name?: string | null;
    doctor_name?: string | null;
  }>;
}

export function getPatientMedicalHistoryApi(patientId: number | string, token: string) {
  return apiFetch<MedicalHistoryPayload>(`/patients/${encodeURIComponent(String(patientId))}/medical-history`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Fetch Patients list with pagination, search, and status filters
 * Route: GET /api/patients
 */
export async function fetchPatientsApi(
  params: FetchPatientsParams = {},
  token?: string,
): Promise<ApiResponse<PatientListResponseData>> {
  const queryParts: string[] = [];
  if (
    params.clinic_id !== undefined &&
    params.clinic_id !== null &&
    params.clinic_id !== 'all'
  ) {
    queryParts.push(
      `clinic_id=${encodeURIComponent(String(params.clinic_id))}`,
    );
  }
  if (params.page)
    queryParts.push(`page=${encodeURIComponent(String(params.page))}`);
  if (params.limit)
    queryParts.push(`limit=${encodeURIComponent(String(params.limit))}`);
  if (params.search && params.search.trim()) {
    queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);
  }
  if (params.is_active !== undefined) {
    queryParts.push(
      `is_active=${encodeURIComponent(String(params.is_active))}`,
    );
  }

  const query = queryParts.length ? `?${queryParts.join('&')}` : '';
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  return apiFetch<PatientListResponseData>(`/patients${query}`, {
    method: 'GET',
    headers,
  });
}

/**
 * Fetch single Patient details by ID
 * Route: GET /api/patients/:id
 */
export async function fetchPatientByIdApi(
  patientId: number | string,
  token?: string,
): Promise<ApiResponse<{ patient: PatientModel }>> {
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  return apiFetch<{ patient: PatientModel }>(
    `/patients/${encodeURIComponent(String(patientId))}`,
    {
      method: 'GET',
      headers,
    },
  );
}

export async function getPatientBillingSummaryApi(
  patientId: number | string,
  token: string,
): Promise<
  ApiResponse<PatientBillingSummary | { summary: PatientBillingSummary }>
> {
  return apiFetch<PatientBillingSummary | { summary: PatientBillingSummary }>(
    `/patients/${encodeURIComponent(String(patientId))}/billing-summary`,
    { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
  );
}

export async function getPatientConsultationsApi(
  patientId: number | string,
  token: string,
): Promise<
  ApiResponse<{ consultations: PatientConsultation[] } | PatientConsultation[]>
> {
  return apiFetch<
    { consultations: PatientConsultation[] } | PatientConsultation[]
  >(`/patients/${encodeURIComponent(String(patientId))}/consultations`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Register a new Patient
 * Route: POST /api/patients
 */
export async function createPatientApi(
  payload: Partial<PatientModel> & {
    clinic_id?: number | string;
    password?: string;
  },
  token?: string,
): Promise<ApiResponse<{ patient: PatientModel }>> {
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  return apiFetch<{ patient: PatientModel }>('/patients', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

/**
 * Update an existing Patient
 * Route: PUT /api/patients/:id
 */
export async function updatePatientApi(
  patientId: number | string,
  payload: Partial<PatientModel>,
  token?: string,
): Promise<ApiResponse<{ patient: PatientModel }>> {
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  return apiFetch<{ patient: PatientModel }>(
    `/patients/${encodeURIComponent(String(patientId))}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    },
  );
}

/**
 * Deactivate / Delete a Patient
 * Route: DELETE /api/patients/:id
 */
export async function deletePatientApi(
  patientId: number | string,
  token?: string,
): Promise<ApiResponse<any>> {
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  return apiFetch<any>(`/patients/${encodeURIComponent(String(patientId))}`, {
    method: 'DELETE',
    headers,
  });
}

/**
 * Fetch Patient Dashboard data
 * Route: GET /api/patients/dashboard
 */
export async function getPatientDashboardApi(
  token: string,
): Promise<ApiResponse<PatientDashboardData>> {
  return apiFetch<PatientDashboardData>('/patients/dashboard', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
