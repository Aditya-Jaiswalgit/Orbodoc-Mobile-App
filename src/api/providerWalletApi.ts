import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';

export interface ProviderWalletSummary {
  available_balance: number | string;
  pending_balance?: number | string;
  total_credited?: number | string;
  total_debited?: number | string;
  currency?: string;
  formatted_balance?: string;
  last_updated?: string;
}

export interface WalletTransaction {
  id: number;
  transaction_type: string;
  amount: number | string;
  reference_type?: string;
  reference_id?: number | null;
  direction?: 'in' | 'out';
  description?: string;
  status?: string;
  balance_after?: number | string;
  created_at?: string;
}

export interface ProviderPayoutRequest {
  id: number;
  requested_amount: number | string;
  net_amount: number | string;
  payout_method: 'bank_transfer' | 'upi';
  request_status: string;
  bank_account_number?: string | null;
  upi_id?: string | null;
  requested_at?: string;
}
export const getProviderWalletTransactionsApi = (clinicId: number, page: number, limit: number) =>
  apiFetch<{ wallet: ProviderWalletSummary; transactions: { data: WalletTransaction[]; total: number } }>(
    `/provider-wallets/transactions?clinic_id=${clinicId}&page=${page}&limit=${limit}`,
  );

export const getProviderWalletPayoutRequestsApi = (clinicId: number, page = 1, limit = 10) =>
  apiFetch<{ wallet: ProviderWalletSummary; payoutRequests: { data: ProviderPayoutRequest[]; total: number } }>(
    `/provider-wallets/payout-requests?clinic_id=${clinicId}&page=${page}&limit=${limit}`,
  );

export const createProviderWalletPayoutRequestApi = (payload: {
  clinic_id: number;
  requested_amount: number;
  payout_method: 'bank_transfer' | 'upi';
  account_holder_name?: string;
  bank_account_number?: string;
  ifsc_code?: string;
  upi_id?: string;
}) => apiFetch<{ wallet: ProviderWalletSummary; payoutRequest: ProviderPayoutRequest }>(
  '/provider-wallets/payout-requests',
  { method: 'POST', body: JSON.stringify(payload) },
);

/**
 * Provider Wallet Balance
 * Route: GET /api/provider-wallets/me?clinic_id={clinicId}
 */
export async function getProviderWalletSummaryApi(clinicId?: number | string | null, signal?: AbortSignal): Promise<ApiResponse<{ wallet: ProviderWalletSummary }>> {
	const query = clinicId == null ? '' : `?clinic_id=${encodeURIComponent(String(clinicId))}`;
	return apiFetch<{ wallet: ProviderWalletSummary }>(`/provider-wallets/me${query}`, {
    method: 'GET', signal,
  });
}
