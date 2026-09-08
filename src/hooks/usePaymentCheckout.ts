import { useState } from 'react';
import { Alert } from 'react-native';
import { useAuthContext } from '../context/AuthContext';
import {
  BillPaymentTarget,
  BillPaymentOrderResponse,
  createBillPaymentOrderApi,
  createPaymentOrderApi,
  CreateOrderResponse,
  verifyBillPaymentApi,
  verifyPaymentApi,
} from '../api/paymentApi';

export type PaymentMethod = 'razorpay';
export type PaymentStep = 'select' | 'checkout' | 'verifying' | 'success' | 'error';
export type PaymentTarget = 'wallet_recharge' | BillPaymentTarget;
export interface PaymentIntent { target: PaymentTarget; amount?: number; billId?: number; title?: string; }
export interface RazorpayPaymentResponse { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string; }

const titles: Record<PaymentTarget, string> = {
  wallet_recharge: 'Recharge wallet', medicine_bill: 'Medicine bill payment', treatment_bill: 'Treatment bill payment',
};

export const usePaymentCheckout = () => {
  const { token } = useAuthContext();
  const [visible, setVisible] = useState(false);
  const [amount, setAmount] = useState(500);
  const [intent, setIntent] = useState<PaymentIntent>({ target: 'wallet_recharge', amount: 500 });
  const [step, setStep] = useState<PaymentStep>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<CreateOrderResponse | BillPaymentOrderResponse | null>(null);
  const [newBalance, setNewBalance] = useState<number | null>(null);

  const openCheckout = (input: number | PaymentIntent = 500) => {
    const nextIntent: PaymentIntent = typeof input === 'number' ? { target: 'wallet_recharge', amount: input } : input;
    setIntent(nextIntent); setAmount(Number(nextIntent.amount || 0)); setStep('select'); setError(null);
    setOrderDetails(null); setNewBalance(null); setVisible(true);
  };
  const closeCheckout = () => { if (!loading) { setVisible(false); setStep('select'); } };

  const startPayment = async (amountOverride?: number) => {
    const paymentAmount = intent.target === 'wallet_recharge' ? Number(amountOverride ?? amount) : amount;
    if (!token) { Alert.alert('Authentication required', 'Please log in to make a payment.'); return; }
    if (intent.target === 'wallet_recharge' && paymentAmount <= 0) { Alert.alert('Invalid amount', 'Enter a valid wallet recharge amount.'); return; }
    if (intent.target !== 'wallet_recharge' && !intent.billId) { setError('Bill reference is missing. Please reopen the invoice.'); return; }
    setLoading(true); setError(null);
    try {
      const response = intent.target === 'wallet_recharge'
        ? await createPaymentOrderApi(token, paymentAmount)
        : await createBillPaymentOrderApi(token, intent.target, Number(intent.billId));
      if (!response.success || !response.data) throw new Error(response.message || 'Could not create Razorpay order');
      setOrderDetails(response.data); setAmount(Number(response.data.display_amount)); setStep('checkout');
    } catch (requestError: any) {
      const message = requestError?.message || 'Could not start the payment. Please try again.';
      setError(message); Alert.alert('Payment unavailable', message);
    } finally { setLoading(false); }
  };

  const confirmPayment = async (payment: RazorpayPaymentResponse, onSuccess?: () => void) => {
    if (!token || !orderDetails) { setError('Payment session expired. Please try again.'); return; }
    setLoading(true); setStep('verifying'); setError(null);
    try {
      const response = intent.target === 'wallet_recharge'
        ? await verifyPaymentApi(token, payment.razorpay_order_id, payment.razorpay_payment_id, payment.razorpay_signature)
        : await verifyBillPaymentApi(token, intent.target, Number(intent.billId), payment.razorpay_order_id, payment.razorpay_payment_id, payment.razorpay_signature);
      if (!response.success) throw new Error(response.message || 'Razorpay could not verify this payment.');
      if (intent.target === 'wallet_recharge') setNewBalance(Number((response.data as any)?.balance || 0));
      setStep('success'); onSuccess?.();
    } catch (verificationError: any) {
      const message = verificationError?.message || 'Payment verification failed. Do not retry until you check the payment status.';
      setError(message); setStep('error'); Alert.alert('Payment not verified', message);
    } finally { setLoading(false); }
  };

  return { visible, amount, title: intent.title || titles[intent.target], target: intent.target, selectedMethod: 'razorpay' as PaymentMethod,
    step, loading, error, orderDetails, newBalance, setAmount, openCheckout, closeCheckout, startPayment, confirmPayment };
};

export default usePaymentCheckout;
