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
import { CalendarDays, IndianRupee, Package, Pill, ShoppingCart, TrendingUp, TriangleAlert } from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { useAuthContext } from '../../context/AuthContext';
import { usePharmacistDashboard } from '../../hooks/usePharmacistDashboard';

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
  return (
    <TouchableOpacity
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
    </TouchableOpacity>
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
                fill="#64748B"
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
                stroke="#F1F5F9"
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
                  fill="#0F172A"
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
                fill="#64748B"
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

export const PharmacistDashboardScreen: React.FC<Props> = ({ onOpenDrawer, onOpenNotifications, onNavigateScreen = () => {} }) => {
  const { width } = useWindowDimensions();
  const { user } = useAuthContext();
  const { data, loading, refreshing, error, refresh } = usePharmacistDashboard();
  const today = new Date();
  const todayKey = dateKey(today);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const staffName = String(user?.fullName || user?.full_name || 'Pharmacist').trim();
  const todayLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const revenueBars = [
    { label: 'Today', value: data.todayRevenue, color: '#0D9488' },
    { label: 'Week', value: data.weekRevenue, color: '#16A34A' },
    { label: 'Month', value: data.monthRevenue, color: '#D97706' },
  ];
  const totalStockMix = Math.max(data.totalMedicines, data.lowStockCount, 1);
  const circumference = 2 * Math.PI * 38;
  const lowStockArc = Math.min(data.lowStockCount / totalStockMix, 1) * circumference;

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} onOpenNotifications={onOpenNotifications} title="Pharmacist Dashboard" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#0D9488" colors={['#0D9488']} />}
      >
        {/* ── 1. GREETING & TODAY CARD ── */}
        <View style={styles.welcomeBlock}>
          <Text style={styles.greetingTitle}>
            {greeting}{staffName ? `, ${staffName}` : ''}!
          </Text>
          <Text style={styles.greetingSubtitle}>
            Here's what's happening at your pharmacy today.
          </Text>
        </View>

        {/* Today Date Card */}
        <View style={styles.todayCard}>
          <View style={styles.todayIcon}>
            <CalendarDays size={22} color="#0D9488" strokeWidth={2.2} />
          </View>
          <View style={styles.todayCopy}>
            <View style={styles.todayEyebrow}>
              <View style={styles.todayDot} />
              <Text style={styles.todayLabel}>TODAY</Text>
            </View>
            <Text style={styles.todayDate}>{todayLabel}</Text>
          </View>
        </View>

        {loading ? <View style={styles.loading}><ActivityIndicator color="#0D9488" /><Text style={styles.muted}>Loading pharmacy dashboard…</Text></View> : null}
        {error ? <TouchableOpacity style={styles.errorBox} onPress={refresh}><Text style={styles.errorText}>{error} Tap to retry.</Text></TouchableOpacity> : null}

        {!loading ? <>
          <View style={styles.kpiGrid}>
            <MetricCard
              title="Today's Revenue"
              value={money(data.todayRevenue)}
              color="#0D9488"
              background="#E6FFFA"
              icon={IndianRupee}
              onPress={() => onNavigateScreen(`/billing/medicine?date=${todayKey}`)}
            />
            <MetricCard
              title="Week Revenue"
              value={money(data.weekRevenue)}
              color="#16A34A"
              background="#DCFCE7"
              icon={TrendingUp}
              onPress={() => onNavigateScreen(rangePath(dateKey(weekStart), todayKey))}
            />
            <MetricCard
              title="Month Revenue"
              value={money(data.monthRevenue)}
              color="#D97706"
              background="#FEF3C7"
              icon={IndianRupee}
              onPress={() => onNavigateScreen(rangePath(dateKey(monthStart), todayKey))}
            />
            <MetricCard
              title="Total Medicines"
              value={String(data.totalMedicines)}
              color="#2563EB"
              background="#EFF6FF"
              icon={Package}
              onPress={() => onNavigateScreen('/medicines?stock=all')}
            />
          </View>

          <View style={styles.chartGrid}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Revenue Trend</Text>
              <RevenueTrendChart data={revenueBars} width={width} />
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Inventory Health</Text>
              <View style={styles.donutWrap}>
                <Svg width={112} height={112} viewBox="0 0 100 100">
                  <Circle cx="50" cy="50" r="38" fill="none" stroke="#DCFCE7" strokeWidth="13" />
                  <Circle cx="50" cy="50" r="38" fill="none" stroke="#F59E0B" strokeWidth="13" strokeDasharray={`${lowStockArc} ${circumference}`} rotation="-90" origin="50, 50" />
                </Svg>
                <View style={styles.donutCenter}><Text style={styles.donutValue}>{data.totalMedicines}</Text><Text style={styles.donutLabel}>medicines</Text></View>
              </View>
              <View style={styles.legendRow}><View style={[styles.legendDot, styles.legendWarning]} /><Text style={styles.legendText}>Low stock · {data.lowStockCount}</Text></View>
              <View style={styles.legendRow}><View style={[styles.legendDot, styles.legendSuccess]} /><Text style={styles.legendText}>In stock · {Math.max(data.totalMedicines - data.lowStockCount, 0)}</Text></View>
            </View>
          </View>

          <View style={styles.bottomGrid}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Inventory Status</Text>
              <TouchableOpacity style={styles.inventoryStat} onPress={() => onNavigateScreen('/medicines?stock=low')}>
                <View><Text style={styles.muted}>Low Stock Items</Text><Text style={styles.inventoryNumber}>{data.lowStockCount}</Text></View>
                <TriangleAlert size={25} color="#D97706" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.inventoryStat} onPress={() => onNavigateScreen('/medicines?stock=all')}>
                <View><Text style={styles.muted}>Total Medicines</Text><Text style={styles.inventoryNumber}>{data.totalMedicines}</Text></View>
                <Package size={25} color="#0D9488" />
              </TouchableOpacity>
              {data.lowStockMedicines.length ? <View style={styles.lowStockList}>
                <Text style={styles.subsectionTitle}>Low Stock Items</Text>
                {data.lowStockMedicines.map(item => <View key={item.id} style={styles.stockRow}>
                  <View style={styles.stockIcon}><Pill size={17} color="#0D9488" /></View>
                  <View style={styles.stockInfo}><Text numberOfLines={1} style={styles.stockName}>{item.name}</Text><Text style={styles.muted}>Reorder level: {item.reorder_level}</Text></View>
                  <Text style={styles.stockQuantity}>{item.stock_quantity} left</Text>
                </View>)}
              </View> : null}
            </View>

            <View style={styles.card}>
              <View style={styles.salesHeading}><ShoppingCart size={18} color="#16A34A" /><Text style={styles.sectionTitle}>Recent Sales</Text></View>
              {data.recentSales.length ? data.recentSales.map(sale => <View key={sale.name} style={styles.saleRow}>
                <Text numberOfLines={1} style={styles.saleName}>{sale.name}</Text><Text style={styles.saleCount}>{sale.totalSold} sold</Text>
              </View>) : <Text style={styles.emptyText}>No recent sales</Text>}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Revenue Overview</Text>
            <View style={styles.revenueOverview}>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  welcomeBlock: { gap: 4, marginBottom: 2 },
  greetingTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  greetingSubtitle: { color: '#64748B', fontSize: 13 },
  todayCard: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#99F6E4',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0D9488',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
    marginBottom: 4,
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
  todayDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0D9488' },
  todayLabel: { color: '#0D9488', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  todayDate: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
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
    fontSize: 20,
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
  muted: { color: '#64748B', fontSize: 12, lineHeight: 18 },
  loading: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 9 },
  errorBox: { borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 10 },
  errorText: { color: '#B91C1C', fontSize: 12 },
  chartGrid: { gap: 12 },
  card: {
    minWidth: 0,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: { color: '#0F172A', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  chartSvgWrap: { alignItems: 'center', justifyContent: 'center' },
  donutWrap: { alignSelf: 'center', width: 112, height: 112, alignItems: 'center', justifyContent: 'center', marginVertical: 2 },
  donutCenter: { position: 'absolute', alignItems: 'center' }, donutValue: { color: '#0F172A', fontSize: 20, fontWeight: '800' }, donutLabel: { color: '#64748B', fontSize: 9 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8 }, legendDot: { width: 8, height: 8, borderRadius: 4 }, legendWarning: { backgroundColor: '#F59E0B' }, legendSuccess: { backgroundColor: '#16A34A' }, legendText: { fontSize: 11, color: '#475569' },
  bottomGrid: { gap: 12 }, inventoryStat: { minHeight: 64, borderRadius: 10, backgroundColor: '#F8FAFC', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }, inventoryNumber: { color: '#0F172A', fontSize: 23, fontWeight: '800', marginTop: 2 },
  lowStockList: { marginTop: 6 }, subsectionTitle: { color: '#334155', fontSize: 13, fontWeight: '700', marginBottom: 7 }, stockRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingVertical: 8 },
  stockIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#CCFBF1', alignItems: 'center', justifyContent: 'center' }, stockInfo: { flex: 1, minWidth: 0 }, stockName: { color: '#1E293B', fontWeight: '600', fontSize: 12 }, stockQuantity: { color: '#B45309', fontSize: 11, fontWeight: '700' },
  salesHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 }, saleRow: { minHeight: 42, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, saleName: { color: '#334155', fontSize: 12, flex: 1 }, saleCount: { color: '#64748B', fontSize: 11, fontWeight: '600' }, emptyText: { color: '#64748B', textAlign: 'center', paddingVertical: 20, fontSize: 12 },
  revenueOverview: { flexDirection: 'row', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 11, overflow: 'hidden' }, revenueCell: { flex: 1, minWidth: 0, alignItems: 'center', paddingVertical: 13, paddingHorizontal: 5 }, revenueValue: { color: '#0F172A', fontSize: 15, fontWeight: '800', marginBottom: 4 },
});

export default PharmacistDashboardScreen;
