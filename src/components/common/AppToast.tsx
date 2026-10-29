import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import type { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { colors, radii, shadows, spacing, typography } from '../../theme/tokens';

type ToastType = 'success' | 'error' | 'info';

export type AppToastNotice = { title: string; message?: string };

const palette: Record<ToastType, { accent: string; title: string }> = {
  success: { accent: colors.success, title: '#166534' },
  error: { accent: colors.destructive, title: colors.destructiveDark },
  info: { accent: colors.primary, title: colors.primaryDark },
};

type AppToastCardProps = Pick<
  ToastConfigParams<unknown>,
  'type' | 'text1' | 'text2' | 'hide'
>;

function AppToastCard({ type, text1, text2, hide }: AppToastCardProps) {
  const tone = palette[(type in palette ? type : 'info') as ToastType];

  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: tone.accent }]} />
      <View style={styles.content}>
        {!!text1 && <Text style={[styles.title, { color: tone.title }]} numberOfLines={1}>{text1}</Text>}
        {!!text2 && <Text style={styles.message} numberOfLines={2}>{text2}</Text>}
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPress={() => hide()}
        style={styles.closeButton}
      >
        <X size={18} color={colors.muted} />
      </TouchableOpacity>
    </View>
  );
}

export const appToastConfig: ToastConfig = {
  success: props => <AppToastCard {...props} />,
  error: props => <AppToastCard {...props} />,
  info: props => <AppToastCard {...props} />,
};

export function AppToastOverlay({
  notice,
  onDismiss,
}: {
  notice: AppToastNotice | null;
  onDismiss: () => void;
}) {
  if (!notice) return null;
  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View pointerEvents="auto">
        <AppToastCard
          type="success"
          text1={notice.title}
          text2={notice.message}
          hide={onDismiss}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: spacing.xxxl,
    left: 0,
    right: 0,
    zIndex: 10000,
    elevation: 10000,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '92%',
    minHeight: 64,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.elevated,
  },
  accent: { width: 4, alignSelf: 'stretch' },
  content: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  title: { fontFamily: typography.family, fontSize: typography.size.body, fontWeight: typography.weight.bold },
  message: { fontFamily: typography.family, marginTop: spacing.xxs, color: colors.muted, fontSize: typography.size.sm, lineHeight: typography.lineHeight.compact },
  closeButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
});
