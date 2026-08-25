import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PatientHeader } from '../../components/common/PatientHeader';

interface NotificationsScreenProps {
  onOpenDrawer?: () => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onOpenDrawer = () => {},
}) => {
  return (
    <View style={styles.container}>
      <PatientHeader onOpenDrawer={onOpenDrawer} />

      <View style={styles.centerBox}>
        <Text style={styles.icon}>🚧</Text>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>IN PROGRESS</Text>
        </View>
        <Text style={styles.subtitle}>This module is currently under active development.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 60,
  },
  icon: { fontSize: 50, marginBottom: 14 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  badge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 12,
  },
  badgeText: { color: '#d97706', fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center' },
});

export default NotificationsScreen;
