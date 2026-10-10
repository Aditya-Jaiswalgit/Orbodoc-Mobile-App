import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';

export interface ProviderWalletSummary {
  available_balance: number | string;
  pending_balance?: number | string;
  currency?: string;
  formatted_balance?: string;
  last_updated?: string;
}

export interface WalletTransaction {
  id: number;
  amount: number | string;
  description?: string;
  status?: string;
  transaction_type?: string;
  created_at?: string;
}
export const getProviderWalletTransactionsApi = (clinicId: number, page: number, limit: number) =>
  apiFetch<{ wallet: ProviderWalletSummary; transactions: { data: WalletTransaction[]; total: number } }>(
    `/provider-wallets/transactions?clinic_id=${clinicId}&page=${page}&limit=${limit}`,
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
