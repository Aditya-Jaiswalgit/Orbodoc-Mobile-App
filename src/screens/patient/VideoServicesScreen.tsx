import { colors, radii, spacing, typography } from '../../theme/tokens';
import React, { useMemo, useState } from 'react';
import { AppModal } from '../../components/common/AppModal';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LiquidBorderScrollView } from '../../components/common/LiquidBorderScrollView';
import { CalendarClock, Clock3, CreditCard, IndianRupee, Video, Wallet, X } from 'lucide-react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { PatientHeader } from '../../components/common/PatientHeader';
import { LiquidBorderSurface } from '../../components/common/LiquidBorderSurface';
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
const statusColor = (status?: string) => ['completed', 'complete', 'settled'].includes(String(status || '').toLowerCase()) ? '#047857' : ['cancelled', 'refunded', 'failed'].includes(String(status || '').toLowerCase()) ? colors.destructiveDark : '#b45309';

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
        theme: { color: colors.primaryDark },
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
    return <LiquidBorderSurface key={appointment.id} style={styles.card} radius={12}>
      <View style={styles.cardTop}>
        <View style={styles.iconCircle}><Video size={19} color={colors.primary} /></View>
        <View style={styles.flex}>
          <View style={styles.doctorLine}><Text numberOfLines={1} ellipsizeMode="tail" style={styles.doctor}>Dr. {appointment.doctor_name || 'Doctor'}</Text><View style={styles.appointmentBadge}><Text style={styles.appointmentBadgeText}>#{appointment.id}</Text></View></View>
          <Text style={styles.muted}>{appointment.clinic_name || 'Clinic'}</Text>
          <Text style={styles.muted}>{appointment.reason || 'Video consultation'}</Text>
        </View>
      </View>
      <View style={styles.statusRow}><Text style={styles.tableLabel}>Status</Text><Text style={[styles.badge, { color: colors.surface, backgroundColor: colors.primary }]}>{String(appointment.status || 'approved').replace(/_/g, ' ')}</Text></View>
      <View style={styles.rule} />
      <View style={styles.dataRow}><CalendarClock size={16} color={colors.muted} /><View style={styles.dataCopy}><Text style={styles.tableLabel}>Date & Time</Text><Text style={styles.detail}>{appointment.appointment_date || 'Date not set'} · {(appointment.appointment_time || appointment.time_slot || '').slice(0, 5)}</Text></View></View>
      <View style={styles.paymentRow}><Text style={styles.tableLabel}>Payment</Text><Text style={[styles.paymentStatus, { color: paymentReady ? '#047857' : statusColor(session?.status) }]}>{paymentReady ? 'Ready' : paymentStatus}</Text>{fee > 0 && <Text style={styles.fee}>{money(fee)}</Text>}</View>
      <View style={styles.actions}>
        {activeStatus(appointment.status) && <TouchableOpacity style={styles.secondaryButton} disabled={loadingAppointment === appointment.id} onPress={() => openPayment(appointment)}>{loadingAppointment === appointment.id ? <ActivityIndicator size="small" color={colors.primaryDark} /> : <CreditCard size={16} color={colors.primaryDark} />}<Text style={styles.secondaryText}>Payment details</Text></TouchableOpacity>}
        {canJoin && <TouchableOpacity style={styles.primaryButton} onPress={() => onJoinCall?.(appointment)}><Video size={16} color={colors.surface} /><Text style={styles.primaryText}>Join call</Text></TouchableOpacity>}
      </View>
    </LiquidBorderSurface>;
  };

  return <View style={styles.container}>
    <PatientHeader onOpenDrawer={onOpenDrawer} />
    <LiquidBorderScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <LiquidBorderSurface style={styles.summaryCard} radius={12}>
        <View style={styles.summaryHeading}><Video size={20} color={colors.primary} /><Text style={styles.summaryTitle}>Patient Video Services</Text></View>
        <Text style={styles.summaryDescription}>Manage your video consultation payments and calls.</Text>
        <View style={styles.summaryMetrics}>
          <Metric title="Wallet Balance" value={walletBalance === null ? '—' : money(walletBalance)} icon={<Wallet size={20} color={colors.primary} />} />
          <Metric title="Active Video Appointments" value={String(active.length)} />
          <Metric title="Completed Calls" value={String(history.length)} />
        </View>
      </LiquidBorderSurface>
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
        <TouchableOpacity style={styles.primaryButton} onPress={() => setRechargeOpen(true)}><IndianRupee size={16} color={colors.surface} /><Text style={styles.primaryText}>Recharge via UPI</Text></TouchableOpacity>
      </View> : <>
        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={refresh}><Text style={styles.retry}>Try again</Text></TouchableOpacity></View> : null}
        {loading ? <View style={styles.loadingState}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Loading video appointments...</Text></View> : null}
        {!loading && !error && rows.map(renderAppointment)}
        {!loading && !error && rows.length === 0 ? <View style={styles.empty}><Clock3 size={30} color={colors.primary} /><Text style={styles.emptyTitle}>{tab === 'calls' ? 'No active video appointments found.' : 'No video consultation history'}</Text><Text style={styles.muted}>Video appointments booked with your doctors will show here.</Text></View> : null}
      </>}
    </LiquidBorderScrollView>
    <AppModal visible={Boolean(payable)} transparent animationType="slide" onRequestClose={() => setPayable(null)}>
      <View style={styles.modalBackdrop}><View style={styles.modal}>
        <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>Consultation payment</Text><Text style={styles.muted}>Appointment #{payable?.appointment.id}</Text></View><TouchableOpacity onPress={() => setPayable(null)}><X size={22} color={colors.muted} /></TouchableOpacity></View>
        <View style={styles.quoteRow}><Text style={styles.muted}>Billing model</Text><Text style={styles.quoteValue}>{payable?.quote.billing_model === 'fixed_fee' ? 'Fixed consultation fee' : 'Per minute'}</Text></View>
        <View style={styles.quoteRow}><Text style={styles.muted}>Doctor fee</Text><Text style={styles.quoteValue}>{money(payable?.quote.consultation_fee)}</Text></View>
        <View style={styles.quoteRow}><Text style={styles.muted}>Wallet balance</Text><Text style={styles.quoteValue}>{money(payable?.balance)}</Text></View>
        <View style={[styles.quoteRow, styles.totalRow]}><Text style={styles.totalLabel}>Due for consultation</Text><Text style={styles.total}>{money(payable?.quote.quoted_amount)}</Text></View>
        <Text style={styles.helper}>The wallet is charged when the doctor starts your call. This confirmation records wallet as the payment source.</Text>
        <TouchableOpacity style={[styles.primaryButton, styles.confirmButton, saving && styles.disabled]} onPress={confirmWalletPayment} disabled={saving}>{saving ? <ActivityIndicator color={colors.surface} /> : <IndianRupee size={17} color={colors.surface} />}<Text style={styles.primaryText}>{saving ? 'Confirming…' : 'Confirm wallet payment'}</Text></TouchableOpacity>
      </View></View>
    </AppModal>
    <AppModal visible={rechargeOpen} transparent animationType="slide" onRequestClose={() => setRechargeOpen(false)}>
      <View style={styles.modalBackdrop}><View style={styles.modal}>
        <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>Recharge wallet</Text><Text style={styles.muted}>Secure payment powered by Razorpay</Text></View><TouchableOpacity onPress={() => setRechargeOpen(false)}><X size={22} color={colors.muted} /></TouchableOpacity></View>
        <Text style={styles.inputLabel}>Amount (₹)</Text>
        <TextInput value={rechargeAmount} onChangeText={setRechargeAmount} keyboardType="decimal-pad" placeholder="Enter amount" style={styles.amountInput} />
        <Text style={styles.helper}>Pay securely with UPI, card, net banking or wallet. Your balance updates after server verification.</Text>
        <TouchableOpacity style={[styles.primaryButton, styles.confirmButton, saving && styles.disabled]} onPress={rechargeWallet} disabled={saving}>{saving ? <ActivityIndicator color={colors.surface} /> : <Wallet size={17} color={colors.surface} />}<Text style={styles.primaryText}>{saving ? 'Processing…' : 'Continue to payment'}</Text></TouchableOpacity>
      </View></View>
    </AppModal>
  </View>;
};

const Metric = ({ icon, title, value }: { icon?: React.ReactNode; title: string; value: string }) => (
  <LiquidBorderSurface style={styles.metric} radius={12}>
    <Text style={styles.metricTitle}>{title}</Text>
    <View style={styles.metricValueRow}>
      {icon}
      <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={styles.countValue}>{value}</Text>
    </View>
  </LiquidBorderSurface>
);
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingBottom: 38 }, flex: { flex: 1, minWidth: 0 },
  summaryCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, shadowColor: colors.foreground, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  summaryHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, summaryTitle: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.lg, fontWeight: typography.weight.semibold }, summaryDescription: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.body, marginTop: spacing.tiny },
  summaryMetrics: { gap: spacing.md, marginTop: spacing.lg }, metric: { minWidth: 0, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg, backgroundColor: colors.surface }, metricTitle: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.body }, metricValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 }, countValue: { flexShrink: 1, fontFamily: typography.family, fontSize: typography.size.display, lineHeight: 32, color: colors.foreground, fontWeight: typography.weight.semibold, marginTop: spacing.sm }, muted: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.body, marginTop: 3 },
  tabs: { flexDirection: 'row', alignSelf: 'flex-start', gap: 2, padding: spacing.xs, borderRadius: radii.sm, backgroundColor: colors.secondary, marginBottom: spacing.lg }, tab: { alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: 4 }, activeTab: { backgroundColor: colors.surface, elevation: 1 }, tabText: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.body, fontWeight: typography.weight.medium }, activeTabText: { color: colors.foreground },
  walletPanel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: 18, shadowColor: colors.foreground, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }, walletTitle: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.lg, fontWeight: typography.weight.semibold }, walletDescription: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.body, marginTop: 5 }, availableBalance: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.lg, fontWeight: typography.weight.semibold, marginTop: 18, marginBottom: 14 },
  card: { minWidth: 0, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md, elevation: 1 }, cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }, iconCircle: { width: 40, height: 40, borderRadius: radii.lg, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }, doctorLine: { minWidth: 0, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm }, doctor: { flexShrink: 1, fontFamily: typography.family, color: colors.foreground, fontSize: 15, fontWeight: typography.weight.semibold }, appointmentBadge: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, borderRadius: radii.lg, paddingHorizontal: spacing.sm, paddingVertical: 3 }, appointmentBadgeText: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.sm, fontWeight: typography.weight.medium }, badge: { fontFamily: typography.family, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, textTransform: 'capitalize', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, overflow: 'hidden' }, statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }, tableLabel: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.body }, rule: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md }, dataRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, dataCopy: { flex: 1, minWidth: 0 }, detail: { flexShrink: 1, fontFamily: typography.family, color: colors.muted, fontSize: typography.size.body, marginTop: 3 }, reason: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.body, marginTop: 9 }, paymentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 13, paddingTop: 11, borderTopWidth: 1, borderTopColor: colors.border }, paymentLabel: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.body }, paymentStatus: { fontFamily: typography.family, fontSize: typography.size.body, fontWeight: typography.weight.semibold, textTransform: 'capitalize' }, fee: { fontFamily: typography.family, marginLeft: 'auto', color: colors.foreground, fontWeight: typography.weight.semibold, fontSize: typography.size.body }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 14 }, primaryButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.primary, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: 9 }, primaryText: { fontFamily: typography.family, color: colors.surface, fontSize: typography.size.body, fontWeight: typography.weight.medium }, secondaryButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: spacing.tiny, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, paddingHorizontal: 11, paddingVertical: 9 }, secondaryText: { fontFamily: typography.family, color: colors.primary, fontSize: typography.size.body, fontWeight: typography.weight.medium }, disabled: { opacity: 0.5 }, empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border, padding: 26, gap: spacing.sm }, emptyTitle: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.subtitle, fontWeight: typography.weight.semibold, textAlign: 'center' }, error: { backgroundColor: colors.destructiveSoft, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.destructiveSoft, padding: 14 }, errorText: { fontFamily: typography.family, color: colors.destructiveDark, fontSize: typography.size.body }, retry: { color: colors.primary, fontWeight: typography.weight.semibold, marginTop: 7 },
  loadingState: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,.45)' }, modal: { backgroundColor: colors.surface, padding: spacing.xl, borderTopLeftRadius: 22, borderTopRightRadius: 22 }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.xs }, modalTitle: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.title, fontWeight: typography.weight.extrabold }, quoteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.secondary }, quoteValue: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.caption, fontWeight: typography.weight.bold }, totalRow: { marginTop: spacing.xs }, totalLabel: { fontFamily: typography.family, color: colors.text, fontWeight: typography.weight.bold, fontSize: typography.size.body }, total: { fontFamily: typography.family, color: colors.primaryDark, fontSize: 17, fontWeight: typography.weight.extrabold }, helper: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.sm, lineHeight: 18, marginTop: 13 }, confirmButton: { marginTop: spacing.lg }, inputLabel: { fontFamily: typography.family, fontSize: typography.size.body, color: colors.foreground, fontWeight: typography.weight.bold, marginTop: spacing.lg }, amountInput: { fontFamily: typography.family, height: 46, borderColor: colors.input, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, fontSize: typography.size.subtitle, color: colors.text, marginTop: 7 },
});

export default VideoServicesScreen;
