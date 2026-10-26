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
    iconColor: '#DC2626',
    iconBg: '#FEE2E2',
    confirmBtnBg: '#DC2626',
  },
  warning: {
    icon: AlertCircle,
    iconColor: '#D97706',
    iconBg: '#FEF3C7',
    confirmBtnBg: '#D97706',
  },
  info: {
    icon: Info,
    iconColor: '#27A599',
    iconBg: '#CCFBF1',
    confirmBtnBg: '#27A599',
  },
  success: {
    icon: CheckCircle2,
    iconColor: '#2EB877',
    iconBg: '#DCFCE7',
    confirmBtnBg: '#2EB877',
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
                  <X size={18} color="#94A3B8" />
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
                    <ActivityIndicator size="small" color="#FFFFFF" />
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
    padding: 16,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
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
    padding: 6,
    borderRadius: 8,
  },
  title: {
    fontFamily: 'Inter', fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  message: {
    fontFamily: 'Inter', fontSize: 14,
    color: '#64748B',
    lineHeight: 21,
    marginBottom: 16,
  },
  detailBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  detailText: {
    fontFamily: 'Inter', fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Inter', fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: 'Inter', fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.7,
  },
});
