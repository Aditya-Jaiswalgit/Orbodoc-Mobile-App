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
import { Activity, AlertCircle, CalendarDays, Clock3, RefreshCw, Users } from 'lucide-react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { StaffHeader } from '../../components/common/StaffHeader';
import { useReceptionistDashboard } from '../../hooks/useReceptionistDashboard';

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
  <TouchableOpacity
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
  </TouchableOpacity>
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
  const colors = ['#0d9488', '#22c55e', '#f59e0b', '#6366f1'];
  return (
    <Svg width={chartWidth} height={chartHeight}>
      {[0, 1, 2, 3, 4].map(index => {
        const y = top + (plotHeight / 4) * index;
        return <Line key={`grid-${index}`} x1={30} x2={chartWidth - 4} y1={y} y2={y} stroke="#e2e8f0" />;
      })}
      {values.map((row, index) => {
        const x = 30 + slot * index + (slot - barWidth) / 2;
        const barHeight = row.value > 0 ? Math.max(4, (row.value / max) * (plotHeight - 12)) : 0;
        const y = top + plotHeight - barHeight;
        return <React.Fragment key={row.name}>
          <Rect x={x} y={y} width={barWidth} height={barHeight} rx={6} fill={colors[index % colors.length]} />
          <SvgText x={x + barWidth / 2} y={chartHeight - 8} fontSize="10" fill="#64748b" textAnchor="middle">{row.name}</SvgText>
          <SvgText x={x + barWidth / 2} y={Math.max(10, y - 5)} fontSize="10" fill="#334155" textAnchor="middle">{String(row.value)}</SvgText>
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
  const colors = ['#0d9488', '#22c55e', '#f59e0b'];
  let offset = 0;
  return <View style={styles.donutLayout}>
    <View style={styles.donutWrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
        {total > 0 ? values.map((row, index) => {
          const dash = (row.value / total) * circumference;
          const currentOffset = offset;
          offset += dash;
          return <Circle key={row.name} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors[index]} strokeWidth={strokeWidth} strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-currentOffset} rotation={-90} origin={`${size / 2}, ${size / 2}`} />;
        }) : null}
      </Svg>
      <View style={styles.donutCenter}><Text style={styles.donutTotal}>{total}</Text><Text style={styles.muted}>Appointments</Text></View>
    </View>
    <View style={styles.legendList}>{values.map((row, index) => <View key={row.name} style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: colors[index] }]} /><Text style={styles.legendLabel}>{row.name}</Text><Text style={styles.legendValue}>{row.value}</Text>
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
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#0d9488" colors={['#0d9488']} />}>
      <View style={styles.welcomeBlock}>
        <Text style={styles.greetingTitle}>{greeting}, {staffName}!</Text>
        <Text style={styles.greetingSubtitle}>Here's what's happening at your clinic today.</Text>
      </View>
      <View style={styles.todayCard}>
        <View style={styles.todayIcon}><CalendarDays size={22} color="#0d9488" strokeWidth={2.2} /></View>
        <View style={styles.todayCopy}>
          <View style={styles.todayEyebrow}><View style={styles.todayDot} /><Text style={styles.todayLabel}>TODAY</Text></View>
          <Text style={styles.todayDate}>{dateLabel}</Text>
        </View>
      </View>

      {loading && !data ? <View style={styles.stateCard}><ActivityIndicator size="large" color="#0d9488" /><Text style={styles.muted}>Loading receptionist dashboard…</Text></View> : error && !data ? <View style={styles.stateCard}><Text style={styles.sectionTitle}>Dashboard unavailable</Text><Text style={styles.muted}>{error}</Text><TouchableOpacity style={styles.retryButton} onPress={refresh}><RefreshCw size={16} color="#fff" /><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View> : data ? <>
        {error ? <TouchableOpacity style={styles.warningBanner} onPress={refresh}><Text style={styles.warningText}>Some dashboard data could not be loaded. Tap to retry.</Text></TouchableOpacity> : null}
        <View style={styles.kpiGrid}>
          <MetricTile
            title="Total Patients"
            value={String(data.totalPatients ?? 0)}
            icon={Users}
            color="#0D9488"
            background="#E6FFFA"
            onPress={() => onNavigateScreen('/patients?status=all')}
          />
          <MetricTile
            title="Today's Appointments"
            value={String(data.todayAppointments ?? 0)}
            icon={CalendarDays}
            color="#16A34A"
            background="#DCFCE7"
            onPress={() => onNavigateScreen(`/appointments?date=${today}`)}
          />
          <MetricTile
            title="Upcoming"
            value={String(data.upcomingAppointments ?? 0)}
            icon={Clock3}
            color="#D97706"
            background="#FEF3C7"
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
          <View style={styles.overviewTile}><View><Text style={styles.overviewLabel}>Today's Schedule</Text><Text style={styles.overviewValue}>{data.todayAppointments}</Text></View><CalendarDays size={36} color="#0d9488" strokeWidth={2} /></View>
          <View style={styles.overviewTile}><View><Text style={styles.overviewLabel}>Pending Approvals</Text><Text style={styles.overviewValue}>{data.pendingApprovals}</Text></View><AlertCircle size={38} color="#d97706" /></View>
        </View>

        <View style={styles.overviewCard}>
          <Text style={styles.sectionTitle}>Appointment Status</Text>
          <StatusRow label="Today's Appointments" value={data.todayAppointments} color="#22c55e" progress={0.7} />
          <StatusRow label="Upcoming Appointments" value={data.upcomingAppointments} color="#0d9488" progress={0.5} />
          <StatusRow label="Pending Approvals" value={data.pendingApprovals} color="#f59e0b" progress={0.3} />
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
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  welcomeBlock: { gap: 4 },
  greetingTitle: { color: '#1e293b', fontSize: 18, fontWeight: '800' },
  greetingSubtitle: { color: '#718096', fontSize: 13 },
  todayCard: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#99f6e4',
    backgroundColor: '#ffffff',
    shadowColor: '#0d9488',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  todayIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6FFFA',
  },
  todayCopy: { flex: 1, gap: 3 },
  todayEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  todayDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0d9488' },
  todayLabel: { color: '#0d9488', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  todayDate: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  kpiCardHalf: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  kpiIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiCardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  kpiCardLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    minHeight: 32,
  },
  kpiActionWrapper: {
    marginTop: 6,
  },
  kpiActionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  chartCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, overflow: 'hidden' },
  sectionTitle: { color: '#0f172a', fontSize: 17, fontWeight: '700', marginBottom: 14 },
  donutLayout: { alignItems: 'center', gap: 14 },
  donutWrap: { width: 190, height: 190, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutTotal: { color: '#0f172a', fontSize: 27, fontWeight: '800' },
  legendList: { width: '100%', gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 8, backgroundColor: '#f8fafc' },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { color: '#64748b', fontSize: 12, flex: 1 },
  legendValue: { color: '#0f172a', fontWeight: '700', fontSize: 12 },
  muted: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  overviewCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 10 },
  overviewTile: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 14, minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overviewLabel: { color: '#64748b', fontSize: 13, flex: 1 },
  overviewValue: { color: '#0f172a', fontSize: 25, fontWeight: '800', marginTop: 4 },
  statusGroup: { gap: 9, marginBottom: 12 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusValue: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  progressTrack: { height: 8, borderRadius: 8, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 8 },
  stateCard: { backgroundColor: '#fff', padding: 24, minHeight: 180, gap: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  retryButton: { minHeight: 42, paddingHorizontal: 18, borderRadius: 9, backgroundColor: '#0d9488', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  retryText: { color: '#fff', fontWeight: '700' },
  warningBanner: { padding: 12, borderRadius: 10, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
  warningText: { color: '#9a3412', fontSize: 12 },
});

export default ReceptionistDashboardScreen;
