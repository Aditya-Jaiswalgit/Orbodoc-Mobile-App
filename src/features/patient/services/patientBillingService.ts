import { apiFetch } from '../../../api/apiConfig';
import {
  getMedicineBillsApi,
  getTreatmentBillsApi,
} from '../../../api/billingApi';

export type PatientBillKind = 'treatment' | 'medicine';
export type PatientBill = Record<string, any> & {
  id: number | string;
  bill_number?: string;
  total_amount?: number | string;
  paid_amount?: number | string;
  status?: string;
  payment_status?: string;
  created_at?: string;
  items?: Array<Record<string, any>>;
};

const rowsFrom = (value: any): PatientBill[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.bills)) return value.bills;
  return [];
};

export async function fetchPatientBills(
  token: string,
  kind: PatientBillKind,
): Promise<PatientBill[]> {
  const response = kind === 'treatment'
    ? await getTreatmentBillsApi(token, { page: 1, limit: 100 })
    : await getMedicineBillsApi(token, { page: 1, limit: 100 });
  if (!response.success) throw new Error(response.message || 'Unable to load bills.');
  return rowsFrom(response.data).sort((a, b) =>
    new Date(String(b.created_at || '')).getTime() - new Date(String(a.created_at || '')).getTime(),
  );
}

export async function fetchPatientBill(
  token: string,
  kind: PatientBillKind,
  id: number | string,
): Promise<PatientBill> {
  const response = await apiFetch<{ bill?: PatientBill } | PatientBill>(
    `/${kind}-bills/${encodeURIComponent(String(id))}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.success) throw new Error(response.message || 'Unable to load bill details.');
  const data = response.data as { bill?: PatientBill } | PatientBill | undefined;
  const bill = (data && 'bill' in data ? data.bill : data) as PatientBill | undefined;
  if (!bill) throw new Error('Bill details are unavailable.');
  return bill;
}

export type PatientBillPaymentOrder = {
  key_id: string;
  order_id: string;
  amount: number;
  currency?: string;
  display_amount?: number;
};

export function createPatientBillPaymentOrder(
  token: string,
  kind: PatientBillKind,
  billId: number | string,
) {
  return apiFetch<PatientBillPaymentOrder>('/payments/create-order', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ target: `${kind}_bill`, bill_id: billId }),
  });
}

export function verifyPatientBillPayment(
  token: string,
  kind: PatientBillKind,
  billId: number | string,
  payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
) {
  return apiFetch<{ bill?: PatientBill }>('/payments/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ target: `${kind}_bill`, bill_id: billId, ...payment }),
  });
}

