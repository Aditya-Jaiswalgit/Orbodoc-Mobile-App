import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import { PatientUserIcon, StethoscopeIcon } from '../../components/common/CustomIcons';
import { useVideoServices } from '../../hooks/useVideoServices';

interface VideoServicesScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
}

export const VideoServicesScreen: React.FC<VideoServicesScreenProps> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
}) => {
  const {
    walletBalance,
    videoAppointments,
    activeCalls,
    completedCalls,
    transactions,
    loading,
    refreshVideoServices,
  } = useVideoServices();

  const [activeTab, setActiveTab] = useState<'calls' | 'history' | 'wallet'>('calls');

  const handleJoinVideoCall = (callItem: any) => {
    Alert.alert(
      'Video Call Room',
      `Connecting to video consultation room with ${callItem.doctor_name || 'Doctor'}...`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <PatientHeader onOpenDrawer={onOpenDrawer} onOpenNotifications={onOpenNotifications} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBox}>
          <View style={styles.titleRow}>
            <Text style={styles.headerIconText}>📹</Text>
            <Text style={styles.pageTitle}>Patient Video Services</Text>
          </View>
          <Text style={styles.pageSub}>Manage your video consultation payments and calls.</Text>
        </View>

        <View style={styles.statsThreeRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Wallet Balance</Text>
            <View style={styles.walletValRow}>
              <View style={styles.walletIconCircle}>
                <Text style={{ fontSize: 14 }}>👛</Text>
              </View>
              <Text style={styles.walletAmountText}>₹{walletBalance.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active Video Appointments</Text>
            <Text style={styles.statBigNum}>{activeCalls.length}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Completed Calls</Text>
            <Text style={styles.statBigNum}>{completedCalls.length}</Text>
          </View>
        </View>

        <View style={styles.tabsBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'calls' && styles.tabBtnActive]}
            onPress={() => setActiveTab('calls')}>
            <Text style={[styles.tabBtnText, activeTab === 'calls' && styles.tabBtnTextActive]}>
              Video Calls
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
            onPress={() => setActiveTab('history')}>
            <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
              History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'wallet' && styles.tabBtnActive]}
            onPress={() => setActiveTab('wallet')}>
            <Text style={[styles.tabBtnText, activeTab === 'wallet' && styles.tabBtnTextActive]}>
              Wallet
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabContentCard}>
          {loading ? (
            <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
          ) : activeTab === 'calls' ? (
            activeCalls.length === 0 ? (
              <View style={styles.dottedEmptyCard}>
                <Text style={styles.dottedEmptyText}>No active video appointments found.</Text>
              </View>
            ) : (
              <View style={styles.callsList}>
                {activeCalls.map((item, idx) => (
                  <View key={item.id ? `call-${item.id}-${idx}` : `call-${idx}`} style={styles.callRowCard}>
                    <View style={styles.callCardHeader}>
                      <View style={styles.docAvatarCircle}>
                        <StethoscopeIcon color="#0d9488" size={20} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docName}>{item.doctor_name || 'Doctor'}</Text>
                        <Text style={styles.docSub}>{item.specialization || 'Video Consultation'}</Text>
                      </View>
                      <View style={styles.approvedBadgePill}>
                        <Text style={styles.approvedBadgeText}>{item.status || 'Approved'}</Text>
                      </View>
                    </View>

                    <View style={styles.callMetaRow}>
                      <Text style={styles.callMetaText}>📅 {item.appointment_date}</Text>
                      <Text style={styles.callMetaText}>⏰ {item.appointment_time}</Text>
                    </View>

                    <TouchableOpacity style={styles.joinCallBtn} onPress={() => handleJoinVideoCall(item)}>
                      <Text style={styles.joinCallBtnText}>📹 Join Video Call</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )
          ) : activeTab === 'history' ? (
            completedCalls.length === 0 ? (
              <View style={styles.dottedEmptyCard}>
                <Text style={styles.dottedEmptyText}>No completed call history records found.</Text>
              </View>
            ) : (
              <View style={styles.callsList}>
                {completedCalls.map((item, idx) => (
                  <View key={item.id ? `comp-${item.id}-${idx}` : `comp-${idx}`} style={styles.callRowCard}>
                    <View style={styles.callCardHeader}>
                      <View style={styles.docAvatarCircle}>
                        <StethoscopeIcon color="#64748b" size={20} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docName}>{item.doctor_name || 'Doctor'}</Text>
                        <Text style={styles.docSub}>{item.appointment_date} · {item.appointment_time}</Text>
                      </View>
                      <View style={[styles.approvedBadgePill, { backgroundColor: '#e2e8f0' }]}>
                        <Text style={[styles.approvedBadgeText, { color: '#475569' }]}>Completed</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )
          ) : (
            <View style={styles.walletTabContainer}>
              <View style={styles.walletBoxCard}>
                <Text style={styles.walletBoxTitle}>Current Balance</Text>
                <Text style={styles.walletBoxAmount}>₹{walletBalance.toFixed(2)}</Text>

                <TouchableOpacity
                  style={styles.rechargeWalletBtn}
                  onPress={() => Alert.alert('Recharge Wallet', 'Redirecting to Razorpay payment gateway...')}>
                  <Text style={styles.rechargeWalletBtnText}>💳 Recharge Wallet</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.secTitle}>Recent Transactions</Text>
              {transactions.length === 0 ? (
                <Text style={styles.emptySubText}>No recent wallet transactions found.</Text>
              ) : (
                transactions.map((tx) => (
                  <View key={tx.id} style={styles.txRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txDesc}>{tx.description || 'Wallet Transaction'}</Text>
                      <Text style={styles.txDate}>{tx.created_at ? new Date(tx.created_at).toLocaleDateString() : '-'}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: tx.type === 'credit' ? '#16a34a' : '#dc2626' }]}>
                      {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}.00
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },

  headerBox: { marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconText: { fontSize: 22 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  pageSub: { fontSize: 13, color: '#64748b', marginTop: 2 },

  statsThreeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    justifyContent: 'space-between',
    minHeight: 85,
  },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  walletValRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  walletIconCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' },
  walletAmountText: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  statBigNum: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 6 },

  tabsBar: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 14, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#ffffff', elevation: 1 },
  tabBtnText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  tabBtnTextActive: { color: '#0f172a', fontWeight: '800' },

  tabContentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },

  dottedEmptyCard: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 45,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginVertical: 10,
  },
  dottedEmptyText: { fontSize: 13, fontWeight: '600', color: '#64748b' },

  callsList: { gap: 12 },
  callRowCard: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
  callCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  docAvatarCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' },
  docName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  docSub: { fontSize: 12, color: '#64748b' },
  approvedBadgePill: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  approvedBadgeText: { fontSize: 11, fontWeight: '800', color: '#16a34a' },
  callMetaRow: { flexDirection: 'row', gap: 16, backgroundColor: '#ffffff', padding: 8, borderRadius: 8 },
  callMetaText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  joinCallBtn: { backgroundColor: '#0d9488', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  joinCallBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },

  walletTabContainer: { gap: 14 },
  walletBoxCard: { backgroundColor: '#073b3a', borderRadius: 16, padding: 20, alignItems: 'center', gap: 8 },
  walletBoxTitle: { fontSize: 13, color: '#99f6e4', fontWeight: '700' },
  walletBoxAmount: { fontSize: 28, fontWeight: '800', color: '#ffffff' },
  rechargeWalletBtn: { backgroundColor: '#2dd4bf', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  rechargeWalletBtnText: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  secTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  emptySubText: { fontSize: 12, color: '#64748b' },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  txDesc: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  txDate: { fontSize: 11, color: '#94a3b8' },
  txAmount: { fontSize: 13, fontWeight: '800' },
});

export default VideoServicesScreen;
