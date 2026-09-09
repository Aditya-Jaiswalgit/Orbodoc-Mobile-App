import React from 'react';
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
import { useAuthContext } from '../../context/AuthContext';
import {
  ArrowRightIcon,
  BellNotificationIcon,
  BillingPaymentCardIcon,
  CalendarIcon,
  LabTubeIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
  UsersIcon,
} from '../../components/common/CustomIcons';
import { useNurseDashboard, NurseModuleCard } from '../../hooks/useNurseDashboard';

interface NurseDashboardScreenProps {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const NurseDashboardScreen: React.FC<NurseDashboardScreenProps> = ({
  onOpenDrawer,
  onOpenNotifications,
  onNavigateScreen = () => {},
}) => {
  const { user } = useAuthContext();
  const { modules, loading, refreshing, onRefresh } = useNurseDashboard();

  // Dynamic Clinic Name
  const clinicName =
    user?.clinic_name ||
    user?.clinicName ||
    (user as any)?.clinics?.[0]?.name ||
    'Aarogya Care Clinic';

  // Dynamic Staff First Name
  const rawName = user?.fullName || (user as any)?.full_name || (user as any)?.name || 'anit';
  const firstName = rawName.trim().split(/\s+/)[0] || 'anit';

  // Dynamic Time of Day Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Dynamic Formatted Date matching Screenshot 1 (e.g., "Wednesday, September 9")
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const renderModuleIcon = (id: string, size = 20) => {
    switch (id) {
      case 'patients':
        return <UsersIcon color="#0d9488" size={size} />;
      case 'appointments':
      case 'book_appointment':
        return <CalendarIcon color="#0d9488" size={size} />;
      case 'treatment_billing':
      case 'medicine_billing':
        return <BillingPaymentCardIcon color="#0d9488" size={size} strokeWidth={1.8} />;
      case 'lab_tests':
      case 'lab_inventory':
        return <LabTubeIcon color="#0d9488" size={size} strokeWidth={2} />;
      case 'notifications':
        return <BellNotificationIcon color="#0d9488" size={size} />;
      default:
        return <UsersIcon color="#0d9488" size={size} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar Header matching Screenshot 1 (Hamburger, Bell, Avatar pill) */}
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        showLogo={false}
        showRolePill={false}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0d9488']} />
        }>
        {/* Clinic Branding Header matching Screenshot 1 */}
        <View style={styles.clinicHeaderSection}>
          <View style={styles.clinicNameRow}>
            <View style={styles.stethoscopeBox}>
              <StethoscopeIcon color="#ffffff" size={20} strokeWidth={2.2} />
            </View>
            <View style={styles.clinicTitleWrapper}>
              <Text style={styles.clinicTitleText}>{clinicName}</Text>
              <View style={styles.gradientUnderline}>
                <View style={styles.gradientPartTeal} />
                <View style={styles.gradientPartBlue} />
              </View>
            </View>
          </View>
        </View>

        {/* Greeting Section matching Screenshot 1 */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>
            {getGreeting()}, {firstName.toLowerCase()}!
          </Text>
          <Text style={styles.greetingSubtitle}>
            Here's what's happening at your clinic today.
          </Text>
        </View>

        {/* Date Card matching Screenshot 1 */}
        <View style={styles.dateCard}>
          <View style={styles.calendarIconBox}>
            <CalendarIcon color="#0d9488" size={20} strokeWidth={2} />
          </View>
          <View style={styles.dateInfoBox}>
            <View style={styles.todayRow}>
              <View style={styles.greenDot} />
              <Text style={styles.todayLabel}>TODAY</Text>
            </View>
            <Text style={styles.dateText}>{todayFormatted}</Text>
          </View>
        </View>

        {/* Custom Workspace Card matching Screenshot 1 */}
        <View style={styles.workspaceCard}>
          <View style={styles.workspaceHeaderRow}>
            <View style={styles.shieldBox}>
              <ShieldCheckIcon color="#ffffff" size={22} strokeWidth={2} />
            </View>
            <View style={styles.workspaceBadgePill}>
              <Text style={styles.workspaceBadgeText}>CUSTOM WORKSPACE</Text>
            </View>
          </View>

          <Text style={styles.workspaceTitle}>Nurse Dashboard</Text>
          <Text style={styles.workspaceSubtitle}>
            Your workspace displays only the modules enabled for this role by your clinic administrator.
          </Text>
        </View>

        {/* Modules Cards List matching Screenshots 1 & 2 */}
        {loading ? (
          <ActivityIndicator size="large" color="#0d9488" style={styles.loader} />
        ) : (
          <View style={styles.modulesList}>
            {modules.map((item: NurseModuleCard) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.75}
                style={styles.moduleCard}
                onPress={() => onNavigateScreen(item.screenKey)}>
                <View style={styles.moduleCardTopRow}>
                  <View style={styles.moduleIconBox}>
                    {renderModuleIcon(item.id, 20)}
                  </View>
                  <ArrowRightIcon color="#64748b" size={18} strokeWidth={2} />
                </View>

                <View style={styles.moduleCardBody}>
                  <Text style={styles.moduleCardTitle}>{item.title}</Text>
                  <Text style={styles.moduleCardSubtitle}>{item.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
  content: {
    padding: 16,
    paddingBottom: 90,
  },

  /* Clinic Branding Header matching Screenshot 1 */
  clinicHeaderSection: {
    marginBottom: 16,
    marginTop: 2,
  },
  clinicNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stethoscopeBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#14b8a6',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  clinicTitleWrapper: {
    flex: 1,
  },
  clinicTitleText: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0f766e',
    letterSpacing: -0.2,
  },
  gradientUnderline: {
    flexDirection: 'row',
    height: 3,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  gradientPartTeal: {
    flex: 2,
    backgroundColor: '#14b8a6',
  },
  gradientPartBlue: {
    flex: 1,
    backgroundColor: '#3b82f6',
  },

  /* Greeting Section matching Screenshot 1 */
  greetingSection: {
    marginBottom: 16,
  },
  greetingTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0f172a',
  },
  greetingSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },

  /* Date Card matching Screenshot 1 */
  dateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#ccfbf1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  calendarIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateInfoBox: {
    flex: 1,
    gap: 2,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0d9488',
  },
  todayLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f766e',
    letterSpacing: 0.8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },

  /* Workspace Banner Card matching Screenshot 1 */
  workspaceCard: {
    backgroundColor: '#f0fdfa',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    marginBottom: 16,
    shadowColor: '#0d9488',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  workspaceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
  },
  shieldBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0d9488',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  workspaceBadgePill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#5eead4',
  },
  workspaceBadgeText: {
    color: '#0f766e',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  workspaceTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 14,
    marginBottom: 6,
  },
  workspaceSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
  },

  loader: {
    marginVertical: 40,
  },

  /* Modules Cards List matching Screenshots 1 & 2 */
  modulesList: {
    gap: 12,
  },
  moduleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  moduleCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moduleIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleCardBody: {
    marginTop: 14,
  },
  moduleCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  moduleCardSubtitle: {
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 3,
  },
});

export default NurseDashboardScreen;
