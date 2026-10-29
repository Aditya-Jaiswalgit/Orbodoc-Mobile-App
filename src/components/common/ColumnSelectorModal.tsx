import { colors, radii, spacing, typography } from '../../theme/tokens';
// src/components/common/ColumnSelectorModal.tsx
import React, { memo, useMemo } from 'react';
import { AppModal } from './AppModal';
import { StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { LiquidBorderScrollView } from './LiquidBorderScrollView';
import { Check, Columns, X } from 'lucide-react-native';

export interface ColumnOption<K extends string = string> {
  key: K;
  label: string;
  defaultVisible?: boolean;
}

export interface ColumnSelectorModalProps<K extends string = string> {
  visible: boolean;
  onClose: () => void;
  columns: Array<ColumnOption<K>>;
  visibleColumns: Record<K, boolean>;
  onToggleColumn: (key: K) => void;
  onReset?: () => void;
  title?: string;
  subtitle?: string;
}

export const ColumnSelectorModal = memo(function ColumnSelectorModal<K extends string = string>({
  visible,
  onClose,
  columns,
  visibleColumns,
  onToggleColumn,
  onReset,
  title = 'Show / Hide Columns',
  subtitle = 'Toggle columns to show or hide in the list',
}: ColumnSelectorModalProps<K>) {
  const visibleCount = useMemo(() => {
    return columns.filter((col) => Boolean(visibleColumns[col.key])).length;
  }, [columns, visibleColumns]);

  return (
    <AppModal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.dropdownCard}>
              {/* Header */}
              <View style={styles.dropdownHeader}>
                <View style={styles.headerTitleRow}>
                  <Columns color={colors.primary} size={16} style={{ marginRight: spacing.sm }} />
                  <Text style={styles.dropdownTitle}>{title}</Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Close"
                >
                  <X size={16} color={colors.muted} />
                </TouchableOpacity>
              </View>

              {/* Subheader & Reset */}
              <View style={styles.dropdownSubheader}>
                <Text style={styles.dropdownSubtitle}>{subtitle}</Text>
                {onReset && (
                  <TouchableOpacity onPress={onReset} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Text style={styles.resetText}>Reset</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Divider */}
              <View style={styles.dropdownDivider} />

              {/* Column Options List */}
              <LiquidBorderScrollView
                style={styles.optionsList}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                <View style={{ paddingVertical: spacing.xs }}>
                  {columns.map((column) => {
                    const isChecked = Boolean(visibleColumns[column.key]);
                    return (
                      <TouchableOpacity
                        key={column.key}
                        style={[
                          styles.checkboxRow,
                          isChecked && styles.checkboxRowSelected,
                        ]}
                        onPress={() => onToggleColumn(column.key)}
                        activeOpacity={0.65}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isChecked }}
                        accessibilityLabel={column.label}
                      >
                        <View
                          style={[
                            styles.checkboxBox,
                            isChecked && styles.checkboxBoxChecked,
                          ]}
                        >
                          {isChecked && <Check size={12} color={colors.surface} strokeWidth={3} />}
                        </View>
                        <Text
                          style={[
                            styles.checkboxLabel,
                            isChecked && styles.checkboxLabelActive,
                          ]}
                        >
                          {column.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </LiquidBorderScrollView>

              {/* Footer */}
              <View style={styles.dropdownFooter}>
                <Text style={styles.activeCountText}>
                  {visibleCount} of {columns.length} visible
                </Text>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={onClose}
                  activeOpacity={0.8}
                  accessibilityLabel="Done"
                >
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </AppModal>
  );
}) as <K extends string = string>(props: ColumnSelectorModalProps<K>) => React.ReactElement | null;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dropdownCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
    paddingBottom: spacing.tiny,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownTitle: {
    fontFamily: typography.family, fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  dropdownSubheader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: 10,
  },
  dropdownSubtitle: {
    fontFamily: typography.family, fontSize: typography.size.xs,
    color: colors.muted,
    flex: 1,
    marginRight: spacing.sm,
  },
  resetText: {
    fontFamily: typography.family, fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: colors.secondary,
  },
  optionsList: {
    maxHeight: 380,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.sm,
    marginHorizontal: spacing.sm,
    marginVertical: 1,
  },
  checkboxRowSelected: {
    backgroundColor: colors.mint,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: colors.surface,
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.foreground,
  },
  checkboxLabelActive: {
    color: colors.text,
    fontWeight: typography.weight.semibold,
  },
  dropdownFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.secondary,
    backgroundColor: colors.background,
  },
  activeCountText: {
    fontFamily: typography.family, fontSize: typography.size.xs,
    color: colors.muted,
    fontWeight: typography.weight.medium,
  },
  doneBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.tiny,
    borderRadius: radii.sm,
  },
  doneBtnText: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.surface,
  },
});
