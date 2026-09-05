import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { useAuditLogs } from '../../hooks/useAuditLogs';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
}

export const AuditLogsScreen: React.FC<Props> = ({ onOpenDrawer, onOpenNotifications }) => {
  const {
    filteredLogs,
    totalCount,
    loading,
    lastRefreshed,
    searchQuery,
    actionFilter,
    setSearchQuery,
    setActionFilter,
    refreshAuditLogs,
    exportLogs,
  } = useAuditLogs();

  const getActionBadgeStyle = (actionStr?: string) => {
    const act = String(actionStr || '').toUpperCase();
    if (act.includes('CREATE') || act.includes('BOOK') || act.includes('START')) {
      return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
    }
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('CHANGE')) {
      return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
    }
    if (act.includes('DELETE') || act.includes('CANCEL') || act.includes('REMOVE')) {
      return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
    }
    if (act.includes('BILL') || act.includes('PAY') || act.includes('WALLET')) {
      return { bg: '#fef3c7', text: '#d97706', border: '#fde68a' };
    }
    return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  };

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} onOpenNotifications={onOpenNotifications} title="Immutable Audit Trail" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshAuditLogs} colors={['#0d9488']} />
        }>
        {/* Compliance Security Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerHeaderRow}>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>SECURITY & COMPLIANCE</Text>
            </View>

            <View style={styles.bannerBtnRow}>
              <TouchableOpacity style={styles.refreshBtn} onPress={refreshAuditLogs}>
                <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.exportBtn} onPress={exportLogs}>
                <Text style={styles.exportBtnText}>📥 Export CSV</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.bannerTitle}>Immutable Audit Trail 📜</Text>
          <Text style={styles.bannerSub}>
            Complete system audit log of all sensitive user actions, medical updates, billing events & security logs.
          </Text>
          {lastRefreshed ? (
            <Text style={styles.timestampText}>Last sync: {lastRefreshed}</Text>
          ) : null}
        </View>

        {/* 3 Summary Stat Cards */}
        <View style={styles.statsThreeRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Events</Text>
            <Text style={styles.statBigNum}>{totalCount}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Compliance Status</Text>
            <Text style={[styles.statBigNum, { color: '#16a34a', fontSize: 16 }]}>100% Active</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Log Encryption</Text>
            <Text style={[styles.statBigNum, { color: '#0d9488', fontSize: 16 }]}>SHA-256</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarBox}>
          <Text style={styles.searchIconText}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by user, action, table, or details..."
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

        {/* Filter Pills */}
        <View style={styles.filterPillsRow}>
          {[
            { id: 'all', label: 'All Events' },
            { id: 'create', label: 'Create / Book' },
            { id: 'update', label: 'Updates' },
            { id: 'delete', label: 'Deletions' },
            { id: 'billing', label: 'Billing' },
          ].map((tab) => {
            const isActive = actionFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setActionFilter(tab.id)}>
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Main Audit Log Card List */}
        <View style={styles.mainLogsCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>System Audit Activity Log ({filteredLogs.length})</Text>
            <Text style={styles.cardHeaderSub}>Real-time system events tracked by backend</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 35 }} />
          ) : filteredLogs.length === 0 ? (
            <View style={styles.emptyLogsBox}>
              <Text style={styles.emptyLogsIcon}>🔍</Text>
              <Text style={styles.emptyLogsTitle}>No Audit Logs Found</Text>
              <Text style={styles.emptyLogsSub}>No system events found matching your search or filter.</Text>
            </View>
          ) : (
            <View style={styles.logsList}>
              {filteredLogs.map((log, idx) => {
                const badge = getActionBadgeStyle(log.action);
                return (
                  <View key={log.id ? `audit-${log.id}-${idx}` : `audit-${idx}`} style={styles.logCardItem}>
                    {/* Header Row: User Name & Action Badge */}
                    <View style={styles.logCardHeader}>
                      <View style={styles.userCol}>
                        <Text style={styles.userNameText}>
                          👤 {log.user_name || 'System User'}
                        </Text>
                        <Text style={styles.userRoleText}>
                          Role: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{log.user_role || log.user_type || 'Staff'}</Text>
                        </Text>
                      </View>

                      <View style={[styles.actionBadgePill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                        <Text style={[styles.actionBadgeText, { color: badge.text }]}>
                          {log.action || 'EVENT'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.logDivider} />

                    {/* Details Content */}
                    <Text style={styles.logDetailsText}>{log.details || 'System event executed.'}</Text>

                    {/* Footer Row: Table Name & Timestamp */}
                    <View style={styles.logFooterRow}>
                      <View style={styles.tableBadgePill}>
                        <Text style={styles.tableBadgeText}>
                          🏷️ {log.table_name || 'system'} #{log.record_id || log.id}
                        </Text>
                      </View>

                      <Text style={styles.timestampText}>
                        📅 {log.created_at ? String(log.created_at) : 'Just now'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 100 },

  banner: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  bannerHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bannerBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  bannerBadgeText: { fontSize: 10, fontWeight: '800', color: '#475569' },
  bannerBtnRow: { flexDirection: 'row', gap: 6 },
  refreshBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  refreshBtnText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  exportBtn: { backgroundColor: '#0d9488', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  exportBtnText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },

  bannerTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  bannerSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
  timestampText: { fontSize: 11, color: '#94a3b8', marginTop: 6 },

  statsThreeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
  },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  statBigNum: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 4 },

  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIconText: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 12, color: '#0f172a' },
  clearSearchText: { fontSize: 14, color: '#94a3b8', padding: 4 },

  filterPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  filterPill: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  filterPillActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  filterPillText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  filterPillTextActive: { color: '#ffffff' },

  mainLogsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  cardHeaderRow: { marginBottom: 14 },
  cardHeaderTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  cardHeaderSub: { fontSize: 11, color: '#64748b', marginTop: 2 },

  emptyLogsBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyLogsIcon: { fontSize: 36, marginBottom: 8 },
  emptyLogsTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  emptyLogsSub: { fontSize: 12, color: '#64748b', marginTop: 2 },

  logsList: { gap: 10 },
  logCardItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  logCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  userCol: { flex: 1, marginRight: 8 },
  userNameText: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  userRoleText: { fontSize: 11, color: '#64748b', marginTop: 1 },

  actionBadgePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  actionBadgeText: { fontSize: 10, fontWeight: '800' },

  logDivider: { height: 1, backgroundColor: '#e2e8f0' },
  logDetailsText: { fontSize: 12, color: '#334155', fontWeight: '600', lineHeight: 17 },

  logFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  tableBadgePill: { backgroundColor: '#ffffff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },
  tableBadgeText: { fontSize: 10, fontWeight: '700', color: '#475569' },
});

export default AuditLogsScreen;
