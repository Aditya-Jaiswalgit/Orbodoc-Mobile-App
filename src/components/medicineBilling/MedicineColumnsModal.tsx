import React from 'react';
import {
  Modal,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export type MedicineColumnKey =
  | 'billNumber'
  | 'patientName'
  | 'patientPhone'
  | 'patientCode'
  | 'subtotal'
  | 'tax'
  | 'totalAmount'
  | 'paid'
  | 'paymentMethod'
  | 'status'
  | 'date'
  | 'pharmacist'
  | 'actions';

export interface MedicineColumnVisibilityState {
  billNumber: boolean;
  patientName: boolean;
  patientPhone: boolean;
  patientCode: boolean;
  subtotal: boolean;
  tax: boolean;
  totalAmount: boolean;
  paid: boolean;
  paymentMethod: boolean;
  status: boolean;
  date: boolean;
  pharmacist: boolean;
  actions: boolean;
}

interface Props {
  visible: boolean;
  columns: MedicineColumnVisibilityState;
  onClose: () => void;
  onToggleColumn: (key: MedicineColumnKey) => void;
  anchorY?: number;
}

const COLUMN_ITEMS: Array<{ key: MedicineColumnKey; label: string }> = [
  { key: 'billNumber', label: 'Bill Number' },
  { key: 'patientName', label: 'Patient Name' },
  { key: 'patientPhone', label: 'Patient Phone' },
  { key: 'patientCode', label: 'Patient Code' },
  { key: 'subtotal', label: 'Subtotal' },
  { key: 'tax', label: 'Tax' },
  { key: 'totalAmount', label: 'Total Amount' },
  { key: 'paid', label: 'Paid' },
  { key: 'paymentMethod', label: 'Payment Method' },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Date' },
  { key: 'pharmacist', label: 'Pharmacist' },
  { key: 'actions', label: 'Actions' },
];

export const MedicineColumnsModal: React.FC<Props> = ({
  visible,
  columns,
  onClose,
  onToggleColumn,
  anchorY,
}) => {
  const screenHeight = Dimensions.get('window').height;
  const popoverPosition = anchorY === undefined ? { bottom: 88 } : { bottom: Math.max(12, screenHeight - anchorY + 30) };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.modalContainer, popoverPosition]}>
          {/* Header matching Screenshot 2 */}
          <View style={styles.header}>
            <Text style={styles.title}>Show / Hide Columns</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            {COLUMN_ITEMS.map((item) => {
              const isChecked = columns[item.key];
              return (
                <TouchableOpacity
                  key={item.key}
                  style={styles.itemRow}
                  activeOpacity={0.7}
                  onPress={() => onToggleColumn(item.key)}>
                  <View style={styles.checkCol}>
                    {isChecked ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>
                  <Text style={[styles.itemLabel, isChecked && styles.itemLabelActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 300,
    maxHeight: '68%',
    position: 'absolute',
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  listContainer: {
    maxHeight: 360,
    paddingVertical: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  checkCol: {
    width: 20,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  itemLabel: {
    fontSize: 13,
    color: '#475569',
  },
  itemLabelActive: {
    color: '#0f172a',
    fontWeight: '600',
  },
});
