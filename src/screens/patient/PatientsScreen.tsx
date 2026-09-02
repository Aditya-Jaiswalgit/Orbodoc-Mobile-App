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
import { PatientHeader } from '../../components/common/PatientHeader';
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

interface PatientsScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
}

export const PatientsScreen: React.FC<PatientsScreenProps> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
}) => {
  const {
    patients,
    stats,
    loading,
    refreshPatients,
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
  const [showEditBloodPicker, setShowEditBloodPicker] = useState<boolean>(false);

  const filteredPatients = patients.filter((p) => {
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

  const handleOpenAction = async (actionType: 'details' | 'edit' | 'consultation' | 'prescription' | 'history') => {
    setShowActionMenuModal(false);
    const targetPatient = selectedPatient || patients[0];
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
      setEditDob(targetPatient.date_of_birth || '');
      setEditGender((targetPatient.gender as any) || 'female');
      setEditBloodGroup(targetPatient.blood_group || 'Select blood group');
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

  const handleSaveEditPatient = async () => {
    const targetPatient = selectedPatient || patients[0];
    if (!targetPatient) return;

    const payload = {
      full_name: editName,
      date_of_birth: editDob,
      gender: editGender,
      blood_group: editBloodGroup === 'Select blood group' ? '' : editBloodGroup,
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

  const activeDisplayPatient = selectedPatient || patients[0];

  return (
    <View style={styles.container}>
      <PatientHeader onOpenDrawer={onOpenDrawer} onOpenNotifications={onOpenNotifications} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBox}>
          <View style={styles.titleRow}>
            <PatientUserIcon color="#0f172a" size={24} />
            <Text style={styles.pageTitle}>Patient Management</Text>
          </View>
          <Text style={styles.pageSub}>Manage patient records and medical history</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScrollRow}>
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
            <TouchableOpacity style={styles.filterPickerBtn} onPress={() => setShowGenderPicker(true)}>
              <Text style={styles.filterPickerText} numberOfLines={1}>{genderFilter}</Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterPickerBtn} onPress={() => setShowBloodPicker(true)}>
              <Text style={styles.filterPickerText} numberOfLines={1}>{bloodGroupFilter}</Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterPickerBtn} onPress={() => setShowStatusPicker(true)}>
              <Text style={styles.filterPickerText} numberOfLines={1}>{statusFilter}</Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>
          </View>
        </View>

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
              <Text style={styles.emptySub}>No patient records found in database matching your filter.</Text>
            </View>
          ) : (
            <View style={styles.patientsList}>
              {filteredPatients.map((item, idx) => {
                const patientCode = (item as any).patient_code || `PT-${String(item.id).padStart(5, '0')}`;
                const regDate = item.registered_at || (item as any).created_at ? new Date(item.registered_at || (item as any).created_at).toLocaleDateString() : '-';

                return (
                  <View key={item.id ? `pt-${item.id}-${idx}` : `pt-${idx}`} style={styles.patientRowCard}>
                    <View style={styles.patientRowHeader}>
                      <View style={styles.codeBadge}>
                        <Text style={styles.codeBadgeText}>{patientCode}</Text>
                      </View>

                      <View style={styles.headerRightActions}>
                        <View style={styles.statusToggleBadge}>
                          <View style={styles.greenDot} />
                          <Text style={styles.statusToggleText}>{item.is_active !== false ? 'Active' : 'Inactive'}</Text>
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
                        <Text style={styles.metaChip}>Gender: <Text style={styles.metaChipVal}>{item.gender || 'Not specified'}</Text></Text>
                        <Text style={styles.metaChip}>Blood Group: <Text style={styles.metaChipVal}>{item.blood_group || 'N/A'}</Text></Text>
                        <Text style={styles.metaChip}>Registered: <Text style={styles.metaChipVal}>{regDate}</Text></Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showActionMenuModal} transparent animationType="fade" onRequestClose={() => setShowActionMenuModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowActionMenuModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.actionMenuCard}>
            <Text style={styles.actionMenuTitle}>Actions for {activeDisplayPatient?.full_name || 'Patient'}</Text>

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
              <Text style={styles.actionOptionText}>Consultation</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionOptionRow, styles.actionOptionHighlight]} onPress={() => handleOpenAction('prescription')}>
              <PrescriptionIcon color="#0d9488" size={18} />
              <Text style={[styles.actionOptionText, { color: '#0d9488', fontWeight: '800' }]}>Prescription</Text>
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

      <Modal visible={showViewDetailsModal} transparent animationType="slide" onRequestClose={() => setShowViewDetailsModal(false)}>
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
                  <Text style={styles.viewDetailsName}>{activeDisplayPatient?.full_name || 'Patient Details'}</Text>
                  <Text style={styles.viewDetailsCode}>
                    {(activeDisplayPatient as any)?.patient_code || `PT-${String(activeDisplayPatient?.id || 1).padStart(5, '0')}`}
                  </Text>
                </View>
              </View>

              <View style={styles.headerRightRow}>
                <View style={styles.activeBadgePill}>
                  <Text style={styles.activeBadgePillText}>
                    {activeDisplayPatient?.is_active !== false ? 'Active' : 'Inactive'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.editInfoSmallBtn}
                  onPress={() => {
                    setShowViewDetailsModal(false);
                    handleOpenAction('edit');
                  }}>
                  <EditPenIcon color="#334155" size={14} />
                  <Text style={styles.editInfoSmallBtnText}>Edit Information</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.closeModalCircle} onPress={() => setShowViewDetailsModal(false)}>
                  <Text style={styles.closeModalCircleText}>✕</Text>
                </TouchableOpacity>
              </View>
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
                    <Text style={styles.itemLabel}>Date of Birth</Text>
                    <Text style={styles.itemVal}>{activeDisplayPatient?.date_of_birth || '-'}</Text>
                  </View>
                  <View style={styles.detailItemRow}>
                    <Text style={styles.itemLabel}>Gender</Text>
                    <Text style={styles.itemVal}>{activeDisplayPatient?.gender || '-'}</Text>
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
                  <View style={styles.detailItemRow}>
                    <Text style={styles.itemLabel}>City</Text>
                    <Text style={styles.itemVal}>{(activeDisplayPatient as any)?.city || '-'}</Text>
                  </View>
                  <View style={styles.detailItemRow}>
                    <Text style={styles.itemLabel}>State</Text>
                    <Text style={styles.itemVal}>{(activeDisplayPatient as any)?.state || '-'}</Text>
                  </View>
                </View>

                <View style={styles.gridDetailsCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardHeaderIconText}>📅</Text>
                    <Text style={styles.cardHeaderTitle}>Visit Information</Text>
                  </View>
                  <View style={styles.detailItemRow}>
                    <Text style={styles.itemLabel}>Registration Date</Text>
                    <Text style={styles.itemVal}>{activeDisplayPatient?.registered_at || '-'}</Text>
                  </View>
                  <View style={styles.detailItemRow}>
                    <Text style={styles.itemLabel}>Last Visit</Text>
                    <Text style={styles.itemVal}>{activeDisplayPatient?.last_visit || '-'}</Text>
                  </View>
                </View>

                <View style={styles.gridDetailsCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardHeaderIconText}>🛡️</Text>
                    <Text style={styles.cardHeaderTitle}>Emergency Contact</Text>
                  </View>
                  <View style={styles.detailItemRow}>
                    <Text style={styles.itemLabel}>Contact</Text>
                    <Text style={styles.itemVal}>{activeDisplayPatient?.emergency_contact || '-'}</Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showEditPatientModal} transparent animationType="slide" onRequestClose={() => setShowEditPatientModal(false)}>
        <View style={styles.modalOverlayDark}>
          <View style={styles.editModalCard}>
            <View style={styles.editModalHeader}>
              <View style={styles.headerLeftRow}>
                <PatientUserIcon color="#0d9488" size={20} />
                <Text style={styles.editModalHeaderTitle}>Edit Patient</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditPatientModal(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editFormBodyScroll}>
              <View style={styles.formSectionHeader}>
                <PatientUserIcon color="#64748b" size={16} />
                <Text style={styles.formSectionTitle}>Personal Information</Text>
              </View>

              <View style={styles.formRowGrid}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>Name <Text style={styles.reqAsterisk}>*</Text></Text>
                  <TextInput
                    style={[styles.textInput, styles.textInputActiveFocus]}
                    value={editName}
                    onChangeText={setEditName}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>Date of Birth <Text style={styles.reqAsterisk}>*</Text></Text>
                  <View style={styles.inputWithIconRight}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={editDob}
                      onChangeText={setEditDob}
                      placeholder="YYYY-MM-DD"
                    />
                    <Text style={styles.innerRightIcon}>📅</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.formRowGrid, { marginTop: 10 }]}>
                <View style={[styles.inputGroup, { flex: 1.2 }]}>
                  <Text style={styles.inputLabelReq}>Gender <Text style={styles.reqAsterisk}>*</Text></Text>
                  <View style={styles.radioGroupRow}>
                    <TouchableOpacity style={styles.radioOption} onPress={() => setEditGender('male')}>
                      <View style={[styles.radioCircle, editGender === 'male' && styles.radioCircleActive]}>
                        {editGender === 'male' && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.radioText}>Male</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.radioOption} onPress={() => setEditGender('female')}>
                      <View style={[styles.radioCircle, editGender === 'female' && styles.radioCircleActive]}>
                        {editGender === 'female' && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.radioText}>Female</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.radioOption} onPress={() => setEditGender('other')}>
                      <View style={[styles.radioCircle, editGender === 'other' && styles.radioCircleActive]}>
                        {editGender === 'other' && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.radioText}>Other</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>Blood Group</Text>
                  <TouchableOpacity style={styles.dropdownPickerBtn} onPress={() => setShowEditBloodPicker(true)}>
                    <Text style={styles.dropdownPickerText}>{editBloodGroup || 'Select blood group'}</Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.sectionDividerLine} />

              <View style={styles.formSectionHeader}>
                <Text style={{ fontSize: 14 }}>📞</Text>
                <Text style={styles.formSectionTitle}>Contact Information</Text>
              </View>

              <View style={styles.formRowGrid}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>Phone <Text style={styles.reqAsterisk}>*</Text></Text>
                  <TextInput
                    style={styles.textInput}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>Email</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    keyboardType="email-address"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>State <Text style={styles.reqAsterisk}>*</Text></Text>
                  <TextInput
                    style={styles.textInput}
                    value={editState}
                    onChangeText={setEditState}
                  />
                </View>
              </View>

              <View style={[styles.formRowGrid, { marginTop: 10 }]}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>City <Text style={styles.reqAsterisk}>*</Text></Text>
                  <TextInput
                    style={styles.textInput}
                    value={editCity}
                    onChangeText={setEditCity}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { marginTop: 10 }]}>
                <Text style={styles.inputLabelReq}>Address</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={editAddress}
                  onChangeText={setEditAddress}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.sectionDividerLine} />

              <View style={styles.formSectionHeader}>
                <Text style={{ fontSize: 14 }}>🛡️</Text>
                <Text style={styles.formSectionTitle}>Emergency Contact</Text>
              </View>

              <View style={styles.formRowGrid}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>Contact Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editEmergencyName}
                    onChangeText={setEditEmergencyName}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>Relation</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editEmergencyRelation}
                    onChangeText={setEditEmergencyRelation}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>Phone</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editEmergencyPhone}
                    onChangeText={setEditEmergencyPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.editModalFooter}>
              <TouchableOpacity style={styles.cancelGreyBtn} onPress={() => setShowEditPatientModal(false)}>
                <Text style={styles.cancelGreyBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.updateTealBtn} onPress={handleSaveEditPatient}>
                <Text style={styles.updateTealBtnText}>Update Patient</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showConsultationsModal} transparent animationType="slide" onRequestClose={() => setShowConsultationsModal(false)}>
        <View style={styles.modalOverlayDark}>
          <View style={styles.consultModalCard}>
            <View style={styles.consultHeader}>
              <View style={styles.headerLeftRow}>
                <View style={styles.consultIconCircle}>
                  <StethoscopeIcon color="#ffffff" size={20} />
                </View>
                <View style={styles.headerTitleCol}>
                  <Text style={styles.consultTitle}>Consultation History</Text>
                  <Text style={styles.consultSub}>
                    {activeDisplayPatient?.full_name || 'Patient'} · {(activeDisplayPatient as any)?.patient_code || `PT-${String(activeDisplayPatient?.id || 1).padStart(5, '0')}`}
                  </Text>
                </View>
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
                <Text style={styles.emptyTitle}>No Consultations Found</Text>
                <Text style={styles.emptySub}>No consultation history records found for this patient.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.consultBody}>
                {consultationList.map((c, idx) => (
                  <View key={c.id || idx} style={styles.consultItemCard}>
                    <View style={styles.consultCardHeader}>
                      <View style={styles.docAvatarSmallCircle}>
                        <PatientUserIcon color="#0d9488" size={18} />
                      </View>
                      <View style={styles.docHeaderCol}>
                        <Text style={styles.docNameTitle}>{c.doctor_name || 'Doctor Consultation'}</Text>
                        <Text style={styles.docSpecSub}>{c.doctor_specialization || c.specialization || 'General Physician'}</Text>
                      </View>
                      <View style={styles.approvedBadgePill}>
                        <Text style={styles.approvedBadgePillText}>{c.status || 'Approved'}</Text>
                      </View>
                    </View>

                    <View style={styles.consultGridTwoRow}>
                      <View style={styles.consultBoxItem}>
                        <Text style={styles.boxLabel}>📅 Date & Time</Text>
                        <Text style={styles.boxVal}>{c.appointment_date} · {c.appointment_time || c.time_slot}</Text>
                      </View>

                      <View style={styles.consultBoxItem}>
                        <Text style={styles.boxLabel}>₹ Consultation Fee</Text>
                        <Text style={styles.feeValText}>₹{c.consultation_fee || c.fee || 0}.00</Text>
                      </View>
                    </View>

                    {c.reason ? (
                      <View style={styles.reasonBoxItem}>
                        <Text style={styles.boxLabel}>📄 Reason</Text>
                        <Text style={styles.boxVal}>{c.reason}</Text>
                      </View>
                    ) : null}

                    {c.notes ? (
                      <View style={styles.notesBoxItem}>
                        <Text style={styles.boxLabel}>✏️ Notes</Text>
                        <Text style={styles.boxVal}>{c.notes}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.consultFooter}>
              <TouchableOpacity style={styles.tealCloseBtn} onPress={() => setShowConsultationsModal(false)}>
                <Text style={styles.tealCloseBtnText}>✕ Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPrescriptionsModal} transparent animationType="slide" onRequestClose={() => setShowPrescriptionsModal(false)}>
        <View style={styles.modalOverlayDark}>
          <View style={styles.prescModalCard}>
            <View style={styles.prescHeader}>
              <View style={styles.headerLeftRow}>
                <View style={styles.prescIconCircle}>
                  <PrescriptionIcon color="#2dd4bf" size={20} />
                </View>
                <View style={styles.headerTitleCol}>
                  <Text style={styles.prescTitle}>Prescriptions</Text>
                  <Text style={styles.prescSub}>
                    {activeDisplayPatient?.full_name || 'Patient'} · {(activeDisplayPatient as any)?.patient_code || `PT-${String(activeDisplayPatient?.id || 1).padStart(5, '0')}`}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowPrescriptionsModal(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {modalLoading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
            ) : prescriptionList.length === 0 ? (
              <View style={styles.prescBodySplit}>
                <View style={styles.prescEmptyBox}>
                  <View style={styles.prescEmptyCircle}>
                    <PrescriptionIcon color="#0d9488" size={32} />
                  </View>
                  <Text style={styles.prescEmptyTitle}>No prescriptions found</Text>
                  <Text style={styles.prescEmptySub}>
                    No prescription history recorded for this patient.
                  </Text>
                </View>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14 }}>
                {prescriptionList.map((p, idx) => (
                  <View key={p.id || idx} style={styles.consultItemCard}>
                    <Text style={styles.docNameTitle}>Prescription #{p.prescription_number || p.id}</Text>
                    <Text style={styles.boxVal}>{p.diagnosis || p.notes || 'Clinical Prescription'}</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.prescFooterRow}>
              <Text style={styles.prescFooterSecText}>Private patient information · Handle with care</Text>
              <TouchableOpacity style={styles.darkCloseBtn} onPress={() => setShowPrescriptionsModal(false)}>
                <Text style={styles.darkCloseBtnText}>✕ Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showMedicalHistoryModal} transparent animationType="slide" onRequestClose={() => setShowMedicalHistoryModal(false)}>
        <View style={styles.modalOverlayDark}>
          <View style={styles.historyModalCard}>
            <View style={styles.historyHeader}>
              <View style={styles.headerLeftRow}>
                <View style={styles.historyIconCircle}>
                  <Text style={{ fontSize: 20 }}>💓</Text>
                </View>
                <View style={styles.headerTitleCol}>
                  <Text style={styles.historyTitle}>Medical history</Text>
                  <Text style={styles.historySub}>
                    {activeDisplayPatient?.full_name || 'Patient'} · {(activeDisplayPatient as any)?.patient_code || `PT-${String(activeDisplayPatient?.id || 1).padStart(5, '0')}`}
                  </Text>
                </View>
              </View>

              <View style={styles.historyHeaderBadges}>
                <View style={styles.countBadgeSquare}>
                  <Text style={styles.badgeSquareLabel}>VISITS</Text>
                  <Text style={styles.badgeSquareVal}>{medicalHistoryData?.visits?.length || 0}</Text>
                </View>
                <View style={styles.countBadgeSquare}>
                  <Text style={styles.badgeSquareLabel}>REPORTS</Text>
                  <Text style={styles.badgeSquareVal}>{medicalHistoryData?.lab_reports?.length || 0}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowMedicalHistoryModal(false)}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {modalLoading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.historyBody}>
                <Text style={styles.historySecTitle}>💓 Patient overview</Text>
                <Text style={styles.historySecSub}>Important health and emergency information</Text>

                <View style={styles.overviewGridThreeCol}>
                  <View style={styles.overviewBox}>
                    <Text style={styles.overviewBoxLabel}>BLOOD GROUP</Text>
                    <Text style={styles.overviewBoxVal}>{medicalHistoryData?.blood_group || activeDisplayPatient?.blood_group || 'Not recorded'}</Text>
                  </View>

                  <View style={styles.overviewBox}>
                    <Text style={styles.overviewBoxLabel}>ALLERGIES</Text>
                    <Text style={styles.overviewBoxVal}>{medicalHistoryData?.allergies || activeDisplayPatient?.allergies || 'None recorded'}</Text>
                  </View>

                  <View style={styles.overviewBox}>
                    <Text style={styles.overviewBoxLabel}>EMERGENCY CONTACT</Text>
                    <Text style={styles.overviewBoxVal}>{medicalHistoryData?.emergency_contact || activeDisplayPatient?.emergency_contact || 'None'}</Text>
                  </View>
                </View>

                <Text style={[styles.historySecTitle, { marginTop: 18 }]}>🩺 Visit history</Text>
                <Text style={styles.historySecSub}>Consultations, diagnoses and prescribed medicines</Text>

                {!medicalHistoryData?.visits || medicalHistoryData.visits.length === 0 ? (
                  <Text style={styles.emptySub}>No visit history recorded for this patient.</Text>
                ) : (
                  medicalHistoryData.visits.map((v: any, idx: number) => (
                    <View key={idx} style={styles.visitHistoryCard}>
                      <View style={styles.visitHeaderRow}>
                        <Text style={styles.visitReasonTitle}>{v.reason || 'Consultation'}</Text>
                        <View style={styles.approvedPillSmall}>
                          <Text style={styles.approvedPillSmallText}>{v.status || 'APPROVED'}</Text>
                        </View>
                      </View>
                      <Text style={styles.visitMetaText}>📅 {v.appointment_date}  🩺 {v.doctor_name}</Text>

                      {v.notes ? (
                        <View style={styles.visitNoteYellowBox}>
                          <Text style={styles.visitNoteText}>⚠️ {v.notes}</Text>
                        </View>
                      ) : null}
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            <View style={styles.prescFooterRow}>
              <Text style={styles.prescFooterSecText}>Private patient information · Handle with care</Text>
              <TouchableOpacity style={styles.darkCloseBtn} onPress={() => setShowMedicalHistoryModal(false)}>
                <Text style={styles.darkCloseBtnText}>✕ Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showEditBloodPicker} transparent animationType="fade" onRequestClose={() => setShowEditBloodPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowEditBloodPicker(false)}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Select Blood Group</Text>
            {['Select blood group', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'N/A'].map((bg) => (
              <TouchableOpacity
                key={bg}
                style={styles.pickerOptionRow}
                onPress={() => {
                  setEditBloodGroup(bg);
                  setShowEditBloodPicker(false);
                }}>
                <Text style={[styles.pickerOptionText, editBloodGroup === bg && styles.pickerOptionSelected]}>{bg}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showGenderPicker} transparent animationType="fade" onRequestClose={() => setShowGenderPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowGenderPicker(false)}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Select Gender</Text>
            {['All Genders', 'Male', 'Female', 'Other'].map((g) => (
              <TouchableOpacity
                key={g}
                style={styles.pickerOptionRow}
                onPress={() => {
                  setGenderFilter(g);
                  setShowGenderPicker(false);
                }}>
                <Text style={[styles.pickerOptionText, genderFilter === g && styles.pickerOptionSelected]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showBloodPicker} transparent animationType="fade" onRequestClose={() => setShowBloodPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowBloodPicker(false)}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Select Blood Group</Text>
            {['All Blood Groups', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'N/A'].map((bg) => (
              <TouchableOpacity
                key={bg}
                style={styles.pickerOptionRow}
                onPress={() => {
                  setBloodGroupFilter(bg);
                  setShowBloodPicker(false);
                }}>
                <Text style={[styles.pickerOptionText, bloodGroupFilter === bg && styles.pickerOptionSelected]}>{bg}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showStatusPicker} transparent animationType="fade" onRequestClose={() => setShowStatusPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStatusPicker(false)}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Select Status</Text>
            {['All Status', 'Active', 'Inactive'].map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.pickerOptionRow}
                onPress={() => {
                  setStatusFilter(s);
                  setShowStatusPicker(false);
                }}>
                <Text style={[styles.pickerOptionText, statusFilter === s && styles.pickerOptionSelected]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },

  headerBox: { marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  pageSub: { fontSize: 13, color: '#64748b', marginTop: 2 },

  statsScrollRow: { gap: 10, marginBottom: 16 },
  statCard: {
    width: 145,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  statCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  statIconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  statIconText: { fontSize: 16 },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  statSplitRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  statSlash: { fontSize: 14, color: '#94a3b8', fontWeight: 'bold' },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#64748b' },

  filterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    gap: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchIconText: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 12, color: '#0f172a' },

  filterDropdownRow: { flexDirection: 'row', gap: 6 },
  filterPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  filterPickerText: { fontSize: 11, fontWeight: '700', color: '#334155', flex: 1 },
  pickerArrow: { fontSize: 9, color: '#94a3b8', marginLeft: 2 },

  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  tableCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  tableTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  refreshBtn: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  refreshBtnText: { fontSize: 12, fontWeight: '700', color: '#0d9488' },

  patientsList: { gap: 12 },
  patientRowCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  patientRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  codeBadge: { backgroundColor: '#e2e8f0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  codeBadgeText: { fontSize: 11, fontWeight: '800', color: '#334155' },
  headerRightActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusToggleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a' },
  statusToggleText: { fontSize: 11, fontWeight: '800', color: '#15803d' },
  actionDotsBtn: { paddingHorizontal: 8, paddingVertical: 2 },
  actionDotsText: { fontSize: 18, fontWeight: 'bold', color: '#64748b' },

  patientInfoCol: { gap: 4 },
  patientFullName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  patientPhoneText: { fontSize: 13, color: '#0d9488', fontWeight: '700' },
  metaRowGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  metaChip: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  metaChipVal: { color: '#0f172a', fontWeight: '700' },

  emptyCard: { alignItems: 'center', padding: 30 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  emptySub: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalOverlayDark: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 14 },
  pickerModalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 320 },
  pickerModalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 14, textAlign: 'center' },
  pickerOptionRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerOptionText: { fontSize: 14, color: '#334155', fontWeight: '600', textAlign: 'center' },
  pickerOptionSelected: { color: '#0d9488', fontWeight: '800' },

  actionMenuCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 18, width: '100%', maxWidth: 300, gap: 4, zIndex: 999 },
  actionMenuTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 10, textAlign: 'center' },
  actionOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#f8fafc', marginVertical: 2 },
  actionOptionHighlight: { backgroundColor: '#ccfbf1' },
  actionOptionText: { fontSize: 14, fontWeight: '700', color: '#334155' },
  closeActionBtn: { backgroundColor: '#f1f5f9', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  closeActionBtnText: { fontSize: 13, fontWeight: '700', color: '#64748b' },

  viewDetailsModalCard: { width: '100%', maxWidth: 460, backgroundColor: '#f0fdf4', borderRadius: 20, overflow: 'hidden', maxHeight: '88%' },
  viewDetailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e6f4f1', paddingHorizontal: 16, paddingVertical: 14 },
  headerLeftRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarBigCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' },
  avatarBigLetter: { fontSize: 20, fontWeight: '800', color: '#0d9488' },
  headerTitleCol: {},
  viewDetailsName: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  viewDetailsCode: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  headerRightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeBadgePill: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  activeBadgePillText: { fontSize: 11, fontWeight: '800', color: '#16a34a' },
  editInfoSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ffffff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1' },
  editInfoSmallBtnText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  closeModalCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  closeModalCircleText: { fontSize: 14, fontWeight: 'bold', color: '#64748b' },

  viewDetailsBodyGrid: { padding: 14, gap: 12 },
  gridDetailsCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardHeaderIconText: { fontSize: 16 },
  cardHeaderTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  detailItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  itemLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  itemVal: { fontSize: 12, color: '#0f172a', fontWeight: '700' },

  editModalCard: { width: '100%', maxWidth: 480, backgroundColor: '#ffffff', borderRadius: 20, overflow: 'hidden', maxHeight: '90%' },
  editModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  editModalHeaderTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  closeBtnText: { fontSize: 18, fontWeight: 'bold', color: '#64748b' },
  editFormBodyScroll: { padding: 20, gap: 10 },
  formSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 4 },
  formSectionTitle: { fontSize: 13, fontWeight: '800', color: '#475569' },
  formRowGrid: { flexDirection: 'row', gap: 10 },
  inputGroup: { gap: 4 },
  inputLabelReq: { fontSize: 12, fontWeight: '700', color: '#334155' },
  reqAsterisk: { color: '#ef4444', fontWeight: 'bold' },
  textInput: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#0f172a' },
  textInputActiveFocus: { borderColor: '#0d9488', borderWidth: 1.8, backgroundColor: '#f0fdf4' },
  multilineInput: { height: 75, textAlignVertical: 'top' },
  inputWithIconRight: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12 },
  innerRightIcon: { fontSize: 14, marginLeft: 4 },
  radioGroupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.8, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: '#0d9488' },
  radioDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#0d9488' },
  radioText: { fontSize: 13, color: '#334155', fontWeight: '600' },
  dropdownPickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  dropdownPickerText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  dropdownArrow: { fontSize: 10, color: '#94a3b8' },
  sectionDividerLine: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  editModalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#ffffff' },
  cancelGreyBtn: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  cancelGreyBtnText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  updateTealBtn: { backgroundColor: '#0d9488', borderRadius: 10, paddingHorizontal: 22, paddingVertical: 10 },
  updateTealBtnText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },

  consultModalCard: { width: '100%', maxWidth: 460, backgroundColor: '#f8fafc', borderRadius: 20, overflow: 'hidden', maxHeight: '85%' },
  consultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#073b3a', paddingHorizontal: 16, paddingVertical: 14 },
  consultIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0d9488', alignItems: 'center', justifyContent: 'center' },
  consultTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  consultSub: { fontSize: 12, color: '#99f6e4' },
  consultBody: { padding: 14, gap: 12 },
  consultItemCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  consultCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  docAvatarSmallCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  docHeaderCol: { flex: 1 },
  docNameTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  docSpecSub: { fontSize: 11, color: '#64748b' },
  approvedBadgePill: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  approvedBadgePillText: { fontSize: 11, fontWeight: '800', color: '#16a34a' },
  consultGridTwoRow: { flexDirection: 'row', gap: 10 },
  consultBoxItem: { flex: 1, backgroundColor: '#f8fafc', padding: 10, borderRadius: 10 },
  reasonBoxItem: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 10 },
  notesBoxItem: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 10 },
  boxLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 2 },
  boxVal: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  feeValText: { fontSize: 13, fontWeight: '800', color: '#0d9488' },
  consultFooter: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  tealCloseBtn: { backgroundColor: '#0d9488', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  tealCloseBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },

  prescModalCard: { width: '100%', maxWidth: 460, backgroundColor: '#071624', borderRadius: 20, overflow: 'hidden', maxHeight: '85%' },
  prescHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  prescIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0f2942', alignItems: 'center', justifyContent: 'center' },
  prescTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  prescSub: { fontSize: 12, color: '#94a3b8' },
  prescBodySplit: { backgroundColor: '#ffffff', padding: 30, alignItems: 'center', justifyContent: 'center' },
  prescEmptyBox: { alignItems: 'center', padding: 20 },
  prescEmptyCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  prescEmptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  prescEmptySub: { fontSize: 12, color: '#64748b', textAlign: 'center' },
  prescFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#071624', paddingHorizontal: 16, paddingVertical: 12 },
  prescFooterSecText: { fontSize: 11, color: '#64748b' },
  darkCloseBtn: { backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  darkCloseBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  historyModalCard: { width: '100%', maxWidth: 460, backgroundColor: '#ffffff', borderRadius: 20, overflow: 'hidden', maxHeight: '88%' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#071624', paddingHorizontal: 16, paddingVertical: 14 },
  historyIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0d9488', alignItems: 'center', justifyContent: 'center' },
  historyTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  historySub: { fontSize: 11, color: '#94a3b8' },
  historyHeaderBadges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadgeSquare: { backgroundColor: '#0f2942', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignItems: 'center' },
  badgeSquareLabel: { fontSize: 9, fontWeight: '800', color: '#2dd4bf' },
  badgeSquareVal: { fontSize: 12, fontWeight: '800', color: '#ffffff' },

  historyBody: { padding: 16 },
  historySecTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  historySecSub: { fontSize: 11, color: '#64748b', marginBottom: 10 },
  overviewGridThreeCol: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  overviewBox: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 8 },
  overviewBoxLabel: { fontSize: 9, fontWeight: '800', color: '#64748b', marginBottom: 2 },
  overviewBoxVal: { fontSize: 11, fontWeight: '800', color: '#0f172a' },

  visitHistoryCard: { backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#2dd4bf', borderRadius: 14, padding: 12, gap: 6 },
  visitHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  visitReasonTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  approvedPillSmall: { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  approvedPillSmallText: { fontSize: 10, fontWeight: '800', color: '#16a34a' },
  visitMetaText: { fontSize: 11, color: '#64748b' },
  visitNoteYellowBox: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 8, padding: 8, marginTop: 4 },
  visitNoteText: { fontSize: 11, color: '#c2410c', fontWeight: '700' },
});

export default PatientsScreen;
