import React from 'react';
import {
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BillingCardIcon,
  CalendarIcon,
  LabTubeIcon,
} from '../../components/common/CustomIcons';
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
  const { dashboardData, loading, refreshing, onRefresh } = usePatientDashboard(token);
  const { bills: treatmentBills } = useTreatmentBills();

  const patientName = user?.fullName || user?.full_name || 'Patient';

  const upcomingCount = dashboardData?.upcoming_appointments?.length || 0;
  const labReportsCount = dashboardData?.recent_lab_reports?.length || 0;
  
  const allBills = treatmentBills.length > 0 ? treatmentBills : (dashboardData?.recent_bills || []);
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
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
        }>
        
        {/* Patient Welcome Greeting Bar */}
        <View style={styles.userGreetingRow}>
          <Text style={styles.greetingText}>Welcome back, <Text style={styles.greetingName}>{patientName}</Text></Text>
        </View>

        {/* Book Appointment Banner */}
        <View style={styles.appointmentBannerCard}>
          <View style={styles.bannerTextSection}>
            <View style={styles.bannerTitleRow}>
              <CalendarIcon color="#0f766e" size={20} />
              <Text style={styles.bannerTitle}>Book an Appointment</Text>
            </View>
            <Text style={styles.bannerSubtitle}>
              Choose from all available clinics and doctors in the system.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.findDoctorBtn}
            activeOpacity={0.85}
            onPress={() => onNavigateTab('book_appointment')}>
            <Text style={styles.findDoctorBtnText}>Find Clinic & Doctor</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Stat Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.kpiScrollView}
          contentContainerStyle={styles.kpiContainer}>
          
          {/* Card 1: Upcoming Appointments */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeaderRow}>
              <View>
                <Text style={styles.kpiTitle}>Upcoming Appointments</Text>
                <Text style={styles.kpiValue}>{upcomingCount}</Text>
              </View>
              <View style={[styles.kpiIconBox, { backgroundColor: '#e6fffa' }]}>
                <CalendarIcon color="#0d9488" size={18} />
              </View>
            </View>
            <TouchableOpacity style={styles.kpiLinkRow} onPress={() => onNavigateTab('appointments')}>
              <Text style={styles.kpiLinkText}>View details ↗</Text>
            </TouchableOpacity>
          </View>

          {/* Card 2: Lab Reports */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeaderRow}>
              <View>
                <Text style={styles.kpiTitle}>Lab Reports</Text>
                <Text style={styles.kpiValue}>{labReportsCount}</Text>
              </View>
              <View style={[styles.kpiIconBox, { backgroundColor: '#e6fffa' }]}>
                <LabTubeIcon color="#0d9488" size={18} />
              </View>
            </View>
            <TouchableOpacity style={styles.kpiLinkRow} onPress={() => onNavigateTab('lab_tests')}>
              <Text style={styles.kpiLinkText}>View details ↗</Text>
            </TouchableOpacity>
          </View>

          {/* Card 3: Bills */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeaderRow}>
              <View>
                <Text style={styles.kpiTitle}>Bills</Text>
                <Text style={styles.kpiValue}>{billsCount}</Text>
              </View>
              <View style={[styles.kpiIconBox, { backgroundColor: '#fef3c7' }]}>
                <BillingCardIcon color="#d97706" size={18} />
              </View>
            </View>
            <TouchableOpacity style={styles.kpiLinkRow} onPress={() => onNavigateTab('treatment_billing')}>
              <Text style={styles.kpiLinkText}>View details ↗</Text>
            </TouchableOpacity>
          </View>

          {/* Card 4: Paid Bills */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeaderRow}>
              <View>
                <Text style={styles.kpiTitle}>Paid Bills</Text>
                <Text style={styles.kpiValue}>{paidBillsCount}</Text>
              </View>
              <View style={[styles.kpiIconBox, { backgroundColor: '#dcfce7' }]}>
                <BillingCardIcon color="#16a34a" size={18} />
              </View>
            </View>
            <TouchableOpacity style={styles.kpiLinkRow} onPress={() => onNavigateTab('treatment_billing')}>
              <Text style={styles.kpiLinkText}>View details ↗</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* Care Overview Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.tagLabelCare}>CARE OVERVIEW</Text>
              <Text style={styles.sectionTitle}>Your next visit</Text>
              <Text style={styles.sectionSubtitle}>
                Upcoming care and health activity at a glance.
              </Text>
            </View>
            <View style={styles.careBadgeCircle}>
              <CalendarIcon color="#ffffff" size={20} />
            </View>
          </View>

          {/* Dynamic Next Visit Card or Empty State Box */}
          {dashboardData?.upcoming_appointments && dashboardData.upcoming_appointments.length > 0 ? (
            <View style={styles.nextVisitCard}>
              <View style={styles.nextVisitHeader}>
                <Text style={styles.nextVisitDoctor}>{dashboardData.upcoming_appointments[0].doctor_name || 'Doctor'}</Text>
                <Text style={styles.nextVisitSpec}>{dashboardData.upcoming_appointments[0].specialization || 'General Physician'}</Text>
              </View>
              <Text style={styles.nextVisitMetaText}>
                📅 {dashboardData.upcoming_appointments[0].appointment_date} · ⏰ {dashboardData.upcoming_appointments[0].appointment_time}
              </Text>
              {dashboardData.upcoming_appointments[0].clinic_name && (
                <Text style={styles.nextVisitClinic}>🏥 {dashboardData.upcoming_appointments[0].clinic_name}</Text>
              )}
            </View>
          ) : (
            <View style={styles.emptyStateBox}>
              <CalendarIcon color="#94a3b8" size={32} />
              <Text style={styles.emptyTitle}>No upcoming appointment</Text>
              <Text style={styles.emptySubtext}>Book a consultation whenever you need care.</Text>
            </View>
          )}

          {/* Bottom Mini Metrics Bar */}
          <View style={styles.miniMetricsRow}>
            <View style={styles.metricCol}>
              <Text style={styles.metricNum}>{upcomingCount}</Text>
              <Text style={styles.metricLabel}>Upcoming</Text>
            </View>
            <View style={styles.metricCol}>
              <Text style={styles.metricNum}>{labReportsCount}</Text>
              <Text style={styles.metricLabel}>Reports</Text>
            </View>
            <View style={styles.metricCol}>
              <Text style={styles.metricNum}>{billsCount}</Text>
              <Text style={styles.metricLabel}>Bills</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.sectionFooterLink} onPress={() => onNavigateTab('appointments')}>
            <Text style={styles.footerLinkTextEmerald}>View appointments ↗</Text>
          </TouchableOpacity>
        </View>

        {/* Billing Overview Section */}
        <View style={[styles.sectionCard, styles.sectionCardAmber]}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.tagLabelBilling}>BILLING OVERVIEW</Text>
              <Text style={styles.sectionTitle}>Recent payments</Text>
              <Text style={styles.sectionSubtitle}>
                A clear summary of your latest bills and payments.
              </Text>
            </View>
            <View style={styles.billingBadgeSquare}>
              <Text style={styles.billingBadgeIcon}>📜</Text>
            </View>
          </View>

          {/* Billing Stats Grid */}
          <View style={styles.billingGridRow}>
            <View style={styles.billingStatBox}>
              <Text style={styles.billingStatLabel}>TOTAL BILLED</Text>
              <Text style={styles.billingStatValue}>₹{totalBilled}</Text>
              <Text style={styles.billingStatSub}>Across {billsCount} recent bill{billsCount === 1 ? '' : 's'}</Text>
            </View>

            <View style={styles.billingStatBox}>
              <Text style={styles.billingStatLabel}>OUTSTANDING</Text>
              <Text style={styles.billingStatValue}>₹{outstanding}</Text>
              <Text style={styles.billingStatSub}>{paidBillsCount} bill{paidBillsCount === 1 ? '' : 's'} fully paid</Text>
            </View>
          </View>

          {/* Payment Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTitleRow}>
              <Text style={styles.progressCheckText}>✓ Payment progress</Text>
              <Text style={styles.progressPercentText}>{progressPercent}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
            <View style={styles.progressFooterRow}>
              <Text style={styles.progressSubLeft}>Paid ₹{paidAmount}</Text>
              <Text style={styles.progressSubRight}>₹{outstanding} pending</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.sectionFooterLink} onPress={() => onNavigateTab('treatment_billing')}>
            <Text style={styles.footerLinkTextAmber}>View billing history ↗</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  logoWrapper: {
    flex: 1,
  },
  logoImage: {
    width: 120,
    height: 38,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6fffa',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  walletIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  walletPlus: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  walletTextCol: {
    justifyContent: 'center',
  },
  walletLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0d9488',
    letterSpacing: 0.5,
  },
  walletAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f766e',
  },
  notificationBell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 16,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  userGreetingRow: {
    marginBottom: 12,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
  },
  greetingName: {
    color: '#059669',
    fontWeight: '800',
  },
  appointmentBannerCard: {
    backgroundColor: '#e6fffa',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  bannerTextSection: {
    marginBottom: 14,
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bannerCalendarIcon: {
    fontSize: 18,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f766e',
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  findDoctorBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  findDoctorBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  kpiScrollView: {
    marginBottom: 20,
  },
  kpiContainer: {
    gap: 12,
  },
  kpiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    width: 165,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between',
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  kpiTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  kpiIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconEmoji: {
    fontSize: 16,
  },
  kpiLinkRow: {
    marginTop: 12,
  },
  kpiLinkText: {
    fontSize: 12,
    color: '#0d9488',
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionCardAmber: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tagLabelCare: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0d9488',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  tagLabelBilling: {
    fontSize: 11,
    fontWeight: '800',
    color: '#d97706',
    letterSpacing: 0.8,
    marginBottom: 2,
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
  },
  careBadgeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  careBadgeIcon: {
    fontSize: 18,
  },
  billingBadgeSquare: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  billingBadgeIcon: {
    fontSize: 18,
  },
  emptyStateBox: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  miniMetricsRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  sectionFooterLink: {
    alignSelf: 'flex-start',
  },
  footerLinkTextEmerald: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0d9488',
  },
  footerLinkTextAmber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b45309',
  },
  billingGridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  billingStatBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  billingStatLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400e',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  billingStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  billingStatSub: {
    fontSize: 11,
    color: '#78350f',
  },
  progressContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  progressTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressCheckText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d9488',
  },
  progressPercentText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0d9488',
    borderRadius: 4,
  },
  progressFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressSubLeft: {
    fontSize: 11,
    color: '#64748b',
  },
  progressSubRight: {
    fontSize: 11,
    color: '#64748b',
  },
  nextVisitCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    marginVertical: 14,
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
    color: '#0d9488',
    marginTop: 2,
  },
  nextVisitClinic: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
});

export default PatientDashboardScreen;
