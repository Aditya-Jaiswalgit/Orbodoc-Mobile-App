import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PatientPageHeadingProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

/** Shared responsive heading used by patient portal tabs. */
export const PatientPageHeading: React.FC<PatientPageHeadingProps> = ({
  title,
  subtitle,
  icon,
  action,
  compact = false,
}) => (
  <View style={[styles.row, compact && styles.compactRow]}>
    <View style={[styles.icon, compact && styles.compactIcon]}>{icon}</View>
    <View style={styles.copy}>
      <Text style={[styles.title, compact && styles.compactTitle]}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
    {action ? <View style={styles.action}>{action}</View> : null}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  compactRow: { alignItems: 'flex-start', marginBottom: 14 },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E6F7F5', alignItems: 'center', justifyContent: 'center' },
  compactIcon: { width: 38, height: 38, borderRadius: 12 },
  copy: { flex: 1, minWidth: 0 },
  title: { fontFamily: 'Inter', color: '#0F172A', fontSize: 20, lineHeight: 27, fontWeight: '800' },
  compactTitle: { fontFamily: 'Inter', fontSize: 20, lineHeight: 25 },
  subtitle: { fontFamily: 'Inter', color: '#64748B', fontSize: 14, lineHeight: 18, marginTop: 2 },
  action: { flexShrink: 0, alignSelf: 'center' },
});

export default PatientPageHeading;
