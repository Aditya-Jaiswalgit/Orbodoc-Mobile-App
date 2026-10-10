import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import type { ToastConfig, ToastConfigParams } from 'react-native-toast-message';

type ToastType = 'success' | 'error' | 'info';

export type AppToastNotice = { title: string; message?: string };

const palette: Record<ToastType, { accent: string; title: string }> = {
  success: { accent: '#059669', title: '#065F46' },
  error: { accent: '#DC2626', title: '#991B1B' },
  info: { accent: '#0D9488', title: '#0F766E' },
};

type AppToastCardProps = Pick<
  ToastConfigParams<unknown>,
  'type' | 'text1' | 'text2' | 'hide'
>;

function AppToastCard({ type, text1, text2, hide }: AppToastCardProps) {
  const colors = palette[(type in palette ? type : 'info') as ToastType];

  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: colors.accent }]} />
      <View style={styles.content}>
        {!!text1 && <Text style={[styles.title, { color: colors.title }]} numberOfLines={1}>{text1}</Text>}
        {!!text2 && <Text style={styles.message} numberOfLines={2}>{text2}</Text>}
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPress={() => hide()}
        style={styles.closeButton}
      >
        <X size={18} color="#64748B" />
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
    top: 36,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  accent: { width: 4, alignSelf: 'stretch' },
  content: { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  title: { fontSize: 14, fontWeight: '700' },
  message: { marginTop: 2, color: '#475569', fontSize: 12 },
  closeButton: { paddingHorizontal: 12, paddingVertical: 12 },
});
