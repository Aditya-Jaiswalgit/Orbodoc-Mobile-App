import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { LabTestOrder } from '../types/clinicTypes';

export interface LabCatalogQuery {
  page?: number;
  limit?: number;
  search?: string;
  isAvailable?: number | boolean;
  status?: number | boolean;
  forceRefresh?: boolean;
}

export interface MasterLabTestQuery {
  page?: number;
  limit?: number;
  search?: string;
  mapped?: 'all' | 'mapped' | 'unmapped';
  status?: number | boolean;
  forceRefresh?: boolean;
}

export interface MobileMasterLabTest {
  id: number;
  test_name: string;
  test_code?: string | null;
  description?: string | null;
  status: number;
  clinic_map_id?: number | null;
  clinic_price?: number | null;
  clinic_discount_price?: number | null;
  clinic_home_collection_available?: number | null;
  clinic_is_available?: number | null;
  is_mapped_for_clinic: number;
}

export interface LabCatalogImportFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export async function getLabTestOrdersApi(
  token: string,
  clinicId?: number | string | null,
  page = 1,
  limit = 100,
): Promise<ApiResponse<unknown>> {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (clinicId) query.set('clinic_id', String(clinicId));
  return apiFetch<unknown>(`/labs/tests?${query.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createLabTestOrderApi(
  token: string,
  testData: Partial<LabTestOrder>,
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
  status: string,
  timestamps: {
    sample_collected_at?: string;
    result_uploaded_at?: string;
    report_ready_at?: string;
  } = {},
): Promise<ApiResponse<LabTestOrder>> {
  return apiFetch<LabTestOrder>(`/labs/tests/${id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status, ...timestamps }),
  });
}

export async function updateLabTestApi(
  token: string,
  id: number,
  payload: { price?: number },
): Promise<ApiResponse<LabTestOrder>> {
  return apiFetch<LabTestOrder>(`/labs/tests/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function getLabReportsApi(
  token: string,
  clinicId?: number | string | null,
  page = 1,
  limit = 100,
): Promise<ApiResponse<unknown>> {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (clinicId) query.set('clinic_id', String(clinicId));
  return apiFetch<unknown>(`/labs/reports?${query.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getLabCatalogApi(
  token: string,
  clinicId: number | string,
  options: LabCatalogQuery = {},
): Promise<ApiResponse<unknown>> {
  const query = new URLSearchParams({
    clinic_id: String(clinicId),
    page: String(options.page || 1),
    limit: String(options.limit || 10),
  });
  if (options.search?.trim()) query.set('search', options.search.trim());
  if (options.isAvailable !== undefined) query.set('is_available', String(Number(options.isAvailable)));
  if (options.status !== undefined) query.set('status', String(Number(options.status)));
  if (options.forceRefresh) query.set('_refresh', String(Date.now()));
  return apiFetch<unknown>(`/labs/catalog?${query.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    ...(options.forceRefresh ? { cache: 'no-store' } : {}),
  });
}

export async function createLabCatalogItemApi(
  token: string,
  payload: Record<string, unknown>,
): Promise<ApiResponse<unknown>> {
  return apiFetch<unknown>('/labs/catalog', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function updateLabCatalogItemApi(
  token: string,
  id: number,
  payload: Record<string, unknown>,
): Promise<ApiResponse<unknown>> {
  return apiFetch<unknown>(`/labs/catalog/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function getMasterLabTestsApi(
  token: string,
  clinicId: number | string,
  options: MasterLabTestQuery = {},
): Promise<ApiResponse<unknown>> {
  const query = new URLSearchParams({
    clinic_id: String(clinicId),
    limit: String(options.limit || 10),
    page: String(options.page || 1),
    mapped: options.mapped || 'all',
  });
  if (options.search?.trim()) query.set('search', options.search.trim());
  if (options.status !== undefined) query.set('status', String(Number(options.status)));
  if (options.forceRefresh) query.set('_refresh', String(Date.now()));
  return apiFetch<unknown>(`/labs/master-tests?${query.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    ...(options.forceRefresh ? { cache: 'no-store' } : {}),
  });
}

export async function mapMasterLabTestApi(
  token: string,
  payload: Record<string, unknown>,
): Promise<ApiResponse<unknown>> {
  return apiFetch<unknown>('/labs/catalog/map-master', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function uploadLabCatalogExcelApi(
  token: string,
  clinicId: number | string,
  file: LabCatalogImportFile,
): Promise<ApiResponse<{
  totalExcelRows?: number;
  inserted?: number;
  skipped?: number;
  skippedData?: Array<{ row?: Record<string, unknown>; reason?: string }>;
}>> {
  const form = new FormData();
  form.append('clinic_id', String(clinicId));
  form.append('file', file as unknown as Blob);
  return apiFetch('/labs/catalog/upload-excel', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}

export async function updateLabReportApi(
  token: string,
  id: number,
  reportData: Record<string, unknown>,
): Promise<ApiResponse<unknown>> {
  return apiFetch<unknown>(`/labs/reports/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(reportData),
  });
}

export async function uploadLabReportApi(
  token: string,
  reportData: Record<string, unknown>,
): Promise<ApiResponse<unknown>> {
  return apiFetch<unknown>('/labs/reports', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(reportData),
  });
}
