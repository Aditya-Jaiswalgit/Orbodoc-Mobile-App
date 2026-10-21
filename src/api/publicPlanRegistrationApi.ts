import { apiFetch } from './apiConfig';

export type PublicPlan = {
  id: number;
  plan_name: string;
  plan_type: string;
  price_monthly: number;
  price_yearly: number;
  max_clinics?: number;
  features?: Array<{ object_name?: string; is_enabled?: number }>;
};

export const fetchPublicPlansApi = () => apiFetch<{ status?: boolean; result?: PublicPlan[] }>('/subscriptionPlans/');
export const registerPlanClinicApi = (payload: Record<string, unknown>) => apiFetch<any>('/register/clinic', { method: 'POST', body: JSON.stringify(payload) });
export const registerPlanAdminApi = (payload: Record<string, unknown>) => apiFetch<any>('/register/admin', { method: 'POST', body: JSON.stringify(payload) });
export const createPlanOrderApi = (payload: Record<string, unknown>) => apiFetch<any>('/subscriptions/create-order', { method: 'POST', body: JSON.stringify(payload) });
export const verifyPlanPaymentApi = (payload: Record<string, unknown>) => apiFetch<any>('/subscriptions/verify-payment', { method: 'POST', body: JSON.stringify(payload) });
