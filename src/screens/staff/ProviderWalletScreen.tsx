import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowDownLeft, ArrowUpRight, Landmark, RefreshCcw, WalletCards, X } from 'lucide-react-native';
import { AppModal } from '../../components/common/AppModal';
import { StaffHeader } from '../../components/common/StaffHeader';
import { Pagination } from '../../components/common/Pagination';
import { RequestState } from '../../components/common/RequestState';
import { useAuthContext } from '../../context/AuthContext';
import {
  createProviderWalletPayoutRequestApi,
  getProviderWalletPayoutRequestsApi,
  getProviderWalletTransactionsApi,
  ProviderPayoutRequest,
  ProviderWalletSummary,
  WalletTransaction,
} from '../../api/providerWalletApi';
import { showSuccessToast } from '../../utils/toast';

type PayoutMethod = 'bank_transfer' | 'upi';
type WalletData = {
  wallet: ProviderWalletSummary;
  transactions: WalletTransaction[];
  transactionCount: number;
  payoutRequests: ProviderPayoutRequest[];
};

const emptyForm = {
  amount: '',
  method: 'bank_transfer' as PayoutMethod,
  accountName: '',
  accountNumber: '',
  ifsc: '',
  upiId: '',
};

const humanize = (value?: string | null) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) || '—';
const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export function ProviderWalletScreen({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const { activeClinicId, user } = useAuthContext();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const loadWallet = useCallback(async (refresh = false) => {
    if (!activeClinicId) {
      setError('No clinic selected.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [transactionResult, payoutResult] = await Promise.all([
        getProviderWalletTransactionsApi(Number(activeClinicId), page, limit),
        getProviderWalletPayoutRequestsApi(Number(activeClinicId), 1, 10),
      ]);
      if (!transactionResult.success || !transactionResult.data?.wallet || !transactionResult.data.transactions) {
        throw new Error(transactionResult.message || 'Unable to load wallet details.');
      }
      if (!payoutResult.success || !payoutResult.data?.payoutRequests) {
        throw new Error(payoutResult.message || 'Unable to load transfer requests.');
      }
      setData({
        wallet: transactionResult.data.wallet,
        transactions: transactionResult.data.transactions.data || [],
        transactionCount: Number(transactionResult.data.transactions.total || 0),
        payoutRequests: payoutResult.data.payoutRequests.data || [],
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load wallet details right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeClinicId, page, limit]);

  useEffect(() => { void loadWallet(); }, [loadWallet]);
  useEffect(() => { setPage(1); }, [activeClinicId]);

  const submitTransfer = async () => {
    const amount = Number(form.amount);
    const available = Number(data?.wallet.available_balance || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      setTransferError('Enter a valid withdrawal amount.');
      return;
    }
    if (amount > available) {
      setTransferError('Requested amount is higher than available balance.');
      return;
    }
    if (form.method === 'bank_transfer' && (!form.accountName.trim() || !form.accountNumber.trim() || !form.ifsc.trim())) {
      setTransferError('Account holder name, account number, and IFSC are required.');
      return;
    }
    if (form.method === 'upi' && !form.upiId.trim()) {
      setTransferError('UPI ID is required.');
      return;
    }
    if (!activeClinicId) {
      setTransferError('No clinic selected.');
      return;
    }
    setSubmitting(true);
    setTransferError('');
    try {
      const result = await createProviderWalletPayoutRequestApi({
        clinic_id: Number(activeClinicId),
        requested_amount: amount,
        payout_method: form.method,
        account_holder_name: form.accountName.trim(),
        bank_account_number: form.accountNumber.trim(),
        ifsc_code: form.ifsc.trim().toUpperCase(),
        upi_id: form.upiId.trim(),
      });
      if (!result.success) throw new Error(result.message || 'Unable to submit transfer request.');
      setTransferOpen(false);
      setForm(emptyForm);
      showSuccessToast('Transfer requested', 'Your wallet transfer request has been submitted.');
      await loadWallet(true);
    } catch (submitError) {
      setTransferError(submitError instanceof Error ? submitError.message : 'Unable to submit transfer request.');
    } finally {
      setSubmitting(false);
    }
  };

  const isIndependentDoctor = String((user as any)?.doctor_type || '').trim().toLowerCase() === 'independent_doctor';
  const ownerLabel = isIndependentDoctor ? 'Independent Doctor Wallet' : 'Clinic Admin Wallet';

  return (
    <View style={styles.screen}>
      <StaffHeader onOpenDrawer={onOpenDrawer} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadWallet(true)} tintColor="#27A599" />}
      >
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>EARNINGS WALLET</Text>
            <Text style={styles.title}>{ownerLabel}</Text>
            <Text style={styles.subtitle}>Track settled consultation earnings, request bank transfers, and monitor payout status.</Text>
          </View>
          <View style={styles.heroActions}>
            <View style={styles.balanceBox}>
              <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
              <Text style={styles.balanceValue}>{formatCurrency(Number(data?.wallet.available_balance || 0))}</Text>
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, Number(data?.wallet.available_balance || 0) <= 0 && styles.disabledButton]}
              onPress={() => { setTransferError(''); setTransferOpen(true); }}
              disabled={Number(data?.wallet.available_balance || 0) <= 0}
              activeOpacity={0.8}
            >
              <Landmark size={17} color="#fff" />
              <Text style={styles.primaryButtonText}>Request Transfer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.refreshButton} onPress={() => void loadWallet(true)} disabled={refreshing}>
              {refreshing ? <ActivityIndicator size="small" color="#334155" /> : <RefreshCcw size={16} color="#334155" />}
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        <RequestState loading={loading && !data} error={error} onRetry={() => void loadWallet()} />
        {error && data ? <TouchableOpacity onPress={() => void loadWallet()} style={styles.errorBanner}><Text style={styles.errorText}>{error}  ·  Tap to retry</Text></TouchableOpacity> : null}

        <View style={styles.statsGrid}>
          <StatCard title="Available" value={data?.wallet.available_balance} icon={<WalletCards size={20} color="#27A599" />} tone="teal" />
          <StatCard title="Pending Transfer" value={data?.wallet.pending_balance} icon={<RefreshCcw size={20} color="#D97706" />} tone="amber" />
          <StatCard title="Total Credited" value={data?.wallet.total_credited} icon={<ArrowDownLeft size={20} color="#059669" />} tone="green" />
          <StatCard title="Total Debited" value={data?.wallet.total_debited} icon={<Landmark size={20} color="#0891B2" />} tone="blue" />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeading}>
            <View><Text style={styles.sectionTitle}>Payout Requests</Text><Text style={styles.sectionDescription}>Transfers move from available balance to pending until processed.</Text></View>
            <Text style={styles.countPill}>{data?.payoutRequests.length || 0} recent</Text>
          </View>
          {data?.payoutRequests.length ? data.payoutRequests.map(item => <PayoutCard key={item.id} item={item} />) : <Text style={styles.emptyText}>No payout requests found yet.</Text>}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeading}>
            <View><Text style={styles.sectionTitle}>Recent Wallet Transactions</Text><Text style={styles.sectionDescription}>Credits arrive from settled video consultation bills. Transfer requests appear here.</Text></View>
            <Text style={styles.countPill}>{data?.transactions.length || 0} entries</Text>
          </View>
          {data?.transactions.length ? data.transactions.map(item => <TransactionCard key={item.id} item={item} />) : <Text style={styles.emptyText}>No wallet transactions found yet.</Text>}
          <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil((data?.transactionCount || 0) / limit))} totalItems={data?.transactionCount || 0} pageSize={limit} itemLabel="transactions" onPageChange={setPage} onPageSizeChange={size => { setLimit(size); setPage(1); }} pageSizeOptions={[10, 20, 50]} />
        </View>
      </ScrollView>

      <AppModal visible={transferOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => { if (!submitting) setTransferOpen(false); }}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}><Text style={styles.modalTitle}>Request Wallet Transfer</Text><Text style={styles.modalSubtitle}>Submit a payout request to move money from your wallet to a bank account or UPI ID.</Text></View>
              <TouchableOpacity onPress={() => !submitting && setTransferOpen(false)} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close transfer form"><X size={20} color="#64748B" /></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalBody}>
              <Field label="Amount">
                <TextInput value={form.amount} onChangeText={amount => setForm(previous => ({ ...previous, amount }))} keyboardType="decimal-pad" placeholder="Enter amount" placeholderTextColor="#718096" style={[styles.input, styles.amountInput]} />
                <Text style={styles.availableHint}>Available: {formatCurrency(Number(data?.wallet.available_balance || 0))}</Text>
              </Field>
              <Field label="Payout Method">
                <View style={styles.methodRow}>
                  {(['bank_transfer', 'upi'] as PayoutMethod[]).map(method => <TouchableOpacity key={method} style={[styles.methodButton, form.method === method && styles.methodButtonActive]} onPress={() => { setTransferError(''); setForm(previous => ({ ...previous, method })); }}><Text style={[styles.methodText, form.method === method && styles.methodTextActive]}>{method === 'upi' ? 'Upi' : 'Bank Transfer'}</Text></TouchableOpacity>)}
                </View>
              </Field>
              {form.method === 'bank_transfer' ? <>
                <Field label="Account Holder Name"><TextInput value={form.accountName} onChangeText={accountName => setForm(previous => ({ ...previous, accountName }))} placeholder="Account holder name" placeholderTextColor="#718096" style={styles.input} /></Field>
                <Field label="Bank Account Number"><TextInput value={form.accountNumber} onChangeText={accountNumber => setForm(previous => ({ ...previous, accountNumber }))} keyboardType="number-pad" placeholder="Bank account number" placeholderTextColor="#718096" style={styles.input} /></Field>
                <Field label="IFSC Code"><TextInput value={form.ifsc} onChangeText={ifsc => setForm(previous => ({ ...previous, ifsc: ifsc.toUpperCase() }))} autoCapitalize="characters" placeholder="IFSC code" placeholderTextColor="#718096" style={styles.input} /></Field>
              </> : <Field label="UPI ID"><TextInput value={form.upiId} onChangeText={upiId => setForm(previous => ({ ...previous, upiId }))} autoCapitalize="none" placeholder="name@bank" placeholderTextColor="#718096" style={styles.input} /></Field>}
              {transferError ? <Text style={styles.formError}>{transferError}</Text> : null}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.primaryButton, styles.submitButton, submitting && styles.disabledButton]} onPress={() => void submitTransfer()} disabled={submitting}>
                {submitting ? <ActivityIndicator size="small" color="#fff" /> : null}
                <Text style={styles.primaryButtonText}>{submitting ? 'Submitting...' : 'Submit Request'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setForm(emptyForm); setTransferError(''); setTransferOpen(false); }} disabled={submitting}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </AppModal>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text>{children}</View>;
}

function StatCard({ title, value, icon, tone }: { title: string; value?: number | string; icon: React.ReactNode; tone: 'teal' | 'amber' | 'green' | 'blue' }) {
  return <View style={styles.statCard}><View style={[styles.statIcon, styles[`tone_${tone}`]]}>{icon}</View><Text style={styles.statLabel}>{title}</Text><Text style={styles.statValue}>{formatCurrency(Number(value || 0))}</Text></View>;
}

function PayoutCard({ item }: { item: ProviderPayoutRequest }) {
  const destination = item.payout_method === 'upi' ? item.upi_id || '—' : item.bank_account_number ? `A/C ${item.bank_account_number}` : '—';
  return <View style={styles.listCard}><View style={styles.listTop}><Text style={styles.listTitle}>{humanize(item.payout_method)}</Text><Text style={styles.statusPill}>{humanize(item.request_status)}</Text></View><Text style={styles.listMeta}>{destination}</Text><View style={styles.listBottom}><Text style={styles.listAmount}>{formatCurrency(Number(item.net_amount || item.requested_amount || 0))}</Text><Text style={styles.listMeta}>{formatDateTime(item.requested_at)}</Text></View></View>;
}

function TransactionCard({ item }: { item: WalletTransaction }) {
  const isCredit = item.direction === 'in';
  return <View style={styles.listCard}><View style={styles.listTop}><View style={styles.transactionTitleRow}><View style={[styles.transactionIcon, isCredit ? styles.creditIcon : styles.debitIcon]}>{isCredit ? <ArrowDownLeft size={16} color="#059669" /> : <ArrowUpRight size={16} color="#D97706" />}</View><View style={styles.transactionTitleCopy}><Text style={styles.listTitle}>{humanize(item.transaction_type)}</Text><Text style={styles.listMeta}>{item.description || 'Wallet entry'}</Text></View></View><Text style={[styles.transactionAmount, isCredit ? styles.creditText : styles.debitText]}>{isCredit ? '+' : '-'}{formatCurrency(Number(item.amount || 0))}</Text></View><View style={styles.transactionDetails}><Text style={styles.listMeta}>{humanize(item.reference_type)}{item.reference_id ? ` · #${item.reference_id}` : ''}</Text><Text style={styles.listMeta}>{humanize(item.status)}</Text><Text style={styles.listMeta}>Balance {formatCurrency(Number(item.balance_after || 0))}</Text><Text style={styles.listMeta}>{formatDateTime(item.created_at)}</Text></View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 36, gap: 16 },
  hero: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, gap: 16 },
  heroCopy: { gap: 5 }, eyebrow: { fontFamily: 'Inter', color: '#27A599', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  title: { fontFamily: 'Inter', color: '#0F172A', fontSize: 20, fontWeight: '800' }, subtitle: { fontFamily: 'Inter', color: '#64748B', fontSize: 14, lineHeight: 19 },
  heroActions: { gap: 10 }, balanceBox: { backgroundColor: '#F0FDFA', borderColor: '#CCFBF1', borderWidth: 1, borderRadius: 14, padding: 14 },
  balanceLabel: { fontFamily: 'Inter', color: '#64748B', fontSize: 10, fontWeight: '700', letterSpacing: 1 }, balanceValue: { fontFamily: 'Inter', color: '#0F172A', fontSize: 28, fontWeight: '800', marginTop: 4 },
  primaryButton: { minHeight: 46, backgroundColor: '#27A599', borderRadius: 11, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, primaryButtonText: { fontFamily: 'Inter', color: '#fff', fontSize: 14, fontWeight: '700' },
  disabledButton: { opacity: 0.5 }, refreshButton: { minHeight: 42, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#fff', borderRadius: 10, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, refreshText: { fontFamily: 'Inter', color: '#334155', fontWeight: '600', fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, statCard: { width: '48%', flexGrow: 1, minWidth: 145, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 15, padding: 13, gap: 6 },
  statIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, tone_teal: { backgroundColor: '#CCFBF1' }, tone_amber: { backgroundColor: '#FEF3C7' }, tone_green: { backgroundColor: '#D1FAE5' }, tone_blue: { backgroundColor: '#CFFAFE' }, statLabel: { fontFamily: 'Inter', color: '#64748B', fontSize: 12, fontWeight: '600' }, statValue: { fontFamily: 'Inter', color: '#0F172A', fontSize: 17, fontWeight: '800' },
  sectionCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, gap: 11 }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }, sectionTitle: { fontFamily: 'Inter', color: '#0F172A', fontSize: 18, fontWeight: '800' }, sectionDescription: { fontFamily: 'Inter', color: '#64748B', fontSize: 12, lineHeight: 17, marginTop: 4, flexShrink: 1 }, countPill: { fontFamily: 'Inter', color: '#475569', backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: '700', overflow: 'hidden' },
  listCard: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, gap: 7 }, listTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, listTitle: { fontFamily: 'Inter', color: '#0F172A', fontSize: 13, fontWeight: '700', flexShrink: 1 }, listMeta: { fontFamily: 'Inter', color: '#64748B', fontSize: 11, flexShrink: 1 }, listBottom: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' }, listAmount: { fontFamily: 'Inter', color: '#0F172A', fontWeight: '800', fontSize: 14 }, statusPill: { fontFamily: 'Inter', color: '#475569', backgroundColor: '#F1F5F9', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, fontSize: 10, fontWeight: '700', overflow: 'hidden' },
  transactionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 }, transactionTitleCopy: { flex: 1, gap: 3 }, transactionIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, creditIcon: { backgroundColor: '#D1FAE5' }, debitIcon: { backgroundColor: '#FEF3C7' }, transactionAmount: { fontFamily: 'Inter', fontSize: 13, fontWeight: '800' }, creditText: { color: '#059669' }, debitText: { color: '#D97706' }, transactionDetails: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 }, emptyText: { fontFamily: 'Inter', textAlign: 'center', color: '#64748B', fontSize: 13, paddingVertical: 20 },
  errorBanner: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12 }, errorText: { fontFamily: 'Inter', color: '#B91C1C', fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'center', padding: 16 }, modalCard: { backgroundColor: '#fff', borderRadius: 14, maxHeight: '92%', overflow: 'hidden' }, modalHeader: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 12, alignItems: 'center' }, modalHeaderCopy: { alignItems: 'center', gap: 5, paddingHorizontal: 12 }, modalTitle: { fontFamily: 'Inter', color: '#0F172A', fontSize: 20, fontWeight: '700', textAlign: 'center' }, modalSubtitle: { fontFamily: 'Inter', color: '#64748B', fontSize: 12, lineHeight: 18, textAlign: 'center' }, closeButton: { position: 'absolute', right: 12, top: 11, padding: 3 }, modalBody: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 16, gap: 14 }, field: { gap: 6 }, fieldLabel: { fontFamily: 'Inter', color: '#1E293B', fontWeight: '600', fontSize: 14 }, input: { fontFamily: 'Inter', minHeight: 40, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, color: '#0F172A', backgroundColor: '#F8FAFC', fontSize: 14 }, amountInput: { borderColor: '#27A599', borderWidth: 1.5 }, availableHint: { fontFamily: 'Inter', color: '#64748B', fontSize: 10, marginTop: -2 }, methodRow: { flexDirection: 'row', gap: 10 }, methodButton: { flex: 1, minHeight: 40, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', borderRadius: 10, justifyContent: 'center', alignItems: 'center' }, methodButtonActive: { backgroundColor: '#27A99D', borderColor: '#27A99D' }, methodText: { fontFamily: 'Inter', color: '#1E293B', fontSize: 12, fontWeight: '600' }, methodTextActive: { color: '#fff' }, formError: { fontFamily: 'Inter', color: '#B91C1C', fontSize: 12, lineHeight: 17 }, modalFooter: { flexDirection: 'column', gap: 0, paddingHorizontal: 22, paddingTop: 0, paddingBottom: 20 }, submitButton: { width: '100%', minHeight: 40, borderRadius: 10 }, cancelButton: { width: '100%', minHeight: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', borderRadius: 10 }, cancelText: { fontFamily: 'Inter', color: '#1E293B', fontSize: 12, fontWeight: '600' },
});
