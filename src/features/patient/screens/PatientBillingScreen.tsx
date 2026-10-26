import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { CreditCard, FileText, IndianRupee, Receipt, X } from 'lucide-react-native';
import { PatientHeader } from '../../../components/common/PatientHeader';
import { PatientPageHeading } from '../../../components/common/PatientPageHeading';
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
        theme: { color: '#1d7c72' },
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
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadBills(true)} tintColor="#1d7c72" />}>
      <PatientPageHeading title={title} subtitle="Your invoices and payment history" icon={<Receipt size={21} color="#1d7c72" />} />
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}><Text style={styles.summaryLabel}>BILLED</Text><Text style={styles.summaryValue}>{money(totals.billed)}</Text></View>
        <View style={styles.summaryCard}><Text style={styles.summaryLabel}>PAID</Text><Text style={[styles.summaryValue, styles.paid]}>{money(totals.paid)}</Text></View>
        <View style={styles.summaryCard}><Text style={styles.summaryLabel}>DUE</Text><Text style={[styles.summaryValue, styles.due]}>{money(totals.due)}</Text></View>
      </View>
      {loading ? <ActivityIndicator color="#1d7c72" style={styles.loader} /> : bills.length ? bills.map(bill => {
        const due = dueFor(bill);
        return <TouchableOpacity key={String(bill.id)} activeOpacity={0.8} style={styles.billCard} onPress={() => void openBill(bill)}>
          <View style={styles.billTop}><View style={styles.billIcon}><FileText size={18} color="#1d7c72" /></View><View style={styles.flex}><Text style={styles.billNumber}>{bill.bill_number || `Bill #${bill.id}`}</Text><Text style={styles.muted}>{bill.created_at ? new Date(bill.created_at).toLocaleDateString('en-IN') : 'Date unavailable'}{bill.clinic_name ? ` · ${bill.clinic_name}` : ''}</Text></View><Text style={[styles.status, due <= 0 ? styles.statusPaid : styles.statusDue]}>{billStatus(bill)}</Text></View>
          <View style={styles.billBottom}><Text style={styles.amount}>{money(bill.total_amount ?? bill.net_amount)}</Text><Text style={styles.dueText}>{due > 0 ? `${money(due)} due` : 'Fully paid'}</Text></View>
        </TouchableOpacity>;
      }) : <View style={styles.empty}><IndianRupee size={30} color="#94a3b8" /><Text style={styles.emptyTitle}>No bills yet</Text><Text style={styles.muted}>Your {kind} invoices will appear here.</Text></View>}
    </ScrollView>
    <AppModal visible={Boolean(selected)} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
      <View style={styles.modalBackdrop}><View style={styles.modalCard}>
        <View style={styles.modalHeader}><View style={styles.flex}><Text style={styles.modalTitle}>{selected?.bill_number || `Bill #${selected?.id}`}</Text><Text style={styles.muted}>{title} details</Text></View><TouchableOpacity onPress={() => setSelected(null)} style={styles.close}><X size={20} color="#475569" /></TouchableOpacity></View>
        {selected ? <ScrollView style={styles.detailScroll}>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Status</Text><Text style={styles.detailValue}>{billStatus(selected)}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Bill amount</Text><Text style={styles.detailValue}>{money(selected.total_amount ?? selected.net_amount)}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Paid</Text><Text style={styles.detailValue}>{money(selected.paid_amount)}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Outstanding</Text><Text style={[styles.detailValue, styles.due]}>{money(dueFor(selected))}</Text></View>
          <Text style={styles.itemsTitle}>Items</Text>
          {(selected.items || selected.medicines || []).length ? (selected.items || selected.medicines || []).map((item: any, index: number) => <View key={String(item.id || index)} style={styles.itemRow}><View style={styles.flex}><Text style={styles.itemName}>{item.service_name || item.medicine_name || item.name || 'Service'}</Text><Text style={styles.muted}>Qty {item.quantity || 1} · {money(item.unit_price)}</Text></View><Text style={styles.itemAmount}>{money(item.total_price ?? Number(item.quantity || 1) * Number(item.unit_price || 0))}</Text></View>) : <Text style={styles.muted}>Item details are not available for this bill.</Text>}
        </ScrollView> : null}
        {selected && dueFor(selected) > 0 ? <TouchableOpacity disabled={paying} style={[styles.payButton, paying && styles.disabled]} onPress={() => void payBill()}>{paying ? <ActivityIndicator color="#fff" /> : <CreditCard size={18} color="#fff" />}<Text style={styles.payText}>{paying ? 'Processing payment…' : `Pay ${money(dueFor(selected))}`}</Text></TouchableOpacity> : null}
      </View></View>
    </AppModal>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' }, content: { padding: 16, paddingBottom: 32, gap: 12 }, flex: { flex: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }, title: { fontFamily: 'Inter', color: '#0f172a', fontSize: 20, fontWeight: '800' }, muted: { fontFamily: 'Inter', color: '#64748b', fontSize: 12, marginTop: 3 },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 4 }, summaryCard: { flex: 1, padding: 11, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }, summaryLabel: { fontFamily: 'Inter', color: '#64748b', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 }, summaryValue: { fontFamily: 'Inter', color: '#0f172a', fontSize: 15, fontWeight: '800', marginTop: 6 }, paid: { color: '#047857' }, due: { color: '#b45309' },
  loader: { marginTop: 32 }, billCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 15, padding: 14, marginBottom: 2 }, billTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, billIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' }, billNumber: { fontFamily: 'Inter', color: '#0f172a', fontSize: 14, fontWeight: '800' }, status: { fontFamily: 'Inter', overflow: 'hidden', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5, textTransform: 'capitalize', fontSize: 10, fontWeight: '800' }, statusPaid: { color: '#047857', backgroundColor: '#ecfdf5' }, statusDue: { color: '#b45309', backgroundColor: '#fffbeb' }, billBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 12, paddingTop: 10 }, amount: { fontFamily: 'Inter', color: '#0f172a', fontSize: 17, fontWeight: '800' }, dueText: { fontFamily: 'Inter', color: '#b45309', fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', padding: 28, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 8, marginTop: 8 }, emptyTitle: { fontFamily: 'Inter', color: '#0f172a', fontSize: 16, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: '#0f172a88', justifyContent: 'flex-end' }, modalCard: { maxHeight: '84%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 }, modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }, modalTitle: { fontFamily: 'Inter', color: '#0f172a', fontSize: 20, fontWeight: '800' }, close: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }, detailScroll: { flexGrow: 0 }, detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }, detailLabel: { fontFamily: 'Inter', color: '#64748b', fontSize: 13 }, detailValue: { fontFamily: 'Inter', color: '#0f172a', fontSize: 13, fontWeight: '700' }, itemsTitle: { fontFamily: 'Inter', color: '#0f172a', fontSize: 14, fontWeight: '800', marginTop: 16, marginBottom: 5 }, itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 10 }, itemName: { fontFamily: 'Inter', color: '#334155', fontSize: 13, fontWeight: '700' }, itemAmount: { fontFamily: 'Inter', color: '#0f172a', fontSize: 13, fontWeight: '700' }, payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, minHeight: 48, borderRadius: 12, backgroundColor: '#1d7c72', marginTop: 15 }, payText: { fontFamily: 'Inter', color: '#fff', fontSize: 14, fontWeight: '800' }, disabled: { opacity: 0.6 },
});
