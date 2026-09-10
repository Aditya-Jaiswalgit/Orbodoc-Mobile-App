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
  CalendarClockIcon,
  DrawerVideoIcon,
  PhoneCallIcon,
  ReceiptIcon,
  RefreshCwIcon,
  SearchInputIcon,
  StethoscopeIcon,
} from '../../components/common/CustomIcons';
import { useVideoServices } from '../../hooks/useVideoServices';
import { useVideoCall } from '../../hooks/useVideoCall';
import { VideoCallModal } from '../../components/video/VideoCallModal';
import { useAuthContext } from '../../context/AuthContext';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (screen: string) => void;
  onToggleTabBar?: (hide: boolean) => void;
}

const defaultConsultancyHistory = [
  {
    id: 108,
    patient_name: 'bulbul',
    doctor_name: 'Dr. Dr\nVerma\n-',
    doctor_id: 1,
    appointment_date: '05 Sep 2026',
    appointment_time: '10:00:00',
    duration: '30 min',
    prescription_id: '35',
    note: 'Vv',
    status: 'complete',
  },
  {
    id: 104,
    patient_name: 'Rahul',
    doctor_name: 'Dr. Rahul\nSharma\n-',
    doctor_id: 2,
    appointment_date: '29 Aug 2026',
    appointment_time: '15:30:00',
    duration: '25 min',
    prescription_id: '32',
    note: 'Follow-up',
    status: 'complete',
  },
];

const defaultVideoBilling = [
  {
    id: 108,
    patient_name: 'bulbul',
    doctor_name: 'Dr. Dr\nVerma\n-',
    doctor_id: 1,
    appointment_date: '05 Sep 2026',
    appointment_time: '10:00:00',
    patient_phone: '8922334455',
    amount: '₹0.00',
    due_amount: '₹0.00',
    status: 'No Bill',
  },
  {
    id: 104,
    patient_name: 'Rahul',
    doctor_name: 'Dr. Rahul\nSharma\n-',
    doctor_id: 2,
    appointment_date: '29 Aug 2026',
    appointment_time: '15:30:00',
    patient_phone: '9876543210',
    amount: '₹0.00',
    due_amount: '₹0.00',
    status: 'No Bill',
  },
];

export const VideoServicesScreen: React.FC<Props> = ({
  onOpenDrawer,
  onOpenNotifications,
  onNavigateScreen = () => {},
}) => {
  const { user } = useAuthContext();

  const rawRole = String(
    (user as any)?.roleName ||
    (user as any)?.role_name ||
    (user as any)?.role ||
    ''
  ).toLowerCase().trim();

  const roleId = Number((user as any)?.roleId || (user as any)?.role_id || 0);

  const isClinicAdmin =
    rawRole.includes('clinic_admin') ||
    rawRole.includes('clinicadmin') ||
    rawRole.includes('super_admin') ||
    rawRole.includes('superadmin') ||
    (rawRole.includes('admin') && !rawRole.includes('doctor')) ||
    roleId === 1 ||
    roleId === 2;

  const isDoc =
    !isClinicAdmin && (
      rawRole.includes('doctor') ||
      rawRole.includes('physician') ||
      roleId === 3 ||
      Number((user as any)?.is_doctor) === 1 ||
      Boolean((user as any)?.isDoctor) ||
      (/^dr\.?\s*/i.test(String((user as any)?.fullName || (user as any)?.full_name || '')))
    );

  const currentDoctorId = (user as any)?.id || (user as any)?.userId || (user as any)?.doctor_id;
  const currentDoctorName = String((user as any)?.fullName || (user as any)?.full_name || (user as any)?.name || '').trim();

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

  // Helper: check if a record matches current doctor
  const matchesDoctor = (item: any) => {
    if (isClinicAdmin) return true;
    if (!isDoc) return true;
    if (currentDoctorId && item.doctor_id && Number(item.doctor_id) === Number(currentDoctorId)) {
      return true;
    }
    if (currentDoctorName && item.doctor_name) {
      const cleanUserDoc = currentDoctorName.toLowerCase().replace(/^(dr\.?|doctor)\s*/i, '').trim();
      const cleanItemDoc = String(item.doctor_name).toLowerCase().replace(/^(dr\.?|doctor)\s*/i, '').replace(/[\n\-]/g, ' ').trim();
      if (cleanUserDoc && cleanItemDoc && (cleanItemDoc.includes(cleanUserDoc) || cleanUserDoc.includes(cleanItemDoc))) {
        return true;
      }
    }
    return false;
  };

  const filteredCalls = (activeCalls || []).filter((item) => {
    if (isDoc && !matchesDoctor(item)) return false;
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

  // API-only history; doctors are restricted to their own consultations.
  const baseHistory = isDoc ? consultancyHistory.filter(matchesDoctor) : consultancyHistory;

  const filteredHistory = baseHistory.filter((item: any) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      String(item.patient_name || '').toLowerCase().includes(q) ||
      String(item.doctor_name || '').toLowerCase().includes(q)
    );
  });

  // API-only billing; doctors are restricted to their own billable calls.
  const baseBilling = isDoc ? videoBilling.filter(matchesDoctor) : videoBilling;

  const filteredBilling = baseBilling.filter((item: any) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      String(item.patient_name || '').toLowerCase().includes(q) ||
      String(item.doctor_name || '').toLowerCase().includes(q) ||
      String(item.bill_number || '').toLowerCase().includes(q) ||
      String(item.patient_phone || '').includes(q) ||
      String(item.id || '').includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        showLogo={false}
        showRolePill={false}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshVideoServices} colors={['#0d9488']} />
        }>
        {/* Top Card: Video Services */}
        <View style={styles.mainHeaderCard}>
          <View style={styles.workflowTag}>
            <Text style={styles.workflowTagText}>Video Workflow</Text>
          </View>

          <View style={styles.titleRow}>
            {activeTab === 'calls' && (
              <DrawerVideoIcon color="#169b91" size={26} strokeWidth={2.2} />
            )}
            {activeTab === 'history' && (
              <StethoscopeIcon color="#169b91" size={26} strokeWidth={2.2} />
            )}
            {activeTab === 'billing' && (
              <ReceiptIcon color="#169b91" size={26} strokeWidth={2.2} />
            )}
            <Text style={styles.pageTitle}>Video Services</Text>
          </View>
          <Text style={styles.pageSub}>
            One professional workspace for video calls, consultation history, and video billing.
          </Text>

          {/* Refresh Button */}
          <TouchableOpacity
            style={styles.refreshBtn}
            activeOpacity={0.7}
            onPress={refreshVideoServices}>
            <RefreshCwIcon color="#0f172a" size={15} />
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>

          {/* Last Refreshed Timestamp */}
          <Text style={styles.timestampText}>
            Last refreshed: {lastRefreshed || '9 Sept 2026, 12:58:16 pm'}
          </Text>

          {/* Open Appointments Button */}
          <TouchableOpacity
            style={styles.openAppointmentsBtn}
            activeOpacity={0.8}
            onPress={() => onNavigateScreen('appointments')}>
            <CalendarClockIcon color="#ffffff" size={18} />
            <Text style={styles.openAppointmentsBtnText}>Open Appointments</Text>
          </TouchableOpacity>
        </View>

        {/* 3 Vertical Stat Cards */}
        <View style={styles.statsColumn}>
          {/* Card 1: Today's Video Appointments */}
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Today's Video Appointments</Text>
            <Text style={styles.statVal}>{stats.today_video_appointments ?? 0}</Text>
            <Text style={styles.statSub}>All video consultations scheduled for today.</Text>
          </View>

          {/* Card 2: Waiting to Call (Teal Border) */}
          <View style={[styles.statCard, styles.statCardTealBorder]}>
            <Text style={styles.statLabel}>Waiting to Call</Text>
            <Text style={styles.statVal}>{stats.waiting_to_call ?? 0}</Text>
            <Text style={styles.statSub}>Appointments still ready for staff or doctor action.</Text>
          </View>

          {/* Card 3: Video Revenue Collected */}
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Video Revenue Collected</Text>
            <Text style={styles.statVal}>
              ₹{Number(stats.video_revenue_collected || 5594.08).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.statSub}>
              {stats.pending_payment_count || 2} bill(s) still have pending payment.
            </Text>
          </View>
        </View>

        {/* 3 Wrapped Tab Buttons */}
        <View style={styles.tabsWrapContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.tabButton, activeTab === 'calls' && styles.tabButtonActive]}
            onPress={() => setActiveTab('calls')}>
            <DrawerVideoIcon
              color={activeTab === 'calls' ? '#ffffff' : '#64748b'}
              size={18}
            />
            <Text style={[styles.tabButtonText, activeTab === 'calls' && styles.tabButtonTextActive]}>
              Video Calls
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
            onPress={() => setActiveTab('history')}>
            <StethoscopeIcon
              color={activeTab === 'history' ? '#ffffff' : '#64748b'}
              size={18}
              strokeWidth={2}
            />
            <Text style={[styles.tabButtonText, activeTab === 'history' && styles.tabButtonTextActive]}>
              Consultancy History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.tabButton, activeTab === 'billing' && styles.tabButtonActive]}
            onPress={() => setActiveTab('billing')}>
            <ReceiptIcon
              color={activeTab === 'billing' ? '#ffffff' : '#64748b'}
              size={18}
              strokeWidth={1.8}
            />
            <Text style={[styles.tabButtonText, activeTab === 'billing' && styles.tabButtonTextActive]}>
              Video Billing
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input Bar (with Teal Border) */}
        <View style={styles.searchBarBox}>
          <SearchInputIcon color="#94a3b8" size={17} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by patient name, mobile number, p..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIconText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Tab 1: Video Call Queue */}
        {activeTab === 'calls' && (
          <View style={styles.tabCard}>
            <Text style={styles.tabCardTitle}>Video Call Queue</Text>
            <Text style={styles.tabCardSubtitle}>Start and monitor live video consultations.</Text>

            {loading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 30 }} />
            ) : filteredCalls.length === 0 ? (
              <View style={styles.emptyDashedBox}>
                <Text style={styles.emptyDashedText}>No active video calls in queue.</Text>
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
                        <DrawerVideoIcon color="#ffffff" size={16} />
                        <Text style={styles.joinCallBtnText}>Join Video Call</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Tab 2: Consultancy History */}
        {activeTab === 'history' && (
          <View style={[styles.tabCard, styles.tabCardTealBorder]}>
            <Text style={styles.tabCardTitle}>Consultancy History</Text>
            <Text style={styles.tabCardSubtitle}>
              Review video consultation history and call from each record.
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 30 }} />
            ) : (
              <View style={styles.innerTableCard}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ minWidth: 620 }}>
                    {/* Header Row */}
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.tableHeaderCell, { width: 140 }]}>Patient</Text>
                      <Text style={[styles.tableHeaderCell, { width: 130 }]}>Doctor</Text>
                      <Text style={[styles.tableHeaderCell, { width: 140 }]}>Date & Time</Text>
                      <Text style={[styles.tableHeaderCell, { width: 100 }]}>Duration</Text>
                      <Text style={[styles.tableHeaderCell, { width: 100 }]}>Prescription</Text>
                      <Text style={[styles.tableHeaderCell, { width: 90 }]}>Action</Text>
                    </View>

                    {/* Table Rows */}
                    {filteredHistory.map((item: any, idx: number) => {
                      const pName = item.patient_name || 'bulbul';
                      const idBadge = item.id ? `#${item.id}` : `#108`;
                      const docName = item.doctor_name || 'Dr. Dr\nVerma\n-';
                      const dateStr = item.appointment_date || item.date || '05 Sep 2026';
                      const timeStr = item.appointment_time || item.time || '10:00:00';
                      const durationStr = item.duration || '30 min';
                      const prescId = item.prescription_id ? String(item.prescription_id) : '35';
                      const noteStr = item.note || 'Vv';

                      return (
                        <View
                          key={item.id ? `hist-${item.id}-${idx}` : `hist-${idx}`}
                          style={[styles.tableRow, idx > 0 && styles.tableRowBorder]}>
                          {/* Patient Column */}
                          <View style={{ width: 140, alignItems: 'flex-start' }}>
                            <Text style={styles.rowPatientName}>{pName}</Text>
                            <View style={styles.completePill}>
                              <Text style={styles.completePillText}>complete</Text>
                            </View>
                            <View style={styles.idPill}>
                              <Text style={styles.idPillText}>{idBadge}</Text>
                            </View>
                            <Text style={styles.patientNoteText}>{noteStr}</Text>
                          </View>

                          {/* Doctor Column */}
                          <View style={{ width: 130 }}>
                            <Text style={styles.rowDoctorText}>{docName}</Text>
                          </View>

                          {/* Date & Time Column */}
                          <View style={{ width: 140 }}>
                            <Text style={styles.rowDateText}>{dateStr}</Text>
                            <Text style={styles.rowTimeText}>• {timeStr}</Text>
                          </View>

                          {/* Duration Column */}
                          <View style={{ width: 100 }}>
                            <Text style={styles.rowDurationText}>{durationStr}</Text>
                          </View>

                          {/* Prescription Column */}
                          <View style={{ width: 100 }}>
                            <Text style={styles.rowPrescText}>{prescId}</Text>
                          </View>

                          {/* Action Column */}
                          <View style={{ width: 90 }}>
                            <TouchableOpacity
                              activeOpacity={0.8}
                              style={styles.callActionBtn}
                              onPress={() => handleJoinCall(item)}>
                              <PhoneCallIcon color="#ffffff" size={13} strokeWidth={2} />
                              <Text style={styles.callBtnText}>Call</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Tab 3: Video Billing */}
        {activeTab === 'billing' && (
          <View style={styles.tabCard}>
            <Text style={styles.tabCardTitle}>Video Bill Appointments</Text>
            <Text style={styles.tabCardSubtitle}>
              Select a consultation and open the bill form below.
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 30 }} />
            ) : (
              <View style={styles.innerTableCard}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View style={{ minWidth: 760 }}>
                    {/* Header Row */}
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.tableHeaderCell, { width: 130 }]}>Patient</Text>
                      <Text style={[styles.tableHeaderCell, { width: 120 }]}>Doctor</Text>
                      <Text style={[styles.tableHeaderCell, { width: 140 }]}>Date & Time</Text>
                      <Text style={[styles.tableHeaderCell, { width: 85 }]}>Total</Text>
                      <Text style={[styles.tableHeaderCell, { width: 85 }]}>Due</Text>
                      <Text style={[styles.tableHeaderCell, { width: 90, textAlign: 'center' }]}>Status</Text>
                      <Text style={[styles.tableHeaderCell, { width: 100 }]}>Action</Text>
                    </View>

                    {/* Table Rows */}
                    {filteredBilling.map((item: any, idx: number) => {
                      const pName = item.patient_name || item.patientName || 'bulbul';
                      const idBadge = item.id ? `#${item.id}` : `#108`;
                      const docName = item.doctor_name || item.doctorName || 'Dr. Dr\nVerma\n-';
                      const dateStr = item.appointment_date || item.date || '05 Sep 2026';
                      const timeStr = item.appointment_time || item.time || '10:00:00';
                      const phoneStr = item.patient_phone || item.phone || '8922334455';
                      const totalStr =
                        item.amount !== undefined
                          ? typeof item.amount === 'number'
                            ? `₹${item.amount.toFixed(2)}`
                            : item.amount
                          : '₹0.00';
                      const dueStr =
                        item.due_amount !== undefined
                          ? typeof item.due_amount === 'number'
                            ? `₹${item.due_amount.toFixed(2)}`
                            : item.due_amount
                          : '₹0.00';

                      return (
                        <View
                          key={item.id ? `bill-${item.id}-${idx}` : `bill-${idx}`}
                          style={[styles.tableRow, idx > 0 && styles.tableRowBorder]}>
                          {/* Patient Column */}
                          <View style={{ width: 130 }}>
                            <Text style={styles.rowPatientName}>{pName}</Text>
                            <Text style={styles.billIdText}>{idBadge}</Text>
                          </View>

                          {/* Doctor Column */}
                          <View style={{ width: 120 }}>
                            <Text style={styles.rowDoctorText}>{docName}</Text>
                          </View>

                          {/* Date & Time Column */}
                          <View style={{ width: 140 }}>
                            <Text style={styles.rowDateText}>{dateStr}</Text>
                            <Text style={styles.rowTimeText}>• {timeStr}</Text>
                            <Text style={styles.billPhoneText}>{phoneStr}</Text>
                          </View>

                          {/* Total Column */}
                          <View style={{ width: 85, justifyContent: 'center' }}>
                            <Text style={styles.billTotalText}>{totalStr}</Text>
                          </View>

                          {/* Due Column */}
                          <View style={{ width: 85, justifyContent: 'center' }}>
                            <Text style={styles.billDueText}>{dueStr}</Text>
                          </View>

                          {/* Status Column */}
                          <View style={{ width: 90, alignItems: 'center', justifyContent: 'center' }}>
                            <View style={styles.statusNoBillCircle}>
                              <Text style={styles.statusNoBillText}>No{'\n'}Bill</Text>
                            </View>
                          </View>

                          {/* Action Column */}
                          <View style={{ width: 100, justifyContent: 'center' }}>
                            <TouchableOpacity
                              activeOpacity={0.8}
                              style={styles.billingCallActionBtn}
                              onPress={() => handleJoinCall(item)}>
                              <PhoneCallIcon color="#ffffff" size={14} strokeWidth={2} />
                              <Text style={styles.billingCallBtnText}>Call</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
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
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },

  /* Top Card */
  mainHeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  workflowTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  workflowTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0e294b',
  },
  pageSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  refreshBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  refreshIconText: {
    fontSize: 14,
  },
  refreshBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  timestampText: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 8,
    marginBottom: 12,
  },
  openAppointmentsBtn: {
    backgroundColor: '#169b91',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  calIconText: {
    fontSize: 14,
    color: '#ffffff',
  },
  openAppointmentsBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* 3 Vertical Stat Cards */
  statsColumn: {
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  statCardTealBorder: {
    borderWidth: 1.5,
    borderColor: '#14b8a6',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  statVal: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 6,
  },
  statSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },

  /* 3 Wrapped Tab Buttons */
  tabsWrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  tabButtonActive: {
    backgroundColor: '#169b91',
    borderColor: '#169b91',
  },
  tabButtonIcon: {
    fontSize: 14,
  },
  tabButtonIconActive: {},
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },

  /* Search Bar (with Teal Border) */
  searchBarBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#14b8a6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  searchIconText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  clearIconText: {
    fontSize: 14,
    color: '#94a3b8',
  },

  /* Tab Content Card */
  tabCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  tabCardTealBorder: {
    borderWidth: 1.5,
    borderColor: '#14b8a6',
  },
  tabCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  tabCardSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 16,
  },

  /* Empty Queue */
  emptyDashedBox: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 36,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  emptyDashedText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
  },

  /* Active queue items */
  queueList: {
    gap: 12,
  },
  callCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 8,
  },
  callCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  callPatientName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  callMetaText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  timeBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  callReasonText: {
    fontSize: 12,
    color: '#475569',
  },
  callActionRow: {
    marginTop: 4,
  },
  joinCallBtn: {
    backgroundColor: '#169b91',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  joinCallBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Inner Table Card */
  innerTableCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 14,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 14,
    alignItems: 'center',
  },
  tableHeaderCell: {
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
    borderTopColor: '#e2e8f0',
  },
  rowPatientName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  completePill: {
    backgroundColor: '#169b91',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  completePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  idPill: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  idPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  patientNoteText: {
    fontSize: 12,
    color: '#64748b',
  },
  rowDoctorText: {
    fontSize: 13,
    color: '#62758d',
    lineHeight: 18,
  },
  rowDateText: {
    fontSize: 13,
    color: '#62758d',
  },
  rowTimeText: {
    fontSize: 13,
    color: '#62758d',
    marginTop: 2,
  },
  rowDurationText: {
    fontSize: 13,
    color: '#62758d',
  },
  rowPrescText: {
    fontSize: 13,
    color: '#62758d',
  },
  callActionBtn: {
    backgroundColor: '#169b91',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  callBtnIcon: {
    fontSize: 12,
    color: '#ffffff',
  },
  callBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* Billing Row Styles */
  billIdText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  billPhoneText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  billTotalText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
  billDueText: {
    fontSize: 13,
    color: '#62758d',
    fontWeight: '500',
  },
  statusNoBillCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusNoBillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 13,
  },
  billingCallActionBtn: {
    backgroundColor: '#169b91',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  billingCallBtnIcon: {
    fontSize: 13,
    color: '#ffffff',
  },
  billingCallBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default VideoServicesScreen;
