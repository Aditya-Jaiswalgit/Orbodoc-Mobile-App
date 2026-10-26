import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppModal } from './AppModal';
import { useAuthContext } from '../../context/AuthContext';
import RazorpayCheckout from 'react-native-razorpay';
import { createWalletPayoutRequestApi, createWalletRechargeOrderApi, getPatientWalletBalanceApi, getWalletPayoutRequestsApi, verifyWalletRechargeApi, WalletPayoutRequest } from '../../api/videoServicesApi';
import { navigatePatientScreen } from '../../utils/patientNavigationEvents';
import { ChevronDown, ChevronUp, IndianRupee, Key, LogOut, Menu, Plus, ShieldCheck, User, WalletCards } from 'lucide-react-native';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { publishPatientWalletBalance } from '../../utils/patientWalletEvents';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { NotificationBell } from './NotificationBell';

interface PatientHeaderProps {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  unreadCount?: number;
}

const formatBalance = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(Number.isFinite(value) ? value : 0);

export const PatientHeader: React.FC<PatientHeaderProps> = ({ onOpenDrawer, onOpenNotifications }) => {
  const { user, token, logout, role, permissionsMap = {} } = useAuthContext();
  const canViewNotifications = !permissionsMap || Object.keys(permissionsMap).length === 0 ||
    canUseStaffScreen(role || 'patient', permissionsMap, 'notifications', 'view');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletMode, setWalletMode] = useState<'recharge' | 'transfer'>('recharge');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState('500');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferMethod, setTransferMethod] = useState<'bank_transfer' | 'upi'>('bank_transfer');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [payoutRequests, setPayoutRequests] = useState<WalletPayoutRequest[]>([]);
  const [walletBusy, setWalletBusy] = useState(false);
  const statusBarHeight = StatusBar.currentHeight || 36;
  const patientName = user?.fullName || user?.full_name || 'Patient';
  const initials = patientName.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    let active = true;
    if (!token) return () => { active = false; };
    getPatientWalletBalanceApi(token).then(result => {
      if (active && result.success && result.data?.balance != null) setWalletBalance(Number(result.data.balance));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [token]);

  const refreshWallet = async () => {
    if (!token) return;
    const [balanceResult, requestsResult] = await Promise.all([
      getPatientWalletBalanceApi(token), getWalletPayoutRequestsApi(token),
    ]);
    if (balanceResult.success && balanceResult.data?.balance != null) setWalletBalance(Number(balanceResult.data.balance));
    if (requestsResult.success) setPayoutRequests(requestsResult.data?.data || []);
  };

  const rechargeWallet = async () => {
    const amount = Number(rechargeAmount);
    if (!token || !Number.isInteger(amount) || amount < 1) {
      showErrorToast('Invalid recharge amount', 'Enter a whole amount of at least ₹1.');
      return;
    }
    setWalletBusy(true);
    try {
      const orderResult = await createWalletRechargeOrderApi(token, amount);
      const order = orderResult.data;
      if (!orderResult.success || !order?.order_id || !order.key_id) throw new Error(orderResult.message || 'Unable to create payment order.');
      const payment = await RazorpayCheckout.open({
        key: order.key_id, amount: String(order.amount), currency: order.currency || 'INR', order_id: order.order_id,
        name: 'OrboDoc', description: 'Patient wallet recharge',
        prefill: { name: user?.full_name || user?.fullName, email: user?.email, contact: user?.phone },
        theme: { color: '#1d7c72' },
      });
      const verifyResult = await verifyWalletRechargeApi(token, payment);
      if (!verifyResult.success) throw new Error(verifyResult.message || 'Payment verification failed.');
      setWalletBalance(Number(verifyResult.data?.balance || 0));
      publishPatientWalletBalance(Number(verifyResult.data?.balance || 0));
      setWalletModalOpen(false);
      showSuccessToast('Wallet recharged', `₹${amount.toLocaleString('en-IN')} added successfully.`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Payment was cancelled or could not be verified.';
      showErrorToast('Recharge failed', message);
    } finally {
      setWalletBusy(false);
    }
  };

  const requestWalletTransfer = async () => {
    const amount = Number(transferAmount);
    if (!token || !Number.isFinite(amount) || amount <= 0) { showErrorToast('Invalid amount', 'Enter a valid transfer amount.'); return; }
    if (amount > Number(walletBalance || 0)) { showErrorToast('Insufficient balance', 'Transfer amount is greater than your wallet balance.'); return; }
    if (transferMethod === 'bank_transfer' && (!accountName.trim() || !accountNumber.trim() || !ifsc.trim())) {
      showErrorToast('Bank details required', 'Enter account holder name, bank account number, and IFSC code.'); return;
    }
    if (transferMethod === 'upi' && !upiId.trim()) { showErrorToast('UPI ID required', 'Enter your UPI ID.'); return; }
    setWalletBusy(true);
    const result = await createWalletPayoutRequestApi(token, {
      amount, payout_method: transferMethod, account_holder_name: accountName.trim(),
      bank_account_number: accountNumber.trim(), ifsc_code: ifsc.trim().toUpperCase(), upi_id: upiId.trim(),
    });
    setWalletBusy(false);
    if (!result.success) { showErrorToast('Transfer failed', result.message); return; }
    if (result.data?.balance != null) {
      setWalletBalance(Number(result.data.balance));
      publishPatientWalletBalance(Number(result.data.balance));
    }
    setTransferAmount(''); setAccountName(''); setAccountNumber(''); setIfsc(''); setUpiId('');
    await refreshWallet();
    showSuccessToast('Transfer request submitted', 'Your wallet transfer request has been created.');
  };

  return (
    <View style={styles.headerContainer}>
      <StatusBar barStyle="dark-content" />
      {Platform.OS === 'android' && <View style={{ height: statusBarHeight, backgroundColor: '#FFFFFF' }} />}
      <View style={styles.topHeaderBar}>
        <View style={styles.leftGroup}>
          <TouchableOpacity style={styles.menuButton} onPress={onOpenDrawer} activeOpacity={0.7} accessibilityLabel="Open navigation">
            <Menu size={18} color="#334155" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerRightGroup}>
          <TouchableOpacity style={styles.walletCircleBtn} onPress={() => { setWalletModalOpen(true); void refreshWallet(); }} activeOpacity={0.8} accessibilityLabel="Open wallet">
            <WalletCards size={16} color="#1D7C72" />
            <View style={styles.walletPlusBadge}><Plus size={11} color="#FFFFFF" strokeWidth={3} /></View>
          </TouchableOpacity>
          {canViewNotifications ? <NotificationBell
            onOpenAll={() => onOpenNotifications ? onOpenNotifications() : navigatePatientScreen('notifications')}
            onNavigate={navigatePatientScreen}
          /> : null}
          <TouchableOpacity
            style={styles.avatarPillBtn}
            onPress={() => setProfileMenuOpen(open => !open)}
            activeOpacity={0.8}
            accessibilityLabel="Open profile menu">
            <View style={styles.avatarCircle}><Text style={styles.avatarInitials}>{initials || 'P'}</Text></View>
            {profileMenuOpen ? <ChevronUp size={14} color="#27A599" /> : <ChevronDown size={14} color="#64748B" />}
          </TouchableOpacity>
        </View>
      </View>

      <AppModal visible={profileMenuOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setProfileMenuOpen(false)}>
        <View style={styles.profileMenuOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setProfileMenuOpen(false)} accessibilityLabel="Close profile menu" />
          <View style={[styles.profileMenuCard, { top: statusBarHeight + 52 }]}>
            <TouchableOpacity style={styles.profileMenuHeader} onPress={() => { setProfileMenuOpen(false); navigatePatientScreen('profile'); }} activeOpacity={0.7}>
              <Text numberOfLines={1} style={styles.profileMenuName}>{patientName}</Text>
              <Text style={styles.profileMenuSub}>Profile settings</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.profileMenuItem} onPress={() => { setProfileMenuOpen(false); navigatePatientScreen('profile'); }} activeOpacity={0.7}>
              <User size={16} color="#27A599" /><Text style={styles.menuItemTitle}>My Profile</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.profileMenuItem} onPress={() => { setProfileMenuOpen(false); navigatePatientScreen('change_password'); }} activeOpacity={0.7}>
              <Key size={16} color="#D97706" /><Text style={styles.menuItemTitle}>Change Password</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.profileMenuItem} onPress={() => { setProfileMenuOpen(false); logout(); }} activeOpacity={0.7}>
              <LogOut size={16} color="#EF4444" /><Text style={[styles.menuItemTitle, { color: '#EF4444' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppModal>

      <AppModal visible={walletModalOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => { if (!walletBusy) setWalletModalOpen(false); }}>
        <View style={styles.walletOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { if (!walletBusy) setWalletModalOpen(false); }} activeOpacity={1} accessibilityLabel="Close wallet" />
          <View style={styles.walletDialog}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.walletDialogContent}>
              <View style={styles.walletDialogHeader}>
                <View style={styles.walletTitleIcon}><WalletCards size={20} color="#1D7C72" /></View>
                <View style={styles.balanceInfo}><Text style={styles.balanceLabel}>Available balance</Text><Text style={styles.balanceAmount}>{walletBalance == null ? '—' : formatBalance(walletBalance)}</Text></View>
                <TouchableOpacity onPress={() => !walletBusy && setWalletModalOpen(false)} style={styles.walletClose} accessibilityLabel="Close wallet dialog"><Text style={styles.walletCloseText}>×</Text></TouchableOpacity>
              </View>
              <Text style={styles.walletTitle}>Recharge wallet</Text>
              <Text style={styles.walletDescription}>Choose an amount, then continue to secure Razorpay checkout.</Text>
              <View style={styles.walletTabs}>
                <TouchableOpacity onPress={() => setWalletMode('recharge')} style={[styles.walletTab, walletMode === 'recharge' && styles.walletTabActive]}><Text style={[styles.walletTabText, walletMode === 'recharge' && styles.walletTabTextActive]}>Recharge</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { setWalletMode('transfer'); void refreshWallet(); }} style={[styles.walletTab, walletMode === 'transfer' && styles.walletTabActive]}><Text style={[styles.walletTabText, walletMode === 'transfer' && styles.walletTabTextActive]}>Transfer</Text></TouchableOpacity>
              </View>
              {walletMode === 'recharge' ? <>
                <Text style={styles.fieldLabel}>Recharge amount <Text style={styles.required}>*</Text></Text>
                <View style={styles.amountInputWrap}><Text style={styles.rupeeSymbol}>₹</Text><TextInput value={rechargeAmount} onChangeText={value => setRechargeAmount(value.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="Enter amount" style={styles.amountInput} /></View>
                <View style={styles.amountPresets}>{[500, 1000, 2000, 5000].map(amount => <TouchableOpacity key={amount} onPress={() => setRechargeAmount(String(amount))} style={[styles.presetButton, Number(rechargeAmount) === amount && styles.presetButtonActive]}><Text style={[styles.presetText, Number(rechargeAmount) === amount && styles.presetTextActive]}>Rs {amount.toLocaleString('en-IN')}</Text></TouchableOpacity>)}</View>
                <View style={styles.secureCard}><View style={styles.secureIcon}><ShieldCheck size={17} color="#FFFFFF" /></View><View style={{ flex: 1 }}><Text style={styles.secureTitle}>Secure Razorpay checkout</Text><Text style={styles.secureText}>UPI, cards, net banking and supported wallets will be available on the next screen.</Text></View></View>
                <TouchableOpacity style={[styles.walletPrimaryButton, walletBusy && styles.disabled]} onPress={rechargeWallet} disabled={walletBusy}>{walletBusy ? <ActivityIndicator color="#FFFFFF" /> : <><Plus size={17} color="#FFFFFF" /><Text style={styles.walletPrimaryText}>Continue to Razorpay</Text></>}</TouchableOpacity>
              </> : <>
                <Text style={styles.fieldLabel}>Transfer amount</Text>
                <View style={styles.amountInputWrap}><Text style={styles.rupeeSymbol}>₹</Text><TextInput value={transferAmount} onChangeText={setTransferAmount} keyboardType="decimal-pad" placeholder="Enter transfer amount" style={styles.amountInput} /></View>
                <View style={styles.methodRow}>{(['bank_transfer', 'upi'] as const).map(method => <TouchableOpacity key={method} onPress={() => setTransferMethod(method)} style={[styles.methodButton, transferMethod === method && styles.presetButtonActive]}><Text style={[styles.presetText, transferMethod === method && styles.presetTextActive]}>{method === 'upi' ? 'UPI' : 'Bank Transfer'}</Text></TouchableOpacity>)}</View>
                {transferMethod === 'bank_transfer' ? <>
                  <TextInput value={accountName} onChangeText={setAccountName} placeholder="Account holder name" style={styles.transferInput} />
                  <TextInput value={accountNumber} onChangeText={setAccountNumber} placeholder="Bank account number" keyboardType="number-pad" style={styles.transferInput} />
                  <TextInput value={ifsc} onChangeText={value => setIfsc(value.toUpperCase())} placeholder="IFSC code" autoCapitalize="characters" style={styles.transferInput} />
                </> : <TextInput value={upiId} onChangeText={setUpiId} placeholder="UPI ID (name@bank)" autoCapitalize="none" style={styles.transferInput} />}
                <Text style={styles.secureText}>Recent transfer requests</Text>
                {payoutRequests.length ? payoutRequests.map(request => <View key={request.id} style={styles.payoutRow}><Text style={styles.payoutAmount}>{formatBalance(request.requested_amount)}</Text><Text style={styles.payoutStatus}>{request.request_status}</Text></View>) : <Text style={styles.emptyPayout}>No transfer requests yet.</Text>}
                <TouchableOpacity style={[styles.walletPrimaryButton, walletBusy && styles.disabled]} onPress={requestWalletTransfer} disabled={walletBusy}>{walletBusy ? <ActivityIndicator color="#FFFFFF" /> : <><IndianRupee size={16} color="#FFFFFF" /><Text style={styles.walletPrimaryText}>Request Transfer</Text></>}</TouchableOpacity>
              </>}
              <TouchableOpacity style={styles.walletCancelButton} onPress={() => !walletBusy && setWalletModalOpen(false)} disabled={walletBusy}><Text style={styles.walletCancelText}>Cancel</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </AppModal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', elevation: 3, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, zIndex: 10 },
  topHeaderBar: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 },
  leftGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  menuButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  headerRightGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  walletCircleBtn: { width: 50, height: 38, borderRadius: 20, backgroundColor: '#E6FFFA', borderWidth: 1, borderColor: '#99F6E4', alignItems: 'center', justifyContent: 'center' },
  walletPlusBadge: { position: 'absolute', top: -3, right: -2, width: 15, height: 15, borderRadius: 8, backgroundColor: '#F9A91F', borderWidth: 1, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  avatarPillBtn: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 5, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  avatarCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#27A599', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontFamily: 'Inter', color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  profileMenuOverlay: { flex: 1, backgroundColor: 'transparent' },
  profileMenuCard: { position: 'absolute', right: 12, width: 240, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', elevation: 12, shadowColor: '#0F172A', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  profileMenuHeader: { paddingHorizontal: 9, paddingVertical: 8 },
  profileMenuName: { fontFamily: 'Inter', color: '#0F172A', fontWeight: '800', fontSize: 14 },
  profileMenuSub: { fontFamily: 'Inter', color: '#64748B', fontSize: 11, marginTop: 3 },
  menuDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },
  profileMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40, paddingHorizontal: 9 },
  menuItemTitle: { fontFamily: 'Inter', color: '#334155', fontSize: 13, fontWeight: '700' },
  walletOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.78)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  walletDialog: { width: '100%', maxWidth: 460, maxHeight: '90%', borderRadius: 12, backgroundColor: '#F8FAFC', overflow: 'hidden', borderWidth: 1, borderColor: '#CBD5E1', elevation: 22 },
  walletDialogContent: { padding: 16, paddingBottom: 18 },
  walletDialogHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', marginBottom: 14 },
  walletTitleIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#CCFBF1', alignItems: 'center', justifyContent: 'center' },
  balanceInfo: { flex: 1, alignItems: 'flex-end' },
  balanceLabel: { fontFamily: 'Inter', color: '#64748B', fontSize: 11, fontWeight: '500' },
  balanceAmount: { fontFamily: 'Inter', color: '#1E293B', fontWeight: '800', fontSize: 20, marginTop: 2 },
  walletClose: { position: 'absolute', top: -8, right: -8, padding: 4 },
  walletCloseText: { fontFamily: 'Inter', color: '#64748B', fontSize: 25, lineHeight: 26 },
  walletTitle: { fontFamily: 'Inter', color: '#1E293B', fontSize: 19, fontWeight: '800' },
  walletDescription: { fontFamily: 'Inter', color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 14 },
  walletTabs: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 4, borderRadius: 12, marginBottom: 18 },
  walletTab: { flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  walletTabActive: { backgroundColor: '#26A69A' },
  walletTabText: { fontFamily: 'Inter', color: '#334155', fontWeight: '600', fontSize: 12 },
  walletTabTextActive: { color: '#FFFFFF', fontWeight: '800' },
  fieldLabel: { fontFamily: 'Inter', color: '#1E293B', fontWeight: '600', fontSize: 14, marginBottom: 7 },
  required: { color: '#DC2626' },
  amountInputWrap: { height: 46, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 11, backgroundColor: '#F8FAFC', paddingHorizontal: 12 },
  rupeeSymbol: { fontFamily: 'Inter', color: '#64748B', fontSize: 16, marginRight: 8 },
  amountInput: { fontFamily: 'Inter', flex: 1, height: 44, color: '#1E293B', fontSize: 16, fontWeight: '600' },
  amountPresets: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  presetButton: { flexBasis: '48%', flexGrow: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC' },
  presetButtonActive: { backgroundColor: '#26A69A', borderColor: '#26A69A' },
  presetText: { fontFamily: 'Inter', color: '#334155', fontSize: 11, fontWeight: '600' },
  presetTextActive: { color: '#FFFFFF', fontWeight: '800' },
  secureCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13, marginTop: 17, marginBottom: 17, borderRadius: 11, borderWidth: 1, borderColor: '#CCFBF1', backgroundColor: '#F0FDFA' },
  secureIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#1D7C72', alignItems: 'center', justifyContent: 'center' },
  secureTitle: { fontFamily: 'Inter', color: '#1E293B', fontSize: 12, fontWeight: '700' },
  secureText: { fontFamily: 'Inter', color: '#64748B', fontSize: 11, lineHeight: 17, marginTop: 3 },
  walletPrimaryButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 11, backgroundColor: '#1D7C72', marginTop: 15 },
  walletPrimaryText: { fontFamily: 'Inter', color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  walletCancelButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, marginTop: 4, backgroundColor: '#F8FAFC' },
  walletCancelText: { fontFamily: 'Inter', color: '#1E293B', fontWeight: '600', fontSize: 12 },
  disabled: { opacity: 0.55 },
  methodRow: { flexDirection: 'row', gap: 8, marginVertical: 10 },
  methodButton: { flex: 1, minHeight: 38, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  transferInput: { fontFamily: 'Inter', height: 42, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 9, paddingHorizontal: 11, color: '#1E293B', marginTop: 8, backgroundColor: '#FFFFFF', fontSize: 12 },
  payoutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  payoutAmount: { fontFamily: 'Inter', color: '#334155', fontWeight: '700', fontSize: 12 },
  payoutStatus: { fontFamily: 'Inter', color: '#1D7C72', textTransform: 'capitalize', fontWeight: '700', fontSize: 11 },
  emptyPayout: { fontFamily: 'Inter', color: '#64748B', fontSize: 11, paddingVertical: 8 },
});

export default PatientHeader;
