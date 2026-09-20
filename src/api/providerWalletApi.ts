import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';

export interface ProviderWalletSummary {
  balance: number;
  currency?: string;
  formatted_balance?: string;
  last_updated?: string;
}

/**
 * Provider Wallet Balance
 * Route: GET /api/provider-wallet/summary
 */
export async function getProviderWalletSummaryApi(): Promise<ApiResponse<ProviderWalletSummary>> {
  return apiFetch<ProviderWalletSummary>('/provider-wallet/summary', {
    method: 'GET',
  });
}
