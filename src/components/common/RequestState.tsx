import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

export function RequestState({ loading, error, empty, onRetry }: {
  loading?: boolean; error?: string | null; empty?: string; onRetry?: () => void;
}) {
  if (!loading && !error && !empty) return null;
  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.message}>{error || empty}</Text>}
      {!loading && error && onRetry && (
        <TouchableOpacity onPress={onRetry} accessibilityRole="button" style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 88, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface },
  message: { color: colors.muted, fontFamily: typography.family, fontSize: typography.size.body, lineHeight: typography.lineHeight.body, textAlign: 'center' },
  retryButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.md },
  retryText: { color: colors.primaryDark, fontFamily: typography.family, fontSize: typography.size.body, fontWeight: typography.weight.bold },
});
