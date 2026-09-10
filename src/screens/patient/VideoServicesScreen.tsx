import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import {
  DrawerVideoIcon,
  StethoscopeIcon,
  WalletOutlineIcon,
} from '../../components/common/CustomIcons';
import { PhoneCall } from 'lucide-react-native';
import { useVideoServices } from '../../hooks/useVideoServices';
import { useVideoCall } from '../../hooks/useVideoCall';
import { usePaymentCheckout } from '../../hooks/usePaymentCheckout';
import { VideoCallModal } from '../../components/video/VideoCallModal';
import { PaymentCheckoutModal } from '../../components/payment/PaymentCheckoutModal';

interface VideoServicesScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
  onToggleTabBar?: (hide: boolean) => void;
}

/* Legacy fixture intentionally disabled: video history is loaded only from the API.
const defaultHistoryCalls = [
  {
    id: 108,
    doctor_name: 'Dr Verma',
    clinic_name: 'Aarogya Care Clinic',
    appointment_date: '05 Sep 2026',
    appointment_time: '10:00:00',
    final_pay: '₹0.00',
    status: 'complete',
  },
  {
    id: 104,
    doctor_name: 'Dr. Rahul Sharma',
    clinic_name: 'Aarogya Care Clinic',
    appointment_date: '29 Aug 2026',
    appointment_time: '15:30:00',
    final_pay: '₹0.00',
    status: 'complete',
  },
  {
    id: 98,
    doctor_name: 'Dr Verma',
    clinic_name: 'Aarogya Care Clinic',
    appointment_date: '18 Aug 2026',
    appointment_time: '11:15:00',
    final_pay: '₹0.00',
    status: 'complete',
  },
  {
    id: 86,
    doctor_name: 'Dr. Rahul Sharma',
    clinic_name: 'Aarogya Care Clinic',
    appointment_date: '02 Aug 2026',
    appointment_time: '14:00:00',
    final_pay: '₹0.00',
    status: 'complete',
  },
]; */

const formatHistoryDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
};

const formatClinicName = (name?: string): string => {
  if (!name) return 'Clinic unavailable';
  return name.trim().split(/\s+/).join('\n');
};

export const VideoServicesScreen: React.FC<VideoServicesScreenProps> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
}) => {
  const {
    walletBalance,
    activeCalls,
    completedCalls,
    transactions,
    loading,
    refreshVideoServices,
  } = useVideoServices();

  const {
    activeAppointment,
    isCallActive,
    isConnecting,
    callDurationStr,
    isMuted,
    isCameraOff,
    isSpeakerOn,
    doctorNotes,
    setDoctorNotes,
    connectVideoCall,
    endVideoCall,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
  } = useVideoCall();

  const {
    visible: checkoutVisible,
    amount: checkoutAmount,
    title: checkoutTitle,
    step: checkoutStep,
    loading: checkoutLoading,
    error: checkoutError,
    newBalance: checkoutNewBalance,
    orderDetails: checkoutOrderDetails,
    setAmount: setCheckoutAmount,
    openCheckout,
    closeCheckout,
    startPayment,
    confirmPayment,
  } = usePaymentCheckout();

  const [activeTab, setActiveTab] = useState<'calls' | 'history' | 'wallet'>('calls');

  const handleJoinVideoCall = (callItem: any) => {
    connectVideoCall(callItem);
  };

  const handleEndCall = () => {
    endVideoCall(() => {
      refreshVideoServices();
    });
  };

  const handleConfirmPayment = (payment: any) => {
    confirmPayment(payment, () => {
      refreshVideoServices();
    });
  };

  const displayCompletedCalls = completedCalls || [];

  return (
    <View style={styles.container}>
      <PatientHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        showLogo={false}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Main Card: Patient Video Services */}
        <View style={styles.mainServicesCard}>
          <View style={styles.titleRow}>
            <DrawerVideoIcon color="#0d9488" size={24} strokeWidth={2.2} />
            <Text style={styles.pageTitle}>Patient Video Services</Text>
          </View>
          <Text style={styles.pageSub}>Manage your video consultation payments and calls.</Text>

          {/* Vertical Stack of 3 Stat Cards */}
          <View style={styles.statsColumn}>
            {/* Card 1: Wallet Balance */}
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Wallet Balance</Text>
              <View style={styles.walletValRow}>
                <WalletOutlineIcon color="#0d9488" size={20} strokeWidth={2} />
                <Text style={styles.statBigValue}>₹{walletBalance.toFixed(2)}</Text>
              </View>
            </View>

            {/* Card 2: Active Video Appointments */}
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Active Video Appointments</Text>
              <Text style={styles.statBigValue}>{activeCalls.length}</Text>
            </View>

            {/* Card 3: Completed Calls */}
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Completed Calls</Text>
              <Text style={styles.statBigValue}>{displayCompletedCalls.length}</Text>
            </View>
          </View>
        </View>

        {/* Tab Segment (Pill style aligned left) */}
        <View style={styles.tabsBarWrapper}>
          <View style={styles.tabsBar}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.tabBtn, activeTab === 'calls' && styles.tabBtnActive]}
              onPress={() => setActiveTab('calls')}>
              <Text style={[styles.tabBtnText, activeTab === 'calls' && styles.tabBtnTextActive]}>
                Video Calls
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
              onPress={() => setActiveTab('history')}>
              <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
                History
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.tabBtn, activeTab === 'wallet' && styles.tabBtnActive]}
              onPress={() => setActiveTab('wallet')}>
              <Text style={[styles.tabBtnText, activeTab === 'wallet' && styles.tabBtnTextActive]}>
                Wallet
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Content */}
        {loading ? (
          <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 30 }} />
        ) : activeTab === 'calls' ? (
          /* TAB 1: Video Calls */
          activeCalls.length === 0 ? (
            <View style={styles.dottedEmptyCard}>
              <Text style={styles.dottedEmptyText}>No active video appointments found.</Text>
            </View>
          ) : (
            <View style={styles.videoTableCardContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled={true}
                contentContainerStyle={styles.videoTableScrollContent}>
                <View>
                  {/* Table Header Row */}
                  <View style={styles.videoTableHeaderRow}>
                    <Text style={[styles.videoTableHeaderCol, styles.videoColDoctor]}>Doctor</Text>
                    <Text style={[styles.videoTableHeaderCol, styles.videoColStatus]}>Status</Text>
                    <Text style={[styles.videoTableHeaderCol, styles.videoColPayment]}>Payment</Text>
                    <Text style={[styles.videoTableHeaderCol, styles.videoColDateTime]}>Date & Time</Text>
                    <Text style={[styles.videoTableHeaderCol, styles.videoColAction]}>Action</Text>
                  </View>

                  {/* Table Body Rows */}
                  {activeCalls.map((item: any, idx: number) => {
                    const docName = item.doctor_name || 'Doctor';
                    const apptId = item.id ? `#${item.id}` : '#114';
                    const clinicName = item.clinic_name || 'Aarogya Care Clinic';
                    const reason = item.reason || item.specialization || 'Video consultation';
                    const statusText = item.status ? String(item.status).toLowerCase() : 'approved';
                    const isPaymentReady = ['confirmed', 'in_call', 'completed', 'paid', 'ready', 'success'].includes(
                      String(item.payment_status || item.paymentStatus || '').toLowerCase()
                    );
                    const paymentText = isPaymentReady ? 'Ready' : 'Pending';
                    const dateStr = formatHistoryDate(item.appointment_date || item.date);
                    const timeStr = item.appointment_time || item.time || '00:00:00';

                    return (
                      <View
                        key={item.id ? `call-${item.id}-${idx}` : `call-${idx}`}
                        style={[styles.videoTableRow, idx > 0 && styles.videoTableRowBorder]}>
                        {/* Doctor Column */}
                        <View style={[styles.videoColDoctor, { alignItems: 'flex-start' }]}>
                          <Text style={styles.tableDocName}>{docName}</Text>
                          <View style={styles.idBadgePill}>
                            <Text style={styles.idBadgeText}>{apptId}</Text>
                          </View>
                          <Text style={styles.tableClinicText}>{clinicName}</Text>
                          {reason ? <Text style={styles.tableReasonText}>{reason}</Text> : null}
                        </View>

                        {/* Status Column */}
                        <View style={[styles.videoColStatus, { alignItems: 'flex-start' }]}>
                          <View style={styles.approvedBadgePill}>
                            <Text style={styles.approvedBadgeText}>{statusText}</Text>
                          </View>
                        </View>

                        {/* Payment Column */}
                        <View style={styles.videoColPayment}>
                          <Text style={styles.tablePaymentText}>{paymentText}</Text>
                        </View>

                        {/* Date & Time Column */}
                        <View style={styles.videoColDateTime}>
                          <Text style={styles.tableDateText}>{dateStr} •</Text>
                          <Text style={styles.tableTimeText}>{timeStr}</Text>
                        </View>

                        {/* Action Column */}
                        <View style={[styles.videoColAction, { alignItems: 'flex-start' }]}>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.joinCallTableBtn}
                            onPress={() => handleJoinVideoCall(item)}>
                            <PhoneCall color="#ffffff" size={15} strokeWidth={2.2} />
                            <Text style={styles.joinCallTableBtnText}>Join Call</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )
        ) : activeTab === 'history' ? (
          /* TAB 2: History (Table format exactly like design) */
          <View style={styles.historyCardContainer}>
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCol, { flex: 1.3 }]}>Doctor</Text>
              <Text style={[styles.tableHeaderCol, { flex: 1.05 }]}>Clinic</Text>
              <Text style={[styles.tableHeaderCol, { flex: 1.35 }]}>Date & Time</Text>
              <Text style={[styles.tableHeaderCol, { flex: 0.9 }]}>Final Pay</Text>
            </View>

            {/* Table Rows */}
            {displayCompletedCalls.map((item: any, idx: number) => {
              const docName = item.doctor_name || 'Doctor';
              const idBadge = item.id ? `#${item.id}` : '—';
              const clinicName = item.clinic_name || 'Clinic unavailable';
              const dateStr = formatHistoryDate(item.appointment_date || item.date);
              const timeStr = item.appointment_time || item.time || '—';
              const payStr = item.final_pay || (item.amount ? `₹${Number(item.amount).toFixed(2)}` : '₹0.00');

              return (
                <View
                  key={item.id ? `hist-${item.id}-${idx}` : `hist-${idx}`}
                  style={[styles.tableRow, idx > 0 && styles.tableRowBorder]}>
                  {/* Doctor column */}
                  <View style={{ flex: 1.3, alignItems: 'flex-start' }}>
                    <Text style={styles.tableDocName}>{docName}</Text>
                    <View style={styles.idBadgePill}>
                      <Text style={styles.idBadgeText}>{idBadge}</Text>
                    </View>
                    <View style={styles.completeBadgePill}>
                      <Text style={styles.completeBadgeText}>complete</Text>
                    </View>
                  </View>

                  {/* Clinic column */}
                  <View style={{ flex: 1.05, paddingRight: 4 }}>
                    <Text style={styles.tableClinicText}>{formatClinicName(clinicName)}</Text>
                  </View>

                  {/* Date & Time column */}
                  <View style={{ flex: 1.35 }}>
                    <Text style={styles.tableDateText}>{dateStr}</Text>
                    <Text style={styles.tableTimeText}>• {timeStr}</Text>
                  </View>

                  {/* Final Pay column */}
                  <View style={{ flex: 0.9 }}>
                    <Text style={styles.tablePayText}>{payStr}</Text>
                  </View>
                </View>
              );
            })}
            {displayCompletedCalls.length === 0 ? (
              <Text style={styles.emptyHistoryText}>No completed video consultations yet.</Text>
            ) : null}
          </View>
        ) : (
          /* TAB 3: Wallet (White card with top-up button) */
          <View style={styles.walletCardContainer}>
            <Text style={styles.walletHeading}>Wallet</Text>
            <Text style={styles.walletSubHeading}>Top up your wallet to pay consultation fees.</Text>

            <Text style={styles.walletAvailableBalance}>
              Available Balance: ₹{walletBalance.toFixed(2)}
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.rechargeUpiBtn}
              onPress={() => openCheckout(500)}>
              <Text style={styles.rechargeUpiRupee}>₹</Text>
              <Text style={styles.rechargeUpiText}>Recharge via UPI</Text>
            </TouchableOpacity>

            {transactions.length > 0 && (
              <View style={{ marginTop: 24, width: '100%' }}>
                <Text style={styles.recentTxTitle}>Recent Transactions</Text>
                {transactions.slice(0, 5).map((tx) => (
                  <View key={tx.id} style={styles.txRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txDesc}>{tx.description || 'Wallet Transaction'}</Text>
                      <Text style={styles.txDate}>
                        {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : '-'}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: tx.type === 'credit' ? '#16a34a' : '#dc2626' },
                      ]}>
                      {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}.00
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Real-Time Video Call Room View Modal */}
      <VideoCallModal
        visible={isCallActive || isConnecting}
        appointment={activeAppointment}
        callDurationStr={callDurationStr}
        isConnecting={isConnecting}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isSpeakerOn={isSpeakerOn}
        doctorNotes={doctorNotes}
        isDoctor={false}
        onSetDoctorNotes={setDoctorNotes}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onToggleSpeaker={toggleSpeaker}
        onEndCall={handleEndCall}
      />

      {/* Real Online Payment Gateway (Razorpay/UPI) Checkout Modal */}
      <PaymentCheckoutModal
        visible={checkoutVisible}
        amount={checkoutAmount}
        title={checkoutTitle}
        step={checkoutStep}
        loading={checkoutLoading}
        error={checkoutError}
        newBalance={checkoutNewBalance}
        orderDetails={checkoutOrderDetails}
        allowAmountEdit
        onSetAmount={setCheckoutAmount}
        onStartPayment={startPayment}
        onConfirmPayment={handleConfirmPayment}
        onClose={closeCheckout}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },

  /* Main Card: Patient Video Services */
  mainServicesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0e294b',
  },
  pageSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 16,
  },

  /* Vertical Stat Cards Stack */
  statsColumn: {
    gap: 12,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  walletValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  statBigValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },

  /* Tabs Bar */
  tabsBarWrapper: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  tabsBar: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },

  /* TAB 1: Empty Dotted Box */
  dottedEmptyCard: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  dottedEmptyText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
  },

  /* TAB 1: Video Calls Table Card (Matches web UI) */
  videoTableCardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  videoTableScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  videoTableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  videoTableHeaderCol: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#5c6f84',
  },
  videoTableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  videoTableRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  videoColDoctor: {
    width: 160,
    paddingRight: 10,
  },
  videoColStatus: {
    width: 110,
    paddingRight: 10,
  },
  videoColPayment: {
    width: 100,
    paddingRight: 10,
  },
  videoColDateTime: {
    width: 145,
    paddingRight: 10,
  },
  videoColAction: {
    width: 130,
  },
  tableReasonText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  tablePaymentText: {
    fontSize: 13.5,
    color: '#64748b',
    fontWeight: '500',
  },
  approvedBadgePill: {
    backgroundColor: '#0d9488',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  approvedBadgeText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  joinCallTableBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  joinCallTableBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  /* TAB 2: History Card */
  historyCardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 16,
    alignItems: 'center',
  },
  tableHeaderCol: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#5c6f84',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    alignItems: 'flex-start',
  },
  tableRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  tableDocName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  idBadgePill: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 9,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  idBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  completeBadgePill: {
    backgroundColor: '#169b91',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  completeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  tableClinicText: {
    fontSize: 13,
    color: '#62758d',
    lineHeight: 18,
  },
  tableDateText: {
    fontSize: 13,
    color: '#62758d',
  },
  tableTimeText: {
    fontSize: 13,
    color: '#62758d',
    marginTop: 4,
  },
  tablePayText: {
    fontSize: 13,
    color: '#62758d',
  },
  emptyHistoryText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },

  /* TAB 3: Wallet Card */
  walletCardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  walletHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  walletSubHeading: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 16,
  },
  walletAvailableBalance: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  rechargeUpiBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  rechargeUpiRupee: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  rechargeUpiText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  recentTxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  txDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  txDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default VideoServicesScreen;
