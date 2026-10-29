import { colors, radii, spacing, typography } from '../../../theme/tokens';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LiquidBorderScrollView } from '../../../components/common/LiquidBorderScrollView';
import RazorpayCheckout from 'react-native-razorpay';
import { CreditCard, FileText, IndianRupee, Receipt, X } from 'lucide-react-native';
import { PatientHeader } from '../../../components/common/PatientHeader';
import { PatientPageHeading } from '../../../components/common/PatientPageHeading';
import { LiquidBorderSurface, LiquidBorderTouchable } from '../../../components/common/LiquidBorderSurface';
import { AppModal } from '../../../components/common/AppModal';
import { useAuthContext } from '../../../context/AuthContext';
import { showErrorToast, showSuccessToast } from '../../../utils/toast';
import { createPatientBillPaymentOrder, fetchPatientBill, fetchPatientBills, PatientBill, PatientBillKind, verifyPatientBillPayment } from '../services/patientBillingService';

interface Props { kind: PatientBillKind; onOpenDrawer?: () => void }
const money = (value: unknown) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const dueFor = (bill: PatientBill) => Math.max(0, Number(bill.total_amount ?? bill.net_amount ?? 0) - Number(bill.paid_amount || 0));
const billStatus = (bill: PatientBill) => String(bill.status || bill.payment_status || (dueFor(bill) <= 0 ? 'paid' : 'pending')).replace(/_/g, ' ');

export function PatientBillingScreen({ kind, onOpenDrawer = () => {} }: Props) {
  const { token, user } = useAuthContext();
  const [bills, setBills] = useState<PatientBill[]>([]);
  const [selected, setSelected] = useState<PatientBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState(false);
  const title = kind === 'treatment' ? 'Treatment Billing' : 'Medicine Billing';

  const loadBills = useCallback(async (pull = false) => {
    if (!token) { setBills([]); setLoading(false); return; }
    if (pull) setRefreshing(true); else setLoading(true);
    try { setBills(await fetchPatientBills(token, kind)); }
    catch (error) { showErrorToast('Billing history', error instanceof Error ? error.message : 'Unable to load bills.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [kind, token]);

  useEffect(() => { void loadBills(); }, [loadBills]);

  const totals = useMemo(() => bills.reduce((sum, bill) => ({
    billed: sum.billed + Number(bill.total_amount ?? bill.net_amount ?? 0),
    paid: sum.paid + Number(bill.paid_amount || 0),
    due: sum.due + dueFor(bill),
  }), { billed: 0, paid: 0, due: 0 }), [bills]);

  const openBill = async (bill: PatientBill) => {
    setSelected(bill);
    if (!token) return;
    try { setSelected(await fetchPatientBill(token, kind, bill.id)); }
    catch (error) { showErrorToast('Bill details', error instanceof Error ? error.message : 'Unable to load bill details.'); }
  };

  const payBill = async () => {
    if (!selected || !token || paying) return;
    if (dueFor(selected) <= 0) { showSuccessToast('Bill settled', 'There is no outstanding balance.'); return; }
    setPaying(true);
    try {
      const orderResponse = await createPatientBillPaymentOrder(token, kind, selected.id);
      const order = orderResponse.data;
      if (!orderResponse.success || !order?.key_id || !order.order_id) throw new Error(orderResponse.message || 'Unable to start payment.');
      const payment = await RazorpayCheckout.open({
        key: order.key_id,
        amount: String(order.amount),
        currency: order.currency || 'INR',
        order_id: order.order_id,
        name: 'OrboDoc',
        description: `${title} · ${selected.bill_number || `#${selected.id}`}`,
        prefill: { name: user?.full_name || user?.fullName, email: user?.email, contact: user?.phone },
        theme: { color: colors.primaryDark },
      });
      const verifyResponse = await verifyPatientBillPayment(token, kind, selected.id, payment);
      if (!verifyResponse.success) throw new Error(verifyResponse.message || 'Payment verification failed.');
      const updated = verifyResponse.data?.bill || { ...selected, paid_amount: selected.total_amount, status: 'paid' };
      setSelected(updated);
      setBills(current => current.map(item => String(item.id) === String(updated.id) ? { ...item, ...updated } : item));
      showSuccessToast('Payment complete', 'Your bill payment has been verified.');
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error?.description || 'Payment was cancelled or could not be verified.');
      if (!/cancel/i.test(message)) showErrorToast('Payment failed', message);
    } finally { setPaying(false); }
  };

  return <View style={styles.container}>
    <PatientHeader onOpenDrawer={onOpenDrawer} />
    <LiquidBorderScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadBills(true)} tintColor={colors.primaryDark} />}>
      <PatientPageHeading title={title} subtitle="Your invoices and payment history" icon={<Receipt size={21} color={colors.primaryDark} />} />
      <View style={styles.summaryRow}>
        <LiquidBorderSurface style={styles.summaryCard} radius={12}><Text style={styles.summaryLabel}>BILLED</Text><Text style={styles.summaryValue}>{money(totals.billed)}</Text></LiquidBorderSurface>
        <LiquidBorderSurface style={styles.summaryCard} radius={12}><Text style={styles.summaryLabel}>PAID</Text><Text style={[styles.summaryValue, styles.paid]}>{money(totals.paid)}</Text></LiquidBorderSurface>
        <LiquidBorderSurface style={styles.summaryCard} radius={12}><Text style={styles.summaryLabel}>DUE</Text><Text style={[styles.summaryValue, styles.due]}>{money(totals.due)}</Text></LiquidBorderSurface>
      </View>
      {loading ? <ActivityIndicator color={colors.primaryDark} style={styles.loader} /> : bills.length ? bills.map(bill => {
        const due = dueFor(bill);
        return <LiquidBorderTouchable key={String(bill.id)} radius={16} activeOpacity={0.8} style={styles.billCard} onPress={() => void openBill(bill)}>
          <View style={styles.billTop}><View style={styles.billIcon}><FileText size={18} color={colors.primaryDark} /></View><View style={styles.flex}><Text style={styles.billNumber}>{bill.bill_number || `Bill #${bill.id}`}</Text><Text style={styles.muted}>{bill.created_at ? new Date(bill.created_at).toLocaleDateString('en-IN') : 'Date unavailable'}{bill.clinic_name ? ` · ${bill.clinic_name}` : ''}</Text></View><Text style={[styles.status, due <= 0 ? styles.statusPaid : styles.statusDue]}>{billStatus(bill)}</Text></View>
          <View style={styles.billBottom}><Text style={styles.amount}>{money(bill.total_amount ?? bill.net_amount)}</Text><Text style={styles.dueText}>{due > 0 ? `${money(due)} due` : 'Fully paid'}</Text></View>
        </LiquidBorderTouchable>;
      }) : <View style={styles.empty}><IndianRupee size={30} color={colors.subtle} /><Text style={styles.emptyTitle}>No bills yet</Text><Text style={styles.muted}>Your {kind} invoices will appear here.</Text></View>}
    </LiquidBorderScrollView>
    <AppModal visible={Boolean(selected)} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
      <View style={styles.modalBackdrop}><View style={styles.modalCard}>
        <View style={styles.modalHeader}><View style={styles.flex}><Text style={styles.modalTitle}>{selected?.bill_number || `Bill #${selected?.id}`}</Text><Text style={styles.muted}>{title} details</Text></View><TouchableOpacity onPress={() => setSelected(null)} style={styles.close}><X size={20} color={colors.muted} /></TouchableOpacity></View>
        {selected ? <LiquidBorderScrollView style={styles.detailScroll}>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Status</Text><Text style={styles.detailValue}>{billStatus(selected)}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Bill amount</Text><Text style={styles.detailValue}>{money(selected.total_amount ?? selected.net_amount)}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Paid</Text><Text style={styles.detailValue}>{money(selected.paid_amount)}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Outstanding</Text><Text style={[styles.detailValue, styles.due]}>{money(dueFor(selected))}</Text></View>
          <Text style={styles.itemsTitle}>Items</Text>
          {(selected.items || selected.medicines || []).length ? (selected.items || selected.medicines || []).map((item: any, index: number) => <View key={String(item.id || index)} style={styles.itemRow}><View style={styles.flex}><Text style={styles.itemName}>{item.service_name || item.medicine_name || item.name || 'Service'}</Text><Text style={styles.muted}>Qty {item.quantity || 1} · {money(item.unit_price)}</Text></View><Text style={styles.itemAmount}>{money(item.total_price ?? Number(item.quantity || 1) * Number(item.unit_price || 0))}</Text></View>) : <Text style={styles.muted}>Item details are not available for this bill.</Text>}
        </LiquidBorderScrollView> : null}
        {selected && dueFor(selected) > 0 ? <TouchableOpacity disabled={paying} style={[styles.payButton, paying && styles.disabled]} onPress={() => void payBill()}>{paying ? <ActivityIndicator color={colors.surface} /> : <CreditCard size={18} color={colors.surface} />}<Text style={styles.payText}>{paying ? 'Processing payment…' : `Pay ${money(dueFor(selected))}`}</Text></TouchableOpacity> : null}
      </View></View>
    </AppModal>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md }, flex: { flex: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.xs }, title: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.title, fontWeight: typography.weight.extrabold }, muted: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.sm, marginTop: 3 },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs }, summaryCard: { flex: 1, padding: 11, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border }, summaryLabel: { fontFamily: typography.family, color: colors.muted, fontSize: 9, fontWeight: typography.weight.extrabold, letterSpacing: 0.6 }, summaryValue: { fontFamily: typography.family, color: colors.text, fontSize: 15, fontWeight: typography.weight.extrabold, marginTop: spacing.tiny }, paid: { color: '#047857' }, due: { color: '#b45309' },
  loader: { marginTop: spacing.xxxl }, billCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 14, marginBottom: 2 }, billTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, billIcon: { width: 38, height: 38, borderRadius: radii.lg, backgroundColor: colors.mintBorder, alignItems: 'center', justifyContent: 'center' }, billNumber: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.extrabold }, status: { fontFamily: typography.family, overflow: 'hidden', borderRadius: 20, paddingHorizontal: spacing.sm, paddingVertical: 5, textTransform: 'capitalize', fontSize: typography.size.micro, fontWeight: typography.weight.extrabold }, statusPaid: { color: '#047857', backgroundColor: '#ecfdf5' }, statusDue: { color: '#b45309', backgroundColor: '#fffbeb' }, billBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.secondary, marginTop: spacing.md, paddingTop: 10 }, amount: { fontFamily: typography.family, color: colors.text, fontSize: 17, fontWeight: typography.weight.extrabold }, dueText: { fontFamily: typography.family, color: '#b45309', fontSize: typography.size.sm, fontWeight: typography.weight.bold },
  empty: { alignItems: 'center', padding: 28, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm, marginTop: spacing.sm }, emptyTitle: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.subtitle, fontWeight: typography.weight.extrabold },
  modalBackdrop: { flex: 1, backgroundColor: '#0f172a88', justifyContent: 'flex-end' }, modalCard: { maxHeight: '84%', backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 }, modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }, modalTitle: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.title, fontWeight: typography.weight.extrabold }, close: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }, detailScroll: { flexGrow: 0 }, detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.secondary }, detailLabel: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.caption }, detailValue: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.caption, fontWeight: typography.weight.bold }, itemsTitle: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.extrabold, marginTop: spacing.lg, marginBottom: 5 }, itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.secondary, paddingVertical: 10 }, itemName: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.caption, fontWeight: typography.weight.bold }, itemAmount: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.caption, fontWeight: typography.weight.bold }, payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, minHeight: 48, borderRadius: radii.lg, backgroundColor: colors.primaryDark, marginTop: 15 }, payText: { fontFamily: typography.family, color: colors.surface, fontSize: typography.size.body, fontWeight: typography.weight.extrabold }, disabled: { opacity: 0.6 },
});
