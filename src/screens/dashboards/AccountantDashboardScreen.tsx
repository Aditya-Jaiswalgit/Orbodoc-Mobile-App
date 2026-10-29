import { colors, radii, spacing, typography } from '../../theme/tokens';
import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import {
  AlertCircle,
  CalendarDays,
  FileText,
  IndianRupee,
  TrendingUp,
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { useAuthContext } from '../../context/AuthContext';
import { useAccountantDashboard } from '../../hooks/useAccountantDashboard';
import { LiquidBorderTouchable } from '../../components/common/LiquidBorderSurface';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (path: string) => void;
}

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const range = (kind: 'week' | 'month') => {
  const now = new Date();
  const from = kind === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now);
  if (kind === 'week') from.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return `date_from=${dayKey(from)}&date_to=${dayKey(now)}`;
};

function MetricCard({
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
}) {
  return (
    <LiquidBorderTouchable
      activeOpacity={0.7}
      style={styles.kpiCardHalf}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${value}`}
    >
      <View style={[styles.kpiIconBox, { backgroundColor: background }]}>
        <Icon size={22} color={color} />
      </View>
      <Text style={styles.kpiCardValue}>{value}</Text>
      <Text style={styles.kpiCardLabel} numberOfLines={2}>
        {title}
      </Text>
      <View style={styles.kpiActionWrapper}>
        <Text style={styles.kpiActionLink}>View details ↗</Text>
      </View>
    </LiquidBorderTouchable>
  );
}

function RevenueTrendChart({
  data,
  width,
}: {
  data: Array<{ label: string; value: number; color: string }>;
  width: number;
}) {
  const chartWidth = Math.max(260, width - 64);
  const chartHeight = 180;
  const top = 14;
  const bottom = 30;
  const left = 32;
  const right = 12;
  const plotWidth = chartWidth - left - right;
  const plotHeight = chartHeight - top - bottom;

  const rawMax = Math.max(...data.map(d => d.value), 0);
  // Default to 4 when data is 0 or low, matching Recharts domain [0, 4] with ticks 4, 3, 2, 1, 0
  const chartMax = rawMax > 4 ? Math.ceil(rawMax / 4) * 4 : 4;
  const step = chartMax / 4;
  const ticks = [4, 3, 2, 1, 0];

  const formatTick = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${Math.round(val / 1000)}k`;
    return String(val);
  };

  const slot = plotWidth / data.length;
  const barWidth = Math.min(38, slot * 0.45);

  return (
    <View style={styles.chartSvgWrap}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Horizontal Grid lines and Y-axis numbers */}
        {ticks.map((t, idx) => {
          const y = top + (plotHeight / 4) * idx;
          const tickVal = t * step;
          return (
            <React.Fragment key={`grid-${t}`}>
              <SvgText
                x={left - 8}
                y={y + 4}
                fontSize="11"
                fill={colors.muted}
                textAnchor="end"
                fontWeight="500"
              >
                {formatTick(tickVal)}
              </SvgText>
              <Line
                x1={left}
                x2={chartWidth - right}
                y1={y}
                y2={y}
                stroke={colors.secondary}
                strokeWidth={1}
              />
            </React.Fragment>
          );
        })}

        {/* Vertical Bars & X-axis Labels */}
        {data.map((item, index) => {
          const x = left + slot * index + (slot - barWidth) / 2;
          const barHeight = item.value > 0 ? Math.max(4, (item.value / chartMax) * (plotHeight - 8)) : 0;
          const y = top + plotHeight - barHeight;
          return (
            <React.Fragment key={item.label}>
              {barHeight > 0 && (
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={6}
                  ry={6}
                  fill={item.color}
                />
              )}
              {item.value > 0 && (
                <SvgText
                  x={x + barWidth / 2}
                  y={Math.max(12, y - 5)}
                  fontSize="10"
                  fontWeight="700"
                  fill={colors.text}
                  textAnchor="middle"
                >
                  {money(item.value)}
                </SvgText>
              )}
              <SvgText
                x={x + barWidth / 2}
                y={chartHeight - 8}
                fontSize="11"
                fontWeight="500"
                fill={colors.muted}
                textAnchor="middle"
              >
                {item.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

function BillingMix({ treatment, medicine, pending }: { treatment: number; medicine: number; pending: number }) {
  const total = treatment + medicine + pending;
  const circumference = 2 * Math.PI * 38;
  const treatmentArc = total ? (treatment / total) * circumference : 0;
  const medicineArc = total ? (medicine / total) * circumference : 0;
  const pendingArc = total ? (pending / total) * circumference : 0;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Revenue &amp; Pending Mix</Text>
      <View style={styles.mixContent}>
        <View style={styles.donutWrap}>
          <Svg width={112} height={112} viewBox="0 0 100 100">
            <Circle cx="50" cy="50" r="38" fill="none" stroke={colors.border} strokeWidth="13" />
            <Circle cx="50" cy="50" r="38" fill="none" stroke={colors.primary} strokeWidth="13" strokeDasharray={`${treatmentArc} ${circumference}`} rotation="-90" origin="50, 50" />
            <Circle cx="50" cy="50" r="38" fill="none" stroke={colors.success} strokeWidth="13" strokeDasharray={`${medicineArc} ${circumference}`} strokeDashoffset={-treatmentArc} rotation="-90" origin="50, 50" />
            <Circle cx="50" cy="50" r="38" fill="none" stroke={colors.warning} strokeWidth="13" strokeDasharray={`${pendingArc} ${circumference}`} strokeDashoffset={-(treatmentArc + medicineArc)} rotation="-90" origin="50, 50" />
          </Svg>
        </View>
        <View style={styles.legend}>
          <Legend color={colors.primary} label="Treatment" value={money(treatment)} />
          <Legend color={colors.success} label="Medicine" value={money(medicine)} />
          <Legend color={colors.warning} label="Pending" value={String(pending)} />
        </View>
      </View>
    </View>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

function Overview({ label, amount }: { label: string; amount: number }) {
  return (
    <View style={styles.overview}>
      <Text style={styles.overviewAmount}>{money(amount)}</Text>
      <Text style={styles.overviewLabel}>{label}</Text>
    </View>
  );
}

function Breakdown({ label, value, ratio, color }: { label: string; value: number; ratio: number; color: string }) {
  return (
    <View style={styles.breakdown}>
      <View style={styles.breakdownHead}>
        <Text style={styles.breakdownLabel}>{label}</Text>
        <Text style={styles.breakdownValue}>{money(value)}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progress, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function StatusTile({ icon, label, value, warning = false }: { icon: React.ReactNode; label: string; value: string; warning?: boolean }) {
  return (
    <View style={styles.statusTile}>
      <View style={styles.statusHead}>
        <Text style={styles.statusLabel}>{label}</Text>
        {icon}
      </View>
      <Text style={[styles.statusValue, warning && styles.warning]}>{value}</Text>
    </View>
  );
}

export const AccountantDashboardScreen: React.FC<Props> = ({ onOpenDrawer, onOpenNotifications, onNavigateScreen = () => {} }) => {
  const { width } = useWindowDimensions();
  const { user } = useAuthContext();
  const { data, loading, refreshing, error, refresh } = useAccountantDashboard();

  const now = new Date();
  const today = dayKey(now);
  const todayPath = `/billing/treatment?date=${today}`;
  const weekPath = `/billing/treatment?${range('week')}`;
  const monthPath = `/billing/treatment?${range('month')}`;

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const staffName = String(user?.fullName || user?.full_name || 'Accountant').trim();
  const todayLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const breakdownTotal = data.treatmentRevenue + data.medicineRevenue;
  const treatmentRatio = breakdownTotal ? data.treatmentRevenue / breakdownTotal : 0;
  const medicineRatio = breakdownTotal ? data.medicineRevenue / breakdownTotal : 0;

  const revenueBars = [
    { label: 'Today', value: data.todayRevenue, color: colors.primary },
    { label: 'Week', value: data.weekRevenue, color: colors.success },
    { label: 'Month', value: data.monthRevenue, color: colors.warning },
  ];

  return (
    <View style={styles.root}>
      <StaffHeader onOpenDrawer={onOpenDrawer} onOpenNotifications={onOpenNotifications} title="Accounts Dashboard" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* ── 1. GREETING & TODAY CARD ── */}
        <View style={styles.welcomeBlock}>
          <Text style={styles.greetingTitle}>
            {greeting}{staffName ? `, ${staffName}` : ''}!
          </Text>
          <Text style={styles.greetingSubtitle}>
            Here's what's happening in your clinic accounts today.
          </Text>
        </View>

        {/* Today Date Card */}
        <View style={styles.todayCard}>
          <View style={styles.todayIcon}>
            <CalendarDays size={22} color={colors.primary} strokeWidth={2.2} />
          </View>
          <View style={styles.todayCopy}>
            <View style={styles.todayEyebrow}>
              <View style={styles.todayDot} />
              <Text style={styles.todayLabel}>TODAY</Text>
            </View>
            <Text style={styles.todayDate}>{todayLabel}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.muted}>Loading accounts dashboard…</Text>
          </View>
        ) : null}

        {error ? (
          <TouchableOpacity onPress={refresh} style={styles.error}>
            <Text style={styles.errorText}>{error} Tap to retry.</Text>
          </TouchableOpacity>
        ) : null}

        {!loading ? (
          <>
            {/* ── 2. KPI CARDS (2x2 GRID) ── */}
            <View style={styles.kpiGrid}>
              <MetricCard
                title="Today's Revenue"
                value={money(data.todayRevenue)}
                color={colors.primary}
                background={colors.mint}
                icon={IndianRupee}
                onPress={() => onNavigateScreen(todayPath)}
              />
              <MetricCard
                title="Week Revenue"
                value={money(data.weekRevenue)}
                color={colors.success}
                background={colors.successSoft}
                icon={TrendingUp}
                onPress={() => onNavigateScreen(weekPath)}
              />
              <MetricCard
                title="Month Revenue"
                value={money(data.monthRevenue)}
                color={colors.warning}
                background={colors.warningSoft}
                icon={IndianRupee}
                onPress={() => onNavigateScreen(monthPath)}
              />
              <MetricCard
                title="Pending Payments"
                value={String(data.pendingPayments)}
                color="#7C3AED"
                background="#F3E8FF"
                icon={AlertCircle}
                onPress={() => onNavigateScreen('/billing/treatment?status=pending')}
              />
            </View>

            {/* ── 3. CHARTS ── */}
            <View style={styles.chartGrid}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Revenue Trend</Text>
                <RevenueTrendChart data={revenueBars} width={width} />
              </View>
              <BillingMix
                treatment={data.treatmentRevenue}
                medicine={data.medicineRevenue}
                pending={data.pendingPayments}
              />
            </View>

            {/* ── 4. REVENUE OVERVIEW ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Revenue Overview</Text>
              <View style={styles.overviewRow}>
                <Overview label="Today" amount={data.todayRevenue} />
                <Overview label="This Week" amount={data.weekRevenue} />
                <Overview label="This Month" amount={data.monthRevenue} />
              </View>
            </View>

            {/* ── 5. DETAILS ── */}
            <View style={styles.detailGrid}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Revenue Breakdown</Text>
                <Breakdown label="Treatment Revenue" value={data.treatmentRevenue} ratio={treatmentRatio} color={colors.primary} />
                <Breakdown label="Medicine Revenue" value={data.medicineRevenue} ratio={medicineRatio} color={colors.success} />
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Bills Status</Text>
                <StatusTile icon={<FileText size={22} color={colors.primary} />} label="Bills Generated" value={String(data.billsGenerated)} />
                <StatusTile icon={<AlertCircle size={22} color={colors.warning} />} label="Pending Payments" value={String(data.pendingPayments)} warning />
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40, gap: 14 },
  welcomeBlock: { gap: spacing.xs, marginBottom: 2 },
  greetingTitle: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.extrabold },
  greetingSubtitle: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.caption },
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
    marginBottom: spacing.xs,
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

  // KPI Grid
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
    fontFamily: typography.family, fontSize: typography.size.title,
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

  chartGrid: { gap: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.bold, marginBottom: 14 },
  chartSvgWrap: { alignItems: 'center', justifyContent: 'center' },

  mixContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  donutWrap: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
  legend: { flex: 1, gap: 11 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { fontFamily: typography.family, flex: 1, color: colors.muted, fontSize: typography.size.sm },
  legendValue: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.sm, fontWeight: typography.weight.bold },

  overviewRow: { flexDirection: 'row', gap: spacing.sm },
  overview: { flex: 1, backgroundColor: colors.background, borderRadius: 11, padding: 10, alignItems: 'center' },
  overviewAmount: { fontFamily: typography.family, color: colors.text, fontWeight: typography.weight.extrabold, fontSize: typography.size.body },
  overviewLabel: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.micro, marginTop: spacing.xs, textAlign: 'center' },

  detailGrid: { gap: 14 },
  breakdown: { padding: spacing.md, backgroundColor: colors.background, borderRadius: 11, marginBottom: 10 },
  breakdownHead: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginBottom: 9 },
  breakdownLabel: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.sm },
  breakdownValue: { fontFamily: typography.family, color: colors.text, fontWeight: typography.weight.bold, fontSize: typography.size.caption },
  progressTrack: { height: 8, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden' },
  progress: { height: '100%', borderRadius: 5 },

  statusTile: { padding: spacing.md, backgroundColor: colors.background, borderRadius: 11, marginBottom: 10 },
  statusHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusLabel: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.sm },
  statusValue: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.display, fontWeight: typography.weight.extrabold, marginTop: 7 },
  warning: { color: colors.warning },

  loading: { padding: 28, borderRadius: radii.lg, alignItems: 'center', gap: 9, backgroundColor: colors.surface },
  muted: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.caption },
  error: { backgroundColor: colors.destructiveSoft, padding: spacing.md, borderRadius: radii.md },
  errorText: { fontFamily: typography.family, color: colors.destructiveDark, fontSize: typography.size.sm },
});

export default AccountantDashboardScreen;
