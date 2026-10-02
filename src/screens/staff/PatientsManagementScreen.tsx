import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { Pagination } from '../../components/common/Pagination';
import { PatientModel } from '../../types/clinicTypes';
import { useAuthContext } from '../../context/AuthContext';
import {
  fetchPatientsApi,
  createPatientApi,
  updatePatientApi,
  deletePatientApi,
} from '../../api/patientApi';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

interface Props {
  onOpenDrawer: () => void;
}

export const PatientsManagementScreen: React.FC<Props> = ({ onOpenDrawer }) => {
  const { token, activeClinicId } = useAuthContext();

  const [patients, setPatients] = useState<PatientModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search State with debouncing
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Register Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [age, setAge] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [email, setEmail] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');

  // Details & Edit Modal State
  const [selectedPatient, setSelectedPatient] = useState<PatientModel | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('O+');
  const [editGender, setEditGender] = useState<'male' | 'female' | 'other'>('male');
  const [editEmail, setEditEmail] = useState('');
  const [editMedicalHistory, setEditMedicalHistory] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load patients from backend
  const loadPatients = useCallback(
    async (pageToLoad = currentPage, currentSearch = debouncedSearch, isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await fetchPatientsApi(
          {
            clinic_id: activeClinicId || undefined,
            page: pageToLoad,
            limit: pageSize,
            search: currentSearch || undefined,
          },
          token || undefined
        );

        if (response.success && response.data) {
          const resData = response.data;
          const rows = Array.isArray(resData.data) ? resData.data : (Array.isArray(resData) ? resData : []);
          setPatients(rows);
          const total = resData.total !== undefined ? resData.total : rows.length;
          setTotalItems(total);
        } else {
          showErrorToast('Error', response.message || 'Unable to fetch patients.');
        }
      } catch (err: any) {
        showErrorToast('Network Error', err?.message || 'Failed to connect to server.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeClinicId, currentPage, pageSize, debouncedSearch, token]
  );

  // Initial and reactive load
  useEffect(() => {
    loadPatients(currentPage, debouncedSearch);
  }, [loadPatients, currentPage, debouncedSearch, pageSize, activeClinicId]);

  const handleRefresh = useCallback(() => {
    loadPatients(1, debouncedSearch, true);
  }, [loadPatients, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset registration form
  const resetRegisterForm = () => {
    setFullName('');
    setPhone('');
    setGender('male');
    setAge('');
    setBloodGroup('O+');
    setEmail('');
    setMedicalHistory('');
  };

  // Register patient API call
  const handleRegisterPatient = async () => {
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedPhone) {
      Alert.alert('Validation Error', 'Full Name and Phone Number are required.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(trimmedPhone)) {
      Alert.alert('Validation Error', 'Phone must be a valid 10-digit number starting with 6, 7, 8, or 9.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<PatientModel> & { clinic_id?: number | string } = {
        clinic_id: activeClinicId || undefined,
        full_name: trimmedName,
        phone: trimmedPhone,
        gender,
        age: age ? parseInt(age, 10) : undefined,
        blood_group: bloodGroup,
        email: email.trim() || undefined,
        medical_history: medicalHistory.trim() || undefined,
      };

      const res = await createPatientApi(payload, token || undefined);
      if (res.success) {
        showSuccessToast('Success', 'Patient registered successfully!');
        setModalVisible(false);
        resetRegisterForm();
        loadPatients(1, debouncedSearch);
      } else {
        Alert.alert('Registration Failed', res.message || 'Could not register patient.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open details modal
  const handleOpenDetails = (patient: PatientModel) => {
    setSelectedPatient(patient);
    setIsEditing(false);
    setEditFullName(patient.full_name || '');
    setEditPhone(patient.phone || '');
    setEditAge(patient.age ? String(patient.age) : '');
    setEditBloodGroup(patient.blood_group || 'O+');
    setEditGender(
      patient.gender === 'female' || patient.gender === 'other' ? patient.gender : 'male'
    );
    setEditEmail(patient.email || '');
    setEditMedicalHistory(patient.medical_history || '');
    setDetailsModalVisible(true);
  };

  // Update patient API call
  const handleUpdatePatient = async () => {
    if (!selectedPatient) return;
    const trimmedName = editFullName.trim();
    const trimmedPhone = editPhone.trim();

    if (!trimmedName || !trimmedPhone) {
      Alert.alert('Validation Error', 'Full Name and Phone Number are required.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(trimmedPhone)) {
      Alert.alert('Validation Error', 'Phone must be a valid 10-digit number starting with 6, 7, 8, or 9.');
      return;
    }

    setIsUpdating(true);
    try {
      const payload: Partial<PatientModel> = {
        full_name: trimmedName,
        phone: trimmedPhone,
        gender: editGender,
        age: editAge ? parseInt(editAge, 10) : undefined,
        blood_group: editBloodGroup,
        email: editEmail.trim() || undefined,
        medical_history: editMedicalHistory.trim() || undefined,
      };

      const res = await updatePatientApi(selectedPatient.id, payload, token || undefined);
      if (res.success) {
        showSuccessToast('Updated', 'Patient details updated successfully!');
        setDetailsModalVisible(false);
        loadPatients(currentPage, debouncedSearch);
      } else {
        Alert.alert('Update Failed', res.message || 'Could not update patient.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Something went wrong.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Toggle patient active status
  const handleToggleStatus = (patient: PatientModel) => {
    const isCurrentlyActive = Number(patient.is_active ?? 1) === 1;
    const actionText = isCurrentlyActive ? 'Deactivate' : 'Activate';

    Alert.alert(
      `${actionText} Patient`,
      `Are you sure you want to ${actionText.toLowerCase()} ${patient.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText,
          style: isCurrentlyActive ? 'destructive' : 'default',
          onPress: async () => {
            setIsDeactivating(true);
            try {
              let res;
              if (isCurrentlyActive) {
                res = await deletePatientApi(patient.id, token || undefined);
              } else {
                res = await updatePatientApi(patient.id, { is_active: 1 }, token || undefined);
              }

              if (res.success) {
                showSuccessToast('Success', `Patient ${actionText.toLowerCase()}d successfully.`);
                setDetailsModalVisible(false);
                loadPatients(currentPage, debouncedSearch);
              } else {
                showErrorToast('Failed', res.message || `Could not ${actionText.toLowerCase()} patient.`);
              }
            } catch (err: any) {
              showErrorToast('Error', err?.message || 'Request failed.');
            } finally {
              setIsDeactivating(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Patients Directory" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#0d9488']}
            tintColor="#0d9488"
          />
        }
      >
        {/* Top Header */}
        <View style={styles.topRow}>
          <Text style={styles.pageTitle}>Patients Roster ({totalItems})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Register Patient</Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search patient by name or phone number..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Loading State */}
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#0d9488" />
            <Text style={styles.loadingText}>Loading patients roster...</Text>
          </View>
        ) : patients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Patients Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim()
                ? `No results match "${searchQuery}". Try a different name or phone.`
                : 'No patients have been registered yet. Tap "+ Register Patient" to add one.'}
            </Text>
          </View>
        ) : (
          /* Patient List */
          <View style={styles.list}>
            {patients.map((patient) => {
              const isActive = Number(patient.is_active ?? 1) === 1;
              return (
                <TouchableOpacity
                  key={patient.id}
                  style={[styles.card, !isActive && styles.cardInactive]}
                  activeOpacity={0.7}
                  onPress={() => handleOpenDetails(patient)}
                >
                  <View
                    style={[
                      styles.avatarCircle,
                      !isActive && { backgroundColor: '#94a3b8' },
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {(patient.full_name || 'P').charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.infoCol}>
                    <View style={styles.titleRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <Text style={styles.patientName} numberOfLines={1}>
                          {patient.full_name}
                        </Text>
                        {!isActive && (
                          <View style={styles.inactiveBadge}>
                            <Text style={styles.inactiveBadgeText}>Inactive</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.bloodBadge}>
                        <Text style={styles.bloodText}>{patient.blood_group || 'O+'}</Text>
                      </View>
                    </View>
                    <Text style={styles.metaText}>
                      {patient.age ? `${patient.age} yrs` : '—'} • {patient.gender || '—'} • 📞 {patient.phone}
                    </Text>
                    {patient.patient_code ? (
                      <Text style={styles.codeText}>ID: {patient.patient_code}</Text>
                    ) : null}
                    {patient.medical_history ? (
                      <Text style={styles.historyText} numberOfLines={2}>
                        History: {patient.medical_history}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Pagination Component */}
        {totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        )}
      </ScrollView>

      {/* Register Patient Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Register New Patient</Text>

              <Text style={styles.label}>Patient Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Rahul Sharma"
                placeholderTextColor="#94a3b8"
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.label}>Mobile Phone (10 digits) *</Text>
              <TextInput
                style={styles.input}
                placeholder="9876543210"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />

              <View style={styles.rowTwo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Age</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="35"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    maxLength={3}
                    value={age}
                    onChangeText={setAge}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Blood Group</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="O+"
                    placeholderTextColor="#94a3b8"
                    value={bloodGroup}
                    onChangeText={setBloodGroup}
                  />
                </View>
              </View>

              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                {(['male', 'female', 'other'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderChip, gender === g && styles.genderChipActive]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                      {g.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Email Address (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="rahul@example.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.label}>Medical History (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Hypertension, Diabetes"
                placeholderTextColor="#94a3b8"
                value={medicalHistory}
                onChangeText={setMedicalHistory}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  disabled={isSubmitting}
                  onPress={() => {
                    setModalVisible(false);
                    resetRegisterForm();
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, isSubmitting && { opacity: 0.7 }]}
                  disabled={isSubmitting}
                  onPress={handleRegisterPatient}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.saveText}>Register Patient</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Patient Details & Edit Modal */}
      <Modal visible={detailsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.modalTitle}>
                  {isEditing ? 'Edit Patient Details' : 'Patient Information'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setDetailsModalVisible(false);
                    setIsEditing(false);
                  }}
                >
                  <Text style={{ fontSize: 18, color: '#64748b', fontWeight: '800' }}>✕</Text>
                </TouchableOpacity>
              </View>

              {selectedPatient && !isEditing ? (
                /* View Mode */
                <View>
                  <View style={styles.detailHeaderBox}>
                    <View style={styles.avatarCircleLarge}>
                      <Text style={styles.avatarTextLarge}>
                        {(selectedPatient.full_name || 'P').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.detailName}>{selectedPatient.full_name}</Text>
                      {selectedPatient.patient_code && (
                        <Text style={styles.detailCode}>Code: {selectedPatient.patient_code}</Text>
                      )}
                      <Text style={styles.detailSub}>
                        {selectedPatient.gender?.toUpperCase() || '—'} • {selectedPatient.age ? `${selectedPatient.age} yrs` : '—'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Phone Number</Text>
                      <Text style={styles.detailValue}>📞 {selectedPatient.phone}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Blood Group</Text>
                      <Text style={styles.detailValue}>🩸 {selectedPatient.blood_group || 'Not specified'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Email</Text>
                      <Text style={styles.detailValue}>✉️ {selectedPatient.email || '—'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: Number(selectedPatient.is_active ?? 1) === 1 ? '#0d9488' : '#e11d48' }]}>
                        {Number(selectedPatient.is_active ?? 1) === 1 ? '● Active' : '○ Inactive'}
                      </Text>
                    </View>
                    {selectedPatient.medical_history ? (
                      <View style={[styles.detailItem, { width: '100%' }]}>
                        <Text style={styles.detailLabel}>Medical History</Text>
                        <Text style={styles.detailValue}>{selectedPatient.medical_history}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.modalBtnRow}>
                    <TouchableOpacity
                      style={[styles.statusBtn, Number(selectedPatient.is_active ?? 1) === 1 ? styles.deactivateBtn : styles.activateBtn]}
                      disabled={isDeactivating}
                      onPress={() => handleToggleStatus(selectedPatient)}
                    >
                      {isDeactivating ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.statusBtnText}>
                          {Number(selectedPatient.is_active ?? 1) === 1 ? 'Deactivate' : 'Activate'}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={() => setIsEditing(true)}
                    >
                      <Text style={styles.saveText}>Edit Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : selectedPatient && isEditing ? (
                /* Edit Mode */
                <View>
                  <Text style={styles.label}>Patient Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={editFullName}
                    onChangeText={setEditFullName}
                    placeholder="Full Name"
                  />

                  <Text style={styles.label}>Mobile Phone *</Text>
                  <TextInput
                    style={styles.input}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholder="10 Digits"
                  />

                  <View style={styles.rowTwo}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Age</Text>
                      <TextInput
                        style={styles.input}
                        value={editAge}
                        onChangeText={setEditAge}
                        keyboardType="numeric"
                        maxLength={3}
                        placeholder="Age"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Blood Group</Text>
                      <TextInput
                        style={styles.input}
                        value={editBloodGroup}
                        onChangeText={setEditBloodGroup}
                        placeholder="e.g. O+"
                      />
                    </View>
                  </View>

                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.genderRow}>
                    {(['male', 'female', 'other'] as const).map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.genderChip, editGender === g && styles.genderChipActive]}
                        onPress={() => setEditGender(g)}
                      >
                        <Text style={[styles.genderText, editGender === g && styles.genderTextActive]}>
                          {g.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="Email"
                  />

                  <Text style={styles.label}>Medical History</Text>
                  <TextInput
                    style={styles.input}
                    value={editMedicalHistory}
                    onChangeText={setEditMedicalHistory}
                    placeholder="Medical history"
                  />

                  <View style={styles.modalBtnRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      disabled={isUpdating}
                      onPress={() => setIsEditing(false)}
                    >
                      <Text style={styles.cancelText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.saveBtn, isUpdating && { opacity: 0.7 }]}
                      disabled={isUpdating}
                      onPress={handleUpdatePatient}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.saveText}>Save Changes</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 80 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  addBtn: { backgroundColor: '#0d9488', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  searchInput: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0f172a', marginBottom: 16 },
  list: { gap: 10 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  cardInactive: { opacity: 0.75, backgroundColor: '#f1f5f9' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0284c7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  infoCol: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patientName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  inactiveBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  inactiveBadgeText: { color: '#991b1b', fontSize: 10, fontWeight: '700' },
  bloodBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  bloodText: { color: '#991b1b', fontSize: 10, fontWeight: '800' },
  metaText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  codeText: { fontSize: 11, color: '#64748b', marginTop: 1, fontWeight: '500' },
  historyText: { fontSize: 11, color: '#0d9488', marginTop: 3, fontWeight: '600' },
  centerContainer: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 13, color: '#64748b', fontWeight: '600' },
  emptyContainer: { paddingVertical: 40, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 18 },
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, marginVertical: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  rowTwo: { flexDirection: 'row', gap: 10 },
  genderRow: { flexDirection: 'row', gap: 8, marginVertical: 6 },
  genderChip: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center' },
  genderChipActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  genderText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  genderTextActive: { color: '#ffffff' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#475569', fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: '#0d9488', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#ffffff', fontWeight: '800' },
  detailHeaderBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 14 },
  avatarCircleLarge: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#0284c7', alignItems: 'center', justifyContent: 'center' },
  avatarTextLarge: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  detailName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  detailCode: { fontSize: 12, color: '#64748b', fontWeight: '600', marginTop: 1 },
  detailSub: { fontSize: 12, color: '#0d9488', fontWeight: '700', marginTop: 2 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  detailItem: { width: '48%', backgroundColor: '#f8fafc', padding: 10, borderRadius: 8 },
  detailLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 2 },
  detailValue: { fontSize: 13, color: '#1e293b', fontWeight: '700' },
  statusBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  deactivateBtn: { backgroundColor: '#e11d48' },
  activateBtn: { backgroundColor: '#10b981' },
  statusBtnText: { color: '#ffffff', fontWeight: '800' },
});

export default PatientsManagementScreen;
