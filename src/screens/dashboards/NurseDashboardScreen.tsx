import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Lock,
  Pill,
  ShieldCheck,
  TestTube,
  UserCog,
  Users,
  Video,
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { useAuthContext } from '../../context/AuthContext';
import { canUseStaffScreen } from '../../navigation/staffAccess';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

interface QuickModuleItem {
  id: string;
  label: string;
  description: string;
  icon: React.FC<{ size?: number; color?: string }>;
}

export const NurseDashboardScreen: React.FC<Props> = ({
  onOpenDrawer,
  onOpenNotifications,
  onNavigateScreen = () => {},
}) => {
  const { role, user, permissionsMap = {} } = useAuthContext();
  const currentRole = role || 'nurse';
  const roleDisplayTitle = currentRole.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Define candidate modules that can appear on custom/nurse workspace
  const allModules: QuickModuleItem[] = useMemo(
    () => [
      {
        id: 'patients',
        label: 'Patients',
        description: 'Open patients module',
        icon: Users,
      },
      {
        id: 'appointments',
        label: 'Appointments',
        description: 'Open appointments module',
        icon: Calendar,
      },
      {
        id: 'book_appointment',
        label: 'Book Appointment',
        description: 'Schedule in-person or online consultation',
        icon: Calendar,
      },
      {
        id: 'video_services',
        label: 'Video Services',
        description: 'Open video services module',
        icon: Video,
      },
      {
        id: 'treatment_billing',
        label: 'Treatment Billing',
        description: 'Open treatment billing module',
        icon: CreditCard,
      },
      {
        id: 'medicine_billing',
        label: 'Medicine Billing',
        description: 'Open medicine billing module',
        icon: CreditCard,
      },
      {
        id: 'pharmacy_inventory',
        label: 'Medicines',
        description: 'Open medicines module',
        icon: Pill,
      },
      {
        id: 'lab_management',
        label: 'Lab Management',
        description: 'Open lab profile management',
        icon: Building2,
      },
      {
        id: 'lab_tests',
        label: 'Lab Tests',
        description: 'Open lab tests module',
        icon: TestTube,
      },
      {
        id: 'lab_reports',
        label: 'Lab Reports',
        description: 'Open verified lab reports',
        icon: TestTube,
      },
      {
        id: 'clinics',
        label: 'Clinic Management',
        description: 'Open clinic management module',
        icon: Building2,
      },
      {
        id: 'staff',
        label: 'User Management',
        description: 'Open user & role management',
        icon: UserCog,
      },
    ],
    []
  );

  // Filter dynamically based on backend permissionsMap
  const quickLinks = useMemo(() => {
    return allModules.filter((mod) => canUseStaffScreen(currentRole, permissionsMap, mod.id));
  }, [allModules, currentRole, permissionsMap]);

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title={`${roleDisplayTitle} Dashboard`}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── 1. CUSTOM WORKSPACE HERO BANNER (Exact Web Parity) ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroIconBox}>
              <ShieldCheck size={28} color="#FFFFFF" />
            </View>
            <View style={styles.heroTextCol}>
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeText}>CUSTOM WORKSPACE</Text>
              </View>
              <Text style={styles.heroTitle}>{roleDisplayTitle} Dashboard</Text>
              <Text style={styles.heroSubtitle}>
                Your workspace displays only the modules enabled for this role by your clinic
                administrator.
              </Text>
            </View>
          </View>
        </View>

        {/* ── 2. QUICK ACCESS MODULES GRID ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Available Modules</Text>
          <Text style={styles.sectionCount}>
            {quickLinks.length} {quickLinks.length === 1 ? 'module' : 'modules'} active
          </Text>
        </View>

        {quickLinks.length > 0 ? (
          <View style={styles.moduleGrid}>
            {quickLinks.map((item) => {
              const IconComp = item.icon;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.moduleCard}
                  activeOpacity={0.7}
                  onPress={() => onNavigateScreen(item.id)}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.moduleIconCircle}>
                      <IconComp size={22} color="#0D9488" />
                    </View>
                    <View style={styles.arrowCircle}>
                      <ArrowRight size={16} color="#94A3B8" />
                    </View>
                  </View>
                  <Text style={styles.cardTitle}>{item.label}</Text>
                  <Text style={styles.cardSubtitle}>{item.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          /* Empty Access State (Exact Web Parity) */
          <View style={styles.emptyCard}>
            <View style={styles.lockCircle}>
              <Lock size={32} color="#0D9488" />
            </View>
            <Text style={styles.emptyBadge}>ACCESS NOT CONFIGURED</Text>
            <Text style={styles.emptyTitle}>No modules are available yet</Text>
            <Text style={styles.emptySubtitle}>
              Your role does not currently have permission to view any modules. Please contact your
              clinic administrator to request the access you need.
            </Text>
            <View style={styles.emptyNoticeBox}>
              <CheckCircle2 size={16} color="#0D9488" style={{ marginTop: 2 }} />
              <Text style={styles.emptyNoticeText}>
                Ask your administrator to enable the required{' '}
                <Text style={{ fontWeight: '700' }}>View</Text> permissions from Role Permissions.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroTextCol: {
    flex: 1,
  },
  badgeWrap: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F766E',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moduleCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  moduleIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  lockCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  emptyBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F766E',
    letterSpacing: 1,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  emptyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    gap: 8,
  },
  emptyNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#0F766E',
    lineHeight: 17,
  },
});

export default NurseDashboardScreen;
