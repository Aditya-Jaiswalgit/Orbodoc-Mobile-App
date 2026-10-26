import React, { useMemo, useState } from 'react';
import { AppModal } from '../../components/common/AppModal';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CalendarClock, Clock3, CreditCard, IndianRupee, Video, Wallet, X } from 'lucide-react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { PatientHeader } from '../../components/common/PatientHeader';
import { useAuthContext } from '../../context/AuthContext';
import { Appointment } from '../../types/clinicTypes';
import { confirmVideoPaymentApi, createWalletRechargeOrderApi, getVideoPaymentQuoteApi, verifyWalletRechargeApi, VideoPaymentQuote } from '../../api/videoServicesApi';
import { VideoPaymentSession } from '../../api/videoServicesApi';
import { useVideoServices } from '../../hooks/useVideoServices';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

interface Props { onOpenDrawer?: () => void; onJoinCall?: (appointment: Appointment) => void }
type Payable = { appointment: Appointment; quote: VideoPaymentQuote; balance: number };
const money = (value: unknown) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const activeStatus = (status?: string) => ['approved', 'scheduled', 'confirmed', 'pending', 'in-progress', 'in_progress', 'ongoing'].includes(String(status || '').toLowerCase());
const statusColor = (status?: string) => ['completed', 'complete', 'settled'].includes(String(status || '').toLowerCase()) ? '#047857' : ['cancelled', 'refunded', 'failed'].includes(String(status || '').toLowerCase()) ? '#b91c1c' : '#b45309';

export const VideoServicesScreen: React.FC<Props> = ({ onOpenDrawer = () => {}, onJoinCall }) => {
  const { token, user } = useAuthContext();
  const { appointments, sessions, walletBalance, loading, refreshing, error, refresh, setWalletBalance } = useVideoServices(token, undefined, true);
  const [tab, setTab] = useState<'calls' | 'history' | 'wallet'>('calls');
  const [payable, setPayable] = useState<Payable | null>(null);
  const [loadingAppointment, setLoadingAppointment] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('500');
  const active = useMemo(() => appointments.filter(item => activeStatus(item.status)), [appointments]);
  const history = useMemo(() => appointments.filter(item => ['completed', 'complete', 'cancelled', 'no_show'].includes(String(item.status || '').toLowerCase())), [appointments]);
  const rows = tab === 'calls' ? active : history;

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
        theme: { color: '#1d7c72' },
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
    const paymentReady = ['confirmed', 'in_call', 'completed'].includes(String(session?.status || '').toLowerCase());
    return <View key={appointment.id} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconCircle}><Video size={19} color="#27A598" /></View>
        <View style={styles.flex}>
          <View style={styles.doctorLine}><Text style={styles.doctor}>Dr. {appointment.doctor_name || 'Doctor'}</Text><View style={styles.appointmentBadge}><Text style={styles.appointmentBadgeText}>#{appointment.id}</Text></View></View>
          <Text style={styles.muted}>{appointment.clinic_name || 'Clinic'}</Text>
          <Text style={styles.muted}>{appointment.reason || 'Video consultation'}</Text>
        </View>
      </View>
      <View style={styles.statusRow}><Text style={styles.tableLabel}>Status</Text><Text style={[styles.badge, { color: statusColor(appointment.status), backgroundColor: `${statusColor(appointment.status)}12` }]}>{String(appointment.status || 'approved').replace(/_/g, ' ')}</Text></View>
      <View style={styles.rule} />
      <View style={styles.dataRow}><CalendarClock size={16} color="#6C7C93" /><View style={styles.dataCopy}><Text style={styles.tableLabel}>Date & Time</Text><Text style={styles.detail}>{appointment.appointment_date || 'Date not set'} · {(appointment.appointment_time || appointment.time_slot || '').slice(0, 5)}</Text></View></View>
      <View style={styles.paymentRow}><Text style={styles.tableLabel}>Payment</Text><Text style={[styles.paymentStatus, { color: paymentReady ? '#047857' : statusColor(session?.status) }]}>{paymentReady ? 'Ready' : paymentStatus}</Text>{fee > 0 && <Text style={styles.fee}>{money(fee)}</Text>}</View>
      <View style={styles.actions}>
        {activeStatus(appointment.status) && <TouchableOpacity style={styles.secondaryButton} disabled={loadingAppointment === appointment.id} onPress={() => openPayment(appointment)}>{loadingAppointment === appointment.id ? <ActivityIndicator size="small" color="#1d7c72" /> : <CreditCard size={16} color="#1d7c72" />}<Text style={styles.secondaryText}>Payment details</Text></TouchableOpacity>}
        {canJoin && <TouchableOpacity style={styles.primaryButton} onPress={() => onJoinCall?.(appointment)}><Video size={16} color="#fff" /><Text style={styles.primaryText}>Join call</Text></TouchableOpacity>}
      </View>
    </View>;
  };

  return <View style={styles.container}>
    <PatientHeader onOpenDrawer={onOpenDrawer} />
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeading}><Video size={20} color="#27A598" /><Text style={styles.summaryTitle}>Patient Video Services</Text></View>
        <Text style={styles.summaryDescription}>Manage your video consultation payments and calls.</Text>
        <View style={styles.summaryMetrics}>
          <Metric title="Wallet Balance" value={walletBalance === null ? '—' : money(walletBalance)} icon={<Wallet size={20} color="#27A598" />} />
          <Metric title="Active Video Appointments" value={String(active.length)} />
          <Metric title="Completed Calls" value={String(history.length)} />
        </View>
      </View>
      <View style={styles.tabs}>
        {(['calls', 'history', 'wallet'] as const).map((key) => (
          <TouchableOpacity key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.activeTab]}>
            <Text style={[styles.tabText, tab === key && styles.activeTabText]}>{key === 'calls' ? 'Video Calls' : key === 'history' ? 'History' : 'Wallet'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'wallet' ? <View style={styles.walletPanel}>
        <Text style={styles.walletTitle}>Wallet</Text>
        <Text style={styles.walletDescription}>Top up your wallet to pay consultation fees.</Text>
        <Text style={styles.availableBalance}>Available Balance: {walletBalance === null ? '—' : money(walletBalance)}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setRechargeOpen(true)}><IndianRupee size={16} color="#fff" /><Text style={styles.primaryText}>Recharge via UPI</Text></TouchableOpacity>
      </View> : <>
        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={refresh}><Text style={styles.retry}>Try again</Text></TouchableOpacity></View> : null}
        {loading ? <ActivityIndicator style={{ marginTop: 34 }} color="#27A598" size="large" /> : null}
        {!loading && !error && rows.map(renderAppointment)}
        {!loading && !error && rows.length === 0 ? <View style={styles.empty}><Clock3 size={30} color="#27A598" /><Text style={styles.emptyTitle}>{tab === 'calls' ? 'No active video appointments found.' : 'No video consultation history'}</Text><Text style={styles.muted}>Video appointments booked with your doctors will show here.</Text></View> : null}
      </>}
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

const Metric = ({ icon, title, value }: { icon?: React.ReactNode; title: string; value: string }) => (
  <View style={styles.metric}>
    <Text style={styles.metricTitle}>{title}</Text>
    <View style={styles.metricValueRow}>
      {icon}
      <Text style={styles.countValue}>{value}</Text>
    </View>
  </View>
);
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' }, content: { padding: 16, paddingBottom: 38 }, flex: { flex: 1, minWidth: 0 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#DFE5EC', marginBottom: 16, shadowColor: '#1C2830', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  summaryHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, summaryTitle: { fontFamily: 'Inter', color: '#1C2830', fontSize: 18, fontWeight: '600' }, summaryDescription: { fontFamily: 'Inter', color: '#6C7C93', fontSize: 14, marginTop: 6 },
  summaryMetrics: { gap: 12, marginTop: 16 }, metric: { borderWidth: 1, borderColor: '#DFE5EC', borderRadius: 12, padding: 16, backgroundColor: '#FFFFFF' }, metricTitle: { fontFamily: 'Inter', color: '#6C7C93', fontSize: 14 }, metricValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, countValue: { fontFamily: 'Inter', fontSize: 24, lineHeight: 32, color: '#1C2830', fontWeight: '600', marginTop: 8 }, muted: { fontFamily: 'Inter', color: '#6C7C93', fontSize: 14, marginTop: 3 },
  tabs: { flexDirection: 'row', alignSelf: 'flex-start', gap: 2, padding: 4, borderRadius: 6, backgroundColor: '#F1F5F9', marginBottom: 16 }, tab: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 4 }, activeTab: { backgroundColor: '#FFFFFF', elevation: 1 }, tabText: { fontFamily: 'Inter', color: '#64748B', fontSize: 14, fontWeight: '500' }, activeTabText: { color: '#1C2830' },
  walletPanel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#DFE5EC', borderRadius: 12, padding: 18, shadowColor: '#1C2830', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }, walletTitle: { fontFamily: 'Inter', color: '#1C2830', fontSize: 18, fontWeight: '600' }, walletDescription: { fontFamily: 'Inter', color: '#6C7C93', fontSize: 14, marginTop: 5 }, availableBalance: { fontFamily: 'Inter', color: '#1C2830', fontSize: 18, fontWeight: '600', marginTop: 18, marginBottom: 14 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#DFE5EC', padding: 16, marginBottom: 12, elevation: 1 }, cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, iconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E6F7F5', alignItems: 'center', justifyContent: 'center' }, doctorLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }, doctor: { fontFamily: 'Inter', color: '#1C2830', fontSize: 15, fontWeight: '600' }, appointmentBadge: { borderWidth: 1, borderColor: '#DFE5EC', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }, appointmentBadgeText: { fontFamily: 'Inter', color: '#334155', fontSize: 12, fontWeight: '500' }, badge: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600', textTransform: 'capitalize', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, overflow: 'hidden' }, statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }, tableLabel: { fontFamily: 'Inter', color: '#6C7C93', fontSize: 14 }, rule: { height: 1, backgroundColor: '#DFE5EC', marginVertical: 12 }, dataRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, dataCopy: { flex: 1 }, detail: { fontFamily: 'Inter', color: '#6C7C93', fontSize: 14, marginTop: 3 }, reason: { fontFamily: 'Inter', color: '#475569', fontSize: 14, marginTop: 9 }, paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 13, paddingTop: 11, borderTopWidth: 1, borderTopColor: '#DFE5EC' }, paymentLabel: { fontFamily: 'Inter', color: '#6C7C93', fontSize: 14 }, paymentStatus: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', textTransform: 'capitalize' }, fee: { fontFamily: 'Inter', marginLeft: 'auto', color: '#1C2830', fontWeight: '600', fontSize: 14 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }, primaryButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#27A598', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9 }, primaryText: { fontFamily: 'Inter', color: '#fff', fontSize: 14, fontWeight: '500' }, secondaryButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#DFE5EC', borderRadius: 6, paddingHorizontal: 11, paddingVertical: 9 }, secondaryText: { fontFamily: 'Inter', color: '#27A598', fontSize: 14, fontWeight: '500' }, disabled: { opacity: 0.5 }, empty: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#DFE5EC', padding: 26, gap: 8 }, emptyTitle: { fontFamily: 'Inter', color: '#1C2830', fontSize: 16, fontWeight: '600', textAlign: 'center' }, error: { backgroundColor: '#fef2f2', borderRadius: 12, borderWidth: 1, borderColor: '#FECACA', padding: 14 }, errorText: { fontFamily: 'Inter', color: '#b91c1c', fontSize: 14 }, retry: { color: '#27A598', fontWeight: '600', marginTop: 7 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,.45)' }, modal: { backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 22, borderTopRightRadius: 22 }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 4 }, modalTitle: { fontFamily: 'Inter', color: '#0f172a', fontSize: 20, fontWeight: '800' }, quoteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }, quoteValue: { fontFamily: 'Inter', color: '#334155', fontSize: 13, fontWeight: '700' }, totalRow: { marginTop: 4 }, totalLabel: { fontFamily: 'Inter', color: '#0f172a', fontWeight: '700', fontSize: 14 }, total: { fontFamily: 'Inter', color: '#1d7c72', fontSize: 17, fontWeight: '800' }, helper: { fontFamily: 'Inter', color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 13 }, confirmButton: { marginTop: 16 }, inputLabel: { fontFamily: 'Inter', fontSize: 14, color: '#334155', fontWeight: '700', marginTop: 16 }, amountInput: { fontFamily: 'Inter', height: 46, borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, color: '#0f172a', marginTop: 7 },
});

export default VideoServicesScreen;
