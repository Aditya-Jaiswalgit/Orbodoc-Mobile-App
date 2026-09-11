import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MedicineBill } from '../../api/medicineBillApi';
import { CancelCircleCrossIcon, PenEditIcon } from '../common/CustomIcons';

interface Props {
  visible: boolean;
  bill: MedicineBill | null;
  onClose: () => void;
  onEdit: (bill: MedicineBill) => void;
  onCancel: (bill: MedicineBill) => void;
}

export const MedicineBillActionModal: React.FC<Props> = ({
  visible,
  bill,
  onClose,
  onEdit,
  onCancel,
}) => {
  if (!bill) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Drag Handle */}
          <View style={styles.dragHandleBox}>
            <View style={styles.dragHandle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{bill.bill_number || `Bill #${bill.id}`}</Text>
              <Text style={styles.headerSubtitle}>
                Patient: {bill.patient_name || 'Patient'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Action Options matching Screenshot 4 */}
          <View style={styles.actionsList}>
            {/* 1. Edit Bill */}
            <TouchableOpacity
              style={styles.actionItem}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                onEdit(bill);
              }}>
              <View style={styles.iconBox}>
                <PenEditIcon size={18} color="#0f172a" strokeWidth={2} />
              </View>
              <Text style={styles.actionText}>Edit bill</Text>
            </TouchableOpacity>

            {/* 2. Cancel Bill */}
            <TouchableOpacity
              style={styles.actionItem}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                onCancel(bill);
              }}>
              <View style={styles.iconBox}>
                <CancelCircleCrossIcon size={18} color="#ef4444" strokeWidth={2} />
              </View>
              <Text style={[styles.actionText, styles.actionTextCancel]}>Cancel bill</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderRadius: 20,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  dragHandleBox: {
    display: 'none',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '700',
  },
  actionsList: {
    paddingVertical: 4,
    gap: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  iconBox: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  actionTextCancel: {
    color: '#ef4444',
  },
});
