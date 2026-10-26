import React from 'react';
import { CalendarDays } from 'lucide-react-native';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useAuthContext } from '../../context/AuthContext';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const DashboardWelcomeCard = () => {
  const { user } = useAuthContext();
  const { width } = useWindowDimensions();
  const name = user?.fullName || user?.full_name || 'User';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={[styles.container, width >= 640 && styles.containerWide]}>
      <View style={styles.copy}>
        <Text style={[styles.greeting, width >= 640 && styles.greetingWide]} numberOfLines={1}>
          {getGreeting()}, {name.trim() || 'User'}!
        </Text>
        <Text style={styles.subtitle}>Here's what's happening at your clinic today.</Text>
      </View>
      <View style={styles.todayCard}>
        <View style={styles.iconBox}><CalendarDays size={20} color="#1D7C72" /></View>
        <View style={styles.todayCopy}>
          <View style={styles.todayLabelRow}><View style={styles.dot} /><Text style={styles.todayLabel}>TODAY</Text></View>
          <Text style={[styles.date, width >= 640 && styles.dateWide]} numberOfLines={1}>{today}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginHorizontal: 16, marginTop: 4, marginBottom: 8, gap: 12 },
  containerWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  copy: { flex: 1, minWidth: 0 },
  greeting: { fontFamily: 'Inter', color: '#1D2931', fontSize: 18, fontWeight: '700' },
  greetingWide: { fontFamily: 'Inter', fontSize: 20 },
  subtitle: { fontFamily: 'Inter', color: '#6B7A85', fontSize: 14, marginTop: 4 },
  todayCard: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#CDE9E5', borderRadius: 16, backgroundColor: '#FFFFFF' },
  iconBox: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#EAF7F5' },
  todayCopy: { flex: 1, minWidth: 0 },
  todayLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#27A599' },
  todayLabel: { fontFamily: 'Inter', color: '#1D7C72', fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  date: { fontFamily: 'Inter', color: '#1D2931', fontSize: 14, fontWeight: '600' },
  dateWide: { fontFamily: 'Inter', fontSize: 16 },
});
