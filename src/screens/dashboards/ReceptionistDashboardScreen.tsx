import { colors, radii, spacing, typography } from '../../theme/tokens';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { AlertCircle, CalendarDays, Clock3, RefreshCw, Users } from 'lucide-react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { StaffHeader } from '../../components/common/StaffHeader';
import { useReceptionistDashboard } from '../../hooks/useReceptionistDashboard';
import { LiquidBorderTouchable } from '../../components/common/LiquidBorderSurface';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const MetricTile = ({
  title, value, icon: Icon, color, background, onPress,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  background: string;
  onPress: () => void;
}) => (
  <LiquidBorderTouchable
    accessibilityRole="button"
    activeOpacity={0.7}
    onPress={onPress}
    style={styles.kpiCardHalf}
  >
    <View style={[styles.kpiIconBox, { backgroundColor: background }]}>
      <Icon size={22} color={color} />
    </View>
    <Text style={styles.kpiCardValue}>{value}</Text>
    <Text style={styles.kpiCardLabel} numberOfLines={2}>{title}</Text>
    <View style={styles.kpiActionWrapper}>
      <Text style={styles.kpiActionLink}>View details ↗</Text>
    </View>
  </LiquidBorderTouchable>
);

const ActivityChart = ({ values, width }: { values: Array<{ name: string; value: number }>; width: number }) => {
  const chartWidth = Math.max(260, width - 64);
  const chartHeight = 220;
  const top = 12;
  const bottom = 34;
  const plotHeight = chartHeight - top - bottom;
  const max = Math.max(1, ...values.map(row => row.value));
  const slot = (chartWidth - 32) / values.length;
  const barWidth = Math.min(36, slot * 0.55);
  const chartColors = [colors.primary, colors.success, colors.warning, '#6366f1'];
  return (
    <Svg width={chartWidth} height={chartHeight}>
      {[0, 1, 2, 3, 4].map(index => {
        const y = top + (plotHeight / 4) * index;
        return <Line key={`grid-${index}`} x1={30} x2={chartWidth - 4} y1={y} y2={y} stroke={colors.border} />;
      })}
      {values.map((row, index) => {
        const x = 30 + slot * index + (slot - barWidth) / 2;
        const barHeight = row.value > 0 ? Math.max(4, (row.value / max) * (plotHeight - 12)) : 0;
        const y = top + plotHeight - barHeight;
        return <React.Fragment key={row.name}>
          <Rect x={x} y={y} width={barWidth} height={barHeight} rx={6} fill={chartColors[index % chartColors.length]} />
          <SvgText x={x + barWidth / 2} y={chartHeight - 8} fontSize="10" fill={colors.muted} textAnchor="middle">{row.name}</SvgText>
          <SvgText x={x + barWidth / 2} y={Math.max(10, y - 5)} fontSize="10" fill={colors.foreground} textAnchor="middle">{String(row.value)}</SvgText>
        </React.Fragment>;
      })}
    </Svg>
  );
};

const StatusMixChart = ({ values }: { values: Array<{ name: string; value: number }> }) => {
  const size = 190;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = values.reduce((sum, row) => sum + row.value, 0);
  const chartColors = [colors.primary, colors.success, colors.warning];
  let offset = 0;
  return <View style={styles.donutLayout}>
    <View style={styles.donutWrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors.border} strokeWidth={strokeWidth} />
        {total > 0 ? values.map((row, index) => {
          const dash = (row.value / total) * circumference;
          const currentOffset = offset;
          offset += dash;
          return <Circle key={row.name} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={chartColors[index]} strokeWidth={strokeWidth} strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-currentOffset} rotation={-90} origin={`${size / 2}, ${size / 2}`} />;
        }) : null}
      </Svg>
      <View style={styles.donutCenter}><Text style={styles.donutTotal}>{total}</Text><Text style={styles.muted}>Appointments</Text></View>
    </View>
    <View style={styles.legendList}>{values.map((row, index) => <View key={row.name} style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: chartColors[index] }]} /><Text style={styles.legendLabel}>{row.name}</Text><Text style={styles.legendValue}>{row.value}</Text>
    </View>)}</View>
  </View>;
};

export const ReceptionistDashboardScreen: React.FC<Props> = ({
  onOpenDrawer,
  onOpenNotifications,
  onNavigateScreen = () => {},
}) => {
  const { width } = useWindowDimensions();
  const { data, loading, error, refresh, user } = useReceptionistDashboard();
  const now = new Date();
  const today = localDateKey(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localDateKey(tomorrowDate);
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const staffName = String(user?.fullName || user?.full_name || 'Receptionist').trim();
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const activityData = useMemo(() => [
    { name: 'Today', value: data?.todayAppointments || 0 },
    { name: 'Upcoming', value: data?.upcomingAppointments || 0 },
    { name: 'Approvals', value: data?.pendingApprovals || 0 },
    { name: 'Patients', value: data?.totalPatients || 0 },
  ], [data]);
  const statusData = useMemo(() => [
    { name: 'Today', value: data?.todayAppointments || 0 },
    { name: 'Upcoming', value: data?.upcomingAppointments || 0 },
    { name: 'Pending', value: data?.pendingApprovals || 0 },
  ], [data]);

  return <View style={styles.screen}>
    <StaffHeader onOpenDrawer={onOpenDrawer} onOpenNotifications={onOpenNotifications} title="Reception Dashboard" />
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}>
      <View style={styles.welcomeBlock}>
        <Text style={styles.greetingTitle}>{greeting}, {staffName}!</Text>
        <Text style={styles.greetingSubtitle}>Here's what's happening at your clinic today.</Text>
      </View>
      <View style={styles.todayCard}>
        <View style={styles.todayIcon}><CalendarDays size={22} color={colors.primary} strokeWidth={2.2} /></View>
        <View style={styles.todayCopy}>
          <View style={styles.todayEyebrow}><View style={styles.todayDot} /><Text style={styles.todayLabel}>TODAY</Text></View>
          <Text style={styles.todayDate}>{dateLabel}</Text>
        </View>
      </View>

      {loading && !data ? <View style={styles.stateCard}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.muted}>Loading receptionist dashboard…</Text></View> : error && !data ? <View style={styles.stateCard}><Text style={styles.sectionTitle}>Dashboard unavailable</Text><Text style={styles.muted}>{error}</Text><TouchableOpacity style={styles.retryButton} onPress={refresh}><RefreshCw size={16} color={colors.surface} /><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View> : data ? <>
        {error ? <TouchableOpacity style={styles.warningBanner} onPress={refresh}><Text style={styles.warningText}>Some dashboard data could not be loaded. Tap to retry.</Text></TouchableOpacity> : null}
        <View style={styles.kpiGrid}>
          <MetricTile
            title="Total Patients"
            value={String(data.totalPatients ?? 0)}
            icon={Users}
            color={colors.primary}
            background={colors.mint}
            onPress={() => onNavigateScreen('/patients?status=all')}
          />
          <MetricTile
            title="Today's Appointments"
            value={String(data.todayAppointments ?? 0)}
            icon={CalendarDays}
            color={colors.success}
            background={colors.successSoft}
            onPress={() => onNavigateScreen(`/appointments?date=${today}`)}
          />
          <MetricTile
            title="Upcoming"
            value={String(data.upcomingAppointments ?? 0)}
            icon={Clock3}
            color={colors.warning}
            background={colors.warningSoft}
            onPress={() => onNavigateScreen(`/appointments?date_from=${tomorrow}`)}
          />
          <MetricTile
            title="Pending Approvals"
            value={String(data.pendingApprovals ?? 0)}
            icon={AlertCircle}
            color="#6366F1"
            background="#EEF2FF"
            onPress={() => onNavigateScreen('/appointments?status=pending')}
          />
        </View>

        <View style={styles.chartCard}><Text style={styles.sectionTitle}>Desk Activity</Text><ActivityChart values={activityData} width={width} /></View>
        <View style={styles.chartCard}><Text style={styles.sectionTitle}>Appointment Status Mix</Text><StatusMixChart values={statusData} /></View>

        <View style={styles.overviewCard}>
          <Text style={styles.sectionTitle}>Quick Overview</Text>
          <View style={styles.overviewTile}><View><Text style={styles.overviewLabel}>Today's Schedule</Text><Text style={styles.overviewValue}>{data.todayAppointments}</Text></View><CalendarDays size={36} color={colors.primary} strokeWidth={2} /></View>
          <View style={styles.overviewTile}><View><Text style={styles.overviewLabel}>Pending Approvals</Text><Text style={styles.overviewValue}>{data.pendingApprovals}</Text></View><AlertCircle size={38} color={colors.warning} /></View>
        </View>

        <View style={styles.overviewCard}>
          <Text style={styles.sectionTitle}>Appointment Status</Text>
          <StatusRow label="Today's Appointments" value={data.todayAppointments} color={colors.success} progress={0.7} />
          <StatusRow label="Upcoming Appointments" value={data.upcomingAppointments} color={colors.primary} progress={0.5} />
          <StatusRow label="Pending Approvals" value={data.pendingApprovals} color={colors.warning} progress={0.3} />
        </View>
      </> : null}
    </ScrollView>
  </View>;
};

const StatusRow = ({ label, value, color, progress }: { label: string; value: number; color: string; progress: number }) => <View style={styles.statusGroup}>
  <View style={styles.statusHeader}><Text style={styles.overviewLabel}>{label}</Text><Text style={styles.statusValue}>{value}</Text></View>
  <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: color }]} /></View>
</View>;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.lg },
  welcomeBlock: { gap: spacing.xs },
  greetingTitle: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.lg, fontWeight: typography.weight.extrabold },
  greetingSubtitle: { fontFamily: typography.family, color: '#718096', fontSize: typography.size.caption },
  todayCard: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    backgroundColor: colors.surface,
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  todayIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
  },
  todayCopy: { flex: 1, gap: 3 },
  todayEyebrow: { flexDirection: 'row', alignItems: 'center', gap: spacing.tiny, marginBottom: 2 },
  todayDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  todayLabel: { fontFamily: typography.family, color: colors.primary, fontSize: typography.size.xs, fontWeight: typography.weight.extrabold, letterSpacing: 1.2 },
  todayDate: { fontFamily: typography.family, color: colors.text, fontSize: 15, fontWeight: typography.weight.bold },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  kpiCardHalf: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  kpiIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiCardValue: {
    fontFamily: typography.family, fontSize: typography.size.display,
    fontWeight: typography.weight.extrabold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  kpiCardLabel: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.muted,
    minHeight: 32,
  },
  kpiActionWrapper: {
    marginTop: spacing.tiny,
  },
  kpiActionLink: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  chartCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, overflow: 'hidden' },
  sectionTitle: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.bold, marginBottom: 14 },
  donutLayout: { alignItems: 'center', gap: 14 },
  donutWrap: { width: 190, height: 190, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutTotal: { fontFamily: typography.family, color: colors.text, fontSize: 27, fontWeight: typography.weight.extrabold },
  legendList: { width: '100%', gap: spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 10, paddingVertical: 9, borderRadius: radii.md, backgroundColor: colors.background },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.sm, flex: 1 },
  legendValue: { fontFamily: typography.family, color: colors.text, fontWeight: typography.weight.bold, fontSize: typography.size.sm },
  muted: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.sm, lineHeight: 18 },
  overviewCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: 10 },
  overviewTile: { backgroundColor: colors.background, borderRadius: radii.md, padding: 14, minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overviewLabel: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.caption, flex: 1 },
  overviewValue: { fontFamily: typography.family, color: colors.text, fontSize: 25, fontWeight: typography.weight.extrabold, marginTop: spacing.xs },
  statusGroup: { gap: 9, marginBottom: spacing.md },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusValue: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.bold },
  progressTrack: { height: 8, borderRadius: radii.md, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radii.md },
  stateCard: { backgroundColor: colors.surface, padding: spacing.xxl, minHeight: 180, gap: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
  retryButton: { minHeight: 42, paddingHorizontal: 18, borderRadius: 9, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  retryText: { color: colors.surface, fontWeight: typography.weight.bold },
  warningBanner: { padding: spacing.md, borderRadius: radii.md, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
  warningText: { fontFamily: typography.family, color: '#9a3412', fontSize: typography.size.sm },
});

export default ReceptionistDashboardScreen;
