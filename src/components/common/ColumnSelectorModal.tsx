// src/components/common/ColumnSelectorModal.tsx
import React, { memo, useMemo } from 'react';
import { AppModal } from './AppModal';
import { ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
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
                  <Columns color="#0D9488" size={16} style={{ marginRight: 8 }} />
                  <Text style={styles.dropdownTitle}>{title}</Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Close"
                >
                  <X size={16} color="#64748B" />
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
              <ScrollView
                style={styles.optionsList}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                <View style={{ paddingVertical: 4 }}>
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
                          {isChecked && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
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
              </ScrollView>

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
    padding: 20,
  },
  dropdownCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  dropdownSubheader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  dropdownSubtitle: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  resetText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0D9488',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  optionsList: {
    maxHeight: 380,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 6,
    marginHorizontal: 8,
    marginVertical: 1,
  },
  checkboxRowSelected: {
    backgroundColor: '#F0FDFA',
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxChecked: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  checkboxLabelActive: {
    color: '#0F172A',
    fontWeight: '600',
  },
  dropdownFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  activeCountText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  doneBtn: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  doneBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
