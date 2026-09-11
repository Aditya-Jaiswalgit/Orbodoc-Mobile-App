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
import { LabCatalogItem } from '../../api/labApi';

interface EditClinicLabTestModalProps {
  visible: boolean;
  item: LabCatalogItem | null;
  onClose: () => void;
  onSave: (updatedItem: Partial<LabCatalogItem>) => void;
}

export const EditClinicLabTestModal: React.FC<EditClinicLabTestModalProps> = ({
  visible,
  item,
  onClose,
  onSave,
}) => {
  const [testName, setTestName] = useState('');
  const [code, setCode] = useState('');
  const [testPrice, setTestPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [homeCollection, setHomeCollection] = useState<'No' | 'Yes'>('No');
  const [available, setAvailable] = useState<'Available' | 'Unavailable'>('Available');
  const [masterStatus, setMasterStatus] = useState<'Active' | 'Inactive'>('Active');
  const [description, setDescription] = useState('');

  // Dropdown options popups
  const [activeDropdown, setActiveDropdown] = useState<'none' | 'home' | 'avail' | 'status'>('none');

  useEffect(() => {
    if (item) {
      setTestName(item.test_name || '');
      setCode(item.test_code || '');
      setTestPrice(String(item.price ?? '250'));
      setDiscountPrice(String(item.discount_price ?? '0'));
      setHomeCollection(item.home_collection_available ? 'Yes' : 'No');
      setAvailable(
        item.is_available !== false && (item.is_available as any) !== 0
          ? 'Available'
          : 'Unavailable'
      );
      setMasterStatus(
        item.status !== false && (item.status as any) !== 0
          ? 'Active'
          : 'Inactive'
      );
      setDescription(item.description || '');
    } else {
      setTestName('');
      setCode('');
      setTestPrice('250');
      setDiscountPrice('0');
      setHomeCollection('No');
      setAvailable('Available');
      setMasterStatus('Active');
      setDescription('');
    }
    setActiveDropdown('none');
  }, [item, visible]);

  const handleUpdate = () => {
    onSave({
      test_name: testName.trim(),
      test_code: code.trim() || undefined,
      price: parseFloat(testPrice) || 0,
      discount_price: parseFloat(discountPrice) || 0,
      home_collection_available: homeCollection === 'Yes' ? 1 : 0,
      is_available: available === 'Available' ? 1 : 0,
      status: masterStatus === 'Active' ? 1 : 0,
      description: description.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Edit Clinic Lab Test</Text>
              <Text style={styles.headerSubtitle}>
                Use this only when a test is not available in the master catalog.
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContent}>
            {/* Test Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Test Name <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, styles.textInputFocused]}
                value={testName}
                onChangeText={setTestName}
                placeholder="Test Name"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Code */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Code</Text>
              <TextInput
                style={styles.textInput}
                value={code}
                onChangeText={setCode}
                placeholder="Code"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
              />
            </View>

            {/* Test Price */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Test Price <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
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

            {/* Home Collection Dropdown */}
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
                      setHomeCollection('No');
                      setActiveDropdown('none');
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        homeCollection === 'No' && styles.dropdownOptionSelected,
                      ]}>
                      No
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dropdownOption}
                    onPress={() => {
                      setHomeCollection('Yes');
                      setActiveDropdown('none');
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        homeCollection === 'Yes' && styles.dropdownOptionSelected,
                      ]}>
                      Yes
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Available Dropdown */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Available</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                activeOpacity={0.7}
                onPress={() =>
                  setActiveDropdown(activeDropdown === 'avail' ? 'none' : 'avail')
                }>
                <Text style={styles.dropdownValue}>{available}</Text>
                <Text style={styles.dropdownChevron}>⌄</Text>
              </TouchableOpacity>
              {activeDropdown === 'avail' && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.dropdownOption}
                    onPress={() => {
                      setAvailable('Available');
                      setActiveDropdown('none');
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        available === 'Available' && styles.dropdownOptionSelected,
                      ]}>
                      Available
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dropdownOption}
                    onPress={() => {
                      setAvailable('Unavailable');
                      setActiveDropdown('none');
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        available === 'Unavailable' && styles.dropdownOptionSelected,
                      ]}>
                      Unavailable
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Master Status Dropdown */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Master Status</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                activeOpacity={0.7}
                onPress={() =>
                  setActiveDropdown(activeDropdown === 'status' ? 'none' : 'status')
                }>
                <Text style={styles.dropdownValue}>{masterStatus}</Text>
                <Text style={styles.dropdownChevron}>⌄</Text>
              </TouchableOpacity>
              {activeDropdown === 'status' && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.dropdownOption}
                    onPress={() => {
                      setMasterStatus('Active');
                      setActiveDropdown('none');
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        masterStatus === 'Active' && styles.dropdownOptionSelected,
                      ]}>
                      Active
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dropdownOption}
                    onPress={() => {
                      setMasterStatus('Inactive');
                      setActiveDropdown('none');
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        masterStatus === 'Inactive' && styles.dropdownOptionSelected,
                      ]}>
                      Inactive
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                value={description}
                onChangeText={setDescription}
                placeholder="Description"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.7}
              onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.updateBtn}
              activeOpacity={0.8}
              onPress={handleUpdate}>
              <Text style={styles.updateBtnText}>Update Item</Text>
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
    justifyContent: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderRadius: 18,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
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
  textAreaInput: {
    height: 80,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: 'top',
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
  updateBtn: {
    flex: 1.2,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
