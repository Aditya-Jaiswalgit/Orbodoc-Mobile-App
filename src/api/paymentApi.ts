import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';

export interface CreateOrderResponse {
  key_id: string;
  order_id: string;
  amount: number;
  currency: string;
  display_amount: number;
}

export interface VerifyPaymentResponse {
  balance: number;
  transaction?: any;
  message?: string;
}

/**
 * Step 1: Create Razorpay Order in Backend
 */
export async function createPaymentOrderApi(
  token: string,
  amount: number
): Promise<ApiResponse<CreateOrderResponse>> {
  return apiFetch<CreateOrderResponse>('/wallet/recharge/create-order', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({ amount }),
  });
}

/**
 * Step 2: Verify Razorpay Payment Signature in Backend & Recharge Wallet
 */
export async function verifyPaymentApi(
  token: string,
  orderId: string,
  paymentId: string,
  signature: string
): Promise<ApiResponse<VerifyPaymentResponse>> {
  return apiFetch<VerifyPaymentResponse>('/wallet/recharge/verify', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    }),
  });
}

/**
 * Fetch Current Wallet Balance
 */
export async function getWalletBalanceApi(
  token: string
): Promise<ApiResponse<{ wallet_id: number; balance: number }>> {
  return apiFetch<{ wallet_id: number; balance: number }>('/wallet/balance', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
