import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';

export type SubscriptionPlanType = 'single' | 'multi';

export interface SubscriptionPlanFeature {
  feature_id?: number;
  is_enabled?: number | boolean;
  sys_obj_id?: number;
  object_name?: string;
}

export interface SubscriptionPlan {
  id: number;
  plan_name: string;
  plan_type: SubscriptionPlanType;
  max_clinics: number | null;
  max_staff: number | null;
  max_patients: number | null;
  price_monthly: number;
  price_yearly: number;
  features?: SubscriptionPlanFeature[];
}

export interface SubscriptionPlanPayload {
  plan_name: string;
  plan_type: SubscriptionPlanType;
  max_clinics: number | null;
  max_staff: number | null;
  max_patients: number | null;
  price_monthly: number;
  price_yearly: number;
}

export interface DoctorApprovalRecord {
  id?: number;
  doctor_id?: number;
  full_name?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  qualification?: string;
  registration_number?: string;
  consultation_fee?: number | string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

function unwrapResult<T>(response: ApiResponse<unknown>): T {
  if (!response.success) throw new Error(response.message || 'Request failed');
  const data = response.data as any;
  return (data?.result ?? data?.data ?? data?.items ?? data) as T;
}

function unwrapRows<T>(response: ApiResponse<unknown>): T[] {
  const result = unwrapResult<unknown>(response) as any;
  if (Array.isArray(result)) return result as T[];
  for (const key of ['plans', 'doctors', 'items', 'rows', 'data', 'result']) {
    if (Array.isArray(result?.[key])) return result[key] as T[];
  }
  return [];
}

export async function fetchSubscriptionPlansApi() {
  return unwrapRows<SubscriptionPlan>(await apiFetch('/subscriptionPlans/'));
}

export async function fetchSingleSubscriptionPlansApi() {
  return unwrapRows<SubscriptionPlan>(await apiFetch('/subscriptionPlans/type/single'));
}

export async function fetchMultiSubscriptionPlansApi() {
  return unwrapRows<SubscriptionPlan>(await apiFetch('/subscriptionPlans/type/multi'));
}

export async function fetchSubscriptionPlanByIdApi(id: number) {
  return unwrapResult<SubscriptionPlan>(await apiFetch(`/subscriptionPlans/${encodeURIComponent(String(id))}`));
}

export async function createSubscriptionPlanApi(payload: SubscriptionPlanPayload) {
  return unwrapResult<unknown>(await apiFetch('/subscriptionPlans/add', { method: 'POST', body: JSON.stringify(payload) }));
}

export async function updateSubscriptionPlanApi(id: number, payload: SubscriptionPlanPayload) {
  return unwrapResult<unknown>(await apiFetch(`/subscriptionPlans/update/${encodeURIComponent(String(id))}`, { method: 'PUT', body: JSON.stringify(payload) }));
}

export async function deleteSubscriptionPlanApi(id: number) {
  return unwrapResult<unknown>(await apiFetch(`/subscriptionPlans/delete/${encodeURIComponent(String(id))}`, { method: 'DELETE' }));
}

export async function createSubscriptionPlanFeatureApi(payload: { plan_id: number; sys_obj_id: number; is_enabled: number }) {
  return unwrapResult<unknown>(await apiFetch('/planFeatures/add', { method: 'POST', body: JSON.stringify(payload) }));
}

export async function updateSubscriptionPlanFeatureApi(id: number, payload: { plan_id: number; sys_obj_id: number; is_enabled: number }) {
  return unwrapResult<unknown>(await apiFetch(`/planFeatures/update/${encodeURIComponent(String(id))}`, { method: 'PUT', body: JSON.stringify(payload) }));
}

export async function fetchDoctorApprovalsApi(status: 'pending-approval' | 'approved') {
  const response = await apiFetch<unknown>(`/doctors/${status}`);
  return unwrapRows<DoctorApprovalRecord>(response);
}

export async function approveDoctorApi(id: number) {
  return unwrapResult<unknown>(await apiFetch(`/doctors/${encodeURIComponent(String(id))}/approve`, { method: 'PUT' }));
}

export async function rejectDoctorApi(id: number, rejectionReason?: string) {
  return unwrapResult<unknown>(await apiFetch(`/doctors/${encodeURIComponent(String(id))}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ rejection_reason: rejectionReason?.trim() || undefined }),
  }));
}

