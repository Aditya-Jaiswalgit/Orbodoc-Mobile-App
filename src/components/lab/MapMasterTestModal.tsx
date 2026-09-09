import React, { useEffect, useState } from 'react';
import {
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
import { PenEditIcon } from '../common/CustomIcons';

interface MapMasterTestModalProps {
  visible: boolean;
  item: any | null;
  clinicName?: string;
  onClose: () => void;
  onSave: (payload: {
    lab_test_id: number;
    price: number;
    discount_price: number;
    home_collection_available: number;
    is_available: number;
  }) => void;
}

export const MapMasterTestModal: React.FC<MapMasterTestModalProps> = ({
  visible,
  item,
  clinicName = 'Aarogya Care Clinic',
  onClose,
  onSave,
}) => {
  const [testPrice, setTestPrice] = useState('0.00');
  const [discountPrice, setDiscountPrice] = useState('0.00');
  const [homeCollection, setHomeCollection] = useState<'Not available' | 'Available'>('Not available');
  const [clinicAvailability, setClinicAvailability] = useState<'Available' | 'Not available'>('Available');

  const [activeDropdown, setActiveDropdown] = useState<'none' | 'home' | 'avail'>('none');

  useEffect(() => {
    if (item) {
      setTestPrice(String(item.price ?? '0.00'));
      setDiscountPrice(String(item.discount_price ?? '0.00'));
      setHomeCollection(
        item.home_collection_available === 1 ? 'Available' : 'Not available'
      );
      setClinicAvailability(
        item.is_available === 0 ? 'Not available' : 'Available'
      );
    } else {
      setTestPrice('0.00');
      setDiscountPrice('0.00');
      setHomeCollection('Not available');
      setClinicAvailability('Available');
    }
    setActiveDropdown('none');
  }, [item, visible]);

  const handleSave = () => {
    if (!item) return;
    onSave({
      lab_test_id: item.id || item.lab_test_id,
      price: parseFloat(testPrice) || 0,
      discount_price: parseFloat(discountPrice) || 0,
      home_collection_available: homeCollection === 'Available' ? 1 : 0,
      is_available: clinicAvailability === 'Available' ? 1 : 0,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetContainer}>
          {/* Header matching Screenshot 5 */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconSquircle}>
                <PenEditIcon size={20} color="#ffffff" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Map master test</Text>
                <Text style={styles.headerSubtitle}>
                  Set price and availability for {clinicName}.
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContent}>
            {/* Top Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{item?.test_name || '2D Echocardiogram'}</Text>
              <Text style={styles.summarySubtitle}>
                {item?.test_code || 'ECHO'} • {item?.description || 'Ultrasound imaging of heart structure and function'}
              </Text>
              <View style={styles.pillsRow}>
                <View style={styles.pillNewMapping}>
                  <Text style={styles.pillNewMappingText}>New mapping</Text>
                </View>
              </View>
            </View>

            {/* Test Price * (Focused teal border) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Test Price <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, styles.textInputFocused]}
                value={testPrice}
                onChangeText={setTestPrice}
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
            </View>

            {/* Discount Price */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Discount Price</Text>
              <TextInput
                style={styles.textInput}
                value={discountPrice}
                onChangeText={setDiscountPrice}
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
            </View>

            {/* Home Collection */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Home Collection</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                activeOpacity={0.7}
                onPress={() =>
                  setActiveDropdown(activeDropdown === 'home' ? 'none' : 'home')
                }>
                <Text style={styles.dropdownValue}>{homeCollection}</Text>
                <Text style={styles.dropdownChevron}>⌄</Text>
              </TouchableOpacity>
              {activeDropdown === 'home' && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.dropdownOption}
                    onPress={() => {
                      setHomeCollection('Not available');
                      setActiveDropdown('none');
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        homeCollection === 'Not available' && styles.dropdownOptionSelected,
                      ]}>
                      Not available
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dropdownOption}
                    onPress={() => {
                      setHomeCollection('Available');
                      setActiveDropdown('none');
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        homeCollection === 'Available' && styles.dropdownOptionSelected,
                      ]}>
                      Available
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Clinic Availability */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Clinic Availability</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                activeOpacity={0.7}
                onPress={() =>
                  setActiveDropdown(activeDropdown === 'avail' ? 'none' : 'avail')
                }>
                <Text style={styles.dropdownValue}>{clinicAvailability}</Text>
                <Text style={styles.dropdownChevron}>⌄</Text>
              </TouchableOpacity>
              {activeDropdown === 'avail' && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.dropdownOption}
                    onPress={() => {
                      setClinicAvailability('Available');
                      setActiveDropdown('none');
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        clinicAvailability === 'Available' && styles.dropdownOptionSelected,
                      ]}>
                      Available
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dropdownOption}
                    onPress={() => {
                      setClinicAvailability('Not available');
                      setActiveDropdown('none');
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        clinicAvailability === 'Not available' && styles.dropdownOptionSelected,
                      ]}>
                      Not available
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.7}
              onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              activeOpacity={0.8}
              onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Mapping</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconSquircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '700',
  },
  formContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  summarySubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
    lineHeight: 16,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  pillNewMapping: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillNewMappingText: {
    color: '#334155',
    fontSize: 11.5,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    color: '#0f172a',
  },
  textInputFocused: {
    borderColor: '#0d9488',
    borderWidth: 1.5,
  },
  dropdownBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: {
    fontSize: 14,
    color: '#0f172a',
  },
  dropdownChevron: {
    fontSize: 16,
    color: '#64748b',
  },
  dropdownMenu: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  dropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownOptionText: {
    fontSize: 13.5,
    color: '#334155',
  },
  dropdownOptionSelected: {
    fontWeight: '700',
    color: '#0d9488',
  },
  footerRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  saveBtn: {
    flex: 1.4,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
