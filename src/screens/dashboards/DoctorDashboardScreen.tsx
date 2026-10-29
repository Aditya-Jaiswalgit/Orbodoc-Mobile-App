import { colors, radii, spacing, typography } from '../../theme/tokens';
import React, { useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  Calendar,
  CalendarDays,
  Clock3,
  RefreshCw,
  WalletCards,
} from 'lucide-react-native';
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
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { StaffHeader } from '../../components/common/StaffHeader';
import { useDoctorDashboard } from '../../hooks/useDoctorDashboard';
import { displayAmount } from '../../utils/dashboardValues';
import { LiquidBorderTouchable } from '../../components/common/LiquidBorderSurface';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const MetricTile = ({
  title,
  value,
  icon: Icon,
  color,
  background,
  onPress,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  background: string;
  onPress: () => void;
}) => {
  const isSmallValue = value.length > 5;
  return (
    <LiquidBorderTouchable accessibilityRole="button" onPress={onPress} style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: background }]}>
        <Icon size={22} color={color} />
      </View>
      <Text style={[styles.metricValue, isSmallValue && styles.metricValueSmall]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.metricTitle} numberOfLines={2}>
        {title}
      </Text>
      <View style={{ marginTop: spacing.tiny }}>
        <Text style={styles.metricAction}>View details ↗</Text>
      </View>
    </LiquidBorderTouchable>
  );
};

const SnapshotChart = ({ values, width }: { values: Array<{ name: string; value: number }>; width: number }) => {
  const chartWidth = Math.max(260, width - 64);
  const chartHeight = 204;
  const top = 14;
  const bottom = 34;
  const plotHeight = chartHeight - top - bottom;
  const max = Math.max(1, ...values.map(item => item.value));
  const slot = chartWidth / Math.max(values.length, 1);
  const barWidth = Math.min(38, slot * 0.55);

  return (
    <Svg width={chartWidth} height={chartHeight}>
      {[0, 1, 2, 3, 4].map(index => {
        const y = top + (plotHeight / 4) * index;
        return <Line key={`grid-${index}`} x1={28} x2={chartWidth - 4} y1={y} y2={y} stroke={colors.border} strokeDasharray="3 4" />;
      })}
      {values.map((item, index) => {
        const x = 28 + slot * index + (slot - barWidth) / 2;
        const height = Math.max(item.value ? 4 : 0, (item.value / max) * (plotHeight - 12));
        const y = top + plotHeight - height;
        const color = [colors.primary, colors.success, colors.warning, '#6366f1'][index % 4];
        return (
          <React.Fragment key={item.name}>
            <Rect x={x} y={y} width={barWidth} height={height} rx={6} fill={color} />
            <SvgText x={x + barWidth / 2} y={chartHeight - 9} fontSize="10" fill={colors.muted} textAnchor="middle">{item.name}</SvgText>
            <SvgText x={x + barWidth / 2} y={Math.max(11, y - 5)} fontSize="10" fill={colors.foreground} textAnchor="middle">{String(item.value)}</SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

const WorkloadChart = ({ values }: { values: Array<{ name: string; value: number }> }) => {
  const size = 190;
  const stroke = 28;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = values.reduce((sum, item) => sum + item.value, 0);
  const chartColors = [colors.primary, colors.warning, '#38bdf8'];
  let offset = 0;

  return (
    <View style={styles.workloadWrap}>
      <View style={styles.donutWrap}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors.border} strokeWidth={stroke} />
          {total > 0 ? values.map((item, index) => {
            const dash = (item.value / total) * circumference;
            const currentOffset = offset;
            offset += dash;
            return <Circle key={item.name} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={chartColors[index]} strokeWidth={stroke} strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-currentOffset} rotation={-90} origin={`${size / 2}, ${size / 2}`} />;
          }) : null}
        </Svg>
        <View style={styles.donutCenter}>
          <Text style={styles.donutTotal}>{total}</Text>
          <Text style={styles.donutCaption}>Appointments</Text>
        </View>
      </View>
      <View style={styles.legendList}>
        {values.map((item, index) => (
          <View key={item.name} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: chartColors[index] }]} />
            <Text style={styles.legendName}>{item.name}</Text>
            <Text style={styles.legendValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export const DoctorDashboardScreen: React.FC<Props> = ({
  onOpenDrawer,
  onOpenNotifications,
  onNavigateScreen = () => {},
}) => {
  const { width } = useWindowDimensions();
  const { data, loading, error, refresh, user } = useDoctorDashboard();
  const now = new Date();
  const today = localDateKey(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localDateKey(tomorrowDate);
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const doctorName = String(user?.fullName || user?.full_name || 'Doctor').trim();
  const todayLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const currency = (amount: number) => displayAmount(amount);

  const flowData = useMemo(() => [
    { name: 'Today', value: data?.todayAppointments || 0 },
    { name: 'Upcoming', value: data?.upcomingAppointments || 0 },
    { name: 'Pending', value: data?.pendingRequests || 0 },
    { name: 'Visits', value: data?.totalVisits || 0 },
  ], [data]);
  const workloadData = useMemo(() => [
    { name: 'Today', value: data?.todayAppointments || 0 },
    { name: 'Pending', value: data?.pendingRequests || 0 },
    { name: 'Upcoming', value: data?.upcomingAppointments || 0 },
  ], [data]);

  return (
    <View style={styles.screen}>
      <StaffHeader onOpenDrawer={onOpenDrawer} onOpenNotifications={onOpenNotifications} title="Doctor Dashboard" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View style={styles.welcomeBlock}>
          <Text style={styles.greetingTitle}>{greeting}, {doctorName}!</Text>
          <Text style={styles.greetingSubtitle}>Here's what's happening at your clinic today.</Text>
        </View>
        <View style={styles.todayCard}>
          <View style={styles.todayIcon}><CalendarDays size={22} color={colors.primary} strokeWidth={2.2} /></View>
          <View style={styles.todayCopy}>
            <View style={styles.todayEyebrow}><View style={styles.todayDot} /><Text style={styles.todayLabel}>TODAY</Text></View>
            <Text style={styles.todayDate}>{todayLabel}</Text>
          </View>
        </View>
        {loading && !data ? (
          <View style={styles.stateCard}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.stateText}>Loading doctor dashboard…</Text></View>
        ) : error && !data ? (
          <View style={styles.stateCard}><Text style={styles.stateTitle}>Dashboard unavailable</Text><Text style={styles.stateText}>{error}</Text><TouchableOpacity style={styles.retryButton} onPress={refresh}><RefreshCw size={16} color={colors.surface} /><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>
        ) : data ? (
          <>
            {error ? <TouchableOpacity style={styles.warningBanner} onPress={refresh}><Text style={styles.warningText}>Some dashboard data could not be loaded. Tap to retry.</Text></TouchableOpacity> : null}
            <View style={styles.metricGrid}>
              <MetricTile title="Today's Appointments" value={String(data.todayAppointments)} icon={Calendar} color={colors.primary} background={colors.mintBorder} onPress={() => onNavigateScreen(`/appointments?date=${today}`)} />
              <MetricTile title="Upcoming Appointments" value={String(data.upcomingAppointments)} icon={Clock3} color={colors.success} background={colors.successSoft} onPress={() => onNavigateScreen(`/appointments?date_from=${tomorrow}`)} />
              <MetricTile title="Pending Requests" value={String(data.pendingRequests)} icon={AlertCircle} color={colors.warning} background={colors.warningSoft} onPress={() => onNavigateScreen('/appointments?status=pending')} />
              <MetricTile
                title={data.isIndependentDoctor ? 'Wallet Balance' : 'Total Visits'}
                value={data.isIndependentDoctor ? currency(data.walletBalance) : String(data.totalVisits)}
                icon={data.isIndependentDoctor ? WalletCards : Activity}
                color={data.isIndependentDoctor ? '#0e7490' : '#6366f1'}
                background={data.isIndependentDoctor ? colors.infoSoft : '#e0e7ff'}
                onPress={() => onNavigateScreen(data.isIndependentDoctor ? 'wallet' : '/appointments?status=complete')}
              />
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Appointments Snapshot</Text>
              <SnapshotChart values={flowData} width={width} />
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Workload Split</Text>
              <WorkloadChart values={workloadData} />
            </View>

            <View style={styles.overviewCard}>
              <Text style={styles.sectionTitle}>Quick Overview</Text>
              <View style={styles.overviewTile}>
                <View><Text style={styles.overviewLabel}>Appointments Today</Text><Text style={styles.overviewValue}>{data.todayAppointments}</Text></View>
                <Calendar size={34} color={colors.primary} />
              </View>
              <View style={styles.overviewTile}>
                <View>
                  <Text style={styles.overviewLabel}>{data.isIndependentDoctor ? 'Available Wallet Balance' : 'Pending Requests'}</Text>
                  <Text style={styles.overviewValue}>{data.isIndependentDoctor ? currency(data.walletBalance) : data.pendingRequests}</Text>
                </View>
                {data.isIndependentDoctor ? <WalletCards size={34} color="#0e7490" /> : <AlertCircle size={34} color={colors.warning} />}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.lg },
  welcomeBlock: { gap: spacing.xs },
  greetingTitle: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.lg, fontWeight: typography.weight.extrabold },
  greetingSubtitle: { fontFamily: typography.family, color: '#718096', fontSize: typography.size.caption },
  todayCard: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.mintBorder, backgroundColor: colors.surface, shadowColor: colors.primary, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  todayIcon: { width: 42, height: 42, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mintBorder },
  todayCopy: { gap: 2 },
  todayEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  todayLabel: { fontFamily: typography.family, color: colors.primaryDark, fontSize: typography.size.micro, fontWeight: typography.weight.extrabold, letterSpacing: 1.6 },
  todayDate: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.caption, fontWeight: typography.weight.semibold },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  metricCard: {
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
  metricIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricValue: {
    fontFamily: typography.family, fontSize: typography.size.display,
    fontWeight: typography.weight.extrabold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  metricValueSmall: {
    fontFamily: typography.family, fontSize: typography.size.lg,
    fontWeight: typography.weight.extrabold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  metricTitle: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.muted,
    minHeight: 32,
    lineHeight: 16,
  },
  metricAction: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  chartCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, overflow: 'hidden' },
  sectionTitle: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.bold, marginBottom: 14 },
  workloadWrap: { alignItems: 'center', gap: 14 },
  donutWrap: { width: 190, height: 190, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutTotal: { fontFamily: typography.family, color: colors.text, fontSize: 27, fontWeight: typography.weight.extrabold },
  donutCaption: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.xs },
  legendList: { width: '100%', gap: spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 10, paddingVertical: 9, borderRadius: radii.md, backgroundColor: colors.background },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendName: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.sm, flex: 1 },
  legendValue: { fontFamily: typography.family, color: colors.text, fontWeight: typography.weight.bold, fontSize: typography.size.sm },
  overviewCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: 10 },
  overviewTile: { backgroundColor: colors.background, borderRadius: radii.md, padding: 14, minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overviewLabel: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.caption },
  overviewValue: { fontFamily: typography.family, color: colors.text, fontSize: 25, fontWeight: typography.weight.extrabold, marginTop: spacing.xs },
  stateCard: { backgroundColor: colors.surface, padding: spacing.xxl, minHeight: 180, gap: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
  stateTitle: { fontFamily: typography.family, fontSize: 17, fontWeight: typography.weight.bold, color: colors.text },
  stateText: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.caption, textAlign: 'center' },
  retryButton: { minHeight: 42, paddingHorizontal: 18, borderRadius: 9, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  retryText: { color: colors.surface, fontWeight: typography.weight.bold },
  warningBanner: { padding: spacing.md, borderRadius: radii.md, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
  warningText: { fontFamily: typography.family, color: '#9a3412', fontSize: typography.size.sm },
});

export default DoctorDashboardScreen;
