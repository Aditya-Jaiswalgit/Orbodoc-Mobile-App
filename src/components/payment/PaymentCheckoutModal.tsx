import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, NativeModules, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PaymentStep, RazorpayPaymentResponse } from '../../hooks/usePaymentCheckout';
import { CreateOrderResponse } from '../../api/paymentApi';

interface Props {
  visible: boolean; amount: number; title: string; step: PaymentStep; loading: boolean;
  error: string | null; newBalance: number | null; orderDetails: CreateOrderResponse | null;
  allowAmountEdit?: boolean; onSetAmount: (amount: number) => void; onStartPayment: (amountOverride?: number) => void;
  onConfirmPayment: (payment: RazorpayPaymentResponse) => void; onClose: () => void;
}

declare global { interface Window { Razorpay?: any; } }

const loadWebCheckout = () => new Promise<void>((resolve, reject) => {
  if (window.Razorpay) return resolve();
  const old = document.getElementById('razorpay-sdk-script') as HTMLScriptElement | null;
  if (old) { old.addEventListener('load', () => resolve(), { once: true }); old.addEventListener('error', () => reject(new Error('Unable to load Razorpay checkout')), { once: true }); return; }
  const script = document.createElement('script'); script.id = 'razorpay-sdk-script'; script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(); script.onerror = () => reject(new Error('Unable to load Razorpay checkout')); document.body.appendChild(script);
});

export const PaymentCheckoutModal: React.FC<Props> = ({ visible, amount, title, step, loading, error, newBalance, orderDetails,
  allowAmountEdit = false, onSetAmount, onStartPayment, onConfirmPayment, onClose }) => {
  const [input, setInput] = useState(String(amount));
  const [opening, setOpening] = useState(false);
  useEffect(() => setInput(String(amount)), [amount, visible]);

  const start = () => { const parsed = Number(input); if (allowAmountEdit && (!Number.isFinite(parsed) || parsed <= 0)) return; if (allowAmountEdit) onSetAmount(parsed); onStartPayment(allowAmountEdit ? parsed : undefined); };
  const openRazorpay = async () => {
    if (!orderDetails) return;
    setOpening(true);
    const options = { key: orderDetails.key_id, amount: String(orderDetails.amount), currency: orderDetails.currency || 'INR', name: 'OrboDoc', description: title, order_id: orderDetails.order_id, theme: { color: '#0d9488' }, retry: { enabled: true, max_count: 4 } };
    try {
      if (Platform.OS === 'web') {
        await loadWebCheckout();
        new window.Razorpay({ ...options, handler: (response: RazorpayPaymentResponse) => onConfirmPayment(response), modal: { ondismiss: () => setOpening(false) } }).open();
      } else {
        if (!NativeModules.RNRazorpayCheckout || typeof NativeModules.RNRazorpayCheckout.open !== 'function') {
          throw new Error('Razorpay is not available in this app build. Install the Android/iOS development build; Expo Go cannot load the Razorpay native SDK.');
        }
        const RazorpayCheckout = require('react-native-razorpay').default;
        if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
          throw new Error('Razorpay SDK failed to load. Rebuild and reinstall the Android/iOS app.');
        }
        const response: RazorpayPaymentResponse = await RazorpayCheckout.open(options);
        onConfirmPayment(response);
      }
    } catch (checkoutError: any) {
      const message = checkoutError?.description || checkoutError?.message || 'Payment was cancelled.';
      console.warn('Razorpay checkout closed', message);
      if (!/cancelled/i.test(message)) Alert.alert('Razorpay unavailable', message);
    }
    finally { setOpening(false); }
  };

  const isSuccess = step === 'success'; const isVerifying = step === 'verifying'; const canClose = !loading && !opening;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.overlay}><View style={styles.card}>
      <View style={styles.header}><View><Text style={styles.headerTitle}>Secure payment</Text><Text style={styles.headerSub}>Powered by Razorpay</Text></View>{canClose && <TouchableOpacity onPress={onClose}><Text style={styles.close}>×</Text></TouchableOpacity>}</View>
      {isVerifying ? <View style={styles.center}><ActivityIndicator size="large" color="#0d9488" /><Text style={styles.title}>Verifying payment…</Text><Text style={styles.sub}>Please do not close this screen.</Text></View>
      : isSuccess ? <View style={styles.center}><Text style={styles.success}>✓</Text><Text style={styles.title}>Payment successful</Text><Text style={styles.sub}>{newBalance !== null ? `Wallet balance: ₹${newBalance.toFixed(2)}` : 'Your bill has been marked as paid.'}</Text><TouchableOpacity style={styles.primary} onPress={onClose}><Text style={styles.primaryText}>Done</Text></TouchableOpacity></View>
      : <><Text style={styles.title}>{title}</Text>{allowAmountEdit ? <TextInput value={input} onChangeText={setInput} keyboardType="decimal-pad" style={styles.amountInput} /> : <Text style={styles.amount}>₹{Number(amount || 0).toFixed(2)}</Text>}
        <Text style={styles.sub}>UPI, cards, net banking and wallets are securely handled in Razorpay Checkout.</Text>{error ? <Text style={styles.error}>{error}</Text> : null}
        {step === 'checkout' && orderDetails ? <TouchableOpacity style={styles.primary} disabled={opening} onPress={openRazorpay}><Text style={styles.primaryText}>{opening ? 'Opening Razorpay…' : `Pay ₹${Number(amount).toFixed(2)}`}</Text></TouchableOpacity>
        : <TouchableOpacity style={styles.primary} disabled={loading} onPress={start}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Continue to Razorpay</Text>}</TouchableOpacity>}
        {canClose && <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>}</>}
    </View></View>
  </Modal>;
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(15,23,42,.62)' }, card: { backgroundColor: '#fff', borderRadius: 18, padding: 20, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#e2e8f0', paddingBottom: 12 }, headerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' }, headerSub: { fontSize: 11, color: '#0d9488', marginTop: 2 }, close: { fontSize: 28, color: '#64748b' },
  title: { fontSize: 17, fontWeight: '800', color: '#0f172a', textAlign: 'center' }, amount: { fontSize: 32, fontWeight: '900', color: '#0d9488', textAlign: 'center' }, amountInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, fontSize: 28, fontWeight: '800', color: '#0f172a', textAlign: 'center', padding: 10 },
  sub: { color: '#64748b', fontSize: 12, textAlign: 'center', lineHeight: 18 }, error: { color: '#b91c1c', fontSize: 12, textAlign: 'center' }, primary: { backgroundColor: '#0d9488', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 }, primaryText: { color: '#fff', fontWeight: '800', fontSize: 14 }, cancel: { textAlign: 'center', color: '#64748b', paddingVertical: 5, fontWeight: '700' },
  center: { minHeight: 210, alignItems: 'center', justifyContent: 'center', gap: 12 }, success: { fontSize: 42, color: '#16a34a', fontWeight: '900' },
});
export default PaymentCheckoutModal;
