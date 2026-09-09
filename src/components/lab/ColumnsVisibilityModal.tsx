import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

export interface ColumnVisibilityState {
  testName: boolean;
  code: boolean;
  price: boolean;
  discountPrice: boolean;
  homeCollection: boolean;
  available: boolean;
  description: boolean;
  actions: boolean;
}

interface ColumnsVisibilityModalProps {
  visible: boolean;
  onClose: () => void;
  columns: ColumnVisibilityState;
  onToggleColumn: (key: keyof ColumnVisibilityState) => void;
}

const COLUMN_DEFINITIONS: { key: keyof ColumnVisibilityState; label: string }[] = [
  { key: 'testName', label: 'Test Name' },
  { key: 'code', label: 'Code' },
  { key: 'price', label: 'Price' },
  { key: 'discountPrice', label: 'Discount Price' },
  { key: 'homeCollection', label: 'Home Collection' },
  { key: 'available', label: 'Available' },
  { key: 'description', label: 'Description' },
  { key: 'actions', label: 'Actions' },
];

export const ColumnsVisibilityModal: React.FC<ColumnsVisibilityModalProps> = ({
  visible,
  onClose,
  columns,
  onToggleColumn,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.popoverCard}>
              <Text style={styles.popoverTitle}>Show / Hide Columns</Text>
              <View style={styles.divider} />

              {COLUMN_DEFINITIONS.map((item) => {
                const isChecked = columns[item.key];
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.optionRow}
                    activeOpacity={0.7}
                    onPress={() => onToggleColumn(item.key)}>
                    <View style={styles.checkIconBox}>
                      {isChecked && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                    <Text style={[styles.optionLabel, isChecked && styles.optionLabelActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  popoverCard: {
    width: '84%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  popoverTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    paddingBottom: 10,
    paddingHorizontal: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  checkIconBox: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkMark: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  optionLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  optionLabelActive: {
    color: '#0f172a',
    fontWeight: '600',
  },
});
