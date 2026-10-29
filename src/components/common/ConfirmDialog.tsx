import { colors, radii, spacing, typography } from '../../theme/tokens';
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X } from 'lucide-react-native';
import { AppModal } from './AppModal';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  detail?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmAccessibilityLabel?: string;
  cancelAccessibilityLabel?: string;
}

const VARIANT_CONFIG: Record<
  ConfirmDialogVariant,
  {
    icon: typeof AlertTriangle;
    iconColor: string;
    iconBg: string;
    confirmBtnBg: string;
  }
> = {
  danger: {
    icon: AlertTriangle,
    iconColor: colors.destructive,
    iconBg: '#FEE2E2',
    confirmBtnBg: colors.destructive,
  },
  warning: {
    icon: AlertCircle,
    iconColor: colors.warning,
    iconBg: colors.warningSoft,
    confirmBtnBg: colors.warning,
  },
  info: {
    icon: Info,
    iconColor: colors.primary,
    iconBg: colors.mintBorder,
    confirmBtnBg: colors.primary,
  },
  success: {
    icon: CheckCircle2,
    iconColor: colors.success,
    iconBg: colors.successSoft,
    confirmBtnBg: colors.success,
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  detail,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
  confirmAccessibilityLabel,
  cancelAccessibilityLabel,
}) => {
  const { width } = useWindowDimensions();
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.danger;
  const IconComponent = config.icon;

  return (
    <AppModal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => {
        if (!loading) onCancel();
      }}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          if (!loading) onCancel();
        }}
      >
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, { maxWidth: Math.min(width - 32, 400) }]}>
              {/* Header with Icon, Title, and Close Button */}
              <View style={styles.headerRow}>
                <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
                  <IconComponent size={22} color={config.iconColor} />
                </View>
                <TouchableOpacity
                  onPress={onCancel}
                  disabled={loading}
                  style={styles.closeBtn}
                  accessibilityLabel="Close confirmation dialog"
                  accessibilityRole="button"
                >
                  <X size={18} color={colors.subtle} />
                </TouchableOpacity>
              </View>

              {/* Title & Message */}
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              {/* Optional Detail Box (e.g. user details or record name) */}
              {detail ? (
                typeof detail === 'string' ? (
                  <View style={styles.detailBox}>
                    <Text style={styles.detailText}>{detail}</Text>
                  </View>
                ) : (
                  detail
                )
              ) : null}

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onCancel}
                  disabled={loading}
                  accessibilityLabel={cancelAccessibilityLabel || cancelText}
                  accessibilityRole="button"
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>{cancelText}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    { backgroundColor: config.confirmBtnBg },
                    loading && styles.disabledBtn,
                  ]}
                  onPress={onConfirm}
                  disabled={loading}
                  accessibilityLabel={confirmAccessibilityLabel || confirmText}
                  accessibilityRole="button"
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <Text style={styles.confirmBtnText}>{confirmText}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </AppModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    padding: spacing.tiny,
    borderRadius: radii.md,
  },
  title: {
    fontFamily: typography.family, fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  message: {
    fontFamily: typography.family, fontSize: typography.size.body,
    color: colors.muted,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  detailBox: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  detailText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    color: colors.foreground,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.tiny,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: typography.family, fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.muted,
  },
  confirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: typography.family, fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.surface,
  },
  disabledBtn: {
    opacity: 0.7,
  },
});
