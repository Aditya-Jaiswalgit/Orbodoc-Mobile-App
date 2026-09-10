import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowUpRightIcon,
  CalendarClockIcon,
  CalendarIcon,
  CalendarPlusIcon,
  CheckCircleIcon,
  ReportDocIcon,
} from '../../components/common/CustomIcons';
import { IndianRupee, ReceiptText } from 'lucide-react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import { useAuthContext } from '../../context/AuthContext';
import { usePatientDashboard } from '../../hooks/usePatientDashboard';
import { useTreatmentBills } from '../../hooks/useTreatmentBills';

interface PatientDashboardScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
  onNavigateProfile?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const PatientDashboardScreen: React.FC<PatientDashboardScreenProps> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
  onNavigateProfile = () => {},
  onNavigateTab = () => {},
}) => {
  const { user, token } = useAuthContext();
  const { dashboardData, refreshing, onRefresh } = usePatientDashboard(token);
  const { bills: treatmentBills } = useTreatmentBills();

  const patientName = user?.fullName || user?.full_name || 'Patient';
  const firstName = ((user as any)?.first_name || patientName.split(' ')[0] || 'Patient').toLowerCase();

  // Time-based greeting based on the signed-in patient's name.
  const currentHour = new Date().getHours();
  let timeGreeting = 'Good afternoon';
  if (currentHour < 12) {
    timeGreeting = 'Good morning';
  } else if (currentHour >= 17) {
    timeGreeting = 'Good evening';
  }

  // Formatted date string (e.g. Tuesday, September 8)
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const upcomingCount = dashboardData?.upcoming_appointments?.length || 0;
  const labReportsCount = dashboardData?.recent_lab_reports?.length || 0;

  // The dashboard endpoint is already patient-scoped. Do not accidentally show
  // another patient's bills when the generic billing endpoint is available.
  const patientId = Number((user as any)?.patient_id || (user as any)?.patient?.id || 0);
  const fallbackBills = treatmentBills.filter((bill: any) =>
    patientId > 0 && Number(bill.patient_id || bill.patient?.id || 0) === patientId,
  );
  const allBills = dashboardData?.recent_bills ?? fallbackBills;
  const billsCount = allBills.length;

  const paidBillsCount = allBills.filter(b => {
    const s = (b.payment_status || b.status || '').toLowerCase();
    return s === 'paid';
  }).length;

  const totalBilled = allBills.reduce((acc, b) => {
    return acc + Number(b.net_amount ?? (b as any).total_amount ?? 0);
  }, 0);

  const totalPaid = allBills.reduce((acc, b) => {
    const s = (b.payment_status || b.status || '').toLowerCase();
    if (s === 'paid') {
      return acc + Number(b.net_amount ?? (b as any).total_amount ?? 0);
    }
    return acc + Number((b as any).paid_amount ?? 0);
  }, 0);

  const outstanding = Math.max(0, totalBilled - totalPaid);
  const paidAmount = totalPaid;
  const progressPercent = totalBilled > 0 ? Math.round((paidAmount / totalBilled) * 100) : 0;

  return (
    <View style={styles.container}>
      <PatientHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        onNavigateProfile={onNavigateProfile}
        showLogo={false}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16b8ac']} />
        }>

        {/* 1. Patient Welcome Greeting (Photo 1) */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>
            {timeGreeting}, {firstName}!
          </Text>
          <Text style={styles.greetingSubtitle}>
            Here's what's happening at your clinic today.
          </Text>
        </View>

        {/* 2. Today Date Card (Photo 1) */}
        <LinearGradient colors={['#ffffff', '#ecfdf9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dateCard}>
          <View style={styles.dateIconBox}>
            <CalendarIcon color="#16b8ac" size={24} strokeWidth={2.25} />
          </View>
          <View style={styles.dateTextCol}>
            <View style={styles.todayTagRow}>
              <View style={styles.todayDot} />
              <Text style={styles.todayTagText}>TODAY</Text>
            </View>
            <Text style={styles.dateTextString}>{formattedDate}</Text>
          </View>
        </LinearGradient>

        {/* 3. Book Appointment Banner Card (Photo 1) */}
        <LinearGradient colors={['#f8fffe', '#dffbf7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.appointmentBannerCard}>
          <View style={styles.bannerHeaderRow}>
            <CalendarPlusIcon color="#16b8ac" size={25} strokeWidth={2.25} />
            <Text style={styles.bannerTitle}>Book an Appointment</Text>
          </View>
          <Text style={styles.bannerSubtitle}>
            Choose from all available clinics and doctors in the system.
          </Text>
          <TouchableOpacity
            style={styles.findDoctorBtn}
            activeOpacity={0.85}
            onPress={() => onNavigateTab('book_appointment')}>
            <Text style={styles.findDoctorBtnText}>Find Clinic & Doctor</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* 4. Metric Cards - Vertical Stack (Photo 1 & Photo 2) */}
        {/* Card 1: Upcoming Appointments */}
        <View style={styles.metricCard}>
          <View pointerEvents="none" style={styles.metricGlow} />
          <View style={styles.metricLeftCol}>
            <Text style={styles.metricTitle}>Upcoming Appointments</Text>
            <Text style={styles.metricValue}>{upcomingCount}</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.metricLinkRow}
              onPress={() => onNavigateTab('appointments')}>
              <Text style={styles.metricLinkText}>View details</Text>
              <ArrowUpRightIcon color="#16b8ac" size={15} strokeWidth={2.3} />
            </TouchableOpacity>
          </View>
          <View style={[styles.metricIconBox, { backgroundColor: '#f0fdfa' }]}>
            <CalendarIcon color="#16b8ac" size={28} strokeWidth={2.25} />
          </View>
        </View>

        {/* Card 2: Lab Reports */}
        <View style={styles.metricCard}>
          <View pointerEvents="none" style={styles.metricGlow} />
          <View style={styles.metricLeftCol}>
            <Text style={styles.metricTitle}>Lab Reports</Text>
            <Text style={styles.metricValue}>{labReportsCount}</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.metricLinkRow}
              onPress={() => onNavigateTab('lab_tests')}>
              <Text style={styles.metricLinkText}>View details</Text>
              <ArrowUpRightIcon color="#16b8ac" size={15} strokeWidth={2.3} />
            </TouchableOpacity>
          </View>
          <View style={[styles.metricIconBox, { backgroundColor: '#f0fdfa' }]}>
            <ReportDocIcon color="#16b8ac" size={28} strokeWidth={2.25} />
          </View>
        </View>

        {/* Card 3: Bills */}
        <View style={styles.metricCard}>
          <View pointerEvents="none" style={[styles.metricGlow, styles.metricGlowAmber]} />
          <View style={styles.metricLeftCol}>
            <Text style={styles.metricTitle}>Bills</Text>
            <Text style={styles.metricValue}>{billsCount}</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.metricLinkRow}
              onPress={() => onNavigateTab('treatment_billing')}>
              <Text style={styles.metricLinkText}>View details</Text>
              <ArrowUpRightIcon color="#16b8ac" size={15} strokeWidth={2.3} />
            </TouchableOpacity>
          </View>
          <View style={[styles.metricIconBox, { backgroundColor: '#fff4d7' }]}>
            <IndianRupee color="#ffad28" size={29} strokeWidth={2.3} />
          </View>
        </View>

        {/* Card 4: Paid Bills */}
        <View style={styles.metricCard}>
          <View pointerEvents="none" style={styles.metricGlow} />
          <View style={styles.metricLeftCol}>
            <Text style={styles.metricTitle}>Paid Bills</Text>
            <Text style={styles.metricValue}>{paidBillsCount}</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.metricLinkRow}
              onPress={() => onNavigateTab('treatment_billing')}>
              <Text style={styles.metricLinkText}>View details</Text>
              <ArrowUpRightIcon color="#16b8ac" size={15} strokeWidth={2.3} />
            </TouchableOpacity>
          </View>
          <View style={[styles.metricIconBox, { backgroundColor: '#dcfce7' }]}>
            <CheckCircleIcon color="#42c98c" size={29} strokeWidth={2.25} />
          </View>
        </View>

        {/* 5. Care Overview Section (Photo 2) */}
        <LinearGradient colors={['#ffffff', '#ffffff', '#e9fffb']} locations={[0, 0.52, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.careSectionCard}>
          <View pointerEvents="none" style={styles.careGlow} />
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderTextCol}>
              <Text style={styles.tagLabelCare}>CARE OVERVIEW</Text>
              <Text style={styles.sectionTitle}>Your next visit</Text>
              <Text style={styles.sectionSubtitle}>
                Upcoming care and health activity at a glance.
              </Text>
            </View>
            <View style={styles.careBadgeSquare}>
              <CalendarClockIcon color="#ffffff" size={27} strokeWidth={2.25} />
            </View>
          </View>

          {/* Dynamic Next Visit Card or Dashed Empty State Box */}
          {dashboardData?.upcoming_appointments && dashboardData.upcoming_appointments.length > 0 ? (
            <View style={styles.nextVisitCard}>
              <View style={styles.nextVisitHeader}>
                <Text style={styles.nextVisitDoctor}>
                  {dashboardData.upcoming_appointments[0].doctor_name || 'Doctor'}
                </Text>
                <Text style={styles.nextVisitSpec}>
                  {dashboardData.upcoming_appointments[0].specialization || 'General Physician'}
                </Text>
              </View>
              <Text style={styles.nextVisitMetaText}>
                📅 {dashboardData.upcoming_appointments[0].appointment_date} · ⏰ {dashboardData.upcoming_appointments[0].appointment_time}
              </Text>
              {dashboardData.upcoming_appointments[0].clinic_name && (
                <Text style={styles.nextVisitClinic}>
                  🏥 {dashboardData.upcoming_appointments[0].clinic_name}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.emptyStateDashedBox}>
              <CalendarPlusIcon color="#16b8ac" size={34} strokeWidth={2.2} />
              <Text style={styles.emptyTitle}>No upcoming appointment</Text>
              <Text style={styles.emptySubtext}>
                Book a consultation whenever you need care.
              </Text>
            </View>
          )}

          {/* Bottom Mini Metrics (3 Columns) */}
          <View style={styles.miniMetricsRow}>
            <View style={styles.miniMetricBox}>
              <Text style={styles.miniMetricNum}>{upcomingCount}</Text>
              <Text style={styles.miniMetricLabel}>Upcoming</Text>
            </View>
            <View style={styles.miniMetricBox}>
              <Text style={styles.miniMetricNum}>{labReportsCount}</Text>
              <Text style={styles.miniMetricLabel}>Reports</Text>
            </View>
            <View style={styles.miniMetricBox}>
              <Text style={styles.miniMetricNum}>{billsCount}</Text>
              <Text style={styles.miniMetricLabel}>Bills</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.sectionFooterLink}
            onPress={() => onNavigateTab('appointments')}>
            <View style={styles.footerLinkRow}>
              <Text style={styles.footerLinkTextEmerald}>View appointments</Text>
              <ArrowUpRightIcon color="#11aaa1" size={17} strokeWidth={2.4} />
            </View>
          </TouchableOpacity>
        </LinearGradient>

        {/* 6. Billing Overview Section (Photo 2 & Photo 3) */}
        <LinearGradient colors={['#ffffff', '#ffffff', '#fff8dd']} locations={[0, 0.52, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.billingSectionCard}>
          <View pointerEvents="none" style={styles.billingGlow} />
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderTextCol}>
              <Text style={styles.tagLabelBilling}>BILLING OVERVIEW</Text>
              <Text style={styles.sectionTitle}>Recent payments</Text>
              <Text style={styles.sectionSubtitle}>
                A clear summary of your latest bills and payments.
              </Text>
            </View>
            <View style={styles.billingBadgeSquare}>
              <ReceiptText color="#ffffff" size={27} strokeWidth={2.25} />
            </View>
          </View>

          {/* Box 1: TOTAL BILLED */}
          <View style={styles.billingTotalBilledBox}>
            <Text style={styles.billingStatLabel}>TOTAL BILLED</Text>
            <Text style={styles.billingStatValue}>₹{totalBilled}</Text>
            <Text style={styles.billingStatSub}>
              Across {billsCount} recent bill{billsCount === 1 ? '' : 's'}
            </Text>
          </View>

          {/* Box 2: OUTSTANDING (with cyan/mint border) */}
          <View style={styles.billingOutstandingBox}>
            <Text style={styles.billingStatLabel}>OUTSTANDING</Text>
            <Text style={styles.billingStatValue}>₹{outstanding}</Text>
            <Text style={styles.billingStatPaidText}>
              {paidBillsCount} bill{paidBillsCount === 1 ? '' : 's'} fully paid
            </Text>
          </View>

          {/* Box 3: Payment Progress */}
          <View style={styles.progressCard}>
            <View style={styles.progressTitleRow}>
              <View style={styles.progressLabelRow}>
                <CheckCircleIcon color="#42c98c" size={18} strokeWidth={2.25} />
                <Text style={styles.progressCheckText}>Payment progress</Text>
              </View>
              <Text style={styles.progressPercentText}>{progressPercent}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
            <View style={styles.progressFooterRow}>
              <Text style={styles.progressSubLeft}>Paid ₹{paidAmount}</Text>
              <Text style={styles.progressSubRight}>
                {outstanding === 0 ? '0 pending' : `₹${outstanding} pending`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.sectionFooterLink}
            onPress={() => onNavigateTab('treatment_billing')}>
            <View style={styles.footerLinkRow}>
              <Text style={styles.footerLinkTextAmber}>View billing history</Text>
              <ArrowUpRightIcon color="#d88b1a" size={17} strokeWidth={2.4} />
            </View>
          </TouchableOpacity>
        </LinearGradient>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fa',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  /* 1. Greeting Section */
  greetingSection: {
    marginBottom: 16,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  greetingSubtitle: {
    fontSize: 13.5,
    color: '#64748b',
    fontWeight: '400',
    lineHeight: 18,
  },

  /* 2. Today Date Card */
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf9',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#c9f5f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  dateIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#e3f8f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTextCol: {
    justifyContent: 'center',
  },
  todayTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16b8ac',
  },
  todayTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0fa79d',
    letterSpacing: 0.8,
  },
  dateTextString: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1e293b',
  },

  /* 3. Book Appointment Banner */
  appointmentBannerCard: {
    backgroundColor: '#f0fdfa',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#d2f6f2',
    padding: 16,
    marginBottom: 16,
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  findDoctorBtn: {
    backgroundColor: '#10b7aa',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  findDoctorBtnText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '700',
  },

  /* 4. Metric Cards (Vertical Full-Width Stack) */
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1.5,
    overflow: 'hidden',
  },
  metricGlow: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    right: -72,
    top: -38,
    backgroundColor: 'rgba(219, 252, 248, 0.88)',
  },
  metricGlowAmber: {
    backgroundColor: 'rgba(255, 247, 218, 0.82)',
  },
  metricLeftCol: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  metricLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16b8ac',
  },
  metricIconBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
  },
  rupeeIconText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#d88b1a',
  },

  /* 5. Care Overview Section */
  careSectionCard: {
    backgroundColor: '#f0fdfa',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#d1f6f2',
    padding: 18,
    marginVertical: 6,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: '#70ded4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  careGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    right: -95,
    top: -70,
    borderRadius: 95,
    backgroundColor: 'rgba(211, 250, 246, 0.64)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sectionHeaderTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  tagLabelCare: {
    fontSize: 11,
    fontWeight: '800',
    color: '#11aaa1',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  tagLabelBilling: {
    fontSize: 11,
    fontWeight: '800',
    color: '#d88b1a',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  careBadgeSquare: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#11aaa1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  billingBadgeSquare: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#ffad28',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Empty state box inside Care Overview */
  emptyStateDashedBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#c9f5f0',
    borderStyle: 'dashed',
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
  },

  /* Next Visit card if appointment exists */
  nextVisitCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d2f6f2',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 6,
  },
  nextVisitHeader: {
    gap: 2,
  },
  nextVisitDoctor: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  nextVisitSpec: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  nextVisitMetaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16b8ac',
    marginTop: 2,
  },
  nextVisitClinic: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },

  /* 3 Mini Metrics in Care Overview */
  miniMetricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  miniMetricBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniMetricNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  miniMetricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 3,
  },

  sectionFooterLink: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  footerLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerLinkTextEmerald: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11aaa1',
  },
  footerLinkTextAmber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#d88b1a',
  },

  /* 6. Billing Overview Section */
  billingSectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#f9e8b6',
    padding: 18,
    marginBottom: 30,
    shadowColor: '#ffd788',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  billingGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    right: -100,
    bottom: -82,
    borderRadius: 95,
    backgroundColor: 'rgba(255, 226, 141, 0.28)',
  },
  billingTotalBilledBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#f9e8b6',
    padding: 16,
    marginBottom: 10,
  },
  billingOutstandingBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#d2f6f2',
    padding: 16,
    marginBottom: 10,
  },
  billingStatLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  billingStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  billingStatSub: {
    fontSize: 12,
    color: '#64748b',
  },
  billingStatPaidText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2bad79',
  },

  /* Payment Progress Card */
  progressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
    marginBottom: 14,
  },
  progressTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCheckText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 8,
  },
  progressPercentText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#42c98c',
    borderRadius: 4,
  },
  progressFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressSubLeft: {
    fontSize: 12,
    color: '#64748b',
  },
  progressSubRight: {
    fontSize: 12,
    color: '#64748b',
  },
});

export default PatientDashboardScreen;
