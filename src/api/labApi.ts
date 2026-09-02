import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { LabReport, LabTestOrder } from '../types/clinicTypes';

export interface LabQueryParams {
  clinic_id?: number | string;
  doctor_id?: number | string;
  patient_id?: number | string;
  status?: string;
  search?: string;
  limit?: number;
  page?: number;
}

export async function getLabTestOrdersApi(
  token: string,
  params?: LabQueryParams
): Promise<ApiResponse<any>> {
  const q = new URLSearchParams();
  q.append('limit', String(params?.limit || 1000));
  if (params?.clinic_id) q.append('clinic_id', String(params.clinic_id));
  if (params?.doctor_id) q.append('doctor_id', String(params.doctor_id));
  if (params?.patient_id) q.append('patient_id', String(params.patient_id));
  if (params?.status) q.append('status', params.status);
  if (params?.search) q.append('search', params.search);

  return apiFetch<any>(`/labs/tests?${q.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getLabTestByIdApi(
  token: string,
  id: number
): Promise<ApiResponse<{ test: LabTestOrder }>> {
  return apiFetch<{ test: LabTestOrder }>(`/labs/tests/${id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createLabTestOrderApi(
  token: string,
  testData: Partial<LabTestOrder>
): Promise<ApiResponse<{ test: LabTestOrder }>> {
  return apiFetch<{ test: LabTestOrder }>('/labs/tests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(testData),
  });
}

export async function updateLabTestStatusApi(
  token: string,
  id: number,
  status: string,
  sampleCollectedAt?: string
): Promise<ApiResponse<{ test: LabTestOrder }>> {
  return apiFetch<{ test: LabTestOrder }>(`/labs/tests/${id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      status,
      sample_collected_at: sampleCollectedAt || new Date().toISOString(),
    }),
  });
}

export async function getLabReportsApi(
  token: string,
  params?: LabQueryParams
): Promise<ApiResponse<any>> {
  const q = new URLSearchParams();
  q.append('limit', String(params?.limit || 1000));
  if (params?.clinic_id) q.append('clinic_id', String(params.clinic_id));
  if (params?.doctor_id) q.append('doctor_id', String(params.doctor_id));

  return apiFetch<any>(`/labs/reports?${q.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getLabReportByTestIdApi(
  token: string,
  testId: number
): Promise<ApiResponse<{ report: LabReport }>> {
  return apiFetch<{ report: LabReport }>(`/labs/reports/by-test/${testId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateLabTestOrderApi(
  token: string,
  id: number,
  testData: Partial<LabTestOrder>
): Promise<ApiResponse<{ test: LabTestOrder }>> {
  return apiFetch<{ test: LabTestOrder }>(`/labs/tests/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(testData),
  });
}

export async function uploadLabReportApi(
  token: string,
  reportData: Partial<LabReport>
): Promise<ApiResponse<{ report: LabReport }>> {
  return apiFetch<{ report: LabReport }>('/labs/reports', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(reportData),
  });
}

export async function updateLabReportApi(
  token: string,
  id: number,
  reportData: Partial<LabReport>
): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/labs/reports/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(reportData),
  });
}

export async function getLabCatalogApi(
  token: string,
  clinicId?: number | string
): Promise<ApiResponse<any>> {
  const query = clinicId ? `?clinic_id=${clinicId}&limit=1000` : `?limit=1000`;
  return apiFetch<any>(`/labs/catalog${query}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}
