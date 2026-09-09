import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import {
  ActivityPulseIcon,
  AlertCircleIcon,
  CalendarIcon,
  ClockOutlineIcon,
  StethoscopeIcon,
} from '../../components/common/CustomIcons';
import { useAuthContext } from '../../context/AuthContext';
import { useDoctorDashboard } from '../../hooks/useDoctorDashboard';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const DoctorDashboardScreen: React.FC<Props> = ({
  onOpenDrawer,
  onOpenNotifications,
  onNavigateScreen = () => {},
}) => {
  const { user } = useAuthContext();

  const { appointments, loading, refreshing, onRefresh } = useDoctorDashboard();

  // Doctor Name formatting (e.g. Dr Verma)
  const doctorDisplayName = useMemo(() => {
    const raw = user?.fullName || (user as any)?.full_name || 'Dr Verma';
    if (raw.toLowerCase().startsWith('dr')) return raw;
    return `Dr ${raw}`;
  }, [user]);

  // Clinic Name
  const clinicName = (user as any)?.clinicName || (user as any)?.clinic?.name || 'Aarogya Care Clinic';

  // Dynamic Time Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Formatted Today Date (e.g. Wednesday, September 9)
  const formattedToday = useMemo(() => {
    const d = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  }, []);

  // Dynamic Metrics from Real Doctor Appointments
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todayCount = useMemo(() => {
    return appointments.filter((a) => {
      const d = (a.appointment_date || '').split('T')[0];
      return d === todayStr;
    }).length;
  }, [appointments, todayStr]);

  const upcomingCount = useMemo(() => {
    return appointments.filter((a) => {
      const d = (a.appointment_date || '').split('T')[0];
      const s = String(a.status || '').toLowerCase();
      return (d > todayStr || s === 'scheduled' || s === 'approved') && d !== todayStr;
    }).length;
  }, [appointments, todayStr]);

  const pendingCount = useMemo(() => {
    return appointments.filter((a) => {
      const s = String(a.status || '').toLowerCase();
      return s === 'pending' || s === 'in_progress' || s === 'scheduled';
    }).length;
  }, [appointments]);

  const visitsCount = useMemo(() => {
    return appointments.filter((a) => {
      const s = String(a.status || '').toLowerCase();
      return s === 'completed' || s === 'complete';
    }).length;
  }, [appointments]);

  const totalWorkload = useMemo(() => {
    return todayCount + pendingCount + upcomingCount;
  }, [todayCount, pendingCount, upcomingCount]);

  // Bar Chart calculations
  const maxBarValue = useMemo(() => {
    const max = Math.max(todayCount, upcomingCount, pendingCount, visitsCount);
    return max > 0 ? max : 2;
  }, [todayCount, upcomingCount, pendingCount, visitsCount]);

  const getBarHeightPercent = (val: number) => {
    if (val <= 0) return '0%';
    const pct = Math.min(100, Math.max(14, (val / maxBarValue) * 100));
    return `${pct}%`;
  };

  return (
    <View style={styles.container}>
      {/* ─── HEADER: HAMBURGER (LEFT), NOTIFICATIONS & AVATAR (RIGHT) ─── */}
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        showLogo={false}
        showRolePill={false}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0d9488']} />
        }>
        {/* ─── CLINIC BRANDING ROW WITH STETHOSCOPE SQUIRCLE ─── */}
        <View style={styles.clinicRow}>
          <View style={styles.stethoscopeBox}>
            <StethoscopeIcon size={20} color="#ffffff" strokeWidth={2.2} />
          </View>
          <View style={styles.clinicTitleWrapper}>
            <Text style={styles.clinicTitleText}>{clinicName}</Text>
            <View style={styles.clinicUnderline} />
          </View>
        </View>

        {/* ─── GREETING SECTION ─── */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>
            {greeting}, {doctorDisplayName}!
          </Text>
          <Text style={styles.greetingSubtitle}>
            Here's what's happening at your clinic today.
          </Text>
        </View>

        {/* ─── TODAY CARD ─── */}
        <View style={styles.todayCard}>
          <View style={styles.todayIconBox}>
            <CalendarIcon size={20} color="#0d9488" />
          </View>
          <View style={styles.todayTextCol}>
            <View style={styles.todayDotRow}>
              <View style={styles.tealDot} />
              <Text style={styles.todayLabelText}>TODAY</Text>
            </View>
            <Text style={styles.todayDateText}>{formattedToday}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 32 }} />
        ) : (
          <>
            {/* ─── 4 STAT / KPI CARDS ─── */}
            <View style={styles.statCardsList}>
              {/* Card 1: Today's Appointments */}
              <TouchableOpacity
                style={styles.statCard}
                activeOpacity={0.88}
                onPress={() => onNavigateScreen('appointments')}>
                <View style={styles.statInfoCol}>
                  <Text style={styles.statLabelText}>Today's Appointments</Text>
                  <Text style={styles.statNumberText}>{todayCount}</Text>
                  <Text style={styles.viewDetailsText}>View details ↗</Text>
                </View>
                <View style={[styles.statIconBox, { backgroundColor: '#f0fdfa' }]}>
                  <CalendarIcon size={24} color="#0d9488" />
                </View>
              </TouchableOpacity>

              {/* Card 2: Upcoming Appointments */}
              <TouchableOpacity
                style={styles.statCard}
                activeOpacity={0.88}
                onPress={() => onNavigateScreen('appointments')}>
                <View style={styles.statInfoCol}>
                  <Text style={styles.statLabelText}>Upcoming Appointments</Text>
                  <Text style={styles.statNumberText}>{upcomingCount}</Text>
                  <Text style={styles.viewDetailsText}>View details ↗</Text>
                </View>
                <View style={[styles.statIconBox, { backgroundColor: '#f0fdf4' }]}>
                  <ClockOutlineIcon size={24} color="#10b981" strokeWidth={2} />
                </View>
              </TouchableOpacity>

              {/* Card 3: Pending Requests */}
              <TouchableOpacity
                style={styles.statCard}
                activeOpacity={0.88}
                onPress={() => onNavigateScreen('appointments')}>
                <View style={styles.statInfoCol}>
                  <Text style={styles.statLabelText}>Pending Requests</Text>
                  <Text style={styles.statNumberText}>{pendingCount}</Text>
                  <Text style={styles.viewDetailsText}>View details ↗</Text>
                </View>
                <View style={[styles.statIconBox, { backgroundColor: '#fefce8' }]}>
                  <AlertCircleIcon size={24} color="#f59e0b" strokeWidth={2} />
                </View>
              </TouchableOpacity>

              {/* Card 4: Total Visits */}
              <TouchableOpacity
                style={styles.statCard}
                activeOpacity={0.88}
                onPress={() => onNavigateScreen('appointments')}>
                <View style={styles.statInfoCol}>
                  <Text style={styles.statLabelText}>Total Visits</Text>
                  <Text style={styles.statNumberText}>{visitsCount}</Text>
                  <Text style={styles.viewDetailsText}>View details ↗</Text>
                </View>
                <View style={[styles.statIconBox, { backgroundColor: '#f0fdfa' }]}>
                  <ActivityPulseIcon size={24} color="#0d9488" strokeWidth={2.2} />
                </View>
              </TouchableOpacity>
            </View>

            {/* ─── APPOINTMENTS SNAPSHOT (BAR CHART) ─── */}
            <View style={styles.snapshotCard}>
              <Text style={styles.cardHeaderTitle}>Appointments Snapshot</Text>

              {/* Bar Chart Container */}
              <View style={styles.chartOuterBox}>
                {/* Y-Axis Labels & Grid Lines */}
                <View style={styles.chartGridContainer}>
                  {['2', '1.5', '1', '0.5', '0'].map((label, idx) => (
                    <View key={label} style={styles.gridLineRow}>
                      <Text style={styles.yAxisLabel}>{label}</Text>
                      <View style={styles.gridLineH} />
                    </View>
                  ))}
                </View>

                {/* Bars Plot Area */}
                <View style={styles.barsPlotArea}>
                  {/* Bar 1: Today */}
                  <View style={styles.barColumn}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { height: getBarHeightPercent(todayCount), backgroundColor: '#0d9488' },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabelText}>Today</Text>
                  </View>

                  {/* Bar 2: Upcoming */}
                  <View style={styles.barColumn}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { height: getBarHeightPercent(upcomingCount), backgroundColor: '#10b981' },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabelText}>Upcoming</Text>
                  </View>

                  {/* Bar 3: Pending (Highlighted in Amber / Golden Orange) */}
                  <View style={styles.barColumn}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { height: getBarHeightPercent(pendingCount), backgroundColor: '#f59e0b' },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabelText}>Pending</Text>
                  </View>

                  {/* Bar 4: Visits */}
                  <View style={styles.barColumn}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { height: getBarHeightPercent(visitsCount), backgroundColor: '#0284c7' },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabelText}>Visits</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ─── WORKLOAD SPLIT (DONUT CHART & LEGEND) ─── */}
            <View style={styles.workloadCard}>
              <Text style={styles.cardHeaderTitle}>Workload Split</Text>

              {/* Donut Chart Ring */}
              <View style={styles.donutCenterWrapper}>
                <View
                  style={[
                    styles.donutRingOuter,
                    { backgroundColor: totalWorkload > 0 ? '#10b981' : '#e2e8f0' },
                  ]}>
                  {/* Subtle slice separator mark on right */}
                  {totalWorkload > 0 && <View style={styles.donutSliceGap} />}
                  <View style={styles.donutCenterHole} />
                </View>
              </View>

              {/* Legend Pill Rows */}
              <View style={styles.legendContainer}>
                {/* Today */}
                <View style={styles.legendPillRow}>
                  <View style={styles.legendDotAndLabel}>
                    <View style={[styles.legendDot, { backgroundColor: '#0d9488' }]} />
                    <Text style={styles.legendLabelText}>Today</Text>
                  </View>
                  <Text style={styles.legendCountText}>{todayCount}</Text>
                </View>

                {/* Pending */}
                <View style={styles.legendPillRow}>
                  <View style={styles.legendDotAndLabel}>
                    <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                    <Text style={styles.legendLabelText}>Pending</Text>
                  </View>
                  <Text style={styles.legendCountText}>{pendingCount}</Text>
                </View>

                {/* Upcoming */}
                <View style={styles.legendPillRow}>
                  <View style={styles.legendDotAndLabel}>
                    <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                    <Text style={styles.legendLabelText}>Upcoming</Text>
                  </View>
                  <Text style={styles.legendCountText}>{upcomingCount}</Text>
                </View>
              </View>
            </View>

            {/* ─── QUICK OVERVIEW CARD ─── */}
            <View style={styles.quickOverviewCard}>
              <Text style={styles.cardHeaderTitle}>Quick Overview</Text>

              {/* Sub-card 1: Appointments Today */}
              <View style={styles.quickSubCard}>
                <View style={styles.quickSubTextCol}>
                  <Text style={styles.quickSubLabel}>Appointments Today</Text>
                  <Text style={styles.quickSubValue}>{todayCount}</Text>
                </View>
                <View style={styles.quickSubIconBox}>
                  <CalendarIcon size={34} color="#a7f3d0" />
                </View>
              </View>

              {/* Sub-card 2: Pending Requests */}
              <View style={styles.quickSubCard}>
                <View style={styles.quickSubTextCol}>
                  <Text style={styles.quickSubLabel}>Pending Requests</Text>
                  <Text style={styles.quickSubValue}>{pendingCount}</Text>
                </View>
                <View style={styles.quickSubIconBox}>
                  <AlertCircleIcon size={34} color="#fde68a" strokeWidth={1.8} />
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },

  /* ─── Clinic Branding ─── */
  clinicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  stethoscopeBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clinicTitleWrapper: {
    flex: 1,
  },
  clinicTitleText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0d766e',
    letterSpacing: -0.3,
  },
  clinicUnderline: {
    height: 3,
    backgroundColor: '#38bdf8',
    width: '100%',
    borderRadius: 2,
    marginTop: 2,
  },

  /* ─── Greeting ─── */
  greetingSection: {
    marginBottom: 16,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 3,
  },

  /* ─── Today Card ─── */
  todayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#99f6e4',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    marginBottom: 16,
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  todayIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayTextCol: {
    flex: 1,
  },
  todayDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  tealDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0d9488',
  },
  todayLabelText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0d9488',
    letterSpacing: 0.6,
  },
  todayDateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },

  /* ─── 4 Stat Cards ─── */
  statCardsList: {
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statInfoCol: {
    flex: 1,
  },
  statLabelText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  statNumberText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginVertical: 4,
  },
  viewDetailsText: {
    fontSize: 12.5,
    color: '#0d9488',
    fontWeight: '600',
  },
  statIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ─── Shared Card Styles ─── */
  cardHeaderTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
  },

  /* ─── Appointments Snapshot (Bar Chart) ─── */
  snapshotCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  chartOuterBox: {
    height: 200,
    position: 'relative',
    justifyContent: 'space-between',
  },
  chartGridContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 24,
    justifyContent: 'space-between',
  },
  gridLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  yAxisLabel: {
    width: 22,
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'right',
  },
  gridLineH: {
    flex: 1,
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  barsPlotArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    marginLeft: 30,
    marginBottom: 2,
    paddingBottom: 22,
  },
  barColumn: {
    alignItems: 'center',
    width: 50,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 38,
    height: 140,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 2,
  },
  barLabelText: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 6,
    fontWeight: '500',
  },

  /* ─── Workload Split (Donut Chart) ─── */
  workloadCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  donutCenterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
  },
  donutRingOuter: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  donutSliceGap: {
    position: 'absolute',
    right: 0,
    top: 75,
    width: 30,
    height: 3,
    backgroundColor: '#ffffff',
  },
  donutCenterHole: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#ffffff',
  },
  legendContainer: {
    gap: 8,
    marginTop: 6,
  },
  legendPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  legendDotAndLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabelText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  legendCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },

  /* ─── Quick Overview ─── */
  quickOverviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  quickSubCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quickSubTextCol: {
    flex: 1,
  },
  quickSubLabel: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },
  quickSubValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  quickSubIconBox: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DoctorDashboardScreen;
