import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Calendar,
  CalendarCheck,
  CalendarX,
  IndianRupee,
  Pill,
  TestTube,
  Users,
  WalletCards,
} from 'lucide-react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { StaffHeader } from '../../components/common/StaffHeader';
import { useAuthContext } from '../../context/AuthContext';
import { displayAmount } from '../../utils/dashboardValues';
import { useClinicDashboard } from '../../hooks/useClinicDashboard';

interface AdminDashboardProps {
  onNavigate?: (path: string) => void;
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
}

export function AdminDashboard({
  onNavigate = () => {},
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
}: AdminDashboardProps) {
  const { user, activeClinicId } = useAuthContext();
  const { width: screenWidth } = useWindowDimensions();
  const { values: kpiData, appointments: monthlyAppointments, loading, error: dashboardError, refresh } = useClinicDashboard();
  const barData = monthlyAppointments?.daily || [];
  const [activeBarIdx, setActiveBarIdx] = useState<number | null>(null);
  const [activeDonutSegment, setActiveDonutSegment] = useState<'treatment' | 'medicine' | null>(null);
  const staffName = user?.fullName || user?.full_name || '';
  useEffect(() => {
    setActiveBarIdx(null);
    setActiveDonutSegment(null);
  }, [activeClinicId, monthlyAppointments]);

  const currentKpi = {
    revenueThisMonth: kpiData.revenueThisMonth ?? null,
    treatmentRevenue: kpiData.treatmentRevenue ?? null,
    medicineRevenue: kpiData.medicineRevenue ?? null,
    activePatients: kpiData.activePatients ?? null,
    lowStockMedicines: kpiData.lowStockMedicines ?? null,
    pendingLabTests: kpiData.pendingLabTests ?? null,
    walletBalance: kpiData.walletBalance ?? null,
  };
  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const todayLabel = now.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });
  const localDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const monthRange = `date_from=${localDateKey(new Date(now.getFullYear(), now.getMonth(), 1))}&date_to=${localDateKey(now)}`;
  const formatChartDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const chartMax = Math.max(4, ...barData.map(bar => bar.approved + bar.completed + bar.cancelled));
  const chartStep = Math.ceil(chartMax / 4);
  const chartScale = chartStep * 4;

  const formatCurrency = displayAmount;
  const formatChartValue = (value: number | null | undefined) =>
    Number(value ?? 0).toLocaleString();
  const formatLegendValue = (value: number | null | undefined) =>
    String(value ?? 0);

  if (loading && !monthlyAppointments && Object.keys(kpiData).length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0D9488" />
        <Text style={styles.loadingText}>Updating Clinic Dashboard...</Text>
      </View>
    );
  }

  // Responsive Left Calculation for Bar Tooltip
  const chartWidth = Math.max(260, screenWidth - 72);
  const totalBars = barData.length;
  const barSpacing = chartWidth / Math.max(1, totalBars);
  const barTooltipWidth = Math.min(184, chartWidth - 20);
  const tooltipLeftPos = activeBarIdx !== null
    ? Math.min(
        Math.max(10, activeBarIdx * barSpacing + barSpacing / 2 - barTooltipWidth / 2),
        chartWidth - barTooltipWidth - 10
      )
    : 15;
  const donutTooltipWidth = Math.min(180, Math.max(148, screenWidth * 0.42));

  // Calculate SVG Donut parameters
  const totalRev = (currentKpi.treatmentRevenue ?? 0) + (currentKpi.medicineRevenue ?? 0);
  const treatRatio = totalRev > 0 ? (currentKpi.treatmentRevenue ?? 0) / totalRev : 0;
  const treatmentChartColor = '#27A59B';
  const medicineChartColor = '#2EB77F';
  const size = 190;
  const strokeWidth = 30;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={styles.mainContainer}>
      {/* ── 1. UNIFIED STAFF HEADER (HEADER + CLINIC DROPDOWN + PLAN MODAL) ── */}
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        onNavigate={onNavigate}
      />

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}>
        {/* ── 2. GREETING & TODAY CARD ── */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>{now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'}{staffName ? ', ' + staffName : ''}!</Text>
          <Text style={styles.greetingSubtitle}>Here's what's happening at your clinic today.</Text>

          {/* Today Date Card */}
          <View style={styles.todayDateCard}>
            <View style={styles.todayIconBox}>
              <Calendar size={20} color="#0D9488" />
            </View>
            <View style={styles.todayTextCol}>
              <View style={styles.todayBadgeRow}>
                <View style={styles.greenDot} />
                <Text style={styles.todayBadgeText}>TODAY</Text>
              </View>
              <Text style={styles.todayDateText}>{todayLabel}</Text>
            </View>
          </View>
        </View>

        {/* ── 3. MONTHLY PERFORMANCE (2 CARDS PER ROW GRID) ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Monthly Performance</Text>
          <Text style={styles.sectionSubtitle}>Monthly results for {monthLabel}</Text>
        </View>

        {dashboardError && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionSubtitle}>Some dashboard data could not be loaded. Please retry.</Text>
            <TouchableOpacity onPress={refresh}>
              <Text style={styles.kpiActionLink}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.kpiGrid}>
          {/* Card 1: Appointments This Month */}
          <View style={styles.kpiCardHalf}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#E6FFFA' }]}>
              <Calendar size={22} color="#0D9488" />
            </View>
            <Text style={styles.kpiCardValue}>{monthlyAppointments?.appointments ?? '—'}</Text>
            <Text style={styles.kpiCardLabel} numberOfLines={2}>Appointments This Month</Text>
            <TouchableOpacity onPress={() => onNavigate(`/appointments?${monthRange}`)} style={{ marginTop: 6 }}>
              <Text style={styles.kpiActionLink}>View details ↗</Text>
            </TouchableOpacity>
          </View>

          {/* Card 2: Completed This Month */}
          <View style={styles.kpiCardHalf}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#DCFCE7' }]}>
              <CalendarCheck size={22} color="#16A34A" />
            </View>
            <Text style={styles.kpiCardValue}>{monthlyAppointments?.completed ?? '—'}</Text>
            <Text style={styles.kpiCardLabel} numberOfLines={2}>Completed This Month</Text>
            <TouchableOpacity onPress={() => onNavigate(`/appointments?${monthRange}&status=completed`)} style={{ marginTop: 6 }}>
              <Text style={styles.kpiActionLink}>View details ↗</Text>
            </TouchableOpacity>
          </View>

          {/* Card 3: Cancelled This Month */}
          <View style={styles.kpiCardHalf}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FEE2E2' }]}>
              <CalendarX size={22} color="#EF4444" />
            </View>
            <Text style={styles.kpiCardValue}>{monthlyAppointments?.cancelled ?? '—'}</Text>
            <Text style={styles.kpiCardLabel} numberOfLines={2}>Cancelled This Month</Text>
            <TouchableOpacity onPress={() => onNavigate(`/appointments?${monthRange}&status=cancelled`)} style={{ marginTop: 6 }}>
              <Text style={styles.kpiActionLink}>View details ↗</Text>
            </TouchableOpacity>
          </View>

          {/* Card 4: Revenue This Month */}
          <View style={styles.kpiCardHalf}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#F3E8FF' }]}>
              <IndianRupee size={22} color="#9333EA" />
            </View>
            <Text style={styles.kpiCardValueSmall}>{formatCurrency(currentKpi.revenueThisMonth)}</Text>
            <Text style={styles.kpiCardLabel} numberOfLines={2}>Revenue This Month</Text>
            <TouchableOpacity onPress={() => onNavigate(`/billing/treatment?${monthRange}`)} style={{ marginTop: 6 }}>
              <Text style={styles.kpiActionLink}>View details ↗</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 4. OPERATIONS OVERVIEW (2 TILES PER ROW GRID) ── */}
        <View style={styles.operationsCardContainer}>
          <Text style={styles.opsTitle}>Operations Overview</Text>
          <Text style={styles.opsSubtitle}>Live clinic status and quick access.</Text>

          <View style={styles.quickAccessTag}>
            <Text style={styles.quickAccessText}>Quick access</Text>
          </View>

          <View style={styles.opGrid}>
            {/* Tile 1: Active Patients */}
            <TouchableOpacity style={styles.opTileHalf} onPress={() => onNavigate('/patients?status=active')}>
              <View style={[styles.opSquareIcon, { backgroundColor: '#E6FFFA' }]}>
                <Users size={22} color="#0D9488" />
              </View>
              <Text style={styles.opBigNumber}>{currentKpi.activePatients ?? '—'}</Text>
              <Text style={styles.opTileLabel}>Active Patients</Text>
            </TouchableOpacity>

            {/* Tile 2: Low Stock Medicines */}
            <TouchableOpacity style={styles.opTileHalf} onPress={() => onNavigate('/medicines?stock=low')}>
              <View style={[styles.opSquareIcon, { backgroundColor: '#DCFCE7' }]}>
                <Pill size={22} color="#16A34A" />
              </View>
              <Text style={styles.opBigNumber}>{currentKpi.lowStockMedicines ?? '—'}</Text>
              <Text style={styles.opTileLabel}>Low Stock Medicines</Text>
            </TouchableOpacity>

            {/* Tile 3: Pending Lab Tests */}
            <TouchableOpacity style={styles.opTileHalf} onPress={() => onNavigate('/lab/tests?status=pending')}>
              <View style={[styles.opSquareIcon, { backgroundColor: '#FEF3C7' }]}>
                <TestTube size={22} color="#D97706" />
              </View>
              <Text style={styles.opBigNumber}>{currentKpi.pendingLabTests ?? '—'}</Text>
              <Text style={styles.opTileLabel}>Pending Lab Tests</Text>
            </TouchableOpacity>

            {/* Tile 4: Wallet Overview */}
            <TouchableOpacity style={styles.opTileHalf} onPress={() => onNavigate('/wallet')}>
              <View style={[styles.opSquareIcon, { backgroundColor: '#E0F2FE' }]}>
                <WalletCards size={22} color="#0284C7" />
              </View>
              <Text style={styles.opBigNumberSmall}>{formatCurrency(currentKpi.walletBalance)}</Text>
              <Text style={styles.opTileLabel}>Wallet Overview</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 5. DAILY APPOINTMENT STATUS BAR CHART (RESPONSIVE & MODERN HOVER TOOLTIP) ── */}
        <View style={styles.chartCard}>
          <Text style={styles.chartCardTitle}>Daily Appointment Status This Month</Text>
          {monthlyAppointments && barData.length === 0 && (
            <Text style={styles.sectionSubtitle}>No appointments this month.</Text>
          )}

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#0EA5E9' }]} />
              <Text style={styles.legendText}>Approved</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Completed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F43F5E' }]} />
              <Text style={styles.legendText}>Cancelled</Text>
            </View>
          </View>

          {/* Grid Lines & Vertical Bars Container */}
          <View style={styles.barGridArea}>
            {[4, 3, 2, 1, 0].map((num) => (
              <View key={num} style={styles.gridLineRow}>
                <Text style={styles.yAxisNum}>{num * chartStep}</Text>
                <View style={styles.gridLine} />
              </View>
            ))}

            {/* Interactive Floating Tooltip Card */}
            {activeBarIdx !== null && barData[activeBarIdx] && (
              <View style={[styles.barTooltipCard, { left: tooltipLeftPos, width: barTooltipWidth }]}>
                <Text style={styles.tooltipHeaderDate}>{formatChartDate(barData[activeBarIdx].date)}</Text>

                <View style={styles.tooltipRow}>
                  <View style={[styles.tooltipSquareDot, { backgroundColor: '#0EA5E9' }]} />
                  <Text numberOfLines={1} style={styles.tooltipLabel}>Approved</Text>
                  <Text numberOfLines={1} style={styles.tooltipVal}>{barData[activeBarIdx].approved}</Text>
                </View>

                <View style={styles.tooltipRow}>
                  <View style={[styles.tooltipSquareDot, { backgroundColor: '#10B981' }]} />
                  <Text numberOfLines={1} style={styles.tooltipLabel}>Completed</Text>
                  <Text numberOfLines={1} style={styles.tooltipVal}>{barData[activeBarIdx].completed}</Text>
                </View>

                <View style={styles.tooltipRow}>
                  <View style={[styles.tooltipSquareDot, { backgroundColor: '#F43F5E' }]} />
                  <Text numberOfLines={1} style={styles.tooltipLabel}>Cancelled</Text>
                  <Text numberOfLines={1} style={styles.tooltipVal}>{barData[activeBarIdx].cancelled}</Text>
                </View>

                {/* Downward Pointer Arrow */}
                <View style={styles.tooltipPointerArrow} />
              </View>
            )}

            <View style={styles.barsRow}>
              {barData.map((bar, idx) => {
                const isSelected = activeBarIdx === idx;
                return (
                  <TouchableOpacity
                    key={bar.date}
                    style={styles.barCol}
                    activeOpacity={0.8}
                    onPress={() => setActiveBarIdx((prev) => (prev === idx ? null : idx))}>
                    <View style={styles.barContainer}>
                      <View style={[styles.barVisual, isSelected && styles.barVisualActive]}>
                        <View style={{ height: bar.cancelled / chartScale * 112, backgroundColor: '#F43F5E' }} />
                        <View style={{ height: bar.completed / chartScale * 112, backgroundColor: '#10B981' }} />
                        <View style={{ height: bar.approved / chartScale * 112, backgroundColor: '#0EA5E9' }} />
                      </View>
                    </View>
                    <Text style={[styles.xAxisText, isSelected && styles.xAxisTextActive]}>
                      {formatChartDate(bar.date)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── 6. MONTHLY REVENUE MIX DONUT CHART (RESPONSIVE & MODERN HOVER TOOLTIP) ── */}
        <View style={[styles.chartCard, styles.revenueChartCard]}>
          <Text style={[styles.chartCardTitle, styles.revenueChartTitle]}>Monthly Revenue Mix</Text>
          {totalRev === 0 && (
            <Text style={styles.sectionSubtitle}>
              {currentKpi.revenueThisMonth === null ? 'Revenue data unavailable.' : 'No revenue this month.'}
            </Text>
          )}

          <View style={styles.donutAreaWrapper}>
            {/* Interactive Floating Donut Tooltip Card */}
            {activeDonutSegment && (
              <View
                style={[
                  styles.donutTooltipCard,
                  {
                    width: donutTooltipWidth,
                    left: '50%',
                    top: size / 2 + 22,
                    transform: [{ translateX: -donutTooltipWidth / 2 }],
                  },
                ]}>
                <Text allowFontScaling={false} style={styles.donutTooltipTitle}>Value</Text>
                <View style={styles.tooltipRow}>
                  <View
                    style={[
                      styles.tooltipSquareDot,
                      { backgroundColor: activeDonutSegment === 'treatment' ? treatmentChartColor : medicineChartColor },
                    ]}
                  />
                  <Text allowFontScaling={false} numberOfLines={1} style={styles.tooltipLabel}>
                    {activeDonutSegment === 'treatment' ? 'Treatment' : 'Medicine'}
                  </Text>
                  <Text allowFontScaling={false} numberOfLines={1} style={styles.tooltipVal}>
                    {activeDonutSegment === 'treatment'
                      ? formatChartValue(currentKpi.treatmentRevenue)
                      : formatChartValue(currentKpi.medicineRevenue)}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.donutContainer}
              onPress={event => {
                const { locationX, locationY } = event.nativeEvent;
                const offsetX = locationX - center;
                const offsetY = locationY - center;
                const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
                const innerRadius = radius - strokeWidth / 2;
                const outerRadius = radius + strokeWidth / 2;
                if (distance < innerRadius || distance > outerRadius) return;
                const angle = (Math.atan2(offsetY, offsetX) * 180 / Math.PI + 90 + 360) % 360;
                const segment = angle < treatRatio * 360 ? 'treatment' : 'medicine';
                setActiveDonutSegment(prev => prev === segment ? null : segment);
              }}>
              <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <G rotation="-90" origin={`${center}, ${center}`}>
                  {/* Base Ring (Medicine Segment - Green) */}
                  <Circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={totalRev > 0 ? medicineChartColor : '#E2E8F0'}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  {/* Treatment Segment - Teal */}
                  {treatRatio > 0 && <Circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={treatmentChartColor}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={`${circumference * treatRatio} ${circumference}`}
                    strokeLinecap="round"
                  />}
                </G>
                {/* Keep the donut hole white even if the card background changes. */}
                <Circle
                  cx={center}
                  cy={center}
                  r={radius - strokeWidth / 2}
                  fill="#FFFFFF"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Breakdown Rows */}
          <View style={styles.revenueBreakdownBox}>
            <View style={styles.revenueRow}>
              <View style={styles.revenueLabelGroup}>
                <View style={[styles.legendDot, { backgroundColor: treatmentChartColor }]} />
                <Text style={styles.revenueRowLabel}>Treatment</Text>
              </View>
              <Text style={styles.revenueRowVal}>{formatLegendValue(currentKpi.treatmentRevenue)}</Text>
            </View>

            <View style={styles.revenueRow}>
              <View style={styles.revenueLabelGroup}>
                <View style={[styles.legendDot, { backgroundColor: medicineChartColor }]} />
                <Text style={styles.revenueRowLabel}>Medicine</Text>
              </View>
              <Text style={styles.revenueRowVal}>{formatLegendValue(currentKpi.medicineRevenue)}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  centerContainer: { flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#64748B', marginTop: 10, fontSize: 14 },

  // Greeting & Date
  greetingSection: { marginBottom: 24, marginTop: 4 },
  greetingTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  greetingSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  todayDateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    gap: 14,
  },
  todayIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayTextCol: { flex: 1 },
  todayBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0D9488' },
  todayBadgeText: { fontSize: 11, fontWeight: '800', color: '#0D9488', letterSpacing: 1 },
  todayDateText: { fontSize: 15, fontWeight: '700', color: '#0F172A' },

  // Monthly Performance KPI Grid (2 Cards Per Row)
  sectionHeader: { marginBottom: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  sectionSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
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
  kpiIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  kpiCardValue: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  kpiCardValueSmall: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  kpiCardLabel: { fontSize: 12, fontWeight: '500', color: '#64748B', minHeight: 32 },
  kpiActionLink: { fontSize: 12, fontWeight: '700', color: '#0D9488' },

  // Operations Overview Grid (2 Tiles Per Row)
  operationsCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  opsTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  opsSubtitle: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 12 },
  quickAccessTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#E6FFFA',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 16,
  },
  quickAccessText: { color: '#0D9488', fontSize: 12, fontWeight: '700' },
  opGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  opTileHalf: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  opSquareIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  opBigNumber: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  opBigNumberSmall: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  opTileLabel: { fontSize: 12, color: '#64748B', marginTop: 4, fontWeight: '500', textAlign: 'center' },

  // Charts
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    position: 'relative',
  },
  revenueChartCard: {
    padding: 16,
    borderRadius: 12,
    borderColor: '#2DD4BF',
  },
  revenueChartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  chartCardTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#64748B', fontWeight: '600' },

  // Bar Chart Grid
  barGridArea: { marginTop: 10, position: 'relative' },
  gridLineRow: { flexDirection: 'row', alignItems: 'center', height: 28 },
  yAxisNum: { width: 16, fontSize: 11, color: '#94A3B8', textAlign: 'right', marginRight: 8 },
  gridLine: { flex: 1, height: 1, backgroundColor: '#F1F5F9' },
  barsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', marginTop: -126, paddingLeft: 24 },
  barCol: { alignItems: 'center', flex: 1 },
  barContainer: { height: 112, justifyContent: 'flex-end' },
  barVisual: { width: 18, borderRadius: 4, overflow: 'hidden' },
  barVisualActive: { borderWidth: 2, borderColor: '#0F172A', transform: [{ scaleY: 1.05 }] },
  xAxisText: { fontSize: 11, color: '#64748B', marginTop: 8, fontWeight: '600' },
  xAxisTextActive: { color: '#0F172A', fontWeight: '800' },

  // Responsive & Modern Bar Tooltip Card
  barTooltipCard: {
    position: 'absolute',
    top: -5,
    zIndex: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    minWidth: 0,
  },
  tooltipHeaderDate: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  tooltipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 },
  tooltipSquareDot: { width: 10, height: 10, borderRadius: 3 },
  tooltipLabel: { fontSize: 12, color: '#64748B', flex: 1, flexShrink: 1 },
  tooltipVal: { fontSize: 13, fontWeight: '700', color: '#0F172A', flexShrink: 0 },
  tooltipPointerArrow: {
    position: 'absolute',
    bottom: -6,
    left: '42%',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },

  // Responsive Donut Chart & Tooltip
  donutAreaWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  donutContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 14 },
  donutTooltipCard: {
    position: 'absolute',
    zIndex: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    minWidth: 150,
  },
  donutTooltipTitle: { fontSize: 11, fontWeight: '500', color: '#64748B', marginBottom: 4 },

  // Breakdown Rows
  revenueBreakdownBox: { gap: 8, marginTop: 10 },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  revenueLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  revenueRowLabel: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  revenueRowVal: { fontSize: 12, color: '#0F172A', fontWeight: '500' },
});

export default AdminDashboard;
