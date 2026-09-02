import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import {
  BellNotificationIcon,
  BillingCardIcon,
  CalendarIcon,
  LabTubeIcon,
  MedicinePillIcon,
  PatientUserIcon,
} from '../../components/common/CustomIcons';
import { useVideoServices } from '../../hooks/useVideoServices';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const VideoServicesScreen: React.FC<Props> = ({
  onOpenDrawer,
  onOpenNotifications,
  onNavigateScreen = () => {},
}) => {
  const {
    activeCalls,
    consultancyHistory,
    videoBilling,
    stats,
    lastRefreshed,
    loading,
    refreshVideoServices,
    joinVideoCall,
  } = useVideoServices();

  const [activeTab, setActiveTab] = useState<'calls' | 'history' | 'billing'>('calls');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [showCallModal, setShowCallModal] = useState<boolean>(false);
  const [activeCallRoom, setActiveCallRoom] = useState<any>(null);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);

  const filteredCalls = (activeCalls || []).filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const pName = String(item.patient_name || '').toLowerCase();
    const dName = String(item.doctor_name || '').toLowerCase();
    const phone = String(item.patient_phone || '');
    const code = String(item.patient_code || `PT-${item.id}`);
    const status = String(item.status || '').toLowerCase();
    return (
      pName.includes(q) ||
      dName.includes(q) ||
      phone.includes(q) ||
      code.toLowerCase().includes(q) ||
      status.includes(q)
    );
  });

  const filteredHistory = (consultancyHistory || []).filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const pName = String(item.patient_name || '').toLowerCase();
    const dName = String(item.doctor_name || '').toLowerCase();
    return pName.includes(q) || dName.includes(q);
  });

  const filteredBilling = (videoBilling || []).filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const pName = String(item.patient_name || '').toLowerCase();
    const dName = String(item.doctor_name || '').toLowerCase();
    return pName.includes(q) || dName.includes(q);
  });

  const handleJoinCall = async (item: any) => {
    setActiveCallRoom(item);
    setShowCallModal(true);
    await joinVideoCall(item.id);
  };

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Video Services"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshVideoServices} colors={['#0d9488']} />
        }>
        {/* Top Workflow Banner */}
        <View style={styles.bannerBox}>
          <View style={styles.badgeRow}>
            <View style={styles.workflowBadge}>
              <Text style={styles.workflowBadgeText}>Video Workflow</Text>
            </View>

            <View style={styles.bannerActions}>
              <TouchableOpacity style={styles.refreshBtn} onPress={refreshVideoServices}>
                <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.openApptsBtn}
                onPress={() => onNavigateScreen('appointments')}>
                <Text style={styles.openApptsBtnText}>📅 Open Appointments</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.bannerTitle}>📹 Video Services</Text>
          <Text style={styles.bannerSub}>
            One professional workspace for video calls, consultation history, and video billing.
          </Text>

          {lastRefreshed ? (
            <Text style={styles.timestampText}>Last refreshed: {lastRefreshed}</Text>
          ) : null}
        </View>

        {/* 3 KPI Stat Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Today's Video Appointments</Text>
            <Text style={styles.statVal}>{stats.today_video_appointments}</Text>
            <Text style={styles.statSub}>All video consultations scheduled for today.</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Waiting to Call</Text>
            <Text style={styles.statVal}>{stats.waiting_to_call}</Text>
            <Text style={styles.statSub}>Appointments still ready for staff or doctor action.</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Video Revenue Collected</Text>
            <Text style={[styles.statVal, { color: '#0f172a' }]}>
              ₹{Number(stats.video_revenue_collected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.statSub}>
              {stats.pending_payment_count || 0} bill(s) still have pending payment.
            </Text>
          </View>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'calls' && styles.tabBtnActive]}
            onPress={() => setActiveTab('calls')}>
            <Text style={[styles.tabBtnText, activeTab === 'calls' && styles.tabBtnTextActive]}>
              📹 Video Calls
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
            onPress={() => setActiveTab('history')}>
            <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
              🩺 Consultancy History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'billing' && styles.tabBtnActive]}
            onPress={() => setActiveTab('billing')}>
            <Text style={[styles.tabBtnText, activeTab === 'billing' && styles.tabBtnTextActive]}>
              💵 Video Billing
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchCard}>
          <Text style={styles.searchIconText}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by patient name, mobile number, patient code, doctor, appointment ID, status..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* TAB 1: VIDEO CALLS QUEUE */}
        {activeTab === 'calls' && (
          <View style={styles.contentSection}>
            <View style={styles.sectionHeaderBox}>
              <Text style={styles.sectionTitle}>Video Call Queue</Text>
              <Text style={styles.sectionSub}>Start and monitor live video consultations.</Text>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 30 }} />
            ) : filteredCalls.length === 0 ? (
              <View style={styles.emptyQueueBox}>
                <Text style={styles.emptyQueueText}>No active video calls in queue.</Text>
              </View>
            ) : (
              <View style={styles.queueList}>
                {filteredCalls.map((item, idx) => (
                  <View key={item.id ? `call-${item.id}` : `call-${idx}`} style={styles.callCard}>
                    <View style={styles.callCardHeader}>
                      <View>
                        <Text style={styles.callPatientName}>
                          {item.patient_name || 'Patient'}
                        </Text>
                        <Text style={styles.callMetaText}>
                          📞 {item.patient_phone || 'N/A'} • 👨‍⚕️ {item.doctor_name || 'Doctor'}
                        </Text>
                      </View>

                      <View style={styles.timeBadge}>
                        <Text style={styles.timeBadgeText}>🕒 {item.appointment_time || '10:00 AM'}</Text>
                      </View>
                    </View>

                    {item.reason ? (
                      <Text style={styles.callReasonText}>Reason: {item.reason}</Text>
                    ) : null}

                    <View style={styles.callActionRow}>
                      <TouchableOpacity
                        style={styles.joinCallBtn}
                        onPress={() => handleJoinCall(item)}>
                        <Text style={styles.joinCallBtnText}>📹 Join Video Call</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: CONSULTANCY HISTORY */}
        {activeTab === 'history' && (
          <View style={styles.contentSection}>
            <View style={styles.sectionHeaderBox}>
              <Text style={styles.sectionTitle}>Video Consultancy History</Text>
              <Text style={styles.sectionSub}>Past completed online consultations & clinical records.</Text>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 30 }} />
            ) : filteredHistory.length === 0 ? (
              <View style={styles.emptyQueueBox}>
                <Text style={styles.emptyQueueText}>No past video consultation history found.</Text>
              </View>
            ) : (
              <View style={styles.queueList}>
                {filteredHistory.map((h, idx) => (
                  <View key={h.id ? `hist-${h.id}` : `hist-${idx}`} style={styles.callCard}>
                    <View style={styles.callCardHeader}>
                      <View>
                        <Text style={styles.callPatientName}>{h.patient_name}</Text>
                        <Text style={styles.callMetaText}>
                          👨‍⚕️ {h.doctor_name} · Date: {h.date}
                        </Text>
                      </View>
                      <View style={styles.completedBadge}>
                        <Text style={styles.completedBadgeText}>✓ Completed</Text>
                      </View>
                    </View>
                    {h.diagnosis ? (
                      <Text style={styles.callReasonText}>Diagnosis: {h.diagnosis}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB 3: VIDEO BILLING */}
        {activeTab === 'billing' && (
          <View style={styles.contentSection}>
            <View style={styles.sectionHeaderBox}>
              <Text style={styles.sectionTitle}>Video Consultation Billing</Text>
              <Text style={styles.sectionSub}>Track payments and invoices for online teleconsultations.</Text>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 30 }} />
            ) : filteredBilling.length === 0 ? (
              <View style={styles.emptyQueueBox}>
                <Text style={styles.emptyQueueText}>No video billing records found.</Text>
              </View>
            ) : (
              <View style={styles.queueList}>
                {filteredBilling.map((b, idx) => (
                  <View key={b.id ? `bill-${b.id}` : `bill-${idx}`} style={styles.callCard}>
                    <View style={styles.callCardHeader}>
                      <View>
                        <Text style={styles.callPatientName}>{b.patient_name}</Text>
                        <Text style={styles.callMetaText}>
                          👨‍⚕️ {b.doctor_name} · Bill #{b.bill_number || `VB-${b.id}`}
                        </Text>
                      </View>
                      <View style={styles.amountBadge}>
                        <Text style={styles.amountBadgeText}>
                          ₹{Number(b.amount || 0).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.paymentRow}>
                      <Text style={styles.paymentStatusText}>
                        Status:{' '}
                        <Text
                          style={{
                            color: b.payment_status === 'paid' ? '#16a34a' : '#ea580c',
                            fontWeight: '800',
                          }}>
                          {String(b.payment_status || 'Pending').toUpperCase()}
                        </Text>
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Live In-App Video Call Room Modal */}
      <Modal
        visible={showCallModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCallModal(false)}>
        <View style={styles.videoRoomBg}>
          <View style={styles.videoRoomHeader}>
            <Text style={styles.videoRoomTitle}>
              📹 Live Video Room - {activeCallRoom?.patient_name || 'Patient'}
            </Text>
            <TouchableOpacity onPress={() => setShowCallModal(false)}>
              <Text style={styles.closeRoomText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Video Stream Simulated Workspace */}
          <View style={styles.videoStreamContainer}>
            <View style={styles.patientStreamBox}>
              <Text style={styles.streamAvatarText}>
                {(activeCallRoom?.patient_name || 'P').charAt(0)}
              </Text>
              <Text style={styles.streamNameTag}>{activeCallRoom?.patient_name || 'Patient'} (Connected)</Text>
            </View>

            <View style={styles.doctorSelfStreamBox}>
              <Text style={styles.selfStreamText}>Doctor View</Text>
            </View>
          </View>

          {/* Video Call Controls */}
          <View style={styles.controlsBar}>
            <TouchableOpacity
              style={[styles.controlCircleBtn, isMicMuted && styles.controlBtnMuted]}
              onPress={() => setIsMicMuted(!isMicMuted)}>
              <Text style={styles.controlIconText}>{isMicMuted ? '🔇' : '🎙️'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlCircleBtn, isCameraOff && styles.controlBtnMuted]}
              onPress={() => setIsCameraOff(!isCameraOff)}>
              <Text style={styles.controlIconText}>{isCameraOff ? '📷❌' : '📹'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.endCallBtn}
              onPress={() => {
                setShowCallModal(false);
                Alert.alert('Call Ended', 'Video consultation completed successfully!');
              }}>
              <Text style={styles.endCallBtnText}>📞 End Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  bannerBox: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  workflowBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  workflowBadgeText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  bannerActions: { flexDirection: 'row', gap: 8 },
  refreshBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  refreshBtnText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  openApptsBtn: { backgroundColor: '#0d9488', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  openApptsBtnText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  bannerTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  bannerSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  timestampText: { fontSize: 11, color: '#94a3b8', marginTop: 8 },
  statsGrid: { gap: 10, marginBottom: 16 },
  statCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  statVal: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginVertical: 4 },
  statSub: { fontSize: 11, color: '#94a3b8' },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  tabBtnText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  tabBtnTextActive: { color: '#ffffff' },
  searchCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, marginBottom: 16 },
  searchIconText: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 13, color: '#0f172a' },
  contentSection: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionHeaderBox: { marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  sectionSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  emptyQueueBox: { borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyQueueText: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  queueList: { gap: 12 },
  callCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  callCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  callPatientName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  callMetaText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  timeBadge: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  timeBadgeText: { fontSize: 11, fontWeight: '800', color: '#0369a1' },
  callReasonText: { fontSize: 12, color: '#475569', marginTop: 6 },
  callActionRow: { marginTop: 10 },
  joinCallBtn: { backgroundColor: '#0d9488', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  joinCallBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  completedBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  completedBadgeText: { fontSize: 11, fontWeight: '800', color: '#15803d' },
  amountBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  amountBadgeText: { fontSize: 12, fontWeight: '800', color: '#b45309' },
  paymentRow: { marginTop: 6 },
  paymentStatusText: { fontSize: 12, color: '#475569' },
  videoRoomBg: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  videoRoomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  videoRoomTitle: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  closeRoomText: { fontSize: 20, color: '#94a3b8', fontWeight: 'bold' },
  videoStreamContainer: { flex: 1, backgroundColor: '#1e293b', borderRadius: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  patientStreamBox: { alignItems: 'center' },
  streamAvatarText: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#0d9488', color: '#ffffff', fontSize: 36, fontWeight: 'bold', textAlign: 'center', lineHeight: 80 },
  streamNameTag: { color: '#ffffff', fontWeight: '700', marginTop: 10, fontSize: 14 },
  doctorSelfStreamBox: { position: 'absolute', bottom: 16, right: 16, width: 100, height: 130, backgroundColor: '#334155', borderRadius: 10, borderBottomWidth: 2, borderColor: '#0d9488', justifyContent: 'center', alignItems: 'center' },
  selfStreamText: { color: '#94a3b8', fontSize: 10, fontWeight: '700' },
  controlsBar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 20 },
  controlCircleBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  controlBtnMuted: { backgroundColor: '#ef4444' },
  controlIconText: { fontSize: 20 },
  endCallBtn: { backgroundColor: '#dc2626', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 25 },
  endCallBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
});

export default VideoServicesScreen;
