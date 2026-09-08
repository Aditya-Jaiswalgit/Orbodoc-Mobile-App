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
import {
  BellNotificationIcon,
  BillingCardIcon,
  CalendarIcon,
  DashboardIcon,
  LabTubeIcon,
  MedicinePillIcon,
  PatientUserIcon,
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
  const { modules, loading, refreshing, onRefresh } = useNurseDashboard();

  const renderModuleIcon = (id: string, size = 22) => {
    switch (id) {
      case 'patients':
        return <PatientUserIcon color="#0d9488" size={size} />;
      case 'appointments':
      case 'book_appointment':
        return <CalendarIcon color="#0d9488" size={size} />;
      case 'treatment_billing':
      case 'medicine_billing':
        return <BillingCardIcon color="#0d9488" size={size} />;
      case 'lab_tests':
      case 'lab_inventory':
        return <LabTubeIcon color="#0d9488" size={size} />;
      case 'notifications':
        return <BellNotificationIcon color="#0d9488" size={size} />;
      default:
        return <DashboardIcon color="#0d9488" size={size} />;
    }
  };

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Nurse Station"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0d9488']} />
        }>
        {/* Top Hero Banner */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.shieldCircle}>
              <Text style={styles.shieldIcon}>🛡️</Text>
            </View>
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>CUSTOM WORKSPACE</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Nurse Dashboard</Text>
          <Text style={styles.heroSub}>
            Your workspace displays only the modules enabled for this role by your clinic administrator.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0d9488" style={styles.loader} />
        ) : (
          <View style={styles.gridContainer}>
            {modules.map((item: NurseModuleCard) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                style={styles.cardItem}
                onPress={() => onNavigateScreen(item.screenKey)}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    {renderModuleIcon(item.id, 20)}
                  </View>
                  <Text style={styles.arrowIcon}>→</Text>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSub}>{item.subtitle}</Text>
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
  heroCard: {
    backgroundColor: '#e6fffa',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  shieldCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldIcon: {
    fontSize: 18,
  },
  badgePill: {
    backgroundColor: '#ccfbf1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#5eead4',
  },
  badgeText: {
    color: '#0f766e',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  loader: {
    marginVertical: 40,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardItem: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'space-between',
    minHeight: 120,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '700',
  },
  cardBody: {
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardSub: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
});

export default NurseDashboardScreen;
