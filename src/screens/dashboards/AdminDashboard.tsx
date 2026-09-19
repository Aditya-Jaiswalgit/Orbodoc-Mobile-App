import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
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

interface AdminDashboardProps {
  onNavigate?: (path: string) => void;
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
}

interface BarItemData {
  date: string;
  approved: number;
  completed: number;
  cancelled: number;
  height: number;
  color: string;
}

// Clinic Data Map for Dynamic Switching
const CLINIC_KPI_DATA: Record<number, {
  appointmentsThisMonth: number;
  completedThisMonth: number;
  cancelledThisMonth: number;
  revenueThisMonth: number;
  activePatients: number;
  lowStockMedicines: number;
  pendingLabTests: number;
  walletBalance: number;
  treatmentRevenue: number;
  medicineRevenue: number;
  barData: BarItemData[];
}> = {
  1: {
    appointmentsThisMonth: 4,
    completedThisMonth: 2,
    cancelledThisMonth: 1,
    revenueThisMonth: 467.01,
    activePatients: 16,
    lowStockMedicines: 1,
    pendingLabTests: 0,
    walletBalance: 600.06,
    treatmentRevenue: 200.02,
    medicineRevenue: 266.99,
    barData: [
      { date: '11 Sept', approved: 1, completed: 0, cancelled: 0, height: 40, color: '#0EA5E9' },
      { date: '15 Sept', approved: 0, completed: 1, cancelled: 0, height: 40, color: '#10B981' },
      { date: '18 Sept', approved: 0, completed: 1, cancelled: 0, height: 40, color: '#10B981' },
      { date: '24 Sept', approved: 0, completed: 0, cancelled: 1, height: 40, color: '#F43F5E' },
    ],
  },
  2: {
    appointmentsThisMonth: 42,
    completedThisMonth: 35,
    cancelledThisMonth: 3,
    revenueThisMonth: 58200.50,
    activePatients: 128,
    lowStockMedicines: 5,
    pendingLabTests: 8,
    walletBalance: 15400.00,
    treatmentRevenue: 34000.00,
    medicineRevenue: 24200.50,
    barData: [
      { date: '11 Sept', approved: 4, completed: 2, cancelled: 0, height: 60, color: '#0EA5E9' },
      { date: '15 Sept', approved: 2, completed: 8, cancelled: 1, height: 50, color: '#10B981' },
      { date: '18 Sept', approved: 5, completed: 10, cancelled: 0, height: 70, color: '#10B981' },
      { date: '24 Sept', approved: 1, completed: 3, cancelled: 2, height: 35, color: '#F43F5E' },
    ],
  },
  3: {
    appointmentsThisMonth: 88,
    completedThisMonth: 72,
    cancelledThisMonth: 8,
    revenueThisMonth: 112450.00,
    activePatients: 210,
    lowStockMedicines: 12,
    pendingLabTests: 14,
    walletBalance: 32100.00,
    treatmentRevenue: 68000.00,
    medicineRevenue: 44450.00,
    barData: [
      { date: '11 Sept', approved: 8, completed: 12, cancelled: 1, height: 75, color: '#10B981' },
      { date: '15 Sept', approved: 10, completed: 15, cancelled: 2, height: 65, color: '#0EA5E9' },
      { date: '18 Sept', approved: 14, completed: 20, cancelled: 1, height: 80, color: '#10B981' },
      { date: '24 Sept', approved: 3, completed: 6, cancelled: 4, height: 45, color: '#F43F5E' },
    ],
  },
};

export function AdminDashboard({
  onNavigate = () => {},
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
}: AdminDashboardProps) {
  const { user, activeClinicId } = useAuthContext();
  const { width: screenWidth } = useWindowDimensions();
  const [loading] = useState(false);

  // Interactive Tooltip States (Hidden by default, shown ONLY on touch/hover)
  const [activeBarIdx, setActiveBarIdx] = useState<number | null>(null);
  const [activeDonutSegment, setActiveDonutSegment] = useState<'treatment' | 'medicine' | null>(null);

  const currentClinicId = Number(activeClinicId || 1);
  const staffName = user?.fullName || (user as any)?.full_name || 'Dr. Rahul Sharma';

  // Active KPI data for current clinic
  const currentKpi = CLINIC_KPI_DATA[currentClinicId] || CLINIC_KPI_DATA[1];

  const formatCurrency = (val: number) => `₹${val.toFixed(2)}`;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0D9488" />
        <Text style={styles.loadingText}>Updating Clinic Dashboard...</Text>
      </View>
    );
  }

  // Responsive Left Calculation for Bar Tooltip
  const chartWidth = Math.max(260, screenWidth - 72);
  const totalBars = currentKpi.barData.length;
  const barSpacing = chartWidth / totalBars;
  const tooltipLeftPos = activeBarIdx !== null
    ? Math.min(
        Math.max(10, activeBarIdx * barSpacing + barSpacing / 2 - 68),
        chartWidth - 140
      )
    : 15;

  // Calculate SVG Donut parameters
  const totalRev = currentKpi.treatmentRevenue + currentKpi.medicineRevenue;
  const treatRatio = currentKpi.treatmentRevenue / totalRev;
  const size = 180;
  const strokeWidth = 26;
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

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* ── 2. GREETING & TODAY CARD ── */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>Good evening, {staffName}!</Text>
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
              <Text style={styles.todayDateText}>Saturday, September 19</Text>
            </View>
          </View>
        </View>

        {/* ── 3. MONTHLY PERFORMANCE (2 CARDS PER ROW GRID) ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Monthly Performance</Text>
          <Text style={styles.sectionSubtitle}>Month-to-date results for September 2026</Text>
        </View>

        <View style={styles.kpiGrid}>
          {/* Card 1: Appointments This Month */}
          <View style={styles.kpiCardHalf}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#E6FFFA' }]}>
              <Calendar size={22} color="#0D9488" />
            </View>
            <Text style={styles.kpiCardValue}>{currentKpi.appointmentsThisMonth}</Text>
            <Text style={styles.kpiCardLabel} numberOfLines={2}>Appointments This Month</Text>
            <TouchableOpacity onPress={() => onNavigate('/appointments')} style={{ marginTop: 6 }}>
              <Text style={styles.kpiActionLink}>View details ↗</Text>
            </TouchableOpacity>
          </View>

          {/* Card 2: Completed This Month */}
          <View style={styles.kpiCardHalf}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#DCFCE7' }]}>
              <CalendarCheck size={22} color="#16A34A" />
            </View>
            <Text style={styles.kpiCardValue}>{currentKpi.completedThisMonth}</Text>
            <Text style={styles.kpiCardLabel} numberOfLines={2}>Completed This Month</Text>
            <TouchableOpacity onPress={() => onNavigate('/appointments')} style={{ marginTop: 6 }}>
              <Text style={styles.kpiActionLink}>View details ↗</Text>
            </TouchableOpacity>
          </View>

          {/* Card 3: Cancelled This Month */}
          <View style={styles.kpiCardHalf}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FEE2E2' }]}>
              <CalendarX size={22} color="#EF4444" />
            </View>
            <Text style={styles.kpiCardValue}>{currentKpi.cancelledThisMonth}</Text>
            <Text style={styles.kpiCardLabel} numberOfLines={2}>Cancelled This Month</Text>
            <TouchableOpacity onPress={() => onNavigate('/appointments')} style={{ marginTop: 6 }}>
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
            <TouchableOpacity onPress={() => onNavigate('/wallet')} style={{ marginTop: 6 }}>
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
            <TouchableOpacity style={styles.opTileHalf} onPress={() => onNavigate('/patients')}>
              <View style={[styles.opSquareIcon, { backgroundColor: '#E6FFFA' }]}>
                <Users size={22} color="#0D9488" />
              </View>
              <Text style={styles.opBigNumber}>{currentKpi.activePatients}</Text>
              <Text style={styles.opTileLabel}>Active Patients</Text>
            </TouchableOpacity>

            {/* Tile 2: Low Stock Medicines */}
            <TouchableOpacity style={styles.opTileHalf} onPress={() => onNavigate('/medicines')}>
              <View style={[styles.opSquareIcon, { backgroundColor: '#DCFCE7' }]}>
                <Pill size={22} color="#16A34A" />
              </View>
              <Text style={styles.opBigNumber}>{currentKpi.lowStockMedicines}</Text>
              <Text style={styles.opTileLabel}>Low Stock Medicines</Text>
            </TouchableOpacity>

            {/* Tile 3: Pending Lab Tests */}
            <TouchableOpacity style={styles.opTileHalf} onPress={() => onNavigate('/lab/tests')}>
              <View style={[styles.opSquareIcon, { backgroundColor: '#FEF3C7' }]}>
                <TestTube size={22} color="#D97706" />
              </View>
              <Text style={styles.opBigNumber}>{currentKpi.pendingLabTests}</Text>
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
                <Text style={styles.yAxisNum}>{num}</Text>
                <View style={styles.gridLine} />
              </View>
            ))}

            {/* Interactive Floating Tooltip Card */}
            {activeBarIdx !== null && currentKpi.barData[activeBarIdx] && (
              <View style={[styles.barTooltipCard, { left: tooltipLeftPos }]}>
                <Text style={styles.tooltipHeaderDate}>{currentKpi.barData[activeBarIdx].date}</Text>

                <View style={styles.tooltipRow}>
                  <View style={[styles.tooltipSquareDot, { backgroundColor: '#0EA5E9' }]} />
                  <Text style={styles.tooltipLabel}>Approved</Text>
                  <Text style={styles.tooltipVal}>{currentKpi.barData[activeBarIdx].approved}</Text>
                </View>

                <View style={styles.tooltipRow}>
                  <View style={[styles.tooltipSquareDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.tooltipLabel}>Completed</Text>
                  <Text style={styles.tooltipVal}>{currentKpi.barData[activeBarIdx].completed}</Text>
                </View>

                <View style={styles.tooltipRow}>
                  <View style={[styles.tooltipSquareDot, { backgroundColor: '#F43F5E' }]} />
                  <Text style={styles.tooltipLabel}>Cancelled</Text>
                  <Text style={styles.tooltipVal}>{currentKpi.barData[activeBarIdx].cancelled}</Text>
                </View>

                {/* Downward Pointer Arrow */}
                <View style={styles.tooltipPointerArrow} />
              </View>
            )}

            <View style={styles.barsRow}>
              {currentKpi.barData.map((bar, idx) => {
                const isSelected = activeBarIdx === idx;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.barCol}
                    activeOpacity={0.8}
                    onPress={() => setActiveBarIdx((prev) => (prev === idx ? null : idx))}>
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.barVisual,
                          { height: bar.height, backgroundColor: bar.color },
                          isSelected && styles.barVisualActive,
                        ]}
                      />
                    </View>
                    <Text style={[styles.xAxisText, isSelected && styles.xAxisTextActive]}>
                      {bar.date}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── 6. MONTHLY REVENUE MIX DONUT CHART (RESPONSIVE & MODERN HOVER TOOLTIP) ── */}
        <View style={styles.chartCard}>
          <Text style={styles.chartCardTitle}>Monthly Revenue Mix</Text>

          <View style={styles.donutAreaWrapper}>
            {/* Interactive Floating Donut Tooltip Card */}
            {activeDonutSegment && (
              <View style={styles.donutTooltipCard}>
                <Text style={styles.donutTooltipTitle}>Value</Text>
                <View style={styles.tooltipRow}>
                  <View
                    style={[
                      styles.tooltipSquareDot,
                      { backgroundColor: activeDonutSegment === 'treatment' ? '#0D9488' : '#10B981' },
                    ]}
                  />
                  <Text style={styles.tooltipLabel}>
                    {activeDonutSegment === 'treatment' ? 'Treatment' : 'Medicine'}
                  </Text>
                  <Text style={styles.tooltipVal}>
                    {activeDonutSegment === 'treatment'
                      ? currentKpi.treatmentRevenue.toFixed(2)
                      : currentKpi.medicineRevenue.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.tooltipPointerArrowLeft} />
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.donutContainer}
              onPress={() =>
                setActiveDonutSegment((prev) =>
                  prev === null ? 'treatment' : prev === 'treatment' ? 'medicine' : null
                )
              }>
              <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <G rotation="-90" origin={`${center}, ${center}`}>
                  {/* Base Ring (Medicine Segment - Green) */}
                  <Circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="#10B981"
                    strokeWidth={activeDonutSegment === 'medicine' ? strokeWidth + 4 : strokeWidth}
                    fill="transparent"
                  />
                  {/* Treatment Segment - Teal */}
                  <Circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="#0D9488"
                    strokeWidth={activeDonutSegment === 'treatment' ? strokeWidth + 4 : strokeWidth}
                    fill="transparent"
                    strokeDasharray={`${circumference * treatRatio} ${circumference}`}
                    strokeLinecap="round"
                  />
                </G>
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Breakdown Rows */}
          <View style={styles.revenueBreakdownBox}>
            <TouchableOpacity
              style={[
                styles.revenueRow,
                activeDonutSegment === 'treatment' && styles.revenueRowActive,
              ]}
              activeOpacity={0.8}
              onPress={() => setActiveDonutSegment((prev) => (prev === 'treatment' ? null : 'treatment'))}>
              <View style={styles.revenueLabelGroup}>
                <View style={[styles.legendDot, { backgroundColor: '#0D9488' }]} />
                <Text style={styles.revenueRowLabel}>Treatment</Text>
              </View>
              <Text style={styles.revenueRowVal}>{currentKpi.treatmentRevenue.toFixed(2)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.revenueRow,
                activeDonutSegment === 'medicine' && styles.revenueRowActive,
              ]}
              activeOpacity={0.8}
              onPress={() => setActiveDonutSegment((prev) => (prev === 'medicine' ? null : 'medicine'))}>
              <View style={styles.revenueLabelGroup}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.revenueRowLabel}>Medicine</Text>
              </View>
              <Text style={styles.revenueRowVal}>{currentKpi.medicineRevenue.toFixed(2)}</Text>
            </TouchableOpacity>
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
  barsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 110, marginTop: -140, paddingLeft: 24 },
  barCol: { alignItems: 'center', paddingHorizontal: 10 },
  barContainer: { height: 80, justifyContent: 'flex-end' },
  barVisual: { width: 18, borderRadius: 9 },
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
    minWidth: 135,
  },
  tooltipHeaderDate: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  tooltipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 },
  tooltipSquareDot: { width: 10, height: 10, borderRadius: 3 },
  tooltipLabel: { fontSize: 12, color: '#64748B', flex: 1 },
  tooltipVal: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
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
    top: 20,
    left: 10,
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
    minWidth: 145,
  },
  donutTooltipTitle: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 4 },
  tooltipPointerArrowLeft: {
    position: 'absolute',
    right: -6,
    top: '40%',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
  },

  // Breakdown Rows
  revenueBreakdownBox: { gap: 10, marginTop: 10 },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  revenueRowActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#CCFBF1',
  },
  revenueLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revenueRowLabel: { fontSize: 14, color: '#475569', fontWeight: '600' },
  revenueRowVal: { fontSize: 14, color: '#0F172A', fontWeight: '700' },
});

export default AdminDashboard;
