import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { MedicineBill } from '../../api/medicineBillApi';
import { ChevronDownIcon, EditBillDollarIcon } from '../common/CustomIcons';

interface Props {
  visible: boolean;
  bill: MedicineBill | null;
  onClose: () => void;
  onSave: (id: number, data: Partial<MedicineBill>) => Promise<boolean>;
}

export const EditMedicineBillModal: React.FC<Props> = ({
  visible,
  bill,
  onClose,
  onSave,
}) => {
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [paidAmount, setPaidAmount] = useState('0');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [taxAmount, setTaxAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Online'>('Cash');
  const [status, setStatus] = useState<'pending' | 'paid' | 'partial' | 'cancelled'>('pending');
  const [notes, setNotes] = useState('');

  // Dropdown states
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  useEffect(() => {
    if (!visible || !bill) return;

    setShowPaymentDropdown(false);
    setShowStatusDropdown(false);

    setPaidAmount(String(bill.paid_amount ?? '0'));
    setDiscountAmount(String(bill.discount_amount ?? '0'));
    setTaxAmount(String(bill.tax_amount ?? '0'));

    const pm = (bill.payment_method || (bill as any).payment_mode || 'Cash').toLowerCase();
    if (pm === 'upi') setPaymentMethod('UPI');
    else if (pm === 'card') setPaymentMethod('Card');
    else if (pm === 'online') setPaymentMethod('Online');
    else setPaymentMethod('Cash');

    const st = (bill.payment_status || bill.status || 'pending').toLowerCase();
    if (st === 'paid' || st === 'settled') setStatus('paid');
    else if (st === 'partial' || st === 'partially_paid') setStatus('partial');
    else if (st === 'cancelled' || st === 'canceled') setStatus('cancelled');
    else setStatus('pending');

    setNotes(bill.notes || (bill as any).description || '');
  }, [visible, bill]);

  if (!bill) return null;

  const totalAmt = Number(bill.total_amount || bill.net_amount || 0);

  const handleSave = async () => {
    const paidNum = parseFloat(paidAmount);
    const discNum = parseFloat(discountAmount);
    const taxNum = parseFloat(taxAmount);

    if (isNaN(paidNum) || paidNum < 0) {
      Alert.alert('Validation Error', 'Enter a valid paid amount.');
      return;
    }

    setSaving(true);
    try {
      const success = await onSave(bill.id, {
        paid_amount: paidNum,
        discount_amount: isNaN(discNum) ? 0 : discNum,
        tax_amount: isNaN(taxNum) ? 0 : taxNum,
        payment_method: paymentMethod.toLowerCase(),
        status: status,
        payment_status: status,
        notes: notes.trim(),
      });

      if (success) {
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update bill');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <EditBillDollarIcon size={20} color="#0d9488" />
                <Text style={styles.headerTitle}>Edit Medicine Bill</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* Bill & Patient Summary Card */}
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Bill Number:</Text>
                  <Text style={styles.summaryVal}>{bill.bill_number || `MB-${bill.id}`}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Patient Name:</Text>
                  <Text style={styles.summaryVal}>{bill.patient_name || 'Patient'}</Text>
                </View>
                {bill.patient_phone ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Phone:</Text>
                    <Text style={styles.summaryVal}>{bill.patient_phone}</Text>
                  </View>
                ) : null}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Bill Amount:</Text>
                  <Text style={[styles.summaryVal, { color: '#0d9488', fontWeight: '800' }]}>
                    ₹{totalAmt.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Status Selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Bill Payment Status</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowStatusDropdown(!showStatusDropdown);
                    setShowPaymentDropdown(false);
                  }}>
                  <Text style={styles.dropdownBtnText}>
                    {status === 'paid'
                      ? 'Paid'
                      : status === 'partial'
                      ? 'Partial'
                      : status === 'cancelled'
                      ? 'Cancelled'
                      : 'Pending'}
                  </Text>
                  <ChevronDownIcon size={16} color="#64748b" />
                </TouchableOpacity>

                {showStatusDropdown && (
                  <View style={styles.dropdownMenu}>
                    {(['pending', 'partial', 'paid', 'cancelled'] as const).map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[styles.dropdownItem, status === st && styles.dropdownItemActive]}
                        onPress={() => {
                          setStatus(st);
                          if (st === 'paid') {
                            setPaidAmount(String(totalAmt));
                          } else if (st === 'pending') {
                            setPaidAmount('0');
                          }
                          setShowStatusDropdown(false);
                        }}>
                        <Text style={[styles.dropdownItemText, status === st && styles.dropdownItemTextActive]}>
                          {st === 'paid'
                            ? 'Paid'
                            : st === 'partial'
                            ? 'Partial'
                            : st === 'cancelled'
                            ? 'Cancelled'
                            : 'Pending'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Payment Method Selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Payment Method</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowPaymentDropdown(!showPaymentDropdown);
                    setShowStatusDropdown(false);
                  }}>
                  <Text style={styles.dropdownBtnText}>{paymentMethod}</Text>
                  <ChevronDownIcon size={16} color="#64748b" />
                </TouchableOpacity>

                {showPaymentDropdown && (
                  <View style={styles.dropdownMenu}>
                    {(['Cash', 'UPI', 'Card', 'Online'] as const).map((pm) => (
                      <TouchableOpacity
                        key={pm}
                        style={[styles.dropdownItem, paymentMethod === pm && styles.dropdownItemActive]}
                        onPress={() => {
                          setPaymentMethod(pm);
                          setShowPaymentDropdown(false);
                        }}>
                        <Text
                          style={[styles.dropdownItemText, paymentMethod === pm && styles.dropdownItemTextActive]}>
                          {pm}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Paid Amount */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Paid Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={paidAmount}
                  onChangeText={setPaidAmount}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Discount Amount */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Discount Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={discountAmount}
                  onChangeText={setDiscountAmount}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Tax Amount */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Tax Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={taxAmount}
                  onChangeText={setTaxAmount}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Notes */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={3}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Optional billing remarks or notes..."
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </ScrollView>

            {/* Actions Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={saving}
                activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}>
                {saving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    overflow: 'hidden',
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  summaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
  },
  fieldGroup: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  dropdownBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0f172a',
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    marginTop: 4,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemActive: {
    backgroundColor: '#f0fdfa',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: '#0d9488',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748b',
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#0d9488',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
  },
});
