import { colors, radii, spacing, typography } from '../../theme/tokens';
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
  CalendarDays,
  CalendarCheck,
  CalendarX,
  IndianRupee,
  Pill,
  TestTube,
  Users,
  WalletCards,
} from 'lucide-react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { StaffHeader } from '../../components/common/StaffHeader';
import { useAuthContext } from '../../context/AuthContext';
import { displayAmount } from '../../utils/dashboardValues';
import { useClinicDashboard } from '../../hooks/useClinicDashboard';
import { AnimatedLiquidBorder } from '../../components/common/AnimatedLiquidBorder';
import { LiquidBorderTouchable } from '../../components/common/LiquidBorderSurface';
import { createTapGestureHandlers } from '../../utils/tapGestureHandlers';

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
  const [activeDashboardCard, setActiveDashboardCard] = useState<string | null>(null);
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
  const todayLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const localDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const monthRange = `date_from=${localDateKey(new Date(now.getFullYear(), now.getMonth(), 1))}&date_to=${localDateKey(now)}`;
  const formatChartDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const chartMax = Math.max(
    4,
    ...barData.flatMap(bar => [bar.approved, bar.completed, bar.cancelled]),
  );
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
        <ActivityIndicator size="large" color={colors.primary} />
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
  const completedChartColor = '#22B573';
  const cancelledChartColor = '#EF476F';
  const size = 190;
  const strokeWidth = 30;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const donutGapDegrees = 2;
  const donutArcPath = (startDegrees: number, endDegrees: number) => {
    const startRadians = startDegrees * Math.PI / 180;
    const endRadians = endDegrees * Math.PI / 180;
    const startX = center + radius * Math.cos(startRadians);
    const startY = center + radius * Math.sin(startRadians);
    const endX = center + radius * Math.cos(endRadians);
    const endY = center + radius * Math.sin(endRadians);
    const largeArc = endDegrees - startDegrees > 180 ? 1 : 0;
    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;
  };

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
          <View
            style={styles.todayDateCard}
            {...createTapGestureHandlers(() => setActiveDashboardCard('today'))}>
            <AnimatedLiquidBorder active={activeDashboardCard === 'today'} radius={16} />
            <View style={styles.todayIconBox}>
              <CalendarDays size={20} color={colors.primaryDark} strokeWidth={2} />
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
          <View
            style={styles.kpiCardHalf}
            {...createTapGestureHandlers(() => setActiveDashboardCard('kpi-appointments'))}>
            <AnimatedLiquidBorder active={activeDashboardCard === 'kpi-appointments'} radius={14} />
            <View style={[styles.kpiIconBox, { backgroundColor: '#ECFEFF' }]}>
              <Calendar size={24} color="#0E7490" />
            </View>
            <Text style={styles.kpiCardValue}>{monthlyAppointments?.appointments ?? '—'}</Text>
            <Text style={styles.kpiCardLabel} numberOfLines={2}>Appointments This Month</Text>
            <TouchableOpacity onPress={() => onNavigate(`/appointments?${monthRange}`)} style={{ marginTop: spacing.tiny }}>
              <Text style={styles.kpiActionLink}>View details ↗</Text>
            </TouchableOpacity>
          </View>

          {/* Card 2: Completed This Month */}
          <View
            style={styles.kpiCardHalf}
            {...createTapGestureHandlers(() => setActiveDashboardCard('kpi-completed'))}>
            <AnimatedLiquidBorder active={activeDashboardCard === 'kpi-completed'} radius={14} />
            <View style={[styles.kpiIconBox, { backgroundColor: colors.successSoft }]}>
              <CalendarCheck size={24} color={colors.success} />
            </View>
            <Text style={styles.kpiCardValue}>{monthlyAppointments?.completed ?? '—'}</Text>
            <Text style={styles.kpiCardLabel} numberOfLines={2}>Completed This Month</Text>
            <TouchableOpacity onPress={() => onNavigate(`/appointments?${monthRange}&status=completed`)} style={{ marginTop: spacing.tiny }}>
              <Text style={styles.kpiActionLink}>View details ↗</Text>
            </TouchableOpacity>
          </View>

          {/* Card 3: Cancelled This Month */}
          <View
            style={styles.kpiCardHalf}
            {...createTapGestureHandlers(() => setActiveDashboardCard('kpi-cancelled'))}>
            <AnimatedLiquidBorder active={activeDashboardCard === 'kpi-cancelled'} radius={14} />
            <View style={[styles.kpiIconBox, { backgroundColor: '#FEE2E2' }]}>
              <CalendarX size={24} color={colors.destructive} />
            </View>
            <Text style={styles.kpiCardValue}>{monthlyAppointments?.cancelled ?? '—'}</Text>
            <Text style={styles.kpiCardLabel} numberOfLines={2}>Cancelled This Month</Text>
            <TouchableOpacity onPress={() => onNavigate(`/appointments?${monthRange}&status=cancelled`)} style={{ marginTop: spacing.tiny }}>
              <Text style={styles.kpiActionLink}>View details ↗</Text>
            </TouchableOpacity>
          </View>

          {/* Card 4: Revenue This Month */}
          <View
            style={styles.kpiCardHalf}
            {...createTapGestureHandlers(() => setActiveDashboardCard('kpi-revenue'))}>
            <AnimatedLiquidBorder active={activeDashboardCard === 'kpi-revenue'} radius={14} />
            <View style={[styles.kpiIconBox, { backgroundColor: '#F5F3FF' }]}>
              <IndianRupee size={24} color="#7C3AED" />
            </View>
            <Text style={styles.kpiCardValueSmall}>{formatCurrency(currentKpi.revenueThisMonth)}</Text>
            <Text style={styles.kpiCardLabel} numberOfLines={2}>Revenue This Month</Text>
            <TouchableOpacity onPress={() => onNavigate(`/billing/treatment?${monthRange}`)} style={{ marginTop: spacing.tiny }}>
              <Text style={styles.kpiActionLink}>View details ↗</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 4. OPERATIONS OVERVIEW (2 TILES PER ROW GRID) ── */}
        <View
          style={styles.operationsCardContainer}
          {...createTapGestureHandlers(() => setActiveDashboardCard('operations-overview'))}>
          <AnimatedLiquidBorder active={activeDashboardCard === 'operations-overview'} radius={18} />
          <View style={styles.opsHeader}>
            <View style={styles.opsHeadingCopy}>
              <Text style={styles.opsTitle}>Operations Overview</Text>
              <Text style={styles.opsSubtitle}>Live clinic status and quick access.</Text>
            </View>
            <View style={styles.quickAccessTag}>
              <Text style={styles.quickAccessText}>Quick access</Text>
            </View>
          </View>

          <View style={styles.opGrid}>
            {/* Tile 1: Active Patients */}
            <LiquidBorderTouchable style={styles.opTileHalf} onPress={() => { setActiveDashboardCard('operation-patients'); onNavigate('/patients?status=active'); }} radius={14}>
              <View style={[styles.opSquareIcon, { backgroundColor: '#E6F4F3' }]}>
                <Users size={24} color={colors.primary} />
              </View>
              <Text style={styles.opBigNumber}>{currentKpi.activePatients ?? '—'}</Text>
              <Text style={styles.opTileLabel}>Active Patients</Text>
            </LiquidBorderTouchable>

            {/* Tile 2: Low Stock Medicines */}
            <LiquidBorderTouchable style={styles.opTileHalf} onPress={() => { setActiveDashboardCard('operation-medicines'); onNavigate('/medicines?stock=low'); }} radius={14}>
              <View style={[styles.opSquareIcon, { backgroundColor: colors.successSoft }]}>
                <Pill size={24} color={colors.success} />
              </View>
              <Text style={styles.opBigNumber}>{currentKpi.lowStockMedicines ?? '—'}</Text>
              <Text style={styles.opTileLabel}>Low Stock Medicines</Text>
            </LiquidBorderTouchable>

            {/* Tile 3: Pending Lab Tests */}
            <LiquidBorderTouchable style={styles.opTileHalf} onPress={() => { setActiveDashboardCard('operation-lab'); onNavigate('/lab/tests?status=pending'); }} radius={14}>
              <View style={[styles.opSquareIcon, { backgroundColor: colors.warningSoft }]}>
                <TestTube size={24} color={colors.warning} />
              </View>
              <Text style={styles.opBigNumber}>{currentKpi.pendingLabTests ?? '—'}</Text>
              <Text style={styles.opTileLabel}>Pending Lab Tests</Text>
            </LiquidBorderTouchable>

            {/* Tile 4: Wallet Overview */}
            <LiquidBorderTouchable style={styles.opTileHalf} onPress={() => { setActiveDashboardCard('operation-wallet'); onNavigate('/wallet'); }} radius={14}>
              <View style={[styles.opSquareIcon, { backgroundColor: '#ECFEFF' }]}>
                <WalletCards size={24} color="#0E7490" />
              </View>
              <Text style={styles.opBigNumberSmall}>{formatCurrency(currentKpi.walletBalance)}</Text>
              <Text style={styles.opTileLabel}>Wallet Overview</Text>
            </LiquidBorderTouchable>
          </View>
        </View>

        {/* ── 5. DAILY APPOINTMENT STATUS BAR CHART (RESPONSIVE & MODERN HOVER TOOLTIP) ── */}
        <View
          style={styles.chartCard}
          {...createTapGestureHandlers(() => setActiveDashboardCard('appointments-chart'))}>
          <AnimatedLiquidBorder active={activeDashboardCard === 'appointments-chart'} radius={12} />
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
              <View style={[styles.legendDot, { backgroundColor: '#22B573' }]} />
              <Text style={styles.legendText}>Completed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF476F' }]} />
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
                  <View style={[styles.tooltipSquareDot, { backgroundColor: completedChartColor }]} />
                  <Text numberOfLines={1} style={styles.tooltipLabel}>Completed</Text>
                  <Text numberOfLines={1} style={styles.tooltipVal}>{barData[activeBarIdx].completed}</Text>
                </View>

                <View style={styles.tooltipRow}>
                  <View style={[styles.tooltipSquareDot, { backgroundColor: cancelledChartColor }]} />
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
                    <View style={styles.barGroup}>
                      <View style={styles.barSeriesContainer}>
                        {bar.approved > 0 && (
                          <View style={[styles.barVisual, isSelected && styles.barVisualActive, { height: bar.approved / chartScale * 168, backgroundColor: '#0EA5E9' }]} />
                        )}
                      </View>
                      <View style={styles.barSeriesContainer}>
                        {bar.completed > 0 && (
                          <View style={[styles.barVisual, isSelected && styles.barVisualActive, { height: bar.completed / chartScale * 168, backgroundColor: completedChartColor }]} />
                        )}
                      </View>
                      <View style={styles.barSeriesContainer}>
                        {bar.cancelled > 0 && (
                          <View style={[styles.barVisual, isSelected && styles.barVisualActive, { height: bar.cancelled / chartScale * 168, backgroundColor: cancelledChartColor }]} />
                        )}
                      </View>
                    </View>
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="clip"
                      style={[styles.xAxisText, { width: '100%' }, isSelected && styles.xAxisTextActive]}>
                      {formatChartDate(bar.date)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── 6. MONTHLY REVENUE MIX DONUT CHART (RESPONSIVE & MODERN HOVER TOOLTIP) ── */}
        <View
          style={[styles.chartCard, styles.revenueChartCard]}
          {...createTapGestureHandlers(() => setActiveDashboardCard('revenue-chart'))}>
          <AnimatedLiquidBorder active={activeDashboardCard === 'revenue-chart'} radius={12} />
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
                const angle = (Math.atan2(offsetY, offsetX) * 180 / Math.PI - 36 + 720) % 360;
                const segment = angle < treatRatio * 360 ? 'treatment' : 'medicine';
                setActiveDonutSegment(prev => prev === segment ? null : segment);
              }}>
              <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <G rotation="36" origin={`${center}, ${center}`}>
                  {totalRev <= 0 ? (
                    <Circle
                      cx={center}
                      cy={center}
                      r={radius}
                      stroke={colors.border}
                      strokeWidth={strokeWidth}
                      fill="transparent"
                    />
                  ) : treatRatio >= 1 ? (
                    <Circle
                      cx={center}
                      cy={center}
                      r={radius}
                      stroke={treatmentChartColor}
                      strokeWidth={strokeWidth}
                      fill="transparent"
                    />
                  ) : treatRatio <= 0 ? (
                    <Circle
                      cx={center}
                      cy={center}
                      r={radius}
                      stroke={medicineChartColor}
                      strokeWidth={strokeWidth}
                      fill="transparent"
                    />
                  ) : (
                    <>
                      {treatRatio * 360 < 360 - donutGapDegrees && (
                        <Path
                          d={donutArcPath(
                            treatRatio * 360 + donutGapDegrees / 2,
                            360 - donutGapDegrees / 2,
                          )}
                          stroke={medicineChartColor}
                          strokeWidth={strokeWidth}
                          strokeLinecap="butt"
                          fill="none"
                        />
                      )}
                      {treatRatio * 360 > donutGapDegrees && (
                        <Path
                          d={donutArcPath(
                            donutGapDegrees / 2,
                            treatRatio * 360 - donutGapDegrees / 2,
                          )}
                          stroke={treatmentChartColor}
                          strokeWidth={strokeWidth}
                          strokeLinecap="butt"
                          fill="none"
                        />
                      )}
                    </>
                  )}
                </G>
                {/* Keep the donut hole white even if the card background changes. */}
                <Circle
                  cx={center}
                  cy={center}
                  r={radius - strokeWidth / 2}
                  fill={colors.surface}
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
  mainContainer: { flex: 1, backgroundColor: colors.background },
  scrollContainer: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  centerContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: typography.family, color: colors.muted, marginTop: 10, fontSize: typography.size.body },

  // Greeting & Date
  greetingSection: { marginBottom: spacing.xxl, marginTop: spacing.xs },
  greetingTitle: { fontFamily: typography.family, fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.foreground },
  greetingSubtitle: { fontFamily: typography.family, fontSize: typography.size.subtitle, color: colors.muted, marginTop: spacing.xs },
  todayDateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    gap: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  todayIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayTextCol: { flex: 1 },
  todayBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.tiny, marginBottom: spacing.xs },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  todayBadgeText: { fontFamily: typography.family, fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.primaryDark, letterSpacing: 1.6, textTransform: 'uppercase' },
  todayDateText: { fontFamily: typography.family, fontSize: typography.size.body, fontWeight: typography.weight.semibold, color: colors.foreground },

  // Monthly Performance KPI Grid (2 Cards Per Row)
  sectionHeader: { marginBottom: 14 },
  sectionTitle: { fontFamily: typography.family, fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.foreground },
  sectionSubtitle: { fontFamily: typography.family, fontSize: typography.size.body, color: colors.muted, marginTop: 2 },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  kpiCardHalf: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DFE5EC',
    elevation: 1,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  kpiIconBox: { width: 44, height: 44, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  kpiCardValue: { fontFamily: typography.family, fontSize: typography.size.display, fontWeight: typography.weight.bold, color: colors.foreground, marginBottom: spacing.xs },
  kpiCardValueSmall: { fontFamily: typography.family, fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.foreground, marginBottom: spacing.xs },
  kpiCardLabel: { fontFamily: typography.family, fontSize: typography.size.body, fontWeight: typography.weight.medium, color: colors.muted, minHeight: 36 },
  kpiActionLink: { fontFamily: typography.family, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.primary },

  // Operations Overview Grid (2 Tiles Per Row)
  operationsCardContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#DFE5EC',
    marginBottom: spacing.xxl,
  },
  opsTitle: { fontFamily: typography.family, fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.foreground },
  opsSubtitle: { fontFamily: typography.family, fontSize: typography.size.body, color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.md },
  opsHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  opsHeadingCopy: { flex: 1, minWidth: 180 },
  quickAccessTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#E6F4F3',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.lg,
  },
  quickAccessText: { fontFamily: typography.family, color: colors.primary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  opGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  opTileHalf: {
    width: '48%',
    backgroundColor: colors.secondary,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  opSquareIcon: { width: 44, height: 44, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  opBigNumber: { fontFamily: typography.family, fontSize: typography.size.display, fontWeight: typography.weight.bold, color: colors.foreground },
  opBigNumberSmall: { fontFamily: typography.family, fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.foreground },
  opTileLabel: { fontFamily: typography.family, fontSize: typography.size.body, color: colors.muted, marginTop: spacing.xs, fontWeight: typography.weight.regular, textAlign: 'center' },

  // Charts
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#DFE5EC',
    marginBottom: spacing.xxl,
    position: 'relative',
    shadowColor: colors.foreground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  revenueChartCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#DFE5EC',
  },
  interactiveCardActive: {
    borderWidth: 2,
    borderColor: '#2DD4BF',
  },
  revenueChartTitle: {
    fontFamily: typography.family, fontSize: typography.size.subtitle,
    fontWeight: typography.weight.semibold,
    marginBottom: spacing.lg,
  },
  chartCardTitle: { fontFamily: typography.family, fontSize: typography.size.subtitle, fontWeight: typography.weight.semibold, color: colors.foreground, marginBottom: spacing.lg },
  legendRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.xl },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.tiny },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: typography.family, fontSize: typography.size.micro, color: colors.muted, fontWeight: typography.weight.regular },

  // Bar Chart Grid
  barGridArea: { marginTop: 10, position: 'relative' },
  gridLineRow: { flexDirection: 'row', alignItems: 'center', height: 42 },
  yAxisNum: { fontFamily: typography.family, width: 16, fontSize: typography.size.micro, color: colors.subtle, textAlign: 'right', marginRight: spacing.sm },
  gridLine: { flex: 1, height: 1, backgroundColor: colors.secondary },
  barsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', marginTop: -189, paddingLeft: spacing.xxl },
  barCol: { alignItems: 'center', flex: 1 },
  barGroup: { height: 168, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2 },
  barSeriesContainer: { width: 8, height: 168, justifyContent: 'flex-end' },
  barVisual: { width: 8, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barVisualActive: { borderWidth: 1, borderColor: colors.foreground },
  xAxisText: { fontFamily: typography.family, fontSize: typography.size.micro, color: colors.muted, marginTop: spacing.sm, fontWeight: typography.weight.regular, textAlign: 'center' },
  xAxisTextActive: { color: colors.foreground, fontWeight: typography.weight.semibold },

  // Responsive & Modern Bar Tooltip Card
  barTooltipCard: {
    position: 'absolute',
    top: -5,
    zIndex: 40,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#DFE5EC',
    elevation: 8,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    minWidth: 0,
  },
  tooltipHeaderDate: { fontFamily: typography.family, fontSize: typography.size.body, fontWeight: typography.weight.semibold, color: colors.foreground, marginBottom: spacing.tiny },
  tooltipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: 2 },
  tooltipSquareDot: { width: 10, height: 10, borderRadius: 3 },
  tooltipLabel: { fontFamily: typography.family, fontSize: typography.size.sm, color: colors.muted, flex: 1, flexShrink: 1 },
  tooltipVal: { fontFamily: typography.family, fontSize: typography.size.body, fontWeight: typography.weight.semibold, color: colors.foreground, flexShrink: 0 },
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
    borderTopColor: colors.surface,
  },

  // Responsive Donut Chart & Tooltip
  donutAreaWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  donutContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 14 },
  donutTooltipCard: {
    position: 'absolute',
    zIndex: 40,
    backgroundColor: colors.surface,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: spacing.tiny,
    borderWidth: 1,
    borderColor: '#DFE5EC',
    elevation: 8,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    minWidth: 150,
  },
  donutTooltipTitle: { fontFamily: typography.family, fontSize: typography.size.sm, fontWeight: typography.weight.regular, color: colors.muted, marginBottom: spacing.xs },

  // Breakdown Rows
  revenueBreakdownBox: { gap: spacing.sm, marginTop: 10 },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 7,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  revenueLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  revenueRowLabel: { fontFamily: typography.family, fontSize: typography.size.sm, color: colors.muted, fontWeight: typography.weight.regular },
  revenueRowVal: { fontFamily: typography.family, fontSize: typography.size.sm, color: colors.foreground, fontWeight: typography.weight.semibold },
});

export default AdminDashboard;
