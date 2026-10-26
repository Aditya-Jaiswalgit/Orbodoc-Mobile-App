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
        <ActivityIndicator size="large" color="#27A599" />
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
            style={[styles.todayDateCard, activeDashboardCard === 'today' && styles.interactiveCardActive]}
            onTouchStartCapture={() => setActiveDashboardCard('today')}>
            <View style={styles.todayIconBox}>
              <CalendarDays size={20} color="#0F766E" strokeWidth={2} />
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
            style={[styles.kpiCardHalf, activeDashboardCard === 'kpi-appointments' && styles.interactiveCardActive]}
            onTouchStartCapture={() => setActiveDashboardCard('kpi-appointments')}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#ECFEFF' }]}>
              <Calendar size={24} color="#0E7490" />
            </View>
            <Text style={styles.kpiCardValue}>{monthlyAppointments?.appointments ?? '—'}</Text>
            <Text style={styles.kpiCardLabel} numberOfLines={2}>Appointments This Month</Text>
            <TouchableOpacity onPress={() => onNavigate(`/appointments?${monthRange}`)} style={{ marginTop: 6 }}>
              <Text style={styles.kpiActionLink}>View details ↗</Text>
            </TouchableOpacity>
          </View>

          {/* Card 2: Completed This Month */}
          <View
            style={[styles.kpiCardHalf, activeDashboardCard === 'kpi-completed' && styles.interactiveCardActive]}
            onTouchStartCapture={() => setActiveDashboardCard('kpi-completed')}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#DCFCE7' }]}>
              <CalendarCheck size={24} color="#2EB877" />
            </View>
            <Text style={styles.kpiCardValue}>{monthlyAppointments?.completed ?? '—'}</Text>
            <Text style={styles.kpiCardLabel} numberOfLines={2}>Completed This Month</Text>
            <TouchableOpacity onPress={() => onNavigate(`/appointments?${monthRange}&status=completed`)} style={{ marginTop: 6 }}>
              <Text style={styles.kpiActionLink}>View details ↗</Text>
            </TouchableOpacity>
          </View>

          {/* Card 3: Cancelled This Month */}
          <View
            style={[styles.kpiCardHalf, activeDashboardCard === 'kpi-cancelled' && styles.interactiveCardActive]}
            onTouchStartCapture={() => setActiveDashboardCard('kpi-cancelled')}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FEE2E2' }]}>
              <CalendarX size={24} color="#EF4444" />
            </View>
            <Text style={styles.kpiCardValue}>{monthlyAppointments?.cancelled ?? '—'}</Text>
            <Text style={styles.kpiCardLabel} numberOfLines={2}>Cancelled This Month</Text>
            <TouchableOpacity onPress={() => onNavigate(`/appointments?${monthRange}&status=cancelled`)} style={{ marginTop: 6 }}>
              <Text style={styles.kpiActionLink}>View details ↗</Text>
            </TouchableOpacity>
          </View>

          {/* Card 4: Revenue This Month */}
          <View
            style={[styles.kpiCardHalf, activeDashboardCard === 'kpi-revenue' && styles.interactiveCardActive]}
            onTouchStartCapture={() => setActiveDashboardCard('kpi-revenue')}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#F5F3FF' }]}>
              <IndianRupee size={24} color="#7C3AED" />
            </View>
            <Text style={styles.kpiCardValueSmall}>{formatCurrency(currentKpi.revenueThisMonth)}</Text>
            <Text style={styles.kpiCardLabel} numberOfLines={2}>Revenue This Month</Text>
            <TouchableOpacity onPress={() => onNavigate(`/billing/treatment?${monthRange}`)} style={{ marginTop: 6 }}>
              <Text style={styles.kpiActionLink}>View details ↗</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 4. OPERATIONS OVERVIEW (2 TILES PER ROW GRID) ── */}
        <View
          style={[styles.operationsCardContainer, activeDashboardCard === 'operations-overview' && styles.interactiveCardActive]}
          onTouchStartCapture={() => setActiveDashboardCard('operations-overview')}>
          <Text style={styles.opsTitle}>Operations Overview</Text>
          <Text style={styles.opsSubtitle}>Live clinic status and quick access.</Text>

          <View style={styles.quickAccessTag}>
            <Text style={styles.quickAccessText}>Quick access</Text>
          </View>

          <View style={styles.opGrid}>
            {/* Tile 1: Active Patients */}
            <TouchableOpacity style={[styles.opTileHalf, activeDashboardCard === 'operation-patients' && styles.interactiveCardActive]} onPressIn={() => setActiveDashboardCard('operation-patients')} onPress={() => onNavigate('/patients?status=active')}>
              <View style={[styles.opSquareIcon, { backgroundColor: '#E6F4F3' }]}>
                <Users size={24} color="#27A598" />
              </View>
              <Text style={styles.opBigNumber}>{currentKpi.activePatients ?? '—'}</Text>
              <Text style={styles.opTileLabel}>Active Patients</Text>
            </TouchableOpacity>

            {/* Tile 2: Low Stock Medicines */}
            <TouchableOpacity style={[styles.opTileHalf, activeDashboardCard === 'operation-medicines' && styles.interactiveCardActive]} onPressIn={() => setActiveDashboardCard('operation-medicines')} onPress={() => onNavigate('/medicines?stock=low')}>
              <View style={[styles.opSquareIcon, { backgroundColor: '#DCFCE7' }]}>
                <Pill size={24} color="#2EB877" />
              </View>
              <Text style={styles.opBigNumber}>{currentKpi.lowStockMedicines ?? '—'}</Text>
              <Text style={styles.opTileLabel}>Low Stock Medicines</Text>
            </TouchableOpacity>

            {/* Tile 3: Pending Lab Tests */}
            <TouchableOpacity style={[styles.opTileHalf, activeDashboardCard === 'operation-lab' && styles.interactiveCardActive]} onPressIn={() => setActiveDashboardCard('operation-lab')} onPress={() => onNavigate('/lab/tests?status=pending')}>
              <View style={[styles.opSquareIcon, { backgroundColor: '#FEF3C7' }]}>
                <TestTube size={24} color="#D97706" />
              </View>
              <Text style={styles.opBigNumber}>{currentKpi.pendingLabTests ?? '—'}</Text>
              <Text style={styles.opTileLabel}>Pending Lab Tests</Text>
            </TouchableOpacity>

            {/* Tile 4: Wallet Overview */}
            <TouchableOpacity style={[styles.opTileHalf, activeDashboardCard === 'operation-wallet' && styles.interactiveCardActive]} onPressIn={() => setActiveDashboardCard('operation-wallet')} onPress={() => onNavigate('/wallet')}>
              <View style={[styles.opSquareIcon, { backgroundColor: '#ECFEFF' }]}>
                <WalletCards size={24} color="#0E7490" />
              </View>
              <Text style={styles.opBigNumberSmall}>{formatCurrency(currentKpi.walletBalance)}</Text>
              <Text style={styles.opTileLabel}>Wallet Overview</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 5. DAILY APPOINTMENT STATUS BAR CHART (RESPONSIVE & MODERN HOVER TOOLTIP) ── */}
        <View
          style={[styles.chartCard, activeDashboardCard === 'appointments-chart' && styles.interactiveCardActive]}
          onTouchStartCapture={() => setActiveDashboardCard('appointments-chart')}>
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
          style={[
            styles.chartCard,
            styles.revenueChartCard,
            activeDashboardCard === 'revenue-chart' && styles.interactiveCardActive,
          ]}
          onTouchStartCapture={() => setActiveDashboardCard('revenue-chart')}>
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
                      stroke="#E2E8F0"
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
  loadingText: { fontFamily: 'Inter', color: '#6C7C93', marginTop: 10, fontSize: 14 },

  // Greeting & Date
  greetingSection: { marginBottom: 24, marginTop: 4 },
  greetingTitle: { fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: '#1C2830' },
  greetingSubtitle: { fontFamily: 'Inter', fontSize: 16, color: '#6C7C93', marginTop: 4 },
  todayDateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FDFC',
    borderWidth: 1,
    borderColor: '#B2EDE5',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
    gap: 14,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  todayIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E6F7F4',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayTextCol: { flex: 1 },
  todayBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#27A598' },
  todayBadgeText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: '#0F766E', letterSpacing: 1.6, textTransform: 'uppercase' },
  todayDateText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: '#1C2830' },

  // Monthly Performance KPI Grid (2 Cards Per Row)
  sectionHeader: { marginBottom: 14 },
  sectionTitle: { fontFamily: 'Inter', fontSize: 18, fontWeight: '600', color: '#1C2830' },
  sectionSubtitle: { fontFamily: 'Inter', fontSize: 14, color: '#6C7C93', marginTop: 2 },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  kpiCardHalf: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DFE5EC',
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  kpiIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  kpiCardValue: { fontFamily: 'Inter', fontSize: 24, fontWeight: '700', color: '#1C2830', marginBottom: 4 },
  kpiCardValueSmall: { fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: '#1C2830', marginBottom: 4 },
  kpiCardLabel: { fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: '#6C7C93', minHeight: 36 },
  kpiActionLink: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: '#27A598' },

  // Operations Overview Grid (2 Tiles Per Row)
  operationsCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DFE5EC',
    marginBottom: 24,
  },
  opsTitle: { fontFamily: 'Inter', fontSize: 18, fontWeight: '600', color: '#1C2830' },
  opsSubtitle: { fontFamily: 'Inter', fontSize: 14, color: '#6C7C93', marginTop: 4, marginBottom: 12 },
  quickAccessTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#E6F4F3',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 16,
  },
  quickAccessText: { fontFamily: 'Inter', color: '#27A598', fontSize: 12, fontWeight: '600' },
  opGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  opTileHalf: {
    width: '48%',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  opSquareIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  opBigNumber: { fontFamily: 'Inter', fontSize: 24, fontWeight: '700', color: '#1C2830' },
  opBigNumberSmall: { fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: '#1C2830' },
  opTileLabel: { fontFamily: 'Inter', fontSize: 14, color: '#6C7C93', marginTop: 4, fontWeight: '400', textAlign: 'center' },

  // Charts
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DFE5EC',
    marginBottom: 24,
    position: 'relative',
    shadowColor: '#1C2830',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  revenueChartCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFE5EC',
  },
  interactiveCardActive: {
    borderWidth: 2,
    borderColor: '#2DD4BF',
  },
  revenueChartTitle: {
    fontFamily: 'Inter', fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  chartCardTitle: { fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: '#1C2830', marginBottom: 16 },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: 'Inter', fontSize: 10, color: '#6C7C93', fontWeight: '400' },

  // Bar Chart Grid
  barGridArea: { marginTop: 10, position: 'relative' },
  gridLineRow: { flexDirection: 'row', alignItems: 'center', height: 42 },
  yAxisNum: { fontFamily: 'Inter', width: 16, fontSize: 10, color: '#94A3B8', textAlign: 'right', marginRight: 8 },
  gridLine: { flex: 1, height: 1, backgroundColor: '#F1F5F9' },
  barsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', marginTop: -189, paddingLeft: 24 },
  barCol: { alignItems: 'center', flex: 1 },
  barGroup: { height: 168, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2 },
  barSeriesContainer: { width: 8, height: 168, justifyContent: 'flex-end' },
  barVisual: { width: 8, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barVisualActive: { borderWidth: 1, borderColor: '#1C2830' },
  xAxisText: { fontFamily: 'Inter', fontSize: 10, color: '#6C7C93', marginTop: 8, fontWeight: '400', textAlign: 'center' },
  xAxisTextActive: { color: '#1C2830', fontWeight: '600' },

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
    borderColor: '#DFE5EC',
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    minWidth: 0,
  },
  tooltipHeaderDate: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: '#1C2830', marginBottom: 6 },
  tooltipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 },
  tooltipSquareDot: { width: 10, height: 10, borderRadius: 3 },
  tooltipLabel: { fontFamily: 'Inter', fontSize: 12, color: '#6C7C93', flex: 1, flexShrink: 1 },
  tooltipVal: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: '#1C2830', flexShrink: 0 },
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
    borderColor: '#DFE5EC',
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    minWidth: 150,
  },
  donutTooltipTitle: { fontFamily: 'Inter', fontSize: 12, fontWeight: '400', color: '#6C7C93', marginBottom: 4 },

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
  revenueRowLabel: { fontFamily: 'Inter', fontSize: 12, color: '#6C7C93', fontWeight: '400' },
  revenueRowVal: { fontFamily: 'Inter', fontSize: 12, color: '#1C2830', fontWeight: '600' },
});

export default AdminDashboard;
