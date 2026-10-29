import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  compactRow: { alignItems: 'flex-start', marginBottom: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radii.lg, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  compactIcon: { width: 38, height: 38, borderRadius: radii.lg },
  copy: { flex: 1, minWidth: 0 },
  title: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.title, lineHeight: typography.lineHeight.title, fontWeight: typography.weight.extrabold },
  compactTitle: { fontSize: typography.size.title, lineHeight: typography.lineHeight.title },
  subtitle: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.body, lineHeight: typography.lineHeight.body, marginTop: spacing.xxs },
  action: { flexShrink: 0, alignSelf: 'center' },
});

export default PatientPageHeading;
