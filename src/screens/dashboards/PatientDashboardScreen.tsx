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
import { LiquidBorderSurface, LiquidBorderTouchable } from '../../components/common/LiquidBorderSurface';
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
      color: colors.primary,
      background: colors.mintBorder,
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
      color: colors.warning,
      background: colors.warningSoft,
      onPress: onOpenBilling,
    },
    {
      label: 'Paid Bills',
      value: paidBills,
      Icon: CheckCircle2,
      color: '#15803d',
      background: colors.successSoft,
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
            tintColor={colors.primaryDark}
            colors={[colors.primaryDark]}
          />
        }>
        <View style={styles.greetingSection}>
          <Text style={styles.welcomeText}>
            {greeting}, <Text style={styles.welcomeName}>{patientName}</Text>!
          </Text>
          <Text style={styles.greetingSubtitle}>Here's what's happening with your health today.</Text>
          <LiquidBorderSurface style={styles.todayDateCard} radius={16}>
            <View style={styles.todayIconBox}>
              <CalendarDays size={22} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.todayTextCol}>
              <View style={styles.todayBadgeRow}>
                <View style={styles.greenDot} />
                <Text style={styles.todayBadgeText}>TODAY</Text>
              </View>
              <Text style={styles.todayDateText}>{todayLabel}</Text>
            </View>
          </LiquidBorderSurface>
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
              <CalendarPlus size={20} color={colors.primaryDark} />
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
            <ArrowUpRight size={17} color={colors.surface} />
          </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.statsGrid}>
          {stats.filter(({ label }) => label === 'Upcoming Appointments' ? showAppointments : label === 'Lab Reports' ? showLabReports : showBilling).map(({ label, value, Icon, color, background, onPress }) => (
            <LiquidBorderTouchable
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
            </LiquidBorderTouchable>
          ))}
        </View>

        <View style={[styles.sectionsRow, wide && styles.sectionsRowWide]}>
          {showAppointments ? <LiquidBorderSurface style={[styles.sectionCard, styles.careCard, wide && styles.halfSection]} radius={20}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderCopy}>
                <Text style={styles.careEyebrow}>CARE OVERVIEW</Text>
                <Text style={styles.sectionTitle}>Your next visit</Text>
                <Text style={styles.sectionSubtitle}>
                  Upcoming care and health activity at a glance.
                </Text>
              </View>
              <View style={styles.careBadge}>
                <CalendarClock size={21} color={colors.surface} />
              </View>
            </View>

            {nextAppointment ? (
              <LiquidBorderSurface style={styles.nextVisitCard} radius={16}>
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
                    <Calendar size={16} color={colors.primary} />
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
              </LiquidBorderSurface>
            ) : (
              <View style={styles.emptyAppointment}>
                {loading ? (
                  <ActivityIndicator color={colors.primaryDark} />
                ) : (
                  <CalendarPlus size={29} color={colors.primaryDark} />
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
              <ArrowUpRight size={16} color={colors.primaryDark} />
            </TouchableOpacity>
          </LiquidBorderSurface> : null}

          {showBilling ? <LiquidBorderSurface style={[styles.sectionCard, styles.billingCard, wide && styles.halfSection]} radius={20}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderCopy}>
                <Text style={styles.billingEyebrow}>BILLING OVERVIEW</Text>
                <Text style={styles.sectionTitle}>Recent payments</Text>
                <Text style={styles.sectionSubtitle}>
                  A clear summary of your latest bills and payments.
                </Text>
              </View>
              <View style={styles.billingBadge}>
                <ReceiptText size={21} color={colors.surface} />
              </View>
            </View>

            <View style={styles.billingSummaryRow}>
              <LiquidBorderSurface style={styles.billedBox} radius={14}>
                <Text style={styles.billingStatLabel}>TOTAL BILLED</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={styles.billingStatValue}>
                  {loading ? '—' : formatMoney(totalBilled)}
                </Text>
                <Text style={styles.billingStatSub}>Across {bills.length} recent bills</Text>
              </LiquidBorderSurface>
              <LiquidBorderSurface style={styles.outstandingBox} radius={14}>
                <Text style={styles.billingStatLabel}>OUTSTANDING</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={styles.billingStatValue}>
                  {loading ? '—' : formatMoney(outstanding)}
                </Text>
                <Text style={styles.outstandingSub}>{paidBills} bills fully paid</Text>
              </LiquidBorderSurface>
            </View>

            <LiquidBorderSurface style={styles.progressCard} radius={14}>
              <View style={styles.progressTitleRow}>
                <View style={styles.progressLabelRow}>
                  <CheckCircle2 size={16} color={colors.successDark} />
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
            </LiquidBorderSurface>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onOpenBilling}
              style={styles.footerLink}>
              <Text style={styles.billingLinkText}>View billing history</Text>
              <ArrowUpRight size={16} color="#b45309" />
            </TouchableOpacity>
          </LiquidBorderSurface> : null}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: 28, gap: spacing.lg },
  wideContent: { paddingHorizontal: spacing.xxl, paddingTop: 22, gap: 19 },
  greetingSection: { marginBottom: 0 },
  welcomeText: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.title, fontWeight: typography.weight.extrabold },
  welcomeName: { color: colors.text, fontWeight: typography.weight.extrabold },
  greetingSubtitle: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.caption, marginTop: spacing.xs },
  todayDateCard: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: 14, paddingVertical: 10, marginTop: spacing.lg, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.mintBorder, backgroundColor: colors.surface, shadowColor: '#0d9488', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  todayIconBox: { width: 42, height: 42, borderRadius: radii.lg, backgroundColor: colors.mintBorder, alignItems: 'center', justifyContent: 'center' },
  todayTextCol: { flex: 1 },
  todayBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.tiny, marginBottom: 3 },
  greenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  todayBadgeText: { fontFamily: typography.family, color: colors.primary, fontSize: typography.size.micro, fontWeight: typography.weight.extrabold, letterSpacing: 1.2 },
  todayDateText: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.bold },
  errorCard: { padding: 13, borderRadius: 13, borderWidth: 1, borderColor: colors.destructiveSoft, backgroundColor: '#fff7f7', gap: spacing.sm },
  errorText: { fontFamily: typography.family, color: colors.destructiveDark, fontSize: typography.size.sm, lineHeight: 17 },
  retryButton: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  retryText: { fontFamily: typography.family, color: colors.primaryDark, fontSize: typography.size.sm, fontWeight: typography.weight.extrabold },
  bookingBanner: { padding: spacing.lg, borderRadius: 19, borderWidth: 1, borderColor: '#bdece5', backgroundColor: '#ecfdf9', gap: 14 },
  bookingBannerWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.xl },
  bookingCopy: { flex: 1 },
  bannerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bannerTitle: { fontFamily: typography.family, color: colors.text, fontSize: 17, fontWeight: typography.weight.extrabold },
  bannerSubtitle: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.sm, lineHeight: 18, marginTop: spacing.tiny },
  findDoctorButton: { minHeight: 44, paddingHorizontal: 14, borderRadius: 11, backgroundColor: colors.primaryDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  findDoctorButtonWide: { minWidth: 190, alignSelf: 'center' },
  findDoctorText: { fontFamily: typography.family, color: colors.surface, fontSize: typography.size.caption, fontWeight: typography.weight.extrabold },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  statCard: { minHeight: 116, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.md, justifyContent: 'space-between', elevation: 1, shadowColor: colors.text, shadowOpacity: 0.04, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  statTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.tiny },
  statTitle: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.xs, fontWeight: typography.weight.bold, flex: 1, lineHeight: 15 },
  statIcon: { width: 34, height: 34, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: typography.family, color: colors.text, fontSize: 25, fontWeight: typography.weight.black, marginTop: 5 },
  statLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: spacing.xs },
  statLinkText: { fontFamily: typography.family, fontSize: typography.size.xs, fontWeight: typography.weight.bold },
  sectionsRow: { gap: 15 },
  sectionsRowWide: { flexDirection: 'row', alignItems: 'stretch' },
  halfSection: { flex: 1 },
  sectionCard: { borderRadius: 23, borderWidth: 1, padding: spacing.lg, overflow: 'hidden', elevation: 2, shadowColor: colors.text, shadowOpacity: 0.045, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  careCard: { backgroundColor: '#f5fdfa', borderColor: '#cceee7' },
  billingCard: { backgroundColor: '#fffcf5', borderColor: '#f6e5b7' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 15 },
  sectionHeaderCopy: { flex: 1 },
  careEyebrow: { fontFamily: typography.family, color: colors.primaryDark, fontSize: typography.size.micro, fontWeight: typography.weight.black, letterSpacing: 1.2 },
  billingEyebrow: { fontFamily: typography.family, color: '#b45309', fontSize: typography.size.micro, fontWeight: typography.weight.black, letterSpacing: 1.2 },
  sectionTitle: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.black, marginTop: 3 },
  sectionSubtitle: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.xs, lineHeight: 16, marginTop: spacing.xs },
  careBadge: { width: 43, height: 43, borderRadius: radii.lg, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  billingBadge: { width: 43, height: 43, borderRadius: radii.lg, backgroundColor: colors.warning, alignItems: 'center', justifyContent: 'center' },
  nextVisitCard: { padding: 13, borderRadius: radii.xl, borderWidth: 1, borderColor: '#cceee7', backgroundColor: colors.surface, marginBottom: spacing.md },
  visitTopRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  doctorIcon: { width: 39, height: 39, borderRadius: radii.lg, backgroundColor: '#ecfeff', alignItems: 'center', justifyContent: 'center' },
  visitDoctorCopy: { flex: 1, minWidth: 0 },
  doctorName: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.extrabold },
  specialization: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.xs, marginTop: 3 },
  statusBadge: { fontFamily: typography.family, color: '#047857', backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 20, overflow: 'hidden', textTransform: 'capitalize', fontSize: 9, fontWeight: typography.weight.extrabold, maxWidth: 90 },
  visitDetails: { borderTopWidth: 1, borderTopColor: colors.secondary, marginTop: 11, paddingTop: 10, gap: 7 },
  visitDateRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  visitDateText: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.xs, fontWeight: typography.weight.bold, flex: 1 },
  clinicName: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.xs },
  emptyAppointment: { minHeight: 132, borderRadius: radii.xl, borderWidth: 1, borderStyle: 'dashed', borderColor: '#bde3dc', backgroundColor: '#ffffffaa', alignItems: 'center', justifyContent: 'center', padding: 15, marginBottom: spacing.md },
  emptyTitle: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.body, fontWeight: typography.weight.extrabold, marginTop: spacing.sm },
  emptyCopy: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.xs, textAlign: 'center', marginTop: spacing.xs, lineHeight: 16 },
  miniMetrics: { flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: '#e7f2ef', borderRadius: 13, paddingVertical: 10, marginBottom: spacing.md },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { fontFamily: typography.family, color: colors.text, fontSize: 17, fontWeight: typography.weight.black },
  metricLabel: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.micro, fontWeight: typography.weight.semibold, marginTop: 2 },
  footerLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.xs, paddingVertical: 2 },
  careLinkText: { fontFamily: typography.family, color: colors.primaryDark, fontSize: typography.size.sm, fontWeight: typography.weight.extrabold },
  billingLinkText: { fontFamily: typography.family, color: '#b45309', fontSize: typography.size.sm, fontWeight: typography.weight.extrabold },
  billingSummaryRow: { flexDirection: 'row', gap: 9 },
  billedBox: { flex: 1, borderRadius: 15, borderWidth: 1, borderColor: '#f5df9e', backgroundColor: colors.surface, padding: spacing.md },
  outstandingBox: { flex: 1, borderRadius: 15, borderWidth: 1, borderColor: '#bbf7d0', backgroundColor: colors.surface, padding: spacing.md },
  billingStatLabel: { fontFamily: typography.family, color: colors.muted, fontSize: 9, fontWeight: typography.weight.extrabold, letterSpacing: 0.5 },
  billingStatValue: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.title, fontWeight: typography.weight.black, marginTop: spacing.sm },
  billingStatSub: { fontFamily: typography.family, color: colors.muted, fontSize: 9, marginTop: 5 },
  outstandingSub: { fontFamily: typography.family, color: '#047857', fontSize: 9, marginTop: 5 },
  progressCard: { borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 13, marginTop: 11, marginBottom: spacing.md },
  progressTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.tiny },
  progressTitle: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.xs, fontWeight: typography.weight.extrabold },
  progressPercent: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.sm, fontWeight: typography.weight.black },
  progressTrack: { height: 8, borderRadius: 5, backgroundColor: colors.secondary, overflow: 'hidden', marginTop: 11 },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: colors.success },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
  progressFootText: { fontFamily: typography.family, color: colors.muted, fontSize: 9 },
});

export default PatientDashboardScreen;
