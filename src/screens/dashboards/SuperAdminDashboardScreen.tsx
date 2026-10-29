import { colors, radii, spacing, typography } from '../../theme/tokens';
import React from 'react';
import {
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import { useAuthContext } from '../../context/AuthContext';
import { useRemoteData } from '../../hooks/useRemoteData';
import { apiFetch } from '../../api/apiConfig';
import { dashboardNumber, displayAmount } from '../../utils/dashboardValues';
import { StaffHeader } from '../../components/common/StaffHeader';
import { LiquidBorderTouchable, LiquidBorderSurface } from '../../components/common/LiquidBorderSurface';

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
  const now = new Date();
  const adminName = user?.fullName || user?.full_name || '';
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const todayLabel = now.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });
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
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>{greeting}{adminName ? `, ${adminName}` : ''}!</Text>
          <Text style={styles.greetingSubtitle}>Here's what's happening across your platform today.</Text>
          <View style={styles.todayDateCard}>
            <View style={styles.todayIconBox}><CalendarDays size={22} color={colors.primary} strokeWidth={2.2} /></View>
            <View style={styles.todayTextCol}>
              <View style={styles.todayBadgeRow}><View style={styles.greenDot} /><Text style={styles.todayBadgeText}>TODAY</Text></View>
              <Text style={styles.todayDateText}>{todayLabel}</Text>
            </View>
          </View>
        </View>

        {/* Banner */}
        <LiquidBorderSurface style={styles.heroCard} radius={16}>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroBadge}>SUPER ADMIN DASHBOARD</Text>
            <Text style={styles.heroTitle}>Multi-Tenant Platform Control</Text>
            <Text style={styles.heroSub}>
              {resource.error ? 'Unable to load dashboard. Pull down to retry.' : 'Global overview of registered clinics and tenant performance.'}
            </Text>
          </View>
        </LiquidBorderSurface>

        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <LiquidBorderTouchable
            style={[styles.kpiCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}
            onPress={() => onNavigateScreen('clinics')}>
            <Text style={styles.kpiIcon}>🏥</Text>
            <Text style={styles.kpiValue}>{metric('total_clinics') ?? '\u2014'}</Text>
            <Text style={styles.kpiLabel}>Total Clinics</Text>
            <Text style={styles.kpiSub}>{metric('active_clinics') ?? '\u2014'} Active</Text>
          </LiquidBorderTouchable>

          <LiquidBorderTouchable
            style={[styles.kpiCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}
            onPress={() => onNavigateScreen('staff')}>
            <Text style={styles.kpiIcon}>👨‍⚕️</Text>
            <Text style={styles.kpiValue}>{metric('active_staff') ?? '\u2014'}</Text>
            <Text style={styles.kpiLabel}>Active Staff</Text>
            <Text style={styles.kpiSub}>Across registered clinics</Text>
          </LiquidBorderTouchable>

          <LiquidBorderTouchable
            style={[styles.kpiCard, { backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }]}
            onPress={() => onNavigateScreen('patients')}>
            <Text style={styles.kpiIcon}>👥</Text>
            <Text style={styles.kpiValue}>{metric('active_patients') ?? '\u2014'}</Text>
            <Text style={styles.kpiLabel}>Active Patients</Text>
            <Text style={styles.kpiSub}>Across registered clinics</Text>
          </LiquidBorderTouchable>

          <LiquidBorderSurface
            style={[styles.kpiCard, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
            <Text style={styles.kpiIcon}>💰</Text>
            <Text style={styles.kpiValue}>{displayAmount(revenue)}</Text>
            <Text style={styles.kpiLabel}>Platform Revenue</Text>
            <Text style={styles.kpiSub}>Total treatment and medicine bills</Text>
          </LiquidBorderSurface>
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
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 80 },
  greetingSection: { marginBottom: 18 },
  greetingTitle: { fontFamily: typography.family, color: colors.text, fontSize: 21, fontWeight: typography.weight.extrabold },
  greetingSubtitle: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.caption, marginTop: spacing.xs },
  todayDateCard: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: 14, paddingVertical: 10, marginTop: spacing.lg, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.mintBorder, backgroundColor: colors.surface, shadowColor: '#0d9488', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  todayIconBox: { width: 42, height: 42, borderRadius: radii.lg, backgroundColor: colors.mintBorder, alignItems: 'center', justifyContent: 'center' },
  todayTextCol: { flex: 1 },
  todayBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.tiny, marginBottom: 3 },
  greenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  todayBadgeText: { fontFamily: typography.family, color: colors.primary, fontSize: typography.size.micro, fontWeight: typography.weight.extrabold, letterSpacing: 1.2 },
  todayDateText: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.bold },
  heroCard: {
    backgroundColor: colors.text,
    borderRadius: radii.xl,
    padding: 18,
    marginBottom: spacing.xl,
  },
  heroTextCol: { flex: 1 },
  heroBadge: { fontFamily: typography.family, color: '#38bdf8', fontSize: typography.size.micro, fontWeight: typography.weight.black, letterSpacing: 1, marginBottom: spacing.xs },
  heroTitle: { fontFamily: typography.family, color: colors.surface, fontSize: typography.size.title, fontWeight: typography.weight.extrabold, marginBottom: spacing.tiny },
  heroSub: { fontFamily: typography.family, color: colors.subtle, fontSize: typography.size.caption, lineHeight: 18 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xxl },
  kpiCard: {
    width: '48%',
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
  },
  kpiIcon: { fontFamily: typography.family, fontSize: typography.size.heading, marginBottom: spacing.tiny },
  kpiValue: { fontFamily: typography.family, fontSize: typography.size.heading, fontWeight: typography.weight.extrabold, color: colors.text, marginBottom: 2 },
  kpiLabel: { fontFamily: typography.family, fontSize: typography.size.caption, fontWeight: typography.weight.bold, color: colors.foreground },
  kpiSub: { fontFamily: typography.family, fontSize: typography.size.xs, color: colors.muted, marginTop: 2 },
  sectionTitle: { fontFamily: typography.family, fontSize: typography.size.lg, fontWeight: typography.weight.extrabold, color: colors.text, marginBottom: spacing.md },
  actionsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xxl },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    gap: spacing.sm,
  },
  actionIcon: { fontFamily: typography.family, fontSize: typography.size.subtitle },
  actionText: { fontFamily: typography.family, color: colors.surface, fontWeight: typography.weight.bold, fontSize: typography.size.caption },
  actionBtnAlt: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.input,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    gap: spacing.sm,
  },
  actionTextAlt: { fontFamily: typography.family, color: colors.text, fontWeight: typography.weight.bold, fontSize: typography.size.caption },
  clinicList: { gap: 10 },
  clinicRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  clinicIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  clinicIcon: { fontFamily: typography.family, fontSize: typography.size.title },
  clinicInfo: { flex: 1 },
  clinicName: { fontFamily: typography.family, fontSize: typography.size.body, fontWeight: typography.weight.bold, color: colors.text },
  clinicMeta: { fontFamily: typography.family, fontSize: typography.size.sm, color: colors.muted, marginTop: 2 },
  planBadge: { backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: spacing.xs, borderRadius: radii.md },
  planText: { fontFamily: typography.family, color: '#0369a1', fontSize: typography.size.xs, fontWeight: typography.weight.extrabold },
});

export default SuperAdminDashboardScreen;
