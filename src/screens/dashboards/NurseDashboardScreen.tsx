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
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Lock,
  Pill,
  Shield,
  ShieldCheck,
  TestTube,
  UserPlus,
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

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const staffName = String(user?.fullName || user?.full_name || '').trim();
  const todayLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Keep this list in sync with the web customRoleNav order. The dashboard
  // shows only entries allowed by the role's permissions.
  const allModules: QuickModuleItem[] = useMemo(
    () => [
      {
        id: 'clinics',
        label: 'Clinic Management',
        description: 'Open clinic management module',
        icon: Building2,
      },
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
        icon: CalendarDays,
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
        id: 'lab_tests',
        label: 'Lab Tests',
        description: 'Open lab tests module',
        icon: TestTube,
      },
      {
        id: 'lab_inventory',
        label: 'Lab Inventory',
        description: 'Open lab inventory module',
        icon: TestTube,
      },
      {
        id: 'lab_reports',
        label: 'Lab Reports',
        description: 'Open verified lab reports',
        icon: TestTube,
      },
      {
        id: 'notifications',
        label: 'Notifications',
        description: 'Open notifications',
        icon: Bell,
      },
      {
        id: 'staff',
        label: 'Create User',
        description: 'Open create user module',
        icon: UserPlus,
      },
      {
        id: 'role_permissions',
        label: 'Role Permissions',
        description: 'Open role permissions',
        icon: Shield,
      },
      {
        id: 'lab_management',
        label: 'Lab Management',
        description: 'Open lab profile management',
        icon: Building2,
      },
      {
        id: 'book_appointment',
        label: 'Book Appointment',
        description: 'Schedule in-person or online consultation',
        icon: CalendarDays,
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
        {/* ── 1. GREETING & TODAY CARD ── */}
        <View style={styles.welcomeBlock}>
          <Text style={styles.greetingTitle}>
            {greeting}{staffName ? `, ${staffName}` : ''}!
          </Text>
          <Text style={styles.greetingSubtitle}>
            Here's what's happening at your clinic today.
          </Text>
        </View>

        {/* Today Date Card */}
        <View style={styles.todayCard}>
          <View style={styles.todayIcon}>
            <CalendarDays size={22} color="#0D9488" strokeWidth={2.2} />
          </View>
          <View style={styles.todayCopy}>
            <View style={styles.todayEyebrow}>
              <View style={styles.todayDot} />
              <Text style={styles.todayLabel}>TODAY</Text>
            </View>
            <Text style={styles.todayDate}>{todayLabel}</Text>
          </View>
        </View>

        {/* ── 2. CUSTOM WORKSPACE HERO BANNER ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroIconBox}>
              <ShieldCheck size={28} color="#FFFFFF" strokeWidth={2.2} />
            </View>
            <View style={styles.heroTextCol}>
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeText}>CUSTOM WORKSPACE</Text>
              </View>
              <Text style={styles.heroTitle}>{roleDisplayTitle} Dashboard</Text>
              <Text style={styles.heroSubtitle}>
                Your workspace displays only the modules enabled for this role by your clinic administrator.
              </Text>
            </View>
          </View>
        </View>

        {/* ── 3. AVAILABLE MODULES ── */}
        {quickLinks.length > 0 ? (
          <View style={styles.moduleList}>
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
                    <ArrowRight size={18} color="#64748B" />
                  </View>
                  <Text style={styles.cardTitle}>{item.label}</Text>
                  <Text style={styles.cardSubtitle}>{item.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          /* Empty Access State */
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
    gap: 14,
  },
  welcomeBlock: {
    gap: 4,
    marginBottom: 2,
  },
  greetingTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  greetingSubtitle: {
    color: '#64748B',
    fontSize: 13,
  },
  todayCard: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#99F6E4',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0D9488',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
    marginBottom: 2,
  },
  todayIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6FFFA',
  },
  todayCopy: {
    flex: 1,
    gap: 3,
  },
  todayEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  todayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0D9488',
  },
  todayLabel: {
    color: '#0D9488',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  todayDate: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },

  // Custom Workspace Hero Banner
  heroCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 2,
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
    backgroundColor: '#E6FFFA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F766E',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },

  // Module List & Cards
  moduleList: {
    gap: 12,
  },
  moduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moduleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E6FFFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },

  // Empty Access State
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
