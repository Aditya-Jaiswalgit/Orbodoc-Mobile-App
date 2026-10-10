import React, { useMemo, useState } from 'react';
import { AppModal } from '../../components/common/AppModal';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CalendarClock, CheckCircle2, Clock3, CreditCard, IndianRupee, Video, Wallet, X } from 'lucide-react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { PatientHeader } from '../../components/common/PatientHeader';
import { useAuthContext } from '../../context/AuthContext';
import { Appointment } from '../../types/clinicTypes';
import { confirmVideoPaymentApi, createWalletRechargeOrderApi, getVideoPaymentQuoteApi, verifyWalletRechargeApi, VideoPaymentQuote } from '../../api/videoServicesApi';
import { VideoPaymentSession } from '../../api/videoServicesApi';
import { useVideoServices } from '../../hooks/useVideoServices';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

interface Props { onOpenDrawer?: () => void; onJoinCall?: (appointment: Appointment) => void; onBookAppointment?: () => void }
type Payable = { appointment: Appointment; quote: VideoPaymentQuote; balance: number };
const money = (value: unknown) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const activeStatus = (status?: string) => ['approved', 'scheduled', 'confirmed', 'pending', 'in-progress', 'in_progress', 'ongoing'].includes(String(status || '').toLowerCase());
const statusColor = (status?: string) => ['completed', 'complete', 'settled'].includes(String(status || '').toLowerCase()) ? '#047857' : ['cancelled', 'refunded', 'failed'].includes(String(status || '').toLowerCase()) ? '#b91c1c' : '#b45309';

export const VideoServicesScreen: React.FC<Props> = ({ onOpenDrawer = () => {}, onJoinCall, onBookAppointment }) => {
  const { token, user } = useAuthContext();
  const { appointments, sessions, walletBalance, loading, refreshing, error, refresh, setWalletBalance } = useVideoServices(token, undefined, true);
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [payable, setPayable] = useState<Payable | null>(null);
  const [loadingAppointment, setLoadingAppointment] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('500');
  const active = useMemo(() => appointments.filter(item => activeStatus(item.status)), [appointments]);
  const history = useMemo(() => appointments.filter(item => ['completed', 'complete', 'cancelled', 'no_show'].includes(String(item.status || '').toLowerCase())), [appointments]);
  const rows = tab === 'active' ? active : history;

  const openPayment = async (appointment: Appointment) => {
    if (!token) return;
    setLoadingAppointment(appointment.id);
    const result = await getVideoPaymentQuoteApi(token, appointment.id);
    setLoadingAppointment(null);
    if (!result.success || !result.data?.quote) { showErrorToast('Payment details unavailable', result.message); return; }
    setPayable({ appointment, quote: result.data.quote, balance: Number(result.data.wallet?.balance ?? walletBalance ?? 0) });
  };

  const confirmWalletPayment = async () => {
    if (!payable || !token) return;
    if (payable.balance < Number(payable.quote.quoted_amount || 0)) {
      showErrorToast('Wallet balance is low', 'Recharge your wallet before confirming this consultation.');
      return;
    }
    setSaving(true);
    const result = await confirmVideoPaymentApi(token, payable.appointment.id, 'wallet');
    setSaving(false);
    if (!result.success) { showErrorToast('Payment setup failed', result.message); return; }
    setPayable(null);
    showSuccessToast('Wallet payment confirmed', 'The consultation fee is charged when the doctor starts the call.');
    refresh();
  };

  const rechargeWallet = async () => {
    const amount = Number(rechargeAmount);
    if (!token || !Number.isFinite(amount) || amount < 1) {
      showErrorToast('Invalid recharge amount', 'Enter an amount of at least ₹1.');
      return;
    }
    setSaving(true);
    try {
      const orderResult = await createWalletRechargeOrderApi(token, amount);
      if (!orderResult.success || !orderResult.data?.order_id || !orderResult.data?.key_id) {
        throw new Error(orderResult.message || 'Unable to create payment order.');
      }
      const order = orderResult.data;
      const payment = await RazorpayCheckout.open({
        key: order.key_id,
        amount: String(order.amount),
        currency: order.currency || 'INR',
        order_id: order.order_id,
        name: 'OrboDoc',
        description: 'Patient wallet recharge',
        prefill: { name: user?.full_name || user?.fullName, email: user?.email, contact: user?.phone },
        theme: { color: '#0f766e' },
      });
      const verifyResult = await verifyWalletRechargeApi(token, payment);
      if (!verifyResult.success) throw new Error(verifyResult.message || 'Payment verification failed.');
      setWalletBalance(Number(verifyResult.data?.balance || 0));
      setRechargeOpen(false);
      showSuccessToast('Wallet recharged', `${money(verifyResult.data?.balance)} is now available.`);
      refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String((cause as any)?.description || 'Payment was cancelled or could not be verified.');
      showErrorToast('Recharge failed', message);
    } finally {
      setSaving(false);
    }
  };

  const renderAppointment = (appointment: Appointment) => {
    const session = sessions[String(appointment.id)] as VideoPaymentSession | undefined;
    const paymentStatus = String(session?.status || 'payment due').replace(/_/g, ' ');
    const fee = Number(session?.quoted_amount || 0);
    const canJoin = activeStatus(appointment.status) && Boolean(onJoinCall);
    return <View key={appointment.id} style={styles.card}>
      <View style={styles.cardTop}><View style={styles.iconCircle}><Video size={19} color="#0f766e" /></View><View style={styles.flex}><Text style={styles.doctor}>Dr. {appointment.doctor_name || 'Doctor'}</Text><Text style={styles.muted}>{appointment.specialization || appointment.doctor_specialization || 'Video consultation'} · #{appointment.id}</Text></View><Text style={[styles.badge, { color: statusColor(appointment.status), backgroundColor: `${statusColor(appointment.status)}12` }]}>{String(appointment.status || 'scheduled').replace(/_/g, ' ')}</Text></View>
      <View style={styles.rule} />
      <Text style={styles.detail}><CalendarClock size={14} color="#64748b" />  {appointment.appointment_date || 'Date not set'} · {(appointment.appointment_time || appointment.time_slot || '').slice(0, 5)}</Text>
      {!!appointment.reason && <Text style={styles.reason}>{appointment.reason}</Text>}
      <View style={styles.paymentRow}><Text style={styles.paymentLabel}>Payment</Text><Text style={[styles.paymentStatus, { color: statusColor(session?.status) }]}>{paymentStatus}</Text>{fee > 0 && <Text style={styles.fee}>{money(fee)}</Text>}</View>
      <View style={styles.actions}>
        {activeStatus(appointment.status) && <TouchableOpacity style={styles.secondaryButton} disabled={loadingAppointment === appointment.id} onPress={() => openPayment(appointment)}>{loadingAppointment === appointment.id ? <ActivityIndicator size="small" color="#0f766e" /> : <CreditCard size={16} color="#0f766e" />}<Text style={styles.secondaryText}>Payment details</Text></TouchableOpacity>}
        {canJoin && <TouchableOpacity style={styles.primaryButton} onPress={() => onJoinCall?.(appointment)}><Video size={16} color="#fff" /><Text style={styles.primaryText}>Join call</Text></TouchableOpacity>}
      </View>
    </View>;
  };

  return <View style={styles.container}>
    <PatientHeader onOpenDrawer={onOpenDrawer} />
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <View style={styles.hero}><View style={styles.heroIcon}><Video size={22} color="#0f766e" /></View><Text style={styles.title}>Video Services</Text><Text style={styles.subtitle}>Your video consultations, wallet and call access</Text><TouchableOpacity style={styles.bookButton} onPress={onBookAppointment}><Video size={15} color="#fff" /><Text style={styles.primaryText}>Book consultation</Text></TouchableOpacity></View>
      <View style={styles.walletCard}><View style={styles.walletIcon}><Wallet size={20} color="#0f766e" /></View><View style={styles.flex}><Text style={styles.muted}>Wallet balance</Text><Text style={styles.balance}>{walletBalance === null ? '—' : money(walletBalance)}</Text></View><TouchableOpacity style={styles.rechargeButton} onPress={() => setRechargeOpen(true)}><IndianRupee size={14} color="#0f766e" /><Text style={styles.secondaryText}>Recharge</Text></TouchableOpacity><Text style={styles.walletNote}>Fee is charged when your doctor starts the call.</Text></View>
      <View style={styles.counts}><Count icon={<Video size={17} color="#0f766e" />} title="Active appointments" count={active.length} /><Count icon={<CheckCircle2 size={17} color="#047857" />} title="Completed calls" count={history.length} /></View>
      <View style={styles.tabs}><TouchableOpacity onPress={() => setTab('active')} style={[styles.tab, tab === 'active' && styles.activeTab]}><Text style={[styles.tabText, tab === 'active' && styles.activeTabText]}>Active ({active.length})</Text></TouchableOpacity><TouchableOpacity onPress={() => setTab('history')} style={[styles.tab, tab === 'history' && styles.activeTab]}><Text style={[styles.tabText, tab === 'history' && styles.activeTabText]}>History ({history.length})</Text></TouchableOpacity></View>
      {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={refresh}><Text style={styles.retry}>Try again</Text></TouchableOpacity></View> : null}
      {loading ? <ActivityIndicator style={{ marginTop: 34 }} color="#0f766e" size="large" /> : null}
      {!loading && !error && rows.map(renderAppointment)}
      {!loading && !error && rows.length === 0 ? <View style={styles.empty}><Clock3 size={30} color="#0f766e" /><Text style={styles.emptyTitle}>{tab === 'active' ? 'No active video appointments' : 'No video consultation history'}</Text><Text style={styles.muted}>Video appointments booked with your doctors will show here.</Text></View> : null}
    </ScrollView>
    <AppModal visible={Boolean(payable)} transparent animationType="slide" onRequestClose={() => setPayable(null)}>
      <View style={styles.modalBackdrop}><View style={styles.modal}>
        <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>Consultation payment</Text><Text style={styles.muted}>Appointment #{payable?.appointment.id}</Text></View><TouchableOpacity onPress={() => setPayable(null)}><X size={22} color="#475569" /></TouchableOpacity></View>
        <View style={styles.quoteRow}><Text style={styles.muted}>Billing model</Text><Text style={styles.quoteValue}>{payable?.quote.billing_model === 'fixed_fee' ? 'Fixed consultation fee' : 'Per minute'}</Text></View>
        <View style={styles.quoteRow}><Text style={styles.muted}>Doctor fee</Text><Text style={styles.quoteValue}>{money(payable?.quote.consultation_fee)}</Text></View>
        <View style={styles.quoteRow}><Text style={styles.muted}>Wallet balance</Text><Text style={styles.quoteValue}>{money(payable?.balance)}</Text></View>
        <View style={[styles.quoteRow, styles.totalRow]}><Text style={styles.totalLabel}>Due for consultation</Text><Text style={styles.total}>{money(payable?.quote.quoted_amount)}</Text></View>
        <Text style={styles.helper}>The wallet is charged when the doctor starts your call. This confirmation records wallet as the payment source.</Text>
        <TouchableOpacity style={[styles.primaryButton, styles.confirmButton, saving && styles.disabled]} onPress={confirmWalletPayment} disabled={saving}>{saving ? <ActivityIndicator color="#fff" /> : <IndianRupee size={17} color="#fff" />}<Text style={styles.primaryText}>{saving ? 'Confirming…' : 'Confirm wallet payment'}</Text></TouchableOpacity>
      </View></View>
    </AppModal>
    <AppModal visible={rechargeOpen} transparent animationType="slide" onRequestClose={() => setRechargeOpen(false)}>
      <View style={styles.modalBackdrop}><View style={styles.modal}>
        <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>Recharge wallet</Text><Text style={styles.muted}>Secure payment powered by Razorpay</Text></View><TouchableOpacity onPress={() => setRechargeOpen(false)}><X size={22} color="#475569" /></TouchableOpacity></View>
        <Text style={styles.inputLabel}>Amount (₹)</Text>
        <TextInput value={rechargeAmount} onChangeText={setRechargeAmount} keyboardType="decimal-pad" placeholder="Enter amount" style={styles.amountInput} />
        <Text style={styles.helper}>Pay securely with UPI, card, net banking or wallet. Your balance updates after server verification.</Text>
        <TouchableOpacity style={[styles.primaryButton, styles.confirmButton, saving && styles.disabled]} onPress={rechargeWallet} disabled={saving}>{saving ? <ActivityIndicator color="#fff" /> : <Wallet size={17} color="#fff" />}<Text style={styles.primaryText}>{saving ? 'Processing…' : 'Continue to payment'}</Text></TouchableOpacity>
      </View></View>
    </AppModal>
  </View>;
};

const Count = ({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) => <View style={styles.count}>{icon}<Text style={styles.countValue}>{count}</Text><Text style={styles.muted}>{title}</Text></View>;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' }, content: { padding: 16, paddingBottom: 38 }, flex: { flex: 1 }, hero: { backgroundColor: '#fff', borderRadius: 18, padding: 20, alignItems: 'center', marginBottom: 13, borderWidth: 1, borderColor: '#e2e8f0' }, heroIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ccfbf1', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }, title: { fontSize: 22, fontWeight: '800', color: '#0f172a' }, subtitle: { fontSize: 13, color: '#64748b', marginTop: 4, textAlign: 'center' }, bookButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#0f766e', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, marginTop: 14 }, walletCard: { backgroundColor: '#fff', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }, walletIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ccfbf1', justifyContent: 'center', alignItems: 'center' }, balance: { color: '#0f172a', fontWeight: '800', fontSize: 20, marginTop: 2 }, walletNote: { width: '100%', color: '#64748b', fontSize: 11, paddingLeft: 50 }, rechargeButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#99f6e4', paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9 }, counts: { flexDirection: 'row', gap: 10, marginBottom: 12 }, count: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 13, borderWidth: 1, borderColor: '#e2e8f0' }, countValue: { fontSize: 19, color: '#0f172a', fontWeight: '800', marginTop: 8 }, muted: { color: '#64748b', fontSize: 12, marginTop: 3 }, tabs: { flexDirection: 'row', gap: 8, backgroundColor: '#e2e8f0', padding: 4, borderRadius: 12, marginBottom: 12 }, tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 }, activeTab: { backgroundColor: '#fff' }, tabText: { color: '#64748b', fontSize: 13, fontWeight: '600' }, activeTabText: { color: '#0f766e', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 15, marginBottom: 11 }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' }, doctor: { color: '#0f172a', fontSize: 15, fontWeight: '700' }, badge: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, overflow: 'hidden' }, rule: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 12 }, detail: { flexDirection: 'row', color: '#475569', fontSize: 12, marginTop: 6 }, reason: { color: '#475569', fontSize: 12, marginTop: 9, fontStyle: 'italic' }, paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 13, paddingTop: 11, borderTopWidth: 1, borderTopColor: '#f1f5f9' }, paymentLabel: { color: '#64748b', fontSize: 12 }, paymentStatus: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }, fee: { marginLeft: 'auto', color: '#0f172a', fontWeight: '700', fontSize: 13 }, actions: { flexDirection: 'row', gap: 8, marginTop: 12 }, primaryButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#0f766e', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }, primaryText: { color: '#fff', fontSize: 12, fontWeight: '700' }, secondaryButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 10 }, secondaryText: { color: '#0f766e', fontSize: 12, fontWeight: '700' }, disabled: { opacity: 0.5 }, empty: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1', padding: 26, gap: 8 }, emptyTitle: { color: '#0f172a', fontSize: 15, fontWeight: '700', textAlign: 'center' }, error: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 14 }, errorText: { color: '#b91c1c', fontSize: 13 }, retry: { color: '#0f766e', fontWeight: '700', marginTop: 7 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,.45)' }, modal: { backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 22, borderTopRightRadius: 22 }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 4 }, modalTitle: { color: '#0f172a', fontSize: 18, fontWeight: '800' }, quoteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }, quoteValue: { color: '#334155', fontSize: 13, fontWeight: '700' }, totalRow: { marginTop: 4 }, totalLabel: { color: '#0f172a', fontWeight: '700', fontSize: 14 }, total: { color: '#0f766e', fontSize: 17, fontWeight: '800' }, helper: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 13 }, confirmButton: { marginTop: 16 }, inputLabel: { fontSize: 13, color: '#334155', fontWeight: '700', marginTop: 16 }, amountInput: { height: 46, borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, color: '#0f172a', marginTop: 7 },
});

export default VideoServicesScreen;
