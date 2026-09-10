import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { CreditCard, IndianRupee, Plus, ShieldCheck, WalletCards, X } from 'lucide-react-native';

interface WalletRechargeModalProps {
  visible: boolean;
  balance: number;
  balanceLoading?: boolean;
  onClose: () => void;
  onContinue: (amount: number) => void;
}

const PRESETS = [500, 1000, 2000, 5000];

/** Visual wallet recharge sheet; checkout and verification stay in the existing Razorpay flow. */
export const WalletRechargeModal: React.FC<WalletRechargeModalProps> = ({ visible, balance, balanceLoading = false, onClose, onContinue }) => {
  const [amountText, setAmountText] = useState('500');
  const [mode, setMode] = useState<'recharge' | 'transfer'>('recharge');

  useEffect(() => {
    if (visible) {
      setAmountText('500');
      setMode('recharge');
    }
  }, [visible]);

  const amount = Number(amountText.replace(/[^0-9.]/g, ''));
  const validAmount = Number.isFinite(amount) && amount > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <View style={styles.walletIconBox}><WalletCards color="#079b91" size={23} strokeWidth={2.15} /></View>
            <View style={styles.balanceCol}>
              <Text style={styles.balanceLabel}>Available balance</Text>
              <Text style={styles.balanceValue}>{balanceLoading ? '...' : `\u20B9${Math.round(balance)}`}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={10}><X color="#64748b" size={20} strokeWidth={2.2} /></TouchableOpacity>
          </View>

          <View style={styles.headingBlock}>
            <Text style={styles.heading}>Recharge wallet</Text>
            <Text style={styles.subheading}>Choose an amount, then continue to secure{`\n`}Razorpay checkout.</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, mode === 'recharge' && styles.tabActive]} onPress={() => setMode('recharge')}><Text style={[styles.tabText, mode === 'recharge' && styles.tabTextActive]}>Recharge</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.tab, mode === 'transfer' && styles.tabActive]} onPress={() => setMode('transfer')}><Text style={[styles.tabText, mode === 'transfer' && styles.tabTextActive]}>Transfer</Text></TouchableOpacity>
          </View>

          {mode === 'recharge' ? (
            <>
              <Text style={styles.fieldLabel}>Recharge amount <Text style={styles.required}>*</Text></Text>
              <View style={styles.amountField}>
                <IndianRupee color="#64748b" size={19} strokeWidth={2.4} />
                <TextInput value={amountText} onChangeText={setAmountText} keyboardType="decimal-pad" placeholder="500" placeholderTextColor="#94a3b8" style={styles.amountInput} maxLength={8} />
              </View>
              <View style={styles.presetGrid}>
                {PRESETS.map((preset) => {
                  const selected = amount === preset;
                  return <TouchableOpacity key={preset} style={[styles.presetButton, selected && styles.presetButtonSelected]} onPress={() => setAmountText(String(preset))}><Text style={[styles.presetText, selected && styles.presetTextSelected]}>Rs {preset.toLocaleString('en-IN')}</Text></TouchableOpacity>;
                })}
              </View>
              <View style={styles.secureBox}>
                <View style={styles.secureIconBox}><ShieldCheck color="#ffffff" size={19} strokeWidth={2.35} /></View>
                <View style={styles.secureTextCol}><Text style={styles.secureTitle}>Secure Razorpay checkout</Text><Text style={styles.secureSub}>UPI, cards, net banking and supported wallets{`\n`}will be available on the next screen.</Text></View>
              </View>
            </>
          ) : (
            <View style={styles.transferNotice}>
              <CreditCard color="#079b91" size={26} strokeWidth={2.1} />
              <Text style={styles.transferTitle}>Wallet transfer</Text>
              <Text style={styles.transferSub}>Transfer requests are reviewed securely by the clinic. Choose Recharge to add money through Razorpay.</Text>
            </View>
          )}

          <View style={styles.footer}>
            <TouchableOpacity disabled={mode !== 'recharge' || !validAmount} style={[styles.continueButton, (mode !== 'recharge' || !validAmount) && styles.continueButtonDisabled]} onPress={() => onContinue(amount)}>
              <Plus color="#ffffff" size={20} strokeWidth={2.2} /><Text style={styles.continueText}>Continue to Razorpay</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 15, backgroundColor: 'rgba(15, 23, 42, 0.72)' },
  card: { width: '100%', maxWidth: 430, alignSelf: 'center', backgroundColor: '#fbfcfd', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.26, shadowRadius: 18, elevation: 18 },
  summaryRow: { minHeight: 84, flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 17, paddingTop: 17 },
  walletIconBox: { width: 49, height: 49, borderRadius: 14, backgroundColor: '#effcfb', borderWidth: 1.5, borderColor: '#c9f6f1', alignItems: 'center', justifyContent: 'center' },
  balanceCol: { flex: 1, alignItems: 'flex-end', paddingTop: 4, paddingRight: 1 },
  balanceLabel: { color: '#718096', fontSize: 12, fontWeight: '500' },
  balanceValue: { color: '#0f172a', fontSize: 23, fontWeight: '900', marginTop: 2 },
  closeButton: { position: 'absolute', right: 12, top: 15, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  headingBlock: { paddingHorizontal: 17, paddingTop: 4, paddingBottom: 17 },
  heading: { color: '#111827', fontSize: 22, fontWeight: '800', letterSpacing: -0.45 },
  subheading: { color: '#718096', fontSize: 13, lineHeight: 18, marginTop: 7 },
  divider: { height: 1, backgroundColor: '#e2e8f0' },
  tabs: { flexDirection: 'row', marginHorizontal: 17, marginTop: 16, backgroundColor: '#f7f8fb', borderRadius: 13, padding: 4, gap: 4 },
  tab: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#12afa3', shadowColor: '#0a9b92', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 3 },
  tabText: { color: '#1f2937', fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: '#ffffff', fontWeight: '700' },
  fieldLabel: { color: '#1f2937', fontSize: 14, fontWeight: '600', marginHorizontal: 17, marginTop: 17, marginBottom: 7 },
  required: { color: '#ef4444' },
  amountField: { flexDirection: 'row', alignItems: 'center', height: 52, marginHorizontal: 17, paddingHorizontal: 16, borderRadius: 15, backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#10afa4', gap: 8 },
  amountInput: { flex: 1, color: '#1f2937', fontSize: 20, fontWeight: '600', padding: 0 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 17, marginTop: 8, gap: 8 },
  presetButton: { width: '48.7%', height: 43, borderRadius: 12, borderWidth: 1, borderColor: '#dce4eb', backgroundColor: '#fafbfc', alignItems: 'center', justifyContent: 'center' },
  presetButtonSelected: { backgroundColor: '#12afa3', borderColor: '#12afa3' },
  presetText: { color: '#1f2937', fontSize: 14, fontWeight: '500' },
  presetTextSelected: { color: '#ffffff', fontWeight: '700' },
  secureBox: { flexDirection: 'row', marginHorizontal: 17, marginTop: 16, marginBottom: 16, padding: 15, gap: 12, borderRadius: 14, borderWidth: 1, borderColor: '#c9f6f1', backgroundColor: '#eafffb' },
  secureIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#078f86', alignItems: 'center', justifyContent: 'center' },
  secureTextCol: { flex: 1 },
  secureTitle: { color: '#1f2937', fontSize: 14, fontWeight: '700' },
  secureSub: { color: '#718096', fontSize: 11, lineHeight: 16, marginTop: 4 },
  transferNotice: { marginHorizontal: 17, marginTop: 16, marginBottom: 16, padding: 17, alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#c9f6f1', backgroundColor: '#effcfb' },
  transferTitle: { color: '#1f2937', fontSize: 15, fontWeight: '800', marginTop: 7 },
  transferSub: { color: '#718096', fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 5 },
  footer: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingHorizontal: 17, paddingTop: 15, paddingBottom: 16, gap: 7 },
  continueButton: { minHeight: 48, borderRadius: 14, backgroundColor: '#078f86', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  continueButtonDisabled: { backgroundColor: '#94d9d4' },
  continueText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  cancelButton: { minHeight: 43, borderRadius: 13, borderWidth: 1, borderColor: '#dce4eb', alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#1f2937', fontSize: 15, fontWeight: '500' },
});

export default WalletRechargeModal;
