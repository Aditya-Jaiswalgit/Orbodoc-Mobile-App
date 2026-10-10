import React, { useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  Calendar,
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
}) => (
  <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.metricCard}>
    <View style={styles.metricInfo}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricAction}>View details</Text>
    </View>
    <View style={[styles.metricIcon, { backgroundColor: background }]}>
      <Icon size={22} color={color} />
    </View>
  </TouchableOpacity>
);

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
        return <Line key={`grid-${index}`} x1={28} x2={chartWidth - 4} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 4" />;
      })}
      {values.map((item, index) => {
        const x = 28 + slot * index + (slot - barWidth) / 2;
        const height = Math.max(item.value ? 4 : 0, (item.value / max) * (plotHeight - 12));
        const y = top + plotHeight - height;
        const color = ['#0d9488', '#22c55e', '#f59e0b', '#6366f1'][index % 4];
        return (
          <React.Fragment key={item.name}>
            <Rect x={x} y={y} width={barWidth} height={height} rx={6} fill={color} />
            <SvgText x={x + barWidth / 2} y={chartHeight - 9} fontSize="10" fill="#64748b" textAnchor="middle">{item.name}</SvgText>
            <SvgText x={x + barWidth / 2} y={Math.max(11, y - 5)} fontSize="10" fill="#334155" textAnchor="middle">{String(item.value)}</SvgText>
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
  const colors = ['#0d9488', '#f59e0b', '#38bdf8'];
  let offset = 0;

  return (
    <View style={styles.workloadWrap}>
      <View style={styles.donutWrap}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
          {total > 0 ? values.map((item, index) => {
            const dash = (item.value / total) * circumference;
            const currentOffset = offset;
            offset += dash;
            return <Circle key={item.name} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors[index]} strokeWidth={stroke} strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-currentOffset} rotation={-90} origin={`${size / 2}, ${size / 2}`} />;
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
            <View style={[styles.legendDot, { backgroundColor: colors[index] }]} />
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
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#0d9488" colors={['#0d9488']} />}
      >
        <View style={styles.welcomeBlock}>
          <Text style={styles.greetingTitle}>{greeting}, {doctorName}!</Text>
          <Text style={styles.greetingSubtitle}>Here's what's happening at your clinic today.</Text>
        </View>
        <View style={styles.todayCard}>
          <View style={styles.todayIcon}><Calendar size={20} color="#0d9488" /></View>
          <View style={styles.todayCopy}>
            <View style={styles.todayEyebrow}><View style={styles.todayDot} /><Text style={styles.todayLabel}>TODAY</Text></View>
            <Text style={styles.todayDate}>{todayLabel}</Text>
          </View>
        </View>
        {loading && !data ? (
          <View style={styles.stateCard}><ActivityIndicator size="large" color="#0d9488" /><Text style={styles.stateText}>Loading doctor dashboard…</Text></View>
        ) : error && !data ? (
          <View style={styles.stateCard}><Text style={styles.stateTitle}>Dashboard unavailable</Text><Text style={styles.stateText}>{error}</Text><TouchableOpacity style={styles.retryButton} onPress={refresh}><RefreshCw size={16} color="#fff" /><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>
        ) : data ? (
          <>
            {error ? <TouchableOpacity style={styles.warningBanner} onPress={refresh}><Text style={styles.warningText}>Some dashboard data could not be loaded. Tap to retry.</Text></TouchableOpacity> : null}
            <View style={styles.metricStack}>
              <MetricTile title="Today's Appointments" value={String(data.todayAppointments)} icon={Calendar} color="#0d9488" background="#ccfbf1" onPress={() => onNavigateScreen(`/appointments?date=${today}`)} />
              <MetricTile title="Upcoming Appointments" value={String(data.upcomingAppointments)} icon={Clock3} color="#16a34a" background="#dcfce7" onPress={() => onNavigateScreen(`/appointments?date_from=${tomorrow}`)} />
              <MetricTile title="Pending Requests" value={String(data.pendingRequests)} icon={AlertCircle} color="#d97706" background="#fef3c7" onPress={() => onNavigateScreen('/appointments?status=pending')} />
              <MetricTile
                title={data.isIndependentDoctor ? 'Wallet Balance' : 'Total Visits'}
                value={data.isIndependentDoctor ? currency(data.walletBalance) : String(data.totalVisits)}
                icon={data.isIndependentDoctor ? WalletCards : Activity}
                color={data.isIndependentDoctor ? '#0e7490' : '#6366f1'}
                background={data.isIndependentDoctor ? '#cffafe' : '#e0e7ff'}
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
                <Calendar size={34} color="#0d9488" />
              </View>
              <View style={styles.overviewTile}>
                <View>
                  <Text style={styles.overviewLabel}>{data.isIndependentDoctor ? 'Available Wallet Balance' : 'Pending Requests'}</Text>
                  <Text style={styles.overviewValue}>{data.isIndependentDoctor ? currency(data.walletBalance) : data.pendingRequests}</Text>
                </View>
                {data.isIndependentDoctor ? <WalletCards size={34} color="#0e7490" /> : <AlertCircle size={34} color="#d97706" />}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  welcomeBlock: { gap: 4 },
  greetingTitle: { color: '#1e293b', fontSize: 18, fontWeight: '800' },
  greetingSubtitle: { color: '#718096', fontSize: 13 },
  todayCard: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: '#99f6e4', backgroundColor: '#fff', shadowColor: '#0d9488', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  todayIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ccfbf1' },
  todayCopy: { gap: 2 },
  todayEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#14b8a6' },
  todayLabel: { color: '#0f766e', fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  todayDate: { color: '#1e293b', fontSize: 13, fontWeight: '600' },
  metricStack: { gap: 12 },
  metricCard: { minHeight: 116, padding: 16, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, overflow: 'hidden' },
  metricInfo: { flex: 1, gap: 5 },
  metricIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  metricTitle: { color: '#64748b', fontSize: 13 },
  metricValue: { color: '#0f172a', fontSize: 25, fontWeight: '800' },
  metricAction: { color: '#0d9488', fontSize: 12, fontWeight: '700', marginTop: 2 },
  chartCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, overflow: 'hidden' },
  sectionTitle: { color: '#0f172a', fontSize: 17, fontWeight: '700', marginBottom: 14 },
  workloadWrap: { alignItems: 'center', gap: 14 },
  donutWrap: { width: 190, height: 190, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutTotal: { color: '#0f172a', fontSize: 27, fontWeight: '800' },
  donutCaption: { color: '#64748b', fontSize: 11 },
  legendList: { width: '100%', gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 8, backgroundColor: '#f8fafc' },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendName: { color: '#64748b', fontSize: 12, flex: 1 },
  legendValue: { color: '#0f172a', fontWeight: '700', fontSize: 12 },
  overviewCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 10 },
  overviewTile: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 14, minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overviewLabel: { color: '#64748b', fontSize: 13 },
  overviewValue: { color: '#0f172a', fontSize: 25, fontWeight: '800', marginTop: 4 },
  stateCard: { backgroundColor: '#fff', padding: 24, minHeight: 180, gap: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  stateTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  stateText: { color: '#64748b', fontSize: 13, textAlign: 'center' },
  retryButton: { minHeight: 42, paddingHorizontal: 18, borderRadius: 9, backgroundColor: '#0d9488', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  retryText: { color: '#fff', fontWeight: '700' },
  warningBanner: { padding: 12, borderRadius: 10, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
  warningText: { color: '#9a3412', fontSize: 12 },
});

export default DoctorDashboardScreen;
