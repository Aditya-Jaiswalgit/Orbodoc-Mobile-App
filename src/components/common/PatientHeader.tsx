import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LiquidBorderScrollView } from './LiquidBorderScrollView';
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
import { colors, radii, shadows, spacing, typography } from '../../theme/tokens';

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
        theme: { color: colors.primaryDark },
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
      {Platform.OS === 'android' && <View style={{ height: statusBarHeight, backgroundColor: colors.surface }} />}
      <View style={styles.topHeaderBar}>
        <View style={styles.leftGroup}>
          <TouchableOpacity style={styles.menuButton} onPress={onOpenDrawer} activeOpacity={0.7} accessibilityLabel="Open navigation">
            <Menu size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerRightGroup}>
          <TouchableOpacity style={styles.walletCircleBtn} onPress={() => { setWalletModalOpen(true); void refreshWallet(); }} activeOpacity={0.8} accessibilityLabel="Open wallet">
            <WalletCards size={16} color={colors.primaryDark} />
            <View style={styles.walletPlusBadge}><Plus size={11} color={colors.surface} strokeWidth={3} /></View>
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
            {profileMenuOpen ? <ChevronUp size={14} color={colors.primary} /> : <ChevronDown size={14} color={colors.muted} />}
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
              <User size={16} color={colors.primary} /><Text style={styles.menuItemTitle}>My Profile</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.profileMenuItem} onPress={() => { setProfileMenuOpen(false); navigatePatientScreen('change_password'); }} activeOpacity={0.7}>
              <Key size={16} color={colors.warning} /><Text style={styles.menuItemTitle}>Change Password</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.profileMenuItem} onPress={() => { setProfileMenuOpen(false); logout(); }} activeOpacity={0.7}>
              <LogOut size={16} color={colors.destructive} /><Text style={[styles.menuItemTitle, { color: colors.destructive }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppModal>

      <AppModal visible={walletModalOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => { if (!walletBusy) setWalletModalOpen(false); }}>
        <View style={styles.walletOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { if (!walletBusy) setWalletModalOpen(false); }} activeOpacity={1} accessibilityLabel="Close wallet" />
          <View style={styles.walletDialog}>
            <LiquidBorderScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.walletDialogContent}>
              <View style={styles.walletDialogHeader}>
                <View style={styles.walletTitleIcon}><WalletCards size={20} color={colors.primaryDark} /></View>
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
                <View style={styles.secureCard}><View style={styles.secureIcon}><ShieldCheck size={17} color={colors.surface} /></View><View style={{ flex: 1 }}><Text style={styles.secureTitle}>Secure Razorpay checkout</Text><Text style={styles.secureText}>UPI, cards, net banking and supported wallets will be available on the next screen.</Text></View></View>
                <TouchableOpacity style={[styles.walletPrimaryButton, walletBusy && styles.disabled]} onPress={rechargeWallet} disabled={walletBusy}>{walletBusy ? <ActivityIndicator color={colors.surface} /> : <><Plus size={17} color={colors.surface} /><Text style={styles.walletPrimaryText}>Continue to Razorpay</Text></>}</TouchableOpacity>
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
                <TouchableOpacity style={[styles.walletPrimaryButton, walletBusy && styles.disabled]} onPress={requestWalletTransfer} disabled={walletBusy}>{walletBusy ? <ActivityIndicator color={colors.surface} /> : <><IndianRupee size={16} color={colors.surface} /><Text style={styles.walletPrimaryText}>Request Transfer</Text></>}</TouchableOpacity>
              </>}
              <TouchableOpacity style={styles.walletCancelButton} onPress={() => !walletBusy && setWalletModalOpen(false)} disabled={walletBusy}><Text style={styles.walletCancelText}>Cancel</Text></TouchableOpacity>
            </LiquidBorderScrollView>
          </View>
        </View>
      </AppModal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, ...shadows.card, zIndex: 10 },
  topHeaderBar: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  leftGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  menuButton: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  headerRightGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  walletCircleBtn: { width: 50, height: 38, borderRadius: 20, backgroundColor: colors.mint, borderWidth: 1, borderColor: colors.mintBorder, alignItems: 'center', justifyContent: 'center' },
  walletPlusBadge: { position: 'absolute', top: -3, right: -2, width: 15, height: 15, borderRadius: radii.md, backgroundColor: colors.warning, borderWidth: 1, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  avatarPillBtn: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 5, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  avatarCircle: { width: 28, height: 28, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontFamily: typography.family, color: colors.surface, fontSize: typography.size.xs, fontWeight: typography.weight.extrabold },
  profileMenuOverlay: { flex: 1, backgroundColor: 'transparent' },
  profileMenuCard: { position: 'absolute', right: 12, width: 240, backgroundColor: colors.surface, borderRadius: radii.lg, padding: 10, borderWidth: 1, borderColor: colors.border, elevation: 12, shadowColor: colors.text, shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  profileMenuHeader: { paddingHorizontal: 9, paddingVertical: spacing.sm },
  profileMenuName: { fontFamily: typography.family, color: colors.text, fontWeight: typography.weight.extrabold, fontSize: typography.size.body },
  profileMenuSub: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.xs, marginTop: 3 },
  menuDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  profileMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40, paddingHorizontal: 9 },
  menuItemTitle: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.caption, fontWeight: typography.weight.bold },
  walletOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.78)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  walletDialog: { width: '100%', maxWidth: 460, maxHeight: '90%', borderRadius: radii.lg, backgroundColor: colors.background, overflow: 'hidden', borderWidth: 1, borderColor: colors.input, elevation: 22 },
  walletDialogContent: { padding: spacing.lg, paddingBottom: 18 },
  walletDialogHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 14 },
  walletTitleIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.mint, borderWidth: 1, borderColor: colors.mintBorder, alignItems: 'center', justifyContent: 'center' },
  balanceInfo: { flex: 1, alignItems: 'flex-end' },
  balanceLabel: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.xs, fontWeight: typography.weight.medium },
  balanceAmount: { fontFamily: typography.family, color: colors.foreground, fontWeight: typography.weight.extrabold, fontSize: typography.size.title, marginTop: 2 },
  walletClose: { position: 'absolute', top: -8, right: -8, padding: spacing.xs },
  walletCloseText: { fontFamily: typography.family, color: colors.muted, fontSize: 25, lineHeight: 26 },
  walletTitle: { fontFamily: typography.family, color: colors.foreground, fontSize: 19, fontWeight: typography.weight.extrabold },
  walletDescription: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.sm, lineHeight: 18, marginTop: 5, marginBottom: 14 },
  walletTabs: { flexDirection: 'row', backgroundColor: colors.secondary, padding: spacing.xs, borderRadius: radii.lg, marginBottom: 18 },
  walletTab: { flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  walletTabActive: { backgroundColor: colors.primary },
  walletTabText: { fontFamily: typography.family, color: colors.foreground, fontWeight: typography.weight.semibold, fontSize: typography.size.sm },
  walletTabTextActive: { color: colors.surface, fontWeight: typography.weight.extrabold },
  fieldLabel: { fontFamily: typography.family, color: colors.foreground, fontWeight: typography.weight.semibold, fontSize: typography.size.body, marginBottom: 7 },
  required: { color: colors.destructive },
  amountInputWrap: { height: 46, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.background, paddingHorizontal: spacing.md },
  rupeeSymbol: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.subtitle, marginRight: spacing.sm },
  amountInput: { fontFamily: typography.family, flex: 1, height: 44, color: colors.foreground, fontSize: typography.size.subtitle, fontWeight: typography.weight.semibold },
  amountPresets: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: spacing.sm },
  presetButton: { flexBasis: '48%', flexGrow: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.background },
  presetButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  presetText: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.xs, fontWeight: typography.weight.semibold },
  presetTextActive: { color: colors.surface, fontWeight: typography.weight.extrabold },
  secureCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13, marginTop: 17, marginBottom: 17, borderRadius: 11, borderWidth: 1, borderColor: colors.mintBorder, backgroundColor: colors.mint },
  secureIcon: { width: 34, height: 34, borderRadius: radii.md, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  secureTitle: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.sm, fontWeight: typography.weight.bold },
  secureText: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.xs, lineHeight: 17, marginTop: 3 },
  walletPrimaryButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 11, backgroundColor: colors.primaryDark, marginTop: 15 },
  walletPrimaryText: { fontFamily: typography.family, color: colors.surface, fontWeight: typography.weight.extrabold, fontSize: typography.size.sm },
  walletCancelButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, marginTop: spacing.xs, backgroundColor: colors.background },
  walletCancelText: { fontFamily: typography.family, color: colors.foreground, fontWeight: typography.weight.semibold, fontSize: typography.size.sm },
  disabled: { opacity: 0.55 },
  methodRow: { flexDirection: 'row', gap: spacing.sm, marginVertical: 10 },
  methodButton: { flex: 1, minHeight: 38, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  transferInput: { fontFamily: typography.family, height: 42, borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 11, color: colors.foreground, marginTop: spacing.sm, backgroundColor: colors.surface, fontSize: typography.size.sm },
  payoutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  payoutAmount: { fontFamily: typography.family, color: colors.foreground, fontWeight: typography.weight.bold, fontSize: typography.size.sm },
  payoutStatus: { fontFamily: typography.family, color: colors.primaryDark, textTransform: 'capitalize', fontWeight: typography.weight.bold, fontSize: typography.size.xs },
  emptyPayout: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.xs, paddingVertical: spacing.sm },
});

export default PatientHeader;
