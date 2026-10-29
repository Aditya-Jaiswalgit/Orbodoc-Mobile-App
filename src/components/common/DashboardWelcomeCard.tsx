import React from 'react';
import { CalendarDays } from 'lucide-react-native';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useAuthContext } from '../../context/AuthContext';
import { colors, radii, spacing, typography } from '../../theme/tokens';

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
        <View style={styles.iconBox}><CalendarDays size={20} color={colors.primaryDark} /></View>
        <View style={styles.todayCopy}>
          <View style={styles.todayLabelRow}><View style={styles.dot} /><Text style={styles.todayLabel}>TODAY</Text></View>
          <Text style={[styles.date, width >= 640 && styles.dateWide]} numberOfLines={1}>{today}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginHorizontal: spacing.lg, marginTop: spacing.xs, marginBottom: spacing.sm, gap: spacing.md },
  containerWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  copy: { flex: 1, minWidth: 0 },
  greeting: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  greetingWide: { fontSize: typography.size.title },
  subtitle: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.body, marginTop: spacing.xs },
  todayCard: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.mintBorder, borderRadius: radii.lg, backgroundColor: colors.surface, shadowColor: '#0d9488', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  iconBox: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.mint },
  todayCopy: { flex: 1, minWidth: 0 },
  todayLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  todayLabel: { fontFamily: typography.family, color: colors.primaryDark, fontSize: typography.size.xs, fontWeight: typography.weight.bold, letterSpacing: 1.1 },
  date: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.body, fontWeight: typography.weight.semibold },
  dateWide: { fontSize: typography.size.subtitle },
});
