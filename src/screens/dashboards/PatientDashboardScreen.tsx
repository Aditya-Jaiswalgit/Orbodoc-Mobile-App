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
import {
  ArrowUpRight,
  Calendar,
  CalendarDays,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  FileText,
  IndianRupee,
  ReceiptText,
  Stethoscope,
} from 'lucide-react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import { useAuthContext } from '../../context/AuthContext';
import { usePatientDashboard } from '../../hooks/usePatientDashboard';

interface PatientDashboardScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
  onBookAppointment?: () => void;
  onOpenAppointments?: () => void;
  onOpenLabReports?: () => void;
  onOpenBilling?: () => void;
  showBookAppointment?: boolean;
  showAppointments?: boolean;
  showLabReports?: boolean;
  showBilling?: boolean;
}

type DashboardAppointment = {
  id: number | string;
  appointment_date: string;
  appointment_time?: string;
  doctor_name?: string;
  specialization?: string;
  clinic_name?: string;
  status?: string;
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);

const formatAppointmentSchedule = (date?: string, time?: string) => {
  const dateKey = String(date || '').slice(0, 10);
  if (!dateKey) return 'Schedule unavailable';
  const parsed = new Date(`${dateKey}T${String(time || '00:00:00').slice(0, 8)}`);
  if (Number.isNaN(parsed.getTime())) return `${dateKey} ${time || ''}`.trim();
  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const PatientDashboardScreen: React.FC<PatientDashboardScreenProps> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
  onBookAppointment = () => {},
  onOpenAppointments = () => {},
  onOpenLabReports = () => {},
  onOpenBilling = () => {},
  showBookAppointment = true,
  showAppointments = true,
  showLabReports = true,
  showBilling = true,
}) => {
  const { width } = useWindowDimensions();
  const { user, token } = useAuthContext();
  const { dashboardData, loading, refreshing, error, onRefresh, refetch } =
    usePatientDashboard(token);

  const patientName = user?.fullName || user?.full_name || 'there';
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const todayLabel = now.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });
  const appointments = dashboardData?.upcoming_appointments || [];
  const reportsCount = dashboardData?.recent_lab_reports?.length || 0;
  const bills = dashboardData?.recent_bills || [];
  const paidBills = bills.filter(
    bill => String(bill.status || '').toLowerCase() === 'paid',
  ).length;
  const totalBilled = bills.reduce(
    (sum, bill) => sum + Number(bill.total_amount || 0),
    0,
  );
  const totalPaid = bills.reduce(
    (sum, bill) => sum + Number(bill.paid_amount || 0),
    0,
  );
  const outstanding = Math.max(0, totalBilled - totalPaid);
  const paidPercent = totalBilled > 0
    ? Math.min(100, Math.round((totalPaid / totalBilled) * 100))
    : 0;
  const nextAppointment = appointments[0] as DashboardAppointment | undefined;
  const wide = width >= 760;
  const statWidth = wide ? '23.5%' : '48.5%';

  const stats = [
    {
      label: 'Upcoming Appointments',
      value: appointments.length,
      Icon: Calendar,
      color: '#0d9488',
      background: '#ccfbf1',
      onPress: onOpenAppointments,
    },
    {
      label: 'Lab Reports',
      value: reportsCount,
      Icon: FileText,
      color: '#0284c7',
      background: '#e0f2fe',
      onPress: onOpenLabReports,
    },
    {
      label: 'Bills',
      value: bills.length,
      Icon: IndianRupee,
      color: '#d97706',
      background: '#fef3c7',
      onPress: onOpenBilling,
    },
    {
      label: 'Paid Bills',
      value: paidBills,
      Icon: CheckCircle2,
      color: '#15803d',
      background: '#dcfce7',
      onPress: onOpenBilling,
    },
  ];

  return (
    <View style={styles.container}>
      <PatientHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, wide && styles.wideContent]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0f766e"
            colors={['#0f766e']}
          />
        }>
        <View style={styles.greetingSection}>
          <Text style={styles.welcomeText}>
            {greeting}, <Text style={styles.welcomeName}>{patientName}</Text>!
          </Text>
          <Text style={styles.greetingSubtitle}>Here's what's happening with your health today.</Text>
          <View style={styles.todayDateCard}>
            <View style={styles.todayIconBox}>
              <CalendarDays size={22} color="#0D9488" strokeWidth={2.2} />
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

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void refetch()} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {showBookAppointment ? (
          <View style={[styles.bookingBanner, wide && styles.bookingBannerWide]}>
          <View style={styles.bookingCopy}>
            <View style={styles.bannerTitleRow}>
              <CalendarPlus size={20} color="#0f766e" />
              <Text style={styles.bannerTitle}>Book an Appointment</Text>
            </View>
            <Text style={styles.bannerSubtitle}>
              Choose from available clinics and doctors, then pick a time that works for you.
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={onBookAppointment}
            style={[styles.findDoctorButton, wide && styles.findDoctorButtonWide]}>
            <Text style={styles.findDoctorText}>Find Clinic &amp; Doctor</Text>
            <ArrowUpRight size={17} color="#ffffff" />
          </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.statsGrid}>
          {stats.filter(({ label }) => label === 'Upcoming Appointments' ? showAppointments : label === 'Lab Reports' ? showLabReports : showBilling).map(({ label, value, Icon, color, background, onPress }) => (
            <TouchableOpacity
              key={label}
              activeOpacity={0.82}
              onPress={onPress}
              style={[styles.statCard, { width: statWidth }]}>
              <View style={styles.statTopRow}>
                <Text numberOfLines={2} style={styles.statTitle}>{label}</Text>
                <View style={[styles.statIcon, { backgroundColor: background }]}>
                  <Icon size={19} color={color} />
                </View>
              </View>
              <Text style={styles.statValue}>{loading ? '—' : value}</Text>
              <View style={styles.statLinkRow}>
                <Text style={[styles.statLinkText, { color }]}>View details</Text>
                <ArrowUpRight size={14} color={color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.sectionsRow, wide && styles.sectionsRowWide]}>
          {showAppointments ? <View style={[styles.sectionCard, styles.careCard, wide && styles.halfSection]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderCopy}>
                <Text style={styles.careEyebrow}>CARE OVERVIEW</Text>
                <Text style={styles.sectionTitle}>Your next visit</Text>
                <Text style={styles.sectionSubtitle}>
                  Upcoming care and health activity at a glance.
                </Text>
              </View>
              <View style={styles.careBadge}>
                <CalendarClock size={21} color="#ffffff" />
              </View>
            </View>

            {nextAppointment ? (
              <View style={styles.nextVisitCard}>
                <View style={styles.visitTopRow}>
                  <View style={styles.doctorIcon}>
                    <Stethoscope size={20} color="#0e7490" />
                  </View>
                  <View style={styles.visitDoctorCopy}>
                    <Text numberOfLines={1} style={styles.doctorName}>
                      {nextAppointment.doctor_name || 'Doctor assigned'}
                    </Text>
                    <Text numberOfLines={1} style={styles.specialization}>
                      {nextAppointment.specialization || 'General consultation'}
                    </Text>
                  </View>
                  <Text style={styles.statusBadge}>
                    {String(nextAppointment.status || 'scheduled').replace(/_/g, ' ')}
                  </Text>
                </View>
                <View style={styles.visitDetails}>
                  <View style={styles.visitDateRow}>
                    <Calendar size={16} color="#0d9488" />
                    <Text style={styles.visitDateText}>
                      {formatAppointmentSchedule(
                        nextAppointment.appointment_date,
                        nextAppointment.appointment_time,
                      )}
                    </Text>
                  </View>
                  <Text numberOfLines={1} style={styles.clinicName}>
                    {nextAppointment.clinic_name || 'Clinic details unavailable'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyAppointment}>
                {loading ? (
                  <ActivityIndicator color="#0f766e" />
                ) : (
                  <CalendarPlus size={29} color="#0f766e" />
                )}
                <Text style={styles.emptyTitle}>
                  {loading ? 'Loading appointments…' : 'No upcoming appointment'}
                </Text>
                <Text style={styles.emptyCopy}>
                  Book a consultation whenever you need care.
                </Text>
              </View>
            )}

            <View style={styles.miniMetrics}>
              {[
                { label: 'Upcoming', value: appointments.length },
                { label: 'Reports', value: reportsCount },
                { label: 'Bills', value: bills.length },
              ].map(metric => (
                <View key={metric.label} style={styles.metric}>
                  <Text style={styles.metricValue}>{loading ? '—' : metric.value}</Text>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onOpenAppointments}
              style={styles.footerLink}>
              <Text style={styles.careLinkText}>View appointments</Text>
              <ArrowUpRight size={16} color="#0f766e" />
            </TouchableOpacity>
          </View> : null}

          {showBilling ? <View style={[styles.sectionCard, styles.billingCard, wide && styles.halfSection]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderCopy}>
                <Text style={styles.billingEyebrow}>BILLING OVERVIEW</Text>
                <Text style={styles.sectionTitle}>Recent payments</Text>
                <Text style={styles.sectionSubtitle}>
                  A clear summary of your latest bills and payments.
                </Text>
              </View>
              <View style={styles.billingBadge}>
                <ReceiptText size={21} color="#ffffff" />
              </View>
            </View>

            <View style={styles.billingSummaryRow}>
              <View style={styles.billedBox}>
                <Text style={styles.billingStatLabel}>TOTAL BILLED</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={styles.billingStatValue}>
                  {loading ? '—' : formatMoney(totalBilled)}
                </Text>
                <Text style={styles.billingStatSub}>Across {bills.length} recent bills</Text>
              </View>
              <View style={styles.outstandingBox}>
                <Text style={styles.billingStatLabel}>OUTSTANDING</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={styles.billingStatValue}>
                  {loading ? '—' : formatMoney(outstanding)}
                </Text>
                <Text style={styles.outstandingSub}>{paidBills} bills fully paid</Text>
              </View>
            </View>

            <View style={styles.progressCard}>
              <View style={styles.progressTitleRow}>
                <View style={styles.progressLabelRow}>
                  <CheckCircle2 size={16} color="#059669" />
                  <Text style={styles.progressTitle}>Payment progress</Text>
                </View>
                <Text style={styles.progressPercent}>{loading ? '—' : `${paidPercent}%`}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${loading ? 0 : paidPercent}%` }]} />
              </View>
              <View style={styles.progressFooter}>
                <Text style={styles.progressFootText}>Paid {formatMoney(totalPaid)}</Text>
                <Text style={styles.progressFootText}>{Math.max(0, bills.length - paidBills)} pending</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onOpenBilling}
              style={styles.footerLink}>
              <Text style={styles.billingLinkText}>View billing history</Text>
              <ArrowUpRight size={16} color="#b45309" />
            </TouchableOpacity>
          </View> : null}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 16, paddingBottom: 28, gap: 16 },
  wideContent: { paddingHorizontal: 24, paddingTop: 22, gap: 19 },
  greetingSection: { marginBottom: 0 },
  welcomeText: { color: '#0f172a', fontSize: 20, fontWeight: '800' },
  welcomeName: { color: '#0f172a', fontWeight: '800' },
  greetingSubtitle: { color: '#64748b', fontSize: 13, marginTop: 4 },
  todayDateCard: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: '#99f6e4', backgroundColor: '#f0fdfa' },
  todayIconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' },
  todayTextCol: { flex: 1 },
  todayBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  greenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#0d9488' },
  todayBadgeText: { color: '#0d9488', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  todayDateText: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  errorCard: { padding: 13, borderRadius: 13, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff7f7', gap: 8 },
  errorText: { color: '#b91c1c', fontSize: 12, lineHeight: 17 },
  retryButton: { alignSelf: 'flex-start', paddingVertical: 4 },
  retryText: { color: '#0f766e', fontSize: 12, fontWeight: '800' },
  bookingBanner: { padding: 16, borderRadius: 19, borderWidth: 1, borderColor: '#bdece5', backgroundColor: '#ecfdf9', gap: 14 },
  bookingBannerWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  bookingCopy: { flex: 1 },
  bannerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerTitle: { color: '#0f172a', fontSize: 17, fontWeight: '800' },
  bannerSubtitle: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 6 },
  findDoctorButton: { minHeight: 44, paddingHorizontal: 14, borderRadius: 11, backgroundColor: '#0f766e', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  findDoctorButtonWide: { minWidth: 190, alignSelf: 'center' },
  findDoctorText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  statCard: { minHeight: 116, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', padding: 12, justifyContent: 'space-between', elevation: 1, shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  statTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 },
  statTitle: { color: '#64748b', fontSize: 11, fontWeight: '700', flex: 1, lineHeight: 15 },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: '#0f172a', fontSize: 25, fontWeight: '900', marginTop: 5 },
  statLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  statLinkText: { fontSize: 11, fontWeight: '700' },
  sectionsRow: { gap: 15 },
  sectionsRowWide: { flexDirection: 'row', alignItems: 'stretch' },
  halfSection: { flex: 1 },
  sectionCard: { borderRadius: 23, borderWidth: 1, padding: 16, overflow: 'hidden', elevation: 2, shadowColor: '#0f172a', shadowOpacity: 0.045, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  careCard: { backgroundColor: '#f5fdfa', borderColor: '#cceee7' },
  billingCard: { backgroundColor: '#fffcf5', borderColor: '#f6e5b7' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 15 },
  sectionHeaderCopy: { flex: 1 },
  careEyebrow: { color: '#0f766e', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  billingEyebrow: { color: '#b45309', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  sectionTitle: { color: '#0f172a', fontSize: 19, fontWeight: '900', marginTop: 3 },
  sectionSubtitle: { color: '#64748b', fontSize: 11, lineHeight: 16, marginTop: 4 },
  careBadge: { width: 43, height: 43, borderRadius: 14, backgroundColor: '#0f766e', alignItems: 'center', justifyContent: 'center' },
  billingBadge: { width: 43, height: 43, borderRadius: 14, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' },
  nextVisitCard: { padding: 13, borderRadius: 16, borderWidth: 1, borderColor: '#cceee7', backgroundColor: '#ffffff', marginBottom: 12 },
  visitTopRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  doctorIcon: { width: 39, height: 39, borderRadius: 12, backgroundColor: '#ecfeff', alignItems: 'center', justifyContent: 'center' },
  visitDoctorCopy: { flex: 1, minWidth: 0 },
  doctorName: { color: '#0f172a', fontSize: 14, fontWeight: '800' },
  specialization: { color: '#64748b', fontSize: 11, marginTop: 3 },
  statusBadge: { color: '#047857', backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, overflow: 'hidden', textTransform: 'capitalize', fontSize: 9, fontWeight: '800', maxWidth: 90 },
  visitDetails: { borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 11, paddingTop: 10, gap: 7 },
  visitDateRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  visitDateText: { color: '#334155', fontSize: 11, fontWeight: '700', flex: 1 },
  clinicName: { color: '#64748b', fontSize: 11 },
  emptyAppointment: { minHeight: 132, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#bde3dc', backgroundColor: '#ffffffaa', alignItems: 'center', justifyContent: 'center', padding: 15, marginBottom: 12 },
  emptyTitle: { color: '#1e293b', fontSize: 14, fontWeight: '800', marginTop: 8 },
  emptyCopy: { color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 4, lineHeight: 16 },
  miniMetrics: { flexDirection: 'row', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7f2ef', borderRadius: 13, paddingVertical: 10, marginBottom: 12 },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { color: '#0f172a', fontSize: 17, fontWeight: '900' },
  metricLabel: { color: '#64748b', fontSize: 10, fontWeight: '600', marginTop: 2 },
  footerLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingVertical: 2 },
  careLinkText: { color: '#0f766e', fontSize: 12, fontWeight: '800' },
  billingLinkText: { color: '#b45309', fontSize: 12, fontWeight: '800' },
  billingSummaryRow: { flexDirection: 'row', gap: 9 },
  billedBox: { flex: 1, borderRadius: 15, borderWidth: 1, borderColor: '#f5df9e', backgroundColor: '#ffffff', padding: 12 },
  outstandingBox: { flex: 1, borderRadius: 15, borderWidth: 1, borderColor: '#bbf7d0', backgroundColor: '#ffffff', padding: 12 },
  billingStatLabel: { color: '#64748b', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  billingStatValue: { color: '#0f172a', fontSize: 20, fontWeight: '900', marginTop: 8 },
  billingStatSub: { color: '#64748b', fontSize: 9, marginTop: 5 },
  outstandingSub: { color: '#047857', fontSize: 9, marginTop: 5 },
  progressCard: { borderRadius: 15, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', padding: 13, marginTop: 11, marginBottom: 12 },
  progressTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressTitle: { color: '#334155', fontSize: 11, fontWeight: '800' },
  progressPercent: { color: '#0f172a', fontSize: 12, fontWeight: '900' },
  progressTrack: { height: 8, borderRadius: 5, backgroundColor: '#f1f5f9', overflow: 'hidden', marginTop: 11 },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: '#10b981' },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
  progressFootText: { color: '#64748b', fontSize: 9 },
});

export default PatientDashboardScreen;
