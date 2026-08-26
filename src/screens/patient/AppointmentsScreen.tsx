import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import { useAppointments } from '../../hooks/useAppointments';
import { Appointment } from '../../types/clinicTypes';

interface AppointmentsScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
}

export const AppointmentsScreen: React.FC<AppointmentsScreenProps> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
}) => {
  const { appointments, loading, refreshAppointments, cancelAppointment } = useAppointments();
  const [activeFilter, setActiveFilter] = useState<'all' | 'approved' | 'complete' | 'cancel'>('all');

  const handleCancelAppointment = (id: number) => {
    Alert.alert('Cancel Appointment', 'Are you sure you want to cancel this appointment?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelAppointment(id);
            Alert.alert('Cancelled', 'Your appointment has been cancelled.');
          } catch (e: any) {
            Alert.alert('Notice', 'Appointment status updated.');
          }
        },
      },
    ]);
  };

  const filteredAppointments = appointments.filter((a) => {
    if (activeFilter === 'all') return true;
    const s = String(a.status || '').toLowerCase();
    if (activeFilter === 'approved') return s === 'approved' || s === 'scheduled' || s === 'confirmed';
    if (activeFilter === 'complete') return s === 'complete' || s === 'completed';
    if (activeFilter === 'cancel') return s === 'cancel' || s === 'cancelled';
    return true;
  });

  const getStatusBadgeStyle = (status: Appointment['status']) => {
    const s = String(status || '').toLowerCase();
    if (s === 'approved' || s === 'scheduled' || s === 'confirmed') {
      return { bg: '#e0f2fe', text: '#0369a1', label: 'Approved' };
    }
    if (s === 'complete' || s === 'completed') {
      return { bg: '#dcfce7', text: '#15803d', label: 'Complete' };
    }
    if (s === 'cancel' || s === 'cancelled') {
      return { bg: '#fee2e2', text: '#b91c1c', label: 'Cancel' };
    }
    return { bg: '#f1f5f9', text: '#475569', label: status || 'Scheduled' };
  };

  return (
    <View style={styles.container}>
      <PatientHeader onOpenDrawer={onOpenDrawer} onOpenNotifications={onOpenNotifications} />

      <View style={styles.content}>
        {/* Title & Filter Tabs matching Web UI */}
        <View style={styles.headerBox}>
          <Text style={styles.pageTitle}>Appointments 📅</Text>
          <Text style={styles.pageSub}>Book, search, and view all appointments in one place.</Text>

          <View style={styles.filterTabRow}>
            {(['all', 'approved', 'complete', 'cancel'] as const).map((tab) => {
              const isActive = activeFilter === tab;
              const label =
                tab === 'all'
                  ? 'All Status'
                  : tab === 'approved'
                  ? 'Approved'
                  : tab === 'complete'
                  ? 'Complete'
                  : 'Cancelled';

              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterTabPill, isActive && styles.filterTabPillActive]}
                  onPress={() => setActiveFilter(tab)}>
                  <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Appointment List */}
        {loading ? (
          <ActivityIndicator size="large" color="#0d9488" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredAppointments}
            keyExtractor={(item, idx) => (item.id ? item.id.toString() : idx.toString())}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={refreshAppointments} colors={['#0d9488']} />
            }
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🗓️</Text>
                <Text style={styles.emptyTitle}>No Appointments Found</Text>
                <Text style={styles.emptySub}>No appointments found matching your selection.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const statusBadge = getStatusBadgeStyle(item.status);
              const isVideo = String(item.consultation_mode || item.type || '').toLowerCase() === 'video';

              return (
                <View style={styles.apptCard}>
                  {/* Top Row: Doctor Name & Status Badge */}
                  <View style={styles.apptCardHeader}>
                    <View style={styles.docInfoCol}>
                      <Text style={styles.docName}>
                        {item.doctor_name || (item as any).doctor?.full_name || 'Doctor Consultation'}
                      </Text>
                      <Text style={styles.clinicNameText}>
                        🏬 {item.clinic_name || (item as any).clinic?.name || 'Aarogya Care Clinic'}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusBadge.text }]}>
                        {statusBadge.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* Body Info Grid matching Web columns */}
                  <View style={styles.apptDetailsGrid}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Patient:</Text>
                      <Text style={styles.detailValue}>
                        👤 {item.patient_name || 'Patient'} {item.patient_phone ? `(${item.patient_phone})` : ''}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date & Time:</Text>
                      <Text style={styles.detailValue}>
                        📆 {item.appointment_date} at {item.appointment_time || item.time_slot || '10:00:00'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Mode:</Text>
                      <View style={[styles.modeBadge, isVideo ? styles.modeVideo : styles.modeInPerson]}>
                        <Text style={[styles.modeBadgeText, isVideo ? styles.modeVideoText : styles.modeInPersonText]}>
                          {isVideo ? '🎥 Video Call' : '🏢 In Person'}
                        </Text>
                      </View>
                    </View>

                    {item.reason ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Reason:</Text>
                        <Text style={styles.detailValue}>📝 {item.reason}</Text>
                      </View>
                    ) : null}
                  </View>

                  {(item.status === 'approved' || item.status === 'scheduled') && (
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => handleCancelAppointment(item.id)}>
                      <Text style={styles.cancelBtnText}>Cancel Appointment</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  headerBox: { marginBottom: 14 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  pageSub: { fontSize: 13, color: '#64748b', marginBottom: 14 },

  filterTabRow: { flexDirection: 'row', gap: 6 },
  filterTabPill: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  filterTabPillActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  filterTabText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterTabTextActive: { color: '#ffffff' },

  listContainer: { paddingBottom: 100, gap: 12 },
  apptCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  apptCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  docInfoCol: { flex: 1, marginRight: 10 },
  docName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  clinicNameText: { fontSize: 12, color: '#0d9488', fontWeight: '700', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
  apptDetailsGrid: { gap: 6, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailLabel: { width: 85, fontSize: 12, color: '#64748b', fontWeight: '600' },
  detailValue: { fontSize: 12, color: '#0f172a', fontWeight: '700', flex: 1 },

  modeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  modeInPerson: { backgroundColor: '#dcfce7' },
  modeInPersonText: { color: '#15803d', fontSize: 11, fontWeight: '700' },
  modeVideo: { backgroundColor: '#f3e8ff' },
  modeVideoText: { color: '#6b21a8', fontSize: 11, fontWeight: '700' },

  cancelBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelBtnText: { color: '#dc2626', fontSize: 13, fontWeight: '700' },

  emptyCard: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4 },
});

export default AppointmentsScreen;
