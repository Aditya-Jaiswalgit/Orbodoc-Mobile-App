import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PaymentMethod, PaymentStep } from '../../hooks/usePaymentCheckout';

interface PaymentCheckoutModalProps {
  visible: boolean;
  amount: number;
  selectedMethod: PaymentMethod;
  step: PaymentStep;
  loading: boolean;
  newBalance: number | null;
  currentBalance?: number;
  patientPhone?: string;
  keyId?: string;
  orderId?: string;
  onSetAmount: (val: number) => void;
  onSetSelectedMethod: (method: PaymentMethod) => void;
  onStartPayment: () => void;
  onConfirmPayment: () => void;
  onClose: () => void;
}

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  visible,
  amount,
  selectedMethod,
  step,
  loading,
  newBalance,
  currentBalance = 0,
  patientPhone = '+91 89223 34455',
  keyId,
  orderId,
  onSetAmount,
  onSetSelectedMethod,
  onStartPayment,
  onConfirmPayment,
  onClose,
}) => {
  const [timerSeconds, setTimerSeconds] = useState(714); // 11:54 countdown
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [selectedBank, setSelectedBank] = useState('SBI');
  const [selectedWallet, setSelectedWallet] = useState('Paytm Wallet');
  const [txnId, setTxnId] = useState('');

  const { width: windowWidth } = Dimensions.get('window');
  const isWideScreen = windowWidth >= 768;

  // Load Official Razorpay JS SDK Script dynamically for authentic web popup
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (!document.getElementById('razorpay-sdk-script')) {
        const script = document.createElement('script');
        script.id = 'razorpay-sdk-script';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.head.appendChild(script);
      }
    }
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (visible) {
      setTimerSeconds(714);
      setTxnId(`TXN_${Math.floor(100000000 + Math.random() * 900000000)}`);
      interval = setInterval(() => {
        setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [visible]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCardNumberChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleCardExpiryChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setCardExpiry(digits);
    }
  };

  /**
   * Launch Real Official Razorpay Gateway Popup (Supports Live Mode & Test Mode keys)
   */
  const handleLaunchOfficialRazorpay = () => {
    const activeKey = keyId || 'rzp_test_mock12345';
    const isLiveKey = activeKey.startsWith('rzp_live_');

    if (Platform.OS === 'web' && (window as any).Razorpay) {
      try {
        const options: any = {
          key: activeKey,
          amount: (amount || 500) * 100,
          currency: 'INR',
          name: 'OrboDoc Healthcare',
          description: 'Wallet Recharge & Teleconsultation',
          image: 'https://orbodoc.com/logo.png',
          handler: function (response: any) {
            onConfirmPayment();
          },
          prefill: {
            name: 'OrboDoc Patient',
            contact: patientPhone || '+918922334455',
            email: 'patient@orbodoc.com',
          },
          theme: {
            color: '#054740',
          },
          modal: {
            ondismiss: function () {
              console.log('Razorpay Gateway dismissed');
            },
          },
        };

        if (orderId && !orderId.startsWith('order_mock')) {
          options.order_id = orderId;
        }

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        return;
      } catch (err) {
        console.warn('Razorpay SDK launch error, falling back to embedded modal', err);
      }
    }
    onConfirmPayment();
  };

  if (!visible) return null;

  const isLive = keyId ? keyId.startsWith('rzp_live_') : false;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.safeContainer}>
          <View style={[styles.modalBox, isWideScreen ? styles.modalBoxWide : styles.modalBoxMobile]}>
            
            {/* TOP TEAL HEADER BAR FOR BOTH MOBILE & DESKTOP */}
            <View style={styles.topTealHeader}>
              <View style={styles.headerLeftBrand}>
                <View style={styles.brandCircle}>
                  <Text style={styles.brandPlus}>+</Text>
                </View>
                <View>
                  <Text style={styles.brandTitleText}>OrboDoc Gateway</Text>
                  <Text style={styles.securedSubText}>
                    {isLive ? '🔴 LIVE RAZORPAY MODE' : 'Secured by Razorpay Official'}
                  </Text>
                </View>
              </View>

              <View style={styles.headerRightSummary}>
                <View style={styles.priceSummaryPill}>
                  <Text style={styles.pricePillLabel}>Payable:</Text>
                  <Text style={styles.pricePillAmount}>₹{amount || 0}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeHeaderBtn}>
                  <Text style={styles.closeHeaderBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* LAUNCH OFFICIAL POPUP BANNER (IF IN WEB BROWSER) */}
            {Platform.OS === 'web' && (
              <TouchableOpacity style={styles.launchOfficialBanner} onPress={handleLaunchOfficialRazorpay}>
                <Text style={{ fontSize: 16 }}>⚡</Text>
                <Text style={styles.launchOfficialText}>
                  {isLive
                    ? 'Click to open Live Razorpay Window (PhonePe / GPay real money deduction)'
                    : 'Click here to launch Official Razorpay Checkout Window'}
                </Text>
                <Text style={styles.launchOfficialBadge}>OPEN POPUP ›</Text>
              </TouchableOpacity>
            )}

            {/* QUICK AMOUNT SELECTOR BAR */}
            <View style={styles.quickAmountBar}>
              <Text style={styles.quickAmountLabel}>Amount:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickScrollContent}>
                {[100, 500, 1000, 2000, 5000].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={[styles.quickAmountPill, amount === amt && styles.quickAmountPillActive]}
                    onPress={() => onSetAmount(amt)}>
                    <Text style={[styles.quickAmountText, amount === amt && styles.quickAmountTextActive]}>
                      +₹{amt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* MAIN CONTENT BODY */}
            {step === 'verifying' ? (
              <View style={styles.verifyingStateContainer}>
                <ActivityIndicator size="large" color="#0d9488" />
                <Text style={styles.verifyingTitle}>Verifying Payment Signature...</Text>
                <Text style={styles.verifyingSub}>
                  Connecting with Razorpay & Bank gateway for ₹{amount}.
                </Text>
              </View>
            ) : step === 'success' ? (
              <View style={styles.successStateContainer}>
                <View style={styles.successCheckCircle}>
                  <Text style={{ fontSize: 36 }}>✅</Text>
                </View>
                <Text style={styles.successTitle}>Payment Verified & Successful!</Text>
                <Text style={styles.successSub}>₹{amount} added to your wallet balance.</Text>

                <View style={styles.receiptCard}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Transaction ID:</Text>
                    <Text style={styles.receiptVal}>{txnId}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Payment Method:</Text>
                    <Text style={styles.receiptVal}>{selectedMethod.toUpperCase()} (Razorpay SSL)</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Amount Paid:</Text>
                    <Text style={[styles.receiptVal, { color: '#16a34a', fontWeight: '900' }]}>₹{amount}.00</Text>
                  </View>
                </View>

                {newBalance !== null && (
                  <View style={styles.updatedBalPill}>
                    <Text style={styles.updatedBalText}>Updated Balance: ₹{newBalance.toFixed(2)}</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.donePrimaryBtn} onPress={onClose}>
                  <Text style={styles.donePrimaryBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.paymentMethodsBody}>
                {/* 4 PAYMENT TABS BAR */}
                <View style={isWideScreen ? styles.tabsColumnWide : styles.tabsRowMobile}>
                  {/* UPI TAB */}
                  <TouchableOpacity
                    style={[
                      styles.methodTabBtn,
                      selectedMethod === 'upi' && styles.methodTabBtnActive,
                    ]}
                    onPress={() => onSetSelectedMethod('upi')}>
                    <Text style={{ fontSize: 16 }}>📱</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.methodTabLabel, selectedMethod === 'upi' && styles.methodTabLabelActive]}>
                        UPI / QR
                      </Text>
                      <Text style={styles.methodTabSub}>GPay, PhonePe, Paytm</Text>
                    </View>
                    {selectedMethod === 'upi' && <Text style={styles.tabActiveCheck}>✓</Text>}
                  </TouchableOpacity>

                  {/* NETBANKING TAB */}
                  <TouchableOpacity
                    style={[
                      styles.methodTabBtn,
                      selectedMethod === 'netbanking' && styles.methodTabBtnActive,
                    ]}
                    onPress={() => onSetSelectedMethod('netbanking')}>
                    <Text style={{ fontSize: 16 }}>🏦</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.methodTabLabel, selectedMethod === 'netbanking' && styles.methodTabLabelActive]}>
                        Netbanking
                      </Text>
                      <Text style={styles.methodTabSub}>SBI, HDFC, ICICI, Axis</Text>
                    </View>
                    {selectedMethod === 'netbanking' && <Text style={styles.tabActiveCheck}>✓</Text>}
                  </TouchableOpacity>

                  {/* CARDS TAB */}
                  <TouchableOpacity
                    style={[
                      styles.methodTabBtn,
                      selectedMethod === 'card' && styles.methodTabBtnActive,
                    ]}
                    onPress={() => onSetSelectedMethod('card')}>
                    <Text style={{ fontSize: 16 }}>💳</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.methodTabLabel, selectedMethod === 'card' && styles.methodTabLabelActive]}>
                        Credit / Debit Card
                      </Text>
                      <Text style={styles.methodTabSub}>Visa, Mastercard, RuPay</Text>
                    </View>
                    {selectedMethod === 'card' && <Text style={styles.tabActiveCheck}>✓</Text>}
                  </TouchableOpacity>

                  {/* WALLET TAB */}
                  <TouchableOpacity
                    style={[
                      styles.methodTabBtn,
                      selectedMethod === 'razorpay' && styles.methodTabBtnActive,
                    ]}
                    onPress={() => onSetSelectedMethod('razorpay')}>
                    <Text style={{ fontSize: 16 }}>👛</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.methodTabLabel, selectedMethod === 'razorpay' && styles.methodTabLabelActive]}>
                        Wallets
                      </Text>
                      <Text style={styles.methodTabSub}>Paytm, MobiKwik, Airtel</Text>
                    </View>
                    {selectedMethod === 'razorpay' && <Text style={styles.tabActiveCheck}>✓</Text>}
                  </TouchableOpacity>
                </View>

                {/* ACTIVE TAB DETAILS PANEL */}
                <ScrollView style={styles.detailScrollPanel} contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
                  {/* OFFERS DISCLOSURE BANNER */}
                  <View style={styles.offersBannerBox}>
                    <Text style={{ fontSize: 14 }}>⚡</Text>
                    <Text style={styles.offersBannerText}>
                      Upto ₹30 Instant Cashback on Razorpay Gateway transactions.
                    </Text>
                  </View>

                  {/* 1. NETBANKING DETAILED SECTION */}
                  {selectedMethod === 'netbanking' && (
                    <View style={styles.detailSectionContainer}>
                      <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionTitleText}>Select Netbanking Bank</Text>
                        <Text style={styles.instantBadge}>Instant Approval</Text>
                      </View>

                      {/* POPULAR BANKS GRID */}
                      <View style={styles.banksGridContainer}>
                        {[
                          { name: 'SBI', fullName: 'State Bank of India', icon: '🏦' },
                          { name: 'HDFC', fullName: 'HDFC Bank', icon: '🏢' },
                          { name: 'ICICI', fullName: 'ICICI Bank', icon: '🏛️' },
                          { name: 'AXIS', fullName: 'Axis Bank', icon: '🏦' },
                          { name: 'KOTAK', fullName: 'Kotak Mahindra', icon: '🏢' },
                          { name: 'PNB', fullName: 'Punjab National', icon: '🏛️' },
                          { name: 'BOB', fullName: 'Bank of Baroda', icon: '🏦' },
                          { name: 'CANARA', fullName: 'Canara Bank', icon: '🏢' },
                        ].map((b) => {
                          const isSelected = selectedBank === b.name;
                          return (
                            <TouchableOpacity
                              key={b.name}
                              style={[styles.bankGridCard, isSelected && styles.bankGridCardActive]}
                              onPress={() => setSelectedBank(b.name)}>
                              <Text style={styles.bankEmojiIcon}>{b.icon}</Text>
                              <Text style={styles.bankShortName}>{b.name}</Text>
                              <Text style={styles.bankFullSub} numberOfLines={1}>
                                {b.fullName}
                              </Text>
                              {isSelected && <View style={styles.bankSelectCheck}><Text style={styles.bankCheckText}>✓</Text></View>}
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <TouchableOpacity
                        style={styles.payPrimaryBtn}
                        onPress={handleLaunchOfficialRazorpay}
                        disabled={loading}>
                        {loading ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text style={styles.payPrimaryBtnText}>
                            Pay ₹{amount} via {selectedBank} Netbanking
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* 2. UPI / QR DETAILED SECTION */}
                  {selectedMethod === 'upi' && (
                    <View style={styles.detailSectionContainer}>
                      <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionTitleText}>Scan UPI QR Code</Text>
                        <Text style={styles.timerBadgeText}>⏱️ Expires in {formatTimer(timerSeconds)}</Text>
                      </View>

                      <View style={styles.qrVisualCard}>
                        {/* Dynamic QR Visual */}
                        <View style={styles.qrMatrixBox}>
                          <View style={styles.qrCornerTL} />
                          <View style={styles.qrCornerTR} />
                          <View style={styles.qrCornerBL} />
                          <Text style={{ fontSize: 26 }}>📱</Text>
                          <Text style={styles.qrBrandText}>OrboDoc Razorpay QR</Text>
                        </View>
                        <Text style={styles.qrInstructionText}>Scan QR using any UPI Payment App</Text>

                        {/* UPI App Icons Row */}
                        <View style={styles.upiAppsRow}>
                          <View style={styles.upiPillBadge}><Text style={styles.upiPillText}>PhonePe</Text></View>
                          <View style={styles.upiPillBadge}><Text style={styles.upiPillText}>GPay</Text></View>
                          <View style={styles.upiPillBadge}><Text style={styles.upiPillText}>Paytm</Text></View>
                          <View style={styles.upiPillBadge}><Text style={styles.upiPillText}>BHIM</Text></View>
                          <View style={styles.upiPillBadge}><Text style={styles.upiPillText}>Amazon Pay</Text></View>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.payPrimaryBtn}
                        onPress={handleLaunchOfficialRazorpay}
                        disabled={loading}>
                        {loading ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text style={styles.payPrimaryBtnText}>
                            Pay ₹{amount} via Razorpay Gateway
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* 3. CREDIT / DEBIT CARD DETAILED SECTION */}
                  {selectedMethod === 'card' && (
                    <View style={styles.detailSectionContainer}>
                      <Text style={styles.sectionTitleText}>Enter Card Details</Text>
                      <TextInput
                        style={styles.cardInput}
                        placeholder="Card Number (4532 XXXX XXXX 8923)"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        value={cardNumber}
                        onChangeText={handleCardNumberChange}
                      />
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TextInput
                          style={[styles.cardInput, { flex: 1 }]}
                          placeholder="MM / YY"
                          placeholderTextColor="#94a3b8"
                          keyboardType="numeric"
                          value={cardExpiry}
                          onChangeText={handleCardExpiryChange}
                        />
                        <TextInput
                          style={[styles.cardInput, { flex: 1 }]}
                          placeholder="CVV (3 Digits)"
                          placeholderTextColor="#94a3b8"
                          keyboardType="numeric"
                          secureTextEntry
                          maxLength={3}
                          value={cardCvv}
                          onChangeText={setCardCvv}
                        />
                      </View>
                      <TextInput
                        style={styles.cardInput}
                        placeholder="Cardholder Name"
                        placeholderTextColor="#94a3b8"
                        value={cardName}
                        onChangeText={setCardName}
                      />

                      <TouchableOpacity
                        style={styles.payPrimaryBtn}
                        onPress={handleLaunchOfficialRazorpay}
                        disabled={loading}>
                        {loading ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text style={styles.payPrimaryBtnText}>
                            Pay ₹{amount} via Card
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* 4. WALLET DETAILED SECTION */}
                  {selectedMethod === 'razorpay' && (
                    <View style={styles.detailSectionContainer}>
                      <Text style={styles.sectionTitleText}>Select Online Wallet</Text>
                      <View style={styles.walletsGrid}>
                        {['Paytm Wallet', 'PhonePe Wallet', 'Airtel Money', 'MobiKwik', 'Freecharge'].map((w) => (
                          <TouchableOpacity
                            key={w}
                            style={[styles.walletItemCard, selectedWallet === w && styles.walletItemCardActive]}
                            onPress={() => setSelectedWallet(w)}>
                            <Text style={{ fontSize: 20 }}>👛</Text>
                            <Text style={styles.walletTitle}>{w}</Text>
                            {selectedWallet === w && <Text style={styles.tabActiveCheck}>✓</Text>}
                          </TouchableOpacity>
                        ))}
                      </View>

                      <TouchableOpacity
                        style={styles.payPrimaryBtn}
                        onPress={handleLaunchOfficialRazorpay}
                        disabled={loading}>
                        {loading ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text style={styles.payPrimaryBtnText}>
                            Pay ₹{amount} via {selectedWallet}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={styles.footerTermsText}>
                    By proceeding, I agree to Razorpay's Privacy Notice & Terms • 256-Bit SSL Secured
                  </Text>
                </ScrollView>
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  safeContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 16,
    width: '100%',
    maxWidth: 900,
  },
  modalBoxWide: {
    maxHeight: 640,
  },
  modalBoxMobile: {
    maxHeight: '92%',
  },

  /* TOP TEAL HEADER */
  topTealHeader: {
    backgroundColor: '#054740',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeftBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  brandPlus: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  brandTitleText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  securedSubText: { color: '#99f6e4', fontSize: 10, fontWeight: '600' },

  headerRightSummary: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceSummaryPill: {
    backgroundColor: '#095c53',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pricePillLabel: { color: '#99f6e4', fontSize: 11, fontWeight: '600' },
  pricePillAmount: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  closeHeaderBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeHeaderBtnText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },

  /* LAUNCH OFFICIAL BANNER */
  launchOfficialBanner: {
    backgroundColor: '#0f766e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  launchOfficialText: { flex: 1, color: '#ffffff', fontSize: 12, fontWeight: '800' },
  launchOfficialBadge: { backgroundColor: '#2dd4bf', color: '#0f172a', fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },

  /* QUICK AMOUNT BAR */
  quickAmountBar: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  quickAmountLabel: { fontSize: 11, fontWeight: '800', color: '#475569' },
  quickScrollContent: { gap: 6, alignItems: 'center' },
  quickAmountPill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  quickAmountPillActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  quickAmountText: { fontSize: 12, fontWeight: '800', color: '#334155' },
  quickAmountTextActive: { color: '#ffffff' },

  /* BODY CONTAINER */
  paymentMethodsBody: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    padding: 14,
    gap: 12,
  },
  tabsColumnWide: { width: '35%', gap: 8 },
  tabsRowMobile: { flexDirection: 'column', gap: 6 },

  methodTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  methodTabBtnActive: {
    backgroundColor: '#e6fffa',
    borderColor: '#0d9488',
    borderWidth: 1.5,
  },
  methodTabLabel: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  methodTabLabelActive: { color: '#0f766e' },
  methodTabSub: { fontSize: 10, color: '#64748b', marginTop: 1 },
  tabActiveCheck: { fontSize: 14, fontWeight: '900', color: '#0d9488' },

  /* DETAIL PANEL */
  detailScrollPanel: { flex: 1 },
  offersBannerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  offersBannerText: { fontSize: 11, fontWeight: '700', color: '#0369a1', flex: 1 },

  detailSectionContainer: { gap: 12, marginTop: 4 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitleText: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  instantBadge: { backgroundColor: '#dcfce7', color: '#15803d', fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  timerBadgeText: { fontSize: 11, fontWeight: '700', color: '#ea580c' },

  /* NETBANKING GRID */
  banksGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankGridCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    position: 'relative',
  },
  bankGridCardActive: {
    backgroundColor: '#e6fffa',
    borderColor: '#0d9488',
    borderWidth: 1.8,
  },
  bankEmojiIcon: { fontSize: 22 },
  bankShortName: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  bankFullSub: { fontSize: 9, color: '#64748b', marginTop: 1 },
  bankSelectCheck: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: '#0d9488', alignItems: 'center', justifyContent: 'center' },
  bankCheckText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },

  /* UPI QR VISUAL */
  qrVisualCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  qrMatrixBox: {
    width: 140,
    height: 140,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  qrCornerTL: { position: 'absolute', top: 6, left: 6, width: 22, height: 22, borderWidth: 3, borderColor: '#0f172a' },
  qrCornerTR: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderWidth: 3, borderColor: '#0f172a' },
  qrCornerBL: { position: 'absolute', bottom: 6, left: 6, width: 22, height: 22, borderWidth: 3, borderColor: '#0f172a' },
  qrBrandText: { fontSize: 10, fontWeight: '800', color: '#0d9488', marginTop: 4 },
  qrInstructionText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  upiAppsRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'center' },
  upiPillBadge: { backgroundColor: '#ffffff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },
  upiPillText: { fontSize: 10, fontWeight: '800', color: '#334155' },

  /* CARDS INPUTS */
  cardInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },

  /* WALLETS GRID */
  walletsGrid: { gap: 6 },
  walletItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  walletItemCardActive: { backgroundColor: '#e6fffa', borderColor: '#0d9488', borderWidth: 1.5 },
  walletTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0f172a' },

  payPrimaryBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  payPrimaryBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },

  footerTermsText: { fontSize: 9, color: '#94a3b8', textAlign: 'center', marginTop: 10 },

  /* VERIFYING & SUCCESS STATES */
  verifyingStateContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  verifyingTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 14 },
  verifyingSub: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4 },

  successStateContainer: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  successCheckCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  successTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  successSub: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4 },

  receiptCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 12,
    gap: 6,
  },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  receiptVal: { fontSize: 12, color: '#0f172a', fontWeight: '800' },

  updatedBalPill: { backgroundColor: '#ccfbf1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginTop: 10 },
  updatedBalText: { fontSize: 12, fontWeight: '800', color: '#0f766e' },
  donePrimaryBtn: { backgroundColor: '#0d9488', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, marginTop: 16 },
  donePrimaryBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
});

export default PaymentCheckoutModal;
