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
import { IndianRupee, Package, ShoppingCart, TrendingUp, TriangleAlert } from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { usePharmacistDashboard } from '../../hooks/usePharmacistDashboard';
import { LiquidBorderTouchable } from '../../components/common/LiquidBorderSurface';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (path: string) => void;
}

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const rangePath = (from: string, to: string) => `/billing/medicine?date_from=${from}&date_to=${to}`;

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
  const { width } = useWindowDimensions();

  return (
    <LiquidBorderTouchable
      activeOpacity={0.7}
      style={[styles.kpiCard, { width: width >= 900 ? '23.5%' : width >= 640 ? '48%' : '100%', padding: width >= 640 ? 24 : 16 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${value}`}
    >
      <View style={[styles.kpiIconBox, width >= 640 && styles.kpiIconBoxWide, { backgroundColor: background }]}>
        <Icon size={22} color={color} />
      </View>
      <Text style={[styles.kpiCardValue, width >= 640 && styles.kpiCardValueWide]}>{value}</Text>
      <Text style={[styles.kpiCardLabel, width >= 640 && styles.kpiCardLabelWide]} numberOfLines={2}>
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
  const chartHeight = width >= 640 ? 260 : 220;
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
                fontFamily={typography.family}
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
                  fontFamily={typography.family}
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
                fontFamily={typography.family}
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

export const PharmacistDashboardScreen: React.FC<Props> = ({ onOpenDrawer, onOpenNotifications, onNavigateScreen = () => {} }) => {
  const { width } = useWindowDimensions();
  const { data, loading, refreshing, error, refresh } = usePharmacistDashboard();
  const today = new Date();
  const todayKey = dateKey(today);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const isWide = width >= 900;
  const isMedium = width >= 768;

  const revenueBars = [
    { label: 'Today', value: data.todayRevenue, color: colors.primary },
    { label: 'Week', value: data.weekRevenue, color: colors.success },
    { label: 'Month', value: data.monthRevenue, color: colors.warning },
  ];
  const totalStockMix = Math.max(data.totalMedicines, data.lowStockCount, 1);
  const circumference = 2 * Math.PI * 46;
  const lowStockArc = Math.min(data.lowStockCount / totalStockMix, 1) * circumference;

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} onOpenNotifications={onOpenNotifications} title="Pharmacist Dashboard" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {loading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Loading pharmacy dashboard…</Text></View> : null}
        {error ? <TouchableOpacity style={styles.errorBox} onPress={refresh}><Text style={styles.errorText}>{error} Tap to retry.</Text></TouchableOpacity> : null}

        {!loading ? <>
          <View style={styles.kpiGrid}>
            <MetricCard
              title="Today's Revenue"
              value={money(data.todayRevenue)}
              color={colors.primary}
              background="#E9F6F5"
              icon={IndianRupee}
              onPress={() => onNavigateScreen(`/billing/medicine?date=${todayKey}`)}
            />
            <MetricCard
              title="Week Revenue"
              value={money(data.weekRevenue)}
              color={colors.success}
              background="#EAF8F1"
              icon={TrendingUp}
              onPress={() => onNavigateScreen(rangePath(dateKey(weekStart), todayKey))}
            />
            <MetricCard
              title="Month Revenue"
              value={money(data.monthRevenue)}
              color={colors.warning}
              background="#FEF6E9"
              icon={IndianRupee}
              onPress={() => onNavigateScreen(rangePath(dateKey(monthStart), todayKey))}
            />
            <MetricCard
              title="Total Medicines"
              value={String(data.totalMedicines)}
              color={colors.primaryDark}
              background="#E0F5F3"
              icon={Package}
              onPress={() => onNavigateScreen('/medicines?stock=all')}
            />
          </View>

          <View style={[styles.chartGrid, isWide && styles.chartGridWide]}>
            <View style={[styles.card, styles.chartCard, isWide && styles.halfWidthCard, { padding: width >= 640 ? 24 : 16 }]}>
              <Text style={styles.sectionTitle}>Revenue Trend</Text>
              <RevenueTrendChart data={revenueBars} width={isWide ? width / 2 : width} />
            </View>
            <View style={[styles.card, styles.chartCard, isWide && styles.halfWidthCard, { padding: width >= 640 ? 24 : 16 }]}>
              <Text style={styles.sectionTitle}>Inventory Health</Text>
              <View style={styles.donutWrap}>
                <Svg width={190} height={190} viewBox="0 0 120 120">
                  <Circle cx="60" cy="60" r="46" fill="none" stroke="#EAF8F1" strokeWidth="16" />
                  <Circle cx="60" cy="60" r="46" fill="none" stroke={colors.warning} strokeWidth="16" strokeDasharray={`${lowStockArc} ${circumference}`} rotation="-90" origin="60, 60" />
                </Svg>
                <View style={styles.donutCenter}><Text style={styles.donutValue}>{data.totalMedicines}</Text><Text style={styles.donutLabel}>medicines</Text></View>
              </View>
              <View style={styles.legendRow}><View style={[styles.legendDot, styles.legendWarning]} /><Text style={styles.legendText}>Low stock · {data.lowStockCount}</Text></View>
              <View style={styles.legendRow}><View style={[styles.legendDot, styles.legendSuccess]} /><Text style={styles.legendText}>In stock · {Math.max(data.totalMedicines - data.lowStockCount, 0)}</Text></View>
            </View>
          </View>

          <View style={[styles.bottomGrid, isMedium && styles.bottomGridWide]}>
            <View style={[styles.card, styles.inventoryCard, isMedium && styles.halfWidthCard]}>
              <Text style={styles.sectionTitle}>Inventory Status</Text>
              <TouchableOpacity style={styles.inventoryStat} onPress={() => onNavigateScreen('/medicines?stock=low')}>
                <View><Text style={styles.muted}>Low Stock Items</Text><Text style={styles.inventoryNumber}>{data.lowStockCount}</Text></View>
                <TriangleAlert size={25} color={colors.warning} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.inventoryStat} onPress={() => onNavigateScreen('/medicines?stock=all')}>
                <View><Text style={styles.muted}>Total Medicines</Text><Text style={styles.inventoryNumber}>{data.totalMedicines}</Text></View>
                <Package size={25} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.card, styles.inventoryCard, isMedium && styles.halfWidthCard]}>
              <View style={styles.salesHeading}><ShoppingCart size={18} color={colors.success} /><Text style={styles.sectionTitle}>Recent Sales</Text></View>
              {data.recentSales.length ? data.recentSales.map(sale => <View key={sale.name} style={styles.saleRow}>
                <Text numberOfLines={1} style={styles.saleName}>{sale.name}</Text><Text style={styles.saleCount}>{sale.totalSold} sold</Text>
              </View>) : <Text style={styles.emptyText}>No recent sales</Text>}
            </View>
          </View>

          <View style={[styles.card, styles.inventoryCard]}>
            <Text style={styles.sectionTitle}>Revenue Overview</Text>
            <View style={[styles.revenueOverview, width >= 640 && styles.revenueOverviewWide]}>
              {revenueBars.map(item => <TouchableOpacity key={item.label} style={styles.revenueCell} onPress={() => onNavigateScreen(item.label === 'Today' ? `/billing/medicine?date=${todayKey}` : item.label === 'Week' ? rangePath(dateKey(weekStart), todayKey) : rangePath(dateKey(monthStart), todayKey))}>
                <Text style={styles.revenueValue}>{money(item.value)}</Text><Text style={styles.muted}>{item.label === 'Week' ? 'This Week' : item.label === 'Month' ? 'This Month' : 'Today'}</Text>
              </TouchableOpacity>)}
            </View>
          </View>
        </> : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.xxl },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
    marginBottom: spacing.xs,
  },
  kpiCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  chartGridWide: { flexDirection: 'row', gap: spacing.xxl },
  chartCard: { flex: 1 },
  halfWidthCard: { width: '48%' },
  inventoryCard: { padding: spacing.xxl },
  bottomGridWide: { flexDirection: 'row', gap: spacing.xxl },
  kpiIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiIconBoxWide: { width: 48, height: 48, borderRadius: radii.lg },
  kpiCardValue: {
    fontFamily: typography.family,
    fontSize: typography.size.display,
    fontWeight: typography.weight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  kpiCardValueWide: { fontFamily: typography.family, fontSize: 30 },
  kpiCardLabel: {
    fontFamily: typography.family,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.muted,
    minHeight: 32,
  },
  kpiCardLabelWide: { fontFamily: typography.family, minHeight: 0 },
  kpiActionWrapper: {
    marginTop: spacing.tiny,
  },
  kpiActionLink: {
    fontFamily: typography.family,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  muted: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.body, lineHeight: 20 },
  loading: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 9 },
  errorBox: { borderWidth: 1, borderColor: colors.destructiveSoft, backgroundColor: colors.destructiveSoft, padding: spacing.md, borderRadius: radii.md },
  errorText: { fontFamily: typography.family, color: colors.destructiveDark, fontSize: typography.size.sm },
  chartGrid: { gap: spacing.xxl },
  card: {
    minWidth: 0,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.semibold, marginBottom: spacing.lg },
  chartSvgWrap: { alignItems: 'center', justifyContent: 'center' },
  donutWrap: { alignSelf: 'center', width: 190, height: 190, alignItems: 'center', justifyContent: 'center', marginVertical: 2 },
  donutCenter: { position: 'absolute', alignItems: 'center' }, donutValue: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.title, fontWeight: typography.weight.bold }, donutLabel: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: spacing.sm }, legendDot: { width: 10, height: 10, borderRadius: 5 }, legendWarning: { backgroundColor: colors.warning }, legendSuccess: { backgroundColor: colors.success }, legendText: { fontFamily: typography.family, fontSize: typography.size.sm, color: colors.muted },
  bottomGrid: { gap: spacing.xxl }, inventoryStat: { minHeight: 72, borderRadius: radii.md, backgroundColor: '#EFF3F5', padding: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }, inventoryNumber: { fontFamily: typography.family, color: colors.text, fontSize: 30, fontWeight: typography.weight.bold, marginTop: spacing.xs },
  salesHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 }, saleRow: { minHeight: 0, borderRadius: radii.md, backgroundColor: '#EFF3F5', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: spacing.md, marginBottom: spacing.md }, saleName: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.body, flex: 1 }, saleCount: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.body, fontWeight: typography.weight.semibold }, emptyText: { fontFamily: typography.family, color: colors.muted, textAlign: 'center', paddingVertical: spacing.xl, fontSize: typography.size.body },
  revenueOverview: { flexDirection: 'column', gap: spacing.md }, revenueOverviewWide: { flexDirection: 'row' }, revenueCell: { flex: 1, minWidth: 0, alignItems: 'center', padding: spacing.lg, backgroundColor: '#EFF3F5', borderRadius: radii.md }, revenueValue: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.display, fontWeight: typography.weight.bold, marginBottom: spacing.xs },
});

export default PharmacistDashboardScreen;
