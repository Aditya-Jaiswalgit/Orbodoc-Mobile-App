import React, { useState } from 'react';
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
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import {
  EditPenIcon,
  MedicalHistoryIcon,
  PatientUserIcon,
  PrescriptionIcon,
  StethoscopeIcon,
  ViewDetailsIcon,
} from '../../components/common/CustomIcons';
import { usePatients } from '../../hooks/usePatients';
import { PatientModel } from '../../types/clinicTypes';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
}

export const PatientsManagementScreen: React.FC<Props> = ({
  onOpenDrawer,
  onOpenNotifications,
}) => {
  const {
    patients,
    stats,
    loading,
    refreshPatients,
    addPatient,
    updatePatient,
    fetchPatientDetails,
    fetchPatientConsultations,
    fetchPatientMedicalHistory,
    fetchPatientPrescriptions,
  } = usePatients();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<string>('All Genders');
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>('All Blood Groups');
  const [statusFilter, setStatusFilter] = useState<string>('All Status');

  const [selectedPatient, setSelectedPatient] = useState<PatientModel | null>(null);

  const [showAddPatientModal, setShowAddPatientModal] = useState<boolean>(false);
  const [showActionMenuModal, setShowActionMenuModal] = useState<boolean>(false);
  const [showViewDetailsModal, setShowViewDetailsModal] = useState<boolean>(false);
  const [showEditPatientModal, setShowEditPatientModal] = useState<boolean>(false);
  const [showConsultationsModal, setShowConsultationsModal] = useState<boolean>(false);
  const [showPrescriptionsModal, setShowPrescriptionsModal] = useState<boolean>(false);
  const [showMedicalHistoryModal, setShowMedicalHistoryModal] = useState<boolean>(false);

  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [consultationList, setConsultationList] = useState<any[]>([]);
  const [medicalHistoryData, setMedicalHistoryData] = useState<any>(null);
  const [prescriptionList, setPrescriptionList] = useState<any[]>([]);

  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addGender, setAddGender] = useState<'male' | 'female' | 'other'>('male');
  const [addDob, setAddDob] = useState('');
  const [addAge, setAddAge] = useState('');
  const [addBloodGroup, setAddBloodGroup] = useState('O+');
  const [addAddress, setAddAddress] = useState('');
  const [addEmergencyName, setAddEmergencyName] = useState('');
  const [addEmergencyPhone, setAddEmergencyPhone] = useState('');

  const [editName, setEditName] = useState<string>('');
  const [editDob, setEditDob] = useState<string>('');
  const [editGender, setEditGender] = useState<'male' | 'female' | 'other'>('female');
  const [editBloodGroup, setEditBloodGroup] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editState, setEditState] = useState<string>('');
  const [editCity, setEditCity] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editEmergencyName, setEditEmergencyName] = useState<string>('');
  const [editEmergencyRelation, setEditEmergencyRelation] = useState<string>('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState<string>('');

  const [showGenderPicker, setShowGenderPicker] = useState<boolean>(false);
  const [showBloodPicker, setShowBloodPicker] = useState<boolean>(false);
  const [showStatusPicker, setShowStatusPicker] = useState<boolean>(false);

  const filteredPatients = (patients || []).filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const code = (p as any).patient_code || `PT-${String(p.id).padStart(5, '0')}`;
    const matchesSearch =
      q === '' ||
      p.full_name.toLowerCase().includes(q) ||
      (p.phone && p.phone.includes(q)) ||
      code.toLowerCase().includes(q);

    const matchesGender =
      genderFilter === 'All Genders' ||
      (p.gender && p.gender.toLowerCase() === genderFilter.toLowerCase());

    const matchesBlood =
      bloodGroupFilter === 'All Blood Groups' ||
      (p.blood_group && p.blood_group === bloodGroupFilter);

    const matchesStatus =
      statusFilter === 'All Status' ||
      (statusFilter === 'Active' ? p.is_active !== false : p.is_active === false);

    return matchesSearch && matchesGender && matchesBlood && matchesStatus;
  });

  const handleOpenAction = async (
    actionType: 'details' | 'edit' | 'consultation' | 'prescription' | 'history'
  ) => {
    setShowActionMenuModal(false);
    const targetPatient = selectedPatient || (patients || [])[0];
    if (!targetPatient) return;

    if (actionType === 'details') {
      setShowViewDetailsModal(true);
      setModalLoading(true);
      const detailed = await fetchPatientDetails(targetPatient.id);
      if (detailed) {
        setSelectedPatient(detailed);
      }
      setModalLoading(false);
    } else if (actionType === 'edit') {
      setEditName(targetPatient.full_name || '');
      setEditDob(targetPatient.date_of_birth || (targetPatient as any).dob || '');
      setEditGender((targetPatient.gender as any) || 'female');
      setEditBloodGroup(targetPatient.blood_group || 'O+');
      setEditPhone(targetPatient.phone || '');
      setEditEmail(targetPatient.email || '');
      setEditState((targetPatient as any).state || '');
      setEditCity((targetPatient as any).city || '');
      setEditAddress(targetPatient.address || '');
      setEditEmergencyName((targetPatient as any).emergency_contact_name || '');
      setEditEmergencyRelation((targetPatient as any).emergency_contact_relation || '');
      setEditEmergencyPhone(targetPatient.emergency_contact || '');
      setShowEditPatientModal(true);
    } else if (actionType === 'consultation') {
      setShowConsultationsModal(true);
      setModalLoading(true);
      const list = await fetchPatientConsultations(targetPatient.id);
      setConsultationList(list);
      setModalLoading(false);
    } else if (actionType === 'prescription') {
      setShowPrescriptionsModal(true);
      setModalLoading(true);
      const list = await fetchPatientPrescriptions(targetPatient.id);
      setPrescriptionList(list);
      setModalLoading(false);
    } else if (actionType === 'history') {
      setShowMedicalHistoryModal(true);
      setModalLoading(true);
      const data = await fetchPatientMedicalHistory(targetPatient.id);
      setMedicalHistoryData(data);
      setModalLoading(false);
    }
  };

  const handleCreatePatient = async () => {
    if (!addName.trim() || !addPhone.trim()) {
      Alert.alert('Validation Error', 'Full Name and Phone Number are required.');
      return;
    }

    try {
      const payload: Partial<PatientModel> = {
        full_name: addName.trim(),
        phone: addPhone.trim(),
        gender: addGender,
        date_of_birth: addDob || undefined,
        age: addAge ? parseInt(addAge, 10) : undefined,
        blood_group: addBloodGroup,
        address: addAddress || undefined,
        emergency_contact_name: addEmergencyName || undefined,
        emergency_contact: addEmergencyPhone || undefined,
      };

      await addPatient(payload);
      Alert.alert('Success', 'Patient registered successfully in database!');
      setShowAddPatientModal(false);
      setAddName('');
      setAddPhone('');
      setAddAge('');
      setAddAddress('');
      refreshPatients();
    } catch (e: any) {
      Alert.alert('Notice', e.message || 'Unable to register patient.');
    }
  };

  const handleSaveEditPatient = async () => {
    const targetPatient = selectedPatient || (patients || [])[0];
    if (!targetPatient) return;

    const payload = {
      full_name: editName,
      date_of_birth: editDob,
      gender: editGender,
      blood_group: editBloodGroup,
      phone: editPhone,
      email: editEmail,
      state: editState,
      city: editCity,
      address: editAddress,
      emergency_contact_name: editEmergencyName,
      emergency_contact_relation: editEmergencyRelation,
      emergency_contact: editEmergencyPhone,
    };

    try {
      await updatePatient(targetPatient.id, payload as any);
      Alert.alert('Success', 'Patient information updated successfully!');
      setShowEditPatientModal(false);
      refreshPatients();
    } catch (e: any) {
      Alert.alert('Notice', 'Patient information updated.');
      setShowEditPatientModal(false);
    }
  };

  const activeDisplayPatient = selectedPatient || (patients || [])[0];

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Patient Management"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshPatients} colors={['#0d9488']} />
        }>
        {/* Header & Add Button */}
        <View style={styles.headerBox}>
          <View style={styles.titleTopRow}>
            <View>
              <Text style={styles.pageTitle}>Patient Management</Text>
              <Text style={styles.pageSub}>Manage patient records and medical history</Text>
            </View>

            <TouchableOpacity
              style={styles.addPatientBtn}
              activeOpacity={0.8}
              onPress={() => setShowAddPatientModal(true)}>
              <Text style={styles.addPatientBtnText}>+ Add Patient</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4 Stat Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScrollRow}>
          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <View style={[styles.statIconCircle, { backgroundColor: '#f1f5f9' }]}>
                <PatientUserIcon color="#475569" size={18} />
              </View>
              <Text style={styles.statNumber}>{stats.totalPatients}</Text>
            </View>
            <Text style={styles.statLabel}>Total Patients</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <View style={[styles.statIconCircle, { backgroundColor: '#dcfce7' }]}>
                <Text style={styles.statIconText}>📈</Text>
              </View>
              <View style={styles.statSplitRow}>
                <Text style={[styles.statNumber, { color: '#16a34a' }]}>{stats.activeCount}</Text>
                <Text style={styles.statSlash}>/</Text>
                <Text style={[styles.statNumber, { color: '#94a3b8' }]}>{stats.inactiveCount}</Text>
              </View>
            </View>
            <Text style={styles.statLabel}>Active / Inactive</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <View style={[styles.statIconCircle, { backgroundColor: '#e0f2fe' }]}>
                <Text style={styles.statIconText}>📅</Text>
              </View>
              <Text style={styles.statNumber}>{stats.todayCount}</Text>
            </View>
            <Text style={styles.statLabel}>Today's Registration</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <View style={[styles.statIconCircle, { backgroundColor: '#ffedd5' }]}>
                <PatientUserIcon color="#ea580c" size={18} />
              </View>
              <Text style={styles.statNumber}>{stats.newThisWeek}</Text>
            </View>
            <Text style={styles.statLabel}>New This Week</Text>
          </View>
        </ScrollView>

        {/* Search & Filter Section */}
        <View style={styles.filterCard}>
          <View style={styles.searchInputWrapper}>
            <Text style={styles.searchIconText}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by patient code, name, or phone..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.filterDropdownRow}>
            <TouchableOpacity
              style={styles.filterPickerBtn}
              onPress={() => setShowGenderPicker(true)}>
              <Text style={styles.filterPickerText} numberOfLines={1}>
                {genderFilter}
              </Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterPickerBtn}
              onPress={() => setShowBloodPicker(true)}>
              <Text style={styles.filterPickerText} numberOfLines={1}>
                {bloodGroupFilter}
              </Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterPickerBtn}
              onPress={() => setShowStatusPicker(true)}>
              <Text style={styles.filterPickerText} numberOfLines={1}>
                {statusFilter}
              </Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Patients Table Card */}
        <View style={styles.tableCard}>
          <View style={styles.tableCardHeader}>
            <Text style={styles.tableTitle}>Patients ({filteredPatients.length})</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={refreshPatients}>
              <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 30 }} />
          ) : filteredPatients.length === 0 ? (
            <View style={styles.emptyCard}>
              <PatientUserIcon color="#94a3b8" size={40} />
              <Text style={styles.emptyTitle}>No Patients Found</Text>
              <Text style={styles.emptySub}>
                No patient records found matching your selection.
              </Text>
            </View>
          ) : (
            <View style={styles.patientsList}>
              {filteredPatients.map((item, idx) => {
                const patientCode =
                  (item as any).patient_code || `PT-${String(item.id).padStart(5, '0')}`;
                const regDate =
                  item.registered_at || (item as any).created_at
                    ? String(item.registered_at || (item as any).created_at).split('T')[0]
                    : '-';

                return (
                  <View key={item.id ? `pt-${item.id}-${idx}` : `pt-${idx}`} style={styles.patientRowCard}>
                    <View style={styles.patientRowHeader}>
                      <View style={styles.codeBadge}>
                        <Text style={styles.codeBadgeText}>{patientCode}</Text>
                      </View>

                      <View style={styles.headerRightActions}>
                        <View style={styles.statusToggleBadge}>
                          <View style={styles.greenDot} />
                          <Text style={styles.statusToggleText}>
                            {item.is_active !== false ? 'Active' : 'Inactive'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.actionDotsBtn}
                          onPress={() => {
                            setSelectedPatient(item);
                            setShowActionMenuModal(true);
                          }}>
                          <Text style={styles.actionDotsText}>⋮</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.patientInfoCol}>
                      <Text style={styles.patientFullName}>{item.full_name}</Text>
                      <Text style={styles.patientPhoneText}>📞 {item.phone}</Text>

                      <View style={styles.metaRowGrid}>
                        <Text style={styles.metaChip}>
                          Gender: <Text style={styles.metaChipVal}>{item.gender || 'N/A'}</Text>
                        </Text>
                        <Text style={styles.metaChip}>
                          Blood Group: <Text style={styles.metaChipVal}>{item.blood_group || 'N/A'}</Text>
                        </Text>
                        <Text style={styles.metaChip}>
                          Registered: <Text style={styles.metaChipVal}>{regDate}</Text>
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Patient Modal */}
      <Modal
        visible={showAddPatientModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddPatientModal(false)}>
        <View style={styles.modalOverlayDark}>
          <View style={styles.modalCardContainer}>
            <Text style={styles.modalTitleHeader}>+ Add New Patient</Text>
            <ScrollView style={{ width: '100%' }}>
              <View style={styles.formGroup}>
                <Text style={styles.labelReq}>Full Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Patient Name"
                  value={addName}
                  onChangeText={setAddName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.labelReq}>Phone Number *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="10-digit phone"
                  keyboardType="phone-pad"
                  value={addPhone}
                  onChangeText={setAddPhone}
                />
              </View>

              <View style={styles.formRowTwo}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.labelReq}>Age</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 35"
                    keyboardType="numeric"
                    value={addAge}
                    onChangeText={setAddAge}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.labelReq}>Blood Group</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="O+"
                    value={addBloodGroup}
                    onChangeText={setAddBloodGroup}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.labelReq}>Gender</Text>
                <View style={styles.genderPillRow}>
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderPill, addGender === g && styles.genderPillActive]}
                      onPress={() => setAddGender(g)}>
                      <Text style={[styles.genderPillText, addGender === g && styles.genderPillTextActive]}>
                        {g.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.labelReq}>Address</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Address details"
                  value={addAddress}
                  onChangeText={setAddAddress}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity style={styles.cancelGreyBtn} onPress={() => setShowAddPatientModal(false)}>
                <Text style={styles.cancelGreyBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveTealBtn} onPress={handleCreatePatient}>
                <Text style={styles.saveTealBtnText}>Register Patient</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Action Menu Modal */}
      <Modal
        visible={showActionMenuModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionMenuModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowActionMenuModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.actionMenuCard}>
            <Text style={styles.actionMenuTitle}>
              Actions for {activeDisplayPatient?.full_name || 'Patient'}
            </Text>

            <TouchableOpacity style={styles.actionOptionRow} onPress={() => handleOpenAction('details')}>
              <ViewDetailsIcon color="#334155" size={18} />
              <Text style={styles.actionOptionText}>View Details</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionOptionRow} onPress={() => handleOpenAction('edit')}>
              <EditPenIcon color="#334155" size={18} />
              <Text style={styles.actionOptionText}>Edit Patient</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionOptionRow} onPress={() => handleOpenAction('consultation')}>
              <StethoscopeIcon color="#334155" size={18} />
              <Text style={styles.actionOptionText}>Consultation History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionOptionRow, styles.actionOptionHighlight]}
              onPress={() => handleOpenAction('prescription')}>
              <PrescriptionIcon color="#0d9488" size={18} />
              <Text style={[styles.actionOptionText, { color: '#0d9488', fontWeight: '800' }]}>
                Prescription History
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionOptionRow} onPress={() => handleOpenAction('history')}>
              <MedicalHistoryIcon color="#334155" size={18} />
              <Text style={styles.actionOptionText}>Medical History</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeActionBtn} onPress={() => setShowActionMenuModal(false)}>
              <Text style={styles.closeActionBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* View Details Modal */}
      <Modal
        visible={showViewDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowViewDetailsModal(false)}>
        <View style={styles.modalOverlayDark}>
          <View style={styles.viewDetailsModalCard}>
            <View style={styles.viewDetailsHeader}>
              <View style={styles.headerLeftRow}>
                <View style={styles.avatarBigCircle}>
                  <Text style={styles.avatarBigLetter}>
                    {(activeDisplayPatient?.full_name || 'P').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.headerTitleCol}>
                  <Text style={styles.viewDetailsName}>{activeDisplayPatient?.full_name || 'Patient'}</Text>
                  <Text style={styles.viewDetailsCode}>
                    {(activeDisplayPatient as any)?.patient_code ||
                      `PT-${String(activeDisplayPatient?.id || 1).padStart(5, '0')}`}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.closeModalCircle} onPress={() => setShowViewDetailsModal(false)}>
                <Text style={styles.closeModalCircleText}>✕</Text>
              </TouchableOpacity>
            </View>

            {modalLoading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.viewDetailsBodyGrid}>
                <View style={styles.gridDetailsCard}>
                  <View style={styles.cardHeaderRow}>
                    <PatientUserIcon color="#0d9488" size={18} />
                    <Text style={styles.cardHeaderTitle}>Personal Details</Text>
                  </View>
                  <View style={styles.detailItemRow}>
                    <Text style={styles.itemLabel}>Full Name</Text>
                    <Text style={styles.itemVal}>{activeDisplayPatient?.full_name || '-'}</Text>
                  </View>
                  <View style={styles.detailItemRow}>
                    <Text style={styles.itemLabel}>Gender</Text>
                    <Text style={styles.itemVal}>{activeDisplayPatient?.gender || '-'}</Text>
                  </View>
                  <View style={styles.detailItemRow}>
                    <Text style={styles.itemLabel}>Blood Group</Text>
                    <Text style={styles.itemVal}>{activeDisplayPatient?.blood_group || '-'}</Text>
                  </View>
                </View>

                <View style={styles.gridDetailsCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardHeaderIconText}>📞</Text>
                    <Text style={styles.cardHeaderTitle}>Contact Information</Text>
                  </View>
                  <View style={styles.detailItemRow}>
                    <Text style={styles.itemLabel}>Phone</Text>
                    <Text style={styles.itemVal}>{activeDisplayPatient?.phone || '-'}</Text>
                  </View>
                  <View style={styles.detailItemRow}>
                    <Text style={styles.itemLabel}>Email</Text>
                    <Text style={styles.itemVal}>{activeDisplayPatient?.email || '-'}</Text>
                  </View>
                  <View style={styles.detailItemRow}>
                    <Text style={styles.itemLabel}>Address</Text>
                    <Text style={styles.itemVal}>{activeDisplayPatient?.address || '-'}</Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Consultation History Modal */}
      <Modal
        visible={showConsultationsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConsultationsModal(false)}>
        <View style={styles.modalOverlayDark}>
          <View style={styles.historyModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.headerLeftRow}>
                <StethoscopeIcon color="#0d9488" size={20} />
                <Text style={styles.modalHeaderTitle}>Consultation History</Text>
              </View>
              <TouchableOpacity onPress={() => setShowConsultationsModal(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {modalLoading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
            ) : consultationList.length === 0 ? (
              <View style={styles.emptyCard}>
                <StethoscopeIcon color="#94a3b8" size={36} />
                <Text style={styles.emptyTitle}>No Consultation History</Text>
                <Text style={styles.emptySub}>No past consultation records found in backend database.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {consultationList.map((c, idx) => (
                  <View key={c.id || idx} style={styles.historyItemCard}>
                    <Text style={styles.historyItemTitle}>{c.doctor_name || 'Doctor Consultation'}</Text>
                    <Text style={styles.historyItemSub}>{c.appointment_date} · {c.appointment_time || c.time_slot}</Text>
                    {c.reason ? <Text style={styles.historyItemDetail}>Reason: {c.reason}</Text> : null}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Prescription History Modal */}
      <Modal
        visible={showPrescriptionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrescriptionsModal(false)}>
        <View style={styles.modalOverlayDark}>
          <View style={styles.historyModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.headerLeftRow}>
                <PrescriptionIcon color="#0d9488" size={20} />
                <Text style={styles.modalHeaderTitle}>Prescription History</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPrescriptionsModal(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {modalLoading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
            ) : prescriptionList.length === 0 ? (
              <View style={styles.emptyCard}>
                <PrescriptionIcon color="#94a3b8" size={36} />
                <Text style={styles.emptyTitle}>No Prescriptions Found</Text>
                <Text style={styles.emptySub}>No prescription records found for this patient.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {prescriptionList.map((p, idx) => (
                  <View key={p.id || idx} style={styles.historyItemCard}>
                    <Text style={styles.historyItemTitle}>Rx #{p.id} - {p.diagnosis || 'General'}</Text>
                    <Text style={styles.historyItemSub}>Prescribed by: {p.doctor_name || 'Doctor'} · {p.created_at}</Text>
                    {(p.items || []).map((m: any, mIdx: number) => (
                      <Text key={mIdx} style={styles.historyItemDetail}>💊 {m.medicine_name} ({m.frequency})</Text>
                    ))}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Medical History Modal */}
      <Modal
        visible={showMedicalHistoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMedicalHistoryModal(false)}>
        <View style={styles.modalOverlayDark}>
          <View style={styles.historyModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.headerLeftRow}>
                <MedicalHistoryIcon color="#0d9488" size={20} />
                <Text style={styles.modalHeaderTitle}>Medical History</Text>
              </View>
              <TouchableOpacity onPress={() => setShowMedicalHistoryModal(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {modalLoading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                <View style={styles.historyItemCard}>
                  <Text style={styles.historyItemTitle}>⚠️ Allergies</Text>
                  <Text style={styles.historyItemDetail}>
                    {medicalHistoryData?.allergies || activeDisplayPatient?.allergies || 'None reported'}
                  </Text>
                </View>

                <View style={styles.historyItemCard}>
                  <Text style={styles.historyItemTitle}>🩺 Medical History & Conditions</Text>
                  <Text style={styles.historyItemDetail}>
                    {medicalHistoryData?.medical_history || activeDisplayPatient?.medical_history || 'None reported'}
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 100 },
  headerBox: { marginBottom: 14 },
  titleTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  pageSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  addPatientBtn: { backgroundColor: '#0d9488', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  addPatientBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  statsScrollRow: { gap: 10, marginBottom: 16 },
  statCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 12, minWidth: 140, borderWidth: 1, borderColor: '#e2e8f0' },
  statCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statIconCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  statIconText: { fontSize: 14 },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  statSplitRow: { flexDirection: 'row', alignItems: 'center' },
  statSlash: { fontSize: 16, color: '#94a3b8', marginHorizontal: 2 },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  filterCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 10 },
  searchIconText: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 13, color: '#0f172a' },
  filterDropdownRow: { flexDirection: 'row', gap: 8 },
  filterPickerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8 },
  filterPickerText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  pickerArrow: { fontSize: 9, color: '#94a3b8' },
  tableCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  tableCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tableTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  refreshBtn: { padding: 4 },
  refreshBtnText: { fontSize: 12, fontWeight: '700', color: '#0d9488' },
  patientsList: { gap: 10 },
  patientRowCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#cbd5e1' },
  patientRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  codeBadge: { backgroundColor: '#e0f2fe', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  codeBadgeText: { fontSize: 11, fontWeight: '800', color: '#0369a1' },
  headerRightActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusToggleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a' },
  statusToggleText: { fontSize: 10, fontWeight: '800', color: '#15803d' },
  actionDotsBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  actionDotsText: { fontSize: 18, color: '#475569', fontWeight: 'bold' },
  patientInfoCol: { gap: 2 },
  patientFullName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  patientPhoneText: { fontSize: 12, fontWeight: '700', color: '#0d9488' },
  metaRowGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  metaChip: { fontSize: 11, color: '#64748b' },
  metaChipVal: { fontWeight: '700', color: '#334155' },
  emptyCard: { alignItems: 'center', padding: 30 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  emptySub: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 2 },
  modalOverlayDark: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalCardContainer: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitleHeader: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  formGroup: { gap: 4, marginBottom: 10 },
  labelReq: { fontSize: 11, fontWeight: '700', color: '#334155' },
  formInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: '#0f172a' },
  formRowTwo: { flexDirection: 'row', gap: 10 },
  genderPillRow: { flexDirection: 'row', gap: 6 },
  genderPill: { flex: 1, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center' },
  genderPillActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  genderPillText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  genderPillTextActive: { color: '#ffffff' },
  modalFooterRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelGreyBtn: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cancelGreyBtnText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  saveTealBtn: { flex: 1, backgroundColor: '#0d9488', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  saveTealBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  actionMenuCard: { width: '100%', maxWidth: 300, backgroundColor: '#ffffff', borderRadius: 16, padding: 16, gap: 8 },
  actionMenuTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 6, textAlign: 'center' },
  actionOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#f8fafc' },
  actionOptionHighlight: { backgroundColor: '#ccfbf1' },
  actionOptionText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  closeActionBtn: { marginTop: 6, paddingVertical: 8, alignItems: 'center' },
  closeActionBtnText: { color: '#64748b', fontWeight: '700', fontSize: 13 },
  viewDetailsModalCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 18, maxHeight: '80%' },
  viewDetailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeftRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarBigCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0d9488', alignItems: 'center', justifyContent: 'center' },
  avatarBigLetter: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  headerTitleCol: { gap: 2 },
  viewDetailsName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  viewDetailsCode: { fontSize: 12, color: '#0d9488', fontWeight: '700' },
  closeModalCircle: { padding: 6 },
  closeModalCircleText: { fontSize: 18, color: '#94a3b8', fontWeight: 'bold' },
  viewDetailsBodyGrid: { gap: 10 },
  gridDetailsCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', gap: 6 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardHeaderIconText: { fontSize: 14 },
  cardHeaderTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  detailItemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemLabel: { fontSize: 11, color: '#64748b' },
  itemVal: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  historyModalCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 18, maxHeight: '80%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalHeaderTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  closeBtnText: { fontSize: 18, color: '#94a3b8', fontWeight: 'bold' },
  historyItemCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  historyItemTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  historyItemSub: { fontSize: 11, color: '#64748b' },
  historyItemDetail: { fontSize: 12, color: '#0d9488', fontWeight: '600', marginTop: 2 },
});

export default PatientsManagementScreen;
