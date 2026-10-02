import React from 'react';
import {
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthContext } from '../../context/AuthContext';
import { useRemoteData } from '../../hooks/useRemoteData';
import { apiFetch } from '../../api/apiConfig';
import { dashboardNumber, displayAmount } from '../../utils/dashboardValues';
import { StaffHeader } from '../../components/common/StaffHeader';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const SuperAdminDashboardScreen: React.FC<Props> = ({
  onOpenDrawer,
  onOpenNotifications,
  onNavigateScreen = () => {},
}) => {
  const { user, token } = useAuthContext();
  const resource = useRemoteData([user?.id, token, 'super-dashboard'].join(':'), async (signal) => {
    const [overview, clinics] = await Promise.all([
      apiFetch<{ stats: Record<string, unknown> }>('/dashboard/super-admin', { signal }),
      apiFetch<{ clinics: any[] }>('/clinics/my-clinics', { signal }),
    ]);
    if (!overview.success || !overview.data?.stats || !clinics.success || !Array.isArray(clinics.data?.clinics)) throw new Error('Unable to load dashboard');
    return { stats: overview.data.stats, clinics: [...clinics.data.clinics].sort((a, b) =>
      String(b.created_at || '').localeCompare(String(a.created_at || ''))).slice(0, 3) };
  });
  const stats = resource.data?.stats;
  const metric = (name: string) => dashboardNumber(stats?.[name]);
  const treatment = metric('treatment_revenue');
  const medicine = metric('medicine_revenue');
  const revenue = treatment !== null && medicine !== null ? treatment + medicine : null;
  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Super Admin Portal"
      />

      <ScrollView refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} />} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.heroCard}>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroBadge}>SUPER ADMIN DASHBOARD</Text>
            <Text style={styles.heroTitle}>Multi-Tenant Platform Control</Text>
            <Text style={styles.heroSub}>
              {resource.error ? 'Unable to load dashboard. Pull down to retry.' : 'Global overview of registered clinics and tenant performance.'}
            </Text>
          </View>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}
            onPress={() => onNavigateScreen('clinics')}>
            <Text style={styles.kpiIcon}>🏥</Text>
            <Text style={styles.kpiValue}>{metric('total_clinics') ?? '\u2014'}</Text>
            <Text style={styles.kpiLabel}>Total Clinics</Text>
            <Text style={styles.kpiSub}>{metric('active_clinics') ?? '\u2014'} Active</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}
            onPress={() => onNavigateScreen('staff')}>
            <Text style={styles.kpiIcon}>👨‍⚕️</Text>
            <Text style={styles.kpiValue}>{metric('active_staff') ?? '\u2014'}</Text>
            <Text style={styles.kpiLabel}>Active Staff</Text>
            <Text style={styles.kpiSub}>Across registered clinics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }]}
            onPress={() => onNavigateScreen('patients')}>
            <Text style={styles.kpiIcon}>👥</Text>
            <Text style={styles.kpiValue}>{metric('active_patients') ?? '\u2014'}</Text>
            <Text style={styles.kpiLabel}>Active Patients</Text>
            <Text style={styles.kpiSub}>Across registered clinics</Text>
          </TouchableOpacity>

          <View
            style={[styles.kpiCard, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
            <Text style={styles.kpiIcon}>💰</Text>
            <Text style={styles.kpiValue}>{displayAmount(revenue)}</Text>
            <Text style={styles.kpiLabel}>Platform Revenue</Text>
            <Text style={styles.kpiSub}>Total treatment and medicine bills</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Platform Governance</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onNavigateScreen('clinics')}>
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionText}>Register New Clinic</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnAlt}
            onPress={() => onNavigateScreen('staff')}>
            <Text style={styles.actionIcon}>👥</Text>
            <Text style={styles.actionTextAlt}>User Management</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Registered Clinics */}
        <Text style={styles.sectionTitle}>Recent Tenant Clinics</Text>
        <View style={styles.clinicList}>
          {(resource.data?.clinics ?? []).map((c) => (
            <View key={c.id} style={styles.clinicRow}>
              <View style={styles.clinicIconBox}>
                <Text style={styles.clinicIcon}>🏥</Text>
              </View>
              <View style={styles.clinicInfo}>
                <Text style={styles.clinicName}>{c.name}</Text>
                <Text style={styles.clinicMeta}>{c.city || '\u2014'} • Code: {c.code || '\u2014'} • {c.doctors_count ?? '\u2014'} Doctors</Text>
              </View>
              <View style={styles.planBadge}>
                <Text style={styles.planText}>{c.plan_name || c.subscription_plan || '\u2014'}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 80 },
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  heroTextCol: { flex: 1 },
  heroBadge: { color: '#38bdf8', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  heroTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  heroSub: { color: '#94a3b8', fontSize: 13, lineHeight: 18 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  kpiCard: {
    width: '48%',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  kpiIcon: { fontSize: 22, marginBottom: 6 },
  kpiValue: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  kpiLabel: { fontSize: 13, fontWeight: '700', color: '#334155' },
  kpiSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: {
    flex: 1,
    backgroundColor: '#0d9488',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionIcon: { fontSize: 16 },
  actionText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  actionBtnAlt: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionTextAlt: { color: '#0f172a', fontWeight: '700', fontSize: 13 },
  clinicList: { gap: 10 },
  clinicRow: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  clinicIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clinicIcon: { fontSize: 20 },
  clinicInfo: { flex: 1 },
  clinicName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  clinicMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  planBadge: { backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  planText: { color: '#0369a1', fontSize: 11, fontWeight: '800' },
});

export default SuperAdminDashboardScreen;
