import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { LabReport, LabTestOrder } from '../types/clinicTypes';

export async function getLabTestOrdersApi(token: string): Promise<ApiResponse<LabTestOrder[]>> {
  return apiFetch<LabTestOrder[]>('/labs/tests', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createLabTestOrderApi(
  token: string,
  testData: Partial<LabTestOrder>
): Promise<ApiResponse<LabTestOrder>> {
  return apiFetch<LabTestOrder>('/labs/tests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(testData),
  });
}

export async function updateLabTestStatusApi(
  token: string,
  id: number,
  status: LabTestOrder['status']
): Promise<ApiResponse<LabTestOrder>> {
  return apiFetch<LabTestOrder>(`/labs/tests/${id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
}

export async function getLabReportsApi(token: string): Promise<ApiResponse<LabReport[]>> {
  return apiFetch<LabReport[]>('/labs/reports', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function uploadLabReportApi(
  token: string,
  reportData: Partial<LabReport>
): Promise<ApiResponse<LabReport>> {
  return apiFetch<LabReport>('/labs/reports', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(reportData),
  });
}
