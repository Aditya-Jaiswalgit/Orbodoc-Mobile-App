import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useVideoCall } from '../../hooks/useVideoCall';
import { VideoCallModal } from '../../components/video/VideoCallModal';

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

  const [activeTab, setActiveTab] = useState<'calls' | 'history' | 'billing'>('calls');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleJoinCall = (callItem: any) => {
    connectVideoCall(callItem);
  };

  const handleEndCall = () => {
    endVideoCall(() => {
      refreshVideoServices();
    });
  };

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
    return (
      String(item.patient_name || '').toLowerCase().includes(q) ||
      String(item.doctor_name || '').toLowerCase().includes(q)
    );
  });

  const filteredBilling = (videoBilling || []).filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      String(item.patient_name || '').toLowerCase().includes(q) ||
      String(item.doctor_name || '').toLowerCase().includes(q) ||
      String(item.bill_number || '').toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} onOpenNotifications={onOpenNotifications} title="Video Consultation Manager" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshVideoServices} colors={['#0d9488']} />
        }>
        {/* Banner Section */}
        <View style={styles.bannerBox}>
          <View style={styles.badgeRow}>
            <View style={styles.workflowBadge}>
              <Text style={styles.workflowBadgeText}>TELEMEDICINE WORKFLOW</Text>
            </View>
            <View style={styles.bannerActions}>
              <TouchableOpacity style={styles.refreshBtn} onPress={refreshVideoServices}>
                <Text style={styles.refreshBtnText}>🔄 Refresh Data</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.openApptsBtn}
                onPress={() => onNavigateScreen('appointments')}>
                <Text style={styles.openApptsBtnText}>📅 All Appointments</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.bannerTitle}>Video Consultation Desk</Text>
          <Text style={styles.bannerSub}>
            Monitor patient waiting queue, connect live video calls, view past consultation history, and track billing revenue.
          </Text>
          {lastRefreshed ? (
            <Text style={styles.timestampText}>Last refreshed: {lastRefreshed}</Text>
          ) : null}
        </View>

        {/* 4 Stat Summary Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Today's Video Appointments</Text>
            <Text style={styles.statVal}>{stats.today_video_appointments}</Text>
            <Text style={styles.statSubText}>Scheduled for online consultation</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Waiting to Call</Text>
            <Text style={[styles.statVal, { color: '#0d9488' }]}>{stats.waiting_to_call}</Text>
            <Text style={styles.statSubText}>Active patient queue</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Video Revenue Collected</Text>
            <Text style={[styles.statVal, { color: '#16a34a' }]}>
              ₹{Number(stats.video_revenue_collected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.statSubText}>Settled wallet & billing payments</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending Bills</Text>
            <Text style={[styles.statVal, { color: '#dc2626' }]}>{stats.pending_payment_count}</Text>
            <Text style={styles.statSubText}>Awaiting wallet settlement</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarBox}>
          <Text style={styles.searchIconText}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search patient name, phone, code, status..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Main Tab Navigation */}
        <View style={styles.mainCardBox}>
          <View style={styles.tabsHeader}>
            <TouchableOpacity
              style={[styles.tabPill, activeTab === 'calls' && styles.tabPillActive]}
              onPress={() => setActiveTab('calls')}>
              <Text style={[styles.tabPillText, activeTab === 'calls' && styles.tabPillTextActive]}>
                Video Calls ({activeCalls.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabPill, activeTab === 'history' && styles.tabPillActive]}
              onPress={() => setActiveTab('history')}>
              <Text style={[styles.tabPillText, activeTab === 'history' && styles.tabPillTextActive]}>
                History ({consultancyHistory.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabPill, activeTab === 'billing' && styles.tabPillActive]}
              onPress={() => setActiveTab('billing')}>
              <Text style={[styles.tabPillText, activeTab === 'billing' && styles.tabPillTextActive]}>
                Billing ({videoBilling.length})
              </Text>
            </TouchableOpacity>
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
                <Text style={styles.sectionTitle}>Consultation History</Text>
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
        </View>
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
        isDoctor={true}
        onSetDoctorNotes={setDoctorNotes}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onToggleSpeaker={toggleSpeaker}
        onEndCall={handleEndCall}
      />
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
  statSubText: { fontSize: 11, color: '#94a3b8' },
  searchBarBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, marginBottom: 16 },
  searchIconText: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 13, color: '#0f172a' },
  clearSearchText: { fontSize: 14, color: '#94a3b8', padding: 4 },
  mainCardBox: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  tabsHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: 6, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', gap: 6 },
  tabPill: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  tabPillActive: { backgroundColor: '#0d9488' },
  tabPillText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  tabPillTextActive: { color: '#ffffff', fontWeight: '800' },
  contentSection: { padding: 14 },
  sectionHeaderBox: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  sectionSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  emptyQueueBox: { padding: 30, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyQueueText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  queueList: { gap: 10 },
  callCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  callCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  callPatientName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  callMetaText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  timeBadge: { backgroundColor: '#ccfbf1', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  timeBadgeText: { fontSize: 11, fontWeight: '800', color: '#0f766e' },
  callReasonText: { fontSize: 12, color: '#334155', fontStyle: 'italic' },
  callActionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  joinCallBtn: { backgroundColor: '#0d9488', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  joinCallBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  completedBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  completedBadgeText: { fontSize: 11, fontWeight: '800', color: '#15803d' },
  amountBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  amountBadgeText: { fontSize: 13, fontWeight: '800', color: '#16a34a' },
  paymentRow: { marginTop: 4 },
  paymentStatusText: { fontSize: 11, color: '#64748b' },
});

export default VideoServicesScreen;
