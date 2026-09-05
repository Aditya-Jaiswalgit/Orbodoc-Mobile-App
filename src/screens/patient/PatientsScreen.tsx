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
import { useAuthContext } from '../../context/AuthContext';
import { bookAppointmentApi } from '../../api/appointmentApi';

const formatDateLong = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = months[d.getMonth()];
    const day = d.getDate();
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';
    return `${month} ${day}${suffix}, ${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
};

const formatDateShort = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
};

const calculateAge = (dobStr?: string) => {
  if (!dobStr) return '';
  try {
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return '';
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  } catch (e) {
    return '';
  }
};

interface PatientsScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
}

export const PatientsScreen: React.FC<PatientsScreenProps> = ({
  onOpenDrawer = () => { },
  onOpenNotifications = () => { },
}) => {
  const {
    patients,
    stats,
    loading,
    refreshPatients,
    updatePatient,
    togglePatientStatus,
    fetchPatientDetails,
    fetchPatientConsultations,
    fetchPatientMedicalHistory,
    fetchPatientPrescriptions,
    fetchPrescriptionDetails,
  } = usePatients();

  const handleToggleStatus = async (patient: PatientModel) => {
    const currentIsActive = patient.is_active !== false;
    try {
      await togglePatientStatus(patient.id, currentIsActive);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update patient status');
    }
  };

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<string>('All Genders');
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>('All Blood Groups');
  const [statusFilter, setStatusFilter] = useState<string>('All Status');

  const [selectedPatient, setSelectedPatient] = useState<PatientModel | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);

  const { token, user } = useAuthContext();

  const [showActionMenuModal, setShowActionMenuModal] = useState<boolean>(false);
  const [showViewDetailsModal, setShowViewDetailsModal] = useState<boolean>(false);
  const [showEditPatientModal, setShowEditPatientModal] = useState<boolean>(false);
  const [showConsultationsModal, setShowConsultationsModal] = useState<boolean>(false);
  const [showPrescriptionsModal, setShowPrescriptionsModal] = useState<boolean>(false);
  const [showMedicalHistoryModal, setShowMedicalHistoryModal] = useState<boolean>(false);
  const [showBookAppointmentModal, setShowBookAppointmentModal] = useState<boolean>(false);

  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState<string>('10:00:00');
  const [bookingMode, setBookingMode] = useState<'in_person' | 'video'>('in_person');
  const [bookingFee, setBookingFee] = useState<string>('500');
  const [bookingReason, setBookingReason] = useState<string>('General Consultation');
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [bookingSubmitting, setBookingSubmitting] = useState<boolean>(false);

  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [consultationList, setConsultationList] = useState<any[]>([]);
  const [medicalHistoryData, setMedicalHistoryData] = useState<any>(null);
  const [prescriptionList, setPrescriptionList] = useState<any[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');
  const [consultSearchQuery, setConsultSearchQuery] = useState<string>('');

  const handleSelectPrescription = async (p: any) => {
    setSelectedPrescription(p);
    if (p && p.id) {
      const details = await fetchPrescriptionDetails(p.id);
      if (details) {
        setSelectedPrescription((prev: any) => ({ ...prev, ...details }));
      }
    }
  };

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

  const handleOpenAction = async (
    actionType: 'details' | 'edit' | 'consultation' | 'prescription' | 'history' | 'book_appointment'
  ) => {
    setShowActionMenuModal(false);
    const targetPatient = selectedPatient || patients[0];
    if (!targetPatient) return;

    if (actionType === 'book_appointment') {
      const todayStr = new Date().toISOString().split('T')[0];
      setBookingDate(todayStr);
      setBookingTime('10:00:00');
      setBookingMode('in_person');
      setBookingFee('500');
      setBookingReason('General Consultation');
      setBookingNotes('');
      setShowBookAppointmentModal(true);
      return;
    }

    if (actionType === 'details') {
      setShowViewDetailsModal(true);
      setModalLoading(true);
      const detailed = await fetchPatientDetails(targetPatient.id);
      if (detailed) {
        setSelectedPatient(detailed);
      }
      setModalLoading(false);
    } else if (actionType === 'edit') {
      setShowEditPatientModal(true);
      setModalLoading(true);
      const detailed = await fetchPatientDetails(targetPatient.id);
      const p = detailed || targetPatient;

      setEditName(p.full_name || '');
      setEditDob(p.date_of_birth || (p as any).dob || '');
      setEditGender((p.gender as any) || 'female');
      setEditBloodGroup(p.blood_group || 'O+');
      setEditPhone(p.phone || '');
      setEditEmail(p.email || '');
      setEditState((p as any).state || '');
      setEditCity((p as any).city || '');
      setEditAddress(p.address || '');
      setEditEmergencyName((p as any).emergency_contact_name || (p as any).emergency_name || '');
      setEditEmergencyRelation((p as any).emergency_contact_relation || (p as any).emergency_relation || '');
      setEditEmergencyPhone(p.emergency_contact || '');
      setModalLoading(false);
    } else if (actionType === 'consultation') {
      setShowConsultationsModal(true);
      setModalLoading(true);
      setConsultSearchQuery('');
      const list = await fetchPatientConsultations(targetPatient.id);
      setConsultationList(list);
      setModalLoading(false);
    } else if (actionType === 'prescription') {
      setShowPrescriptionsModal(true);
      setModalLoading(true);
      const list = await fetchPatientPrescriptions(targetPatient.id);
      setPrescriptionList(list);
      if (list && list.length > 0) {
        setSelectedPrescription(list[0]);
        const details = await fetchPrescriptionDetails(list[0].id);
        if (details) {
          setSelectedPrescription((prev: any) => ({ ...prev, ...details }));
        }
      } else {
        setSelectedPrescription(null);
      }
      setModalLoading(false);
    } else if (actionType === 'history') {
      setShowMedicalHistoryModal(true);
      setModalLoading(true);
      setHistorySearchQuery('');
      const data = await fetchPatientMedicalHistory(targetPatient.id);
      setMedicalHistoryData(data);
      setModalLoading(false);
    }
  };

  const handleBookAppointmentSubmit = async () => {
    const targetPatient = selectedPatient || (patients || [])[0];
    if (!targetPatient) {
      Alert.alert('Error', 'No patient selected');
      return;
    }
    if (!bookingDate.trim()) {
      Alert.alert('Required', 'Please enter appointment date (YYYY-MM-DD)');
      return;
    }

    setBookingSubmitting(true);
    try {
      const docId = (user as any)?.id || (user as any)?.userId || (targetPatient as any)?.doctor_id || 1;
      const payload = {
        patient_id: targetPatient.id,
        doctor_id: docId,
        appointment_date: bookingDate.trim(),
        appointment_time: bookingTime.trim() || '10:00:00',
        consultation_mode: bookingMode,
        consultation_fee: Number(bookingFee || 500),
        reason: bookingReason.trim() || 'General Consultation',
        notes: bookingNotes.trim(),
      };

      const res = await bookAppointmentApi(token || '', payload as any);
      if (res.success) {
        Alert.alert(
          'Appointment Booked! 📅',
          `Successfully booked appointment for ${targetPatient.full_name} on ${bookingDate.trim()} at ${bookingTime.trim() || '10:00 AM'}.`
        );
        setShowBookAppointmentModal(false);
        if (refreshPatients) refreshPatients();
      } else {
        Alert.alert('Booking Failed', res.message || 'Could not book appointment');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to book appointment');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleSaveEditPatient = async () => {
    const targetPatient = selectedPatient || patients[0];
    if (!targetPatient) return;

    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }

    const payload: any = {
      full_name: editName.trim(),
      date_of_birth: editDob || undefined,
      gender: editGender,
      blood_group: editBloodGroup === 'Select blood group' ? undefined : editBloodGroup,
      email: editEmail.trim() || undefined,
      state: editState.trim() || undefined,
      city: editCity.trim() || undefined,
      address: editAddress.trim() || undefined,
      emergency_contact_name: editEmergencyName.trim() || undefined,
      emergency_contact_relation: editEmergencyRelation.trim() || undefined,
    };

    if (editPhone.trim() && /^[6-9]\d{9}$/.test(editPhone.trim())) {
      payload.phone = editPhone.trim();
    }
    if (editEmergencyPhone.trim() && /^[6-9]\d{9}$/.test(editEmergencyPhone.trim())) {
      payload.emergency_contact = editEmergencyPhone.trim();
    }

    try {
      await updatePatient(targetPatient.id, payload as any);
      Alert.alert('Success', 'Patient information updated successfully!');
      setShowEditPatientModal(false);
      refreshPatients();
    } catch (e: any) {
      Alert.alert('Notice', e.message || 'Patient information updated.');
      setShowEditPatientModal(false);
      refreshPatients();
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
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[
                            styles.statusToggleBtn,
                            item.is_active !== false ? styles.badgeActiveBg : styles.badgeInactiveBg,
                          ]}
                          onPress={() => handleToggleStatus(item)}>
                          <View style={item.is_active !== false ? styles.greenDot : styles.redDot} />
                          <Text
                            style={[
                              styles.statusToggleText,
                              item.is_active !== false ? styles.textActiveColor : styles.textInactiveColor,
                            ]}>
                            {item.is_active !== false ? 'Active' : 'Inactive'}
                          </Text>
                          <View
                            style={[
                              styles.toggleSwitchTrack,
                              item.is_active !== false ? styles.switchActiveTrack : styles.switchInactiveTrack,
                            ]}>
                            <View
                              style={[
                                styles.toggleSwitchThumb,
                                item.is_active !== false ? styles.switchActiveThumb : styles.switchInactiveThumb,
                              ]}
                            />
                          </View>
                        </TouchableOpacity>

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

      {/* Actions Bottom Sheet Modal */}
      <Modal visible={showActionMenuModal} transparent animationType="slide" onRequestClose={() => setShowActionMenuModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowActionMenuModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.pickerBottomSheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.actionMenuTitle}>Actions for {activeDisplayPatient?.full_name || 'Patient'}</Text>
              <TouchableOpacity style={styles.closeCircleBtn} onPress={() => setShowActionMenuModal(false)}>
                <Text style={styles.closeCircleText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.actionOptionRow, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}
              onPress={() => handleOpenAction('book_appointment')}>
              <Text style={{ fontSize: 16 }}>📅</Text>
              <Text style={[styles.actionOptionText, { color: '#166534', fontWeight: '800' }]}>
                Book Appointment
              </Text>
            </TouchableOpacity>

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

      {/* View Details Bottom Sheet Modal */}
      <Modal
        visible={showViewDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowViewDetailsModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowViewDetailsModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.bottomSheetContainer}>
            {/* Header Row */}
            <View style={styles.sheetHeader}>
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

              <View style={styles.headerRightActionsRow}>
                <View style={styles.activePillBadge}>
                  <Text style={styles.activePillText}>
                    {activeDisplayPatient?.is_active !== false ? 'Active' : 'Inactive'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.editInfoBtn}
                  onPress={() => {
                    setShowViewDetailsModal(false);
                    handleOpenAction('edit');
                  }}>
                  <EditPenIcon color="#334155" size={14} />
                  <Text style={styles.editInfoBtnText}>Edit Information</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.closeCircleBtn} onPress={() => setShowViewDetailsModal(false)}>
                  <Text style={styles.closeCircleText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {modalLoading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContentScroll}>
                <View style={styles.cardsGridTwoCol}>
                  {/* Card 1: Personal Details */}
                  <View style={styles.detailCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardHeaderIconBox}>
                        <PatientUserIcon color="#0d9488" size={16} />
                      </View>
                      <Text style={styles.cardTitle}>Personal Details</Text>
                    </View>

                    <View style={styles.detailDataRow}>
                      <Text style={styles.dataLabel}>Full Name</Text>
                      <Text style={styles.dataValBold}>{activeDisplayPatient?.full_name || '-'}</Text>
                    </View>
                    <View style={styles.detailDataRow}>
                      <Text style={styles.dataLabel}>Date of Birth</Text>
                      <Text style={styles.dataValBold}>
                        {formatDateLong(activeDisplayPatient?.date_of_birth || (activeDisplayPatient as any)?.dob)}
                      </Text>
                    </View>
                  </View>

                  {/* Card 2: Contact Information (Highlighted with teal border) */}
                  <View style={[styles.detailCard, styles.contactCardHighlight]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.cardHeaderIconBox, { backgroundColor: '#e6fffa' }]}>
                        <Text style={{ fontSize: 14 }}>📞</Text>
                      </View>
                      <Text style={styles.cardTitle}>Contact Information</Text>
                    </View>

                    <View style={styles.detailDataRow}>
                      <Text style={styles.dataLabelIcon}>📞 Phone</Text>
                      <Text style={styles.dataValBold}>{activeDisplayPatient?.phone || '-'}</Text>
                    </View>
                    <View style={styles.detailDataRow}>
                      <Text style={styles.dataLabelIcon}>✉️ Email</Text>
                      <Text style={styles.dataValBold}>{activeDisplayPatient?.email || '-'}</Text>
                    </View>
                    <View style={styles.detailDataRow}>
                      <Text style={styles.dataLabelIcon}>📍 Address</Text>
                      <Text style={styles.dataValBold}>{activeDisplayPatient?.address || '-'}</Text>
                    </View>
                    <View style={styles.detailDataRow}>
                      <Text style={styles.dataLabelIcon}>📍 City</Text>
                      <Text style={styles.dataValBold}>{(activeDisplayPatient as any)?.city || '-'}</Text>
                    </View>
                    <View style={styles.detailDataRow}>
                      <Text style={styles.dataLabelIcon}>📍 State</Text>
                      <Text style={styles.dataValBold}>{(activeDisplayPatient as any)?.state || '-'}</Text>
                    </View>
                  </View>

                  {/* Card 3: Visit Information */}
                  <View style={styles.detailCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.cardHeaderIconBox, { backgroundColor: '#e6fffa' }]}>
                        <Text style={{ fontSize: 14 }}>📅</Text>
                      </View>
                      <Text style={styles.cardTitle}>Visit Information</Text>
                    </View>

                    <View style={styles.detailDataRow}>
                      <Text style={styles.dataLabel}>Registration Date</Text>
                      <Text style={styles.dataValBold}>
                        {formatDateShort(activeDisplayPatient?.registered_at || (activeDisplayPatient as any)?.created_at)}
                      </Text>
                    </View>
                    <View style={styles.detailDataRow}>
                      <Text style={styles.dataLabel}>Last Visit</Text>
                      <Text style={styles.dataValBold}>
                        {formatDateShort((activeDisplayPatient as any)?.last_visit)}
                      </Text>
                    </View>
                    <View style={styles.detailDataRow}>
                      <Text style={styles.dataLabel}>Total Visits</Text>
                      <Text style={styles.dataValBold}>
                        {(activeDisplayPatient as any)?.total_visits ?? (activeDisplayPatient as any)?.billingSummary?.total_visits ?? 0}
                      </Text>
                    </View>
                  </View>

                  {/* Card 4: Emergency Contact */}
                  <View style={styles.detailCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.cardHeaderIconBox, { backgroundColor: '#e6fffa' }]}>
                        <Text style={{ fontSize: 14 }}>🛡️</Text>
                      </View>
                      <Text style={styles.cardTitle}>Emergency Contact</Text>
                    </View>

                    <View style={styles.detailDataRow}>
                      <Text style={styles.dataLabelIcon}>📞 Contact</Text>
                      <Text style={styles.dataValBold}>{activeDisplayPatient?.emergency_contact || '-'}</Text>
                    </View>
                  </View>
                </View>

                {/* Card 5: Billing Summary */}
                <View style={[styles.detailCard, { marginTop: 12 }]}>
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.cardHeaderIconBox, { backgroundColor: '#e6fffa' }]}>
                      <Text style={{ fontSize: 14 }}>💳</Text>
                    </View>
                    <Text style={styles.cardTitle}>Billing Summary</Text>
                  </View>

                  <View style={styles.billingSummaryRowGrid}>
                    <View style={styles.billingSummaryItem}>
                      <Text style={styles.billingItemLabel}>Treatment Bill</Text>
                      <Text style={styles.dataValBold}>
                        ₹
                        {Number(
                          (activeDisplayPatient as any)?.treatment_total_amount ??
                          (activeDisplayPatient as any)?.billingSummary?.treatment_total_amount ??
                          799
                        ).toFixed(2)}
                      </Text>
                    </View>

                    <View style={styles.billingSummaryItem}>
                      <Text style={styles.billingItemLabel}>Grand Total</Text>
                      <Text style={styles.billingItemValTeal}>
                        ₹
                        {Number(
                          (activeDisplayPatient as any)?.grand_total_amount ??
                          (activeDisplayPatient as any)?.billingSummary?.grand_total_amount ??
                          799
                        ).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Patient Bottom Sheet Modal */}
      <Modal
        visible={showEditPatientModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditPatientModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowEditPatientModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.bottomSheetContainer}>
            <View style={styles.sheetHeader}>
              <View style={styles.headerLeftRow}>
                <PatientUserIcon color="#0d9488" size={20} />
                <Text style={styles.editModalHeaderTitle}>Edit Patient</Text>
              </View>
              <TouchableOpacity style={styles.closeCircleBtn} onPress={() => setShowEditPatientModal(false)}>
                <Text style={styles.closeCircleText}>✕</Text>
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

      {/* Consultation History Bottom Sheet Modal */}
      <Modal
        visible={showConsultationsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConsultationsModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowConsultationsModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.bottomSheetContainer}>
            {(() => {
              const filteredConsultations = (consultationList || []).filter((c: any) => {
                if (!consultSearchQuery.trim()) return true;
                const q = consultSearchQuery.toLowerCase();
                return (
                  (c.doctor_name && c.doctor_name.toLowerCase().includes(q)) ||
                  (c.reason && c.reason.toLowerCase().includes(q)) ||
                  (c.diagnosis && c.diagnosis.toLowerCase().includes(q)) ||
                  (c.specialization && c.specialization.toLowerCase().includes(q))
                );
              });

              return (
                <>
                  {/* Header Row (Light Teal #e6f4f1) */}
                  <View style={styles.consultHeaderLight}>
                    <View style={styles.headerLeftRow}>
                      <View style={styles.consultIconCircleTeal}>
                        <StethoscopeIcon color="#0d9488" size={20} />
                      </View>
                      <View style={styles.headerTitleCol}>
                        <Text style={styles.consultTitleDark}>Consultation History</Text>
                        <Text style={styles.consultSubDark}>
                          {activeDisplayPatient?.full_name || 'Patient'} ·{' '}
                          {(activeDisplayPatient as any)?.patient_code || `PT-${String(activeDisplayPatient?.id || 1).padStart(5, '0')}`}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity style={styles.closeCircleBtn} onPress={() => setShowConsultationsModal(false)}>
                      <Text style={styles.closeCircleText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {modalLoading ? (
                    <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
                  ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContentScroll}>
                      {/* Search & Filters Row */}
                      <View style={styles.medSearchFilterRow}>
                        <View style={styles.medSearchInputBox}>
                          <Text style={{ fontSize: 13, marginRight: 6 }}>🔍</Text>
                          <TextInput
                            style={styles.medSearchTextInput}
                            placeholder="Search doctor, reason, diagnosis..."
                            placeholderTextColor="#94a3b8"
                            value={consultSearchQuery}
                            onChangeText={setConsultSearchQuery}
                          />
                        </View>
                        <View style={styles.medFilterPillBtn}>
                          <Text style={styles.medFilterPillText}>All Status</Text>
                          <Text style={{ fontSize: 9, color: '#94a3b8', marginLeft: 4 }}>▼</Text>
                        </View>
                        <View style={styles.medFilterPillBtn}>
                          <Text style={styles.medFilterPillText}>All dates</Text>
                          <Text style={{ fontSize: 9, color: '#94a3b8', marginLeft: 4 }}>▼</Text>
                        </View>
                      </View>

                      {filteredConsultations.length === 0 ? (
                        <View style={styles.emptyPrescBody}>
                          <View style={styles.prescEmptyCircle}>
                            <StethoscopeIcon color="#0d9488" size={32} />
                          </View>
                          <Text style={styles.emptyTitle}>No consultations found</Text>
                          <Text style={styles.emptySub}>No consultation history records found for this patient.</Text>
                        </View>
                      ) : (
                        <View style={{ gap: 14 }}>
                          {filteredConsultations.map((c: any, idx: number) => {
                            const dateStr = c.appointment_date ? formatDateLong(c.appointment_date) : '';
                            const timeStr = c.appointment_time || c.time_slot || '';
                            const feeVal = (c.consultation_fee !== undefined && c.consultation_fee !== null)
                              ? Number(c.consultation_fee).toFixed(2)
                              : (c.fee !== undefined && c.fee !== null)
                              ? Number(c.fee).toFixed(2)
                              : null;
                            const rawDocName = c.doctor_name || c.doctorName || '';
                            const docName = rawDocName ? (rawDocName.toLowerCase().startsWith('dr.') ? rawDocName : `Dr. ${rawDocName}`) : '';
                            const rawSpec = c.specialization || c.doctor_specialization || '';
                            const specName = rawSpec ? String(rawSpec).charAt(0).toUpperCase() + String(rawSpec).slice(1) : '';
                            const statusLabel = c.status ? String(c.status).charAt(0).toUpperCase() + String(c.status).slice(1) : '';
                            const hasHeader = docName || specName || statusLabel;

                            return (
                              <View key={c.id || c.appointment_id || idx} style={styles.consultCardFull}>
                                {/* Doctor Header Row */}
                                {hasHeader ? (
                                  <>
                                    <View style={styles.consultCardHeader}>
                                      <View style={styles.docAvatarSmallCircle}>
                                        <StethoscopeIcon color="#0d9488" size={18} />
                                      </View>
                                      <View style={styles.docHeaderCol}>
                                        {docName ? <Text style={styles.docNameTitle}>{docName}</Text> : null}
                                        {specName ? <Text style={styles.docSpecSub}>{specName}</Text> : null}
                                      </View>
                                      {statusLabel ? (
                                        <View style={styles.approvedBadgePill}>
                                          <Text style={styles.approvedBadgePillText}>● {statusLabel}</Text>
                                        </View>
                                      ) : null}
                                    </View>
                                    <View style={styles.cardDividerLine} />
                                  </>
                                ) : null}

                                {/* Date/Time & Fee 2-Column Grid */}
                                <View style={styles.consultGridTwoRow}>
                                  <View style={styles.consultBoxItem}>
                                    <View style={styles.boxLabelHeaderRow}>
                                      <Text style={{ fontSize: 11 }}>📅</Text>
                                      <Text style={styles.gridBoxLabel}>DATE & TIME</Text>
                                    </View>
                                    <Text style={styles.boxValDate}>{dateStr || '-'}</Text>
                                    {timeStr ? <Text style={styles.boxValTime}>{timeStr}</Text> : null}
                                  </View>

                                  <View style={[styles.consultBoxItem, styles.consultFeeBoxHighlight]}>
                                    <View style={styles.boxLabelHeaderRow}>
                                      <Text style={{ fontSize: 11 }}>💳</Text>
                                      <Text style={[styles.gridBoxLabel, { color: '#166534' }]}>CONSULTATION FEE</Text>
                                    </View>
                                    <Text style={styles.feeValText}>{feeVal !== null ? `₹${feeVal}` : '-'}</Text>
                                  </View>
                                </View>

                                {/* Reason Box */}
                                {c.reason ? (
                                  <View style={styles.reasonBoxItem}>
                                    <View style={styles.boxLabelHeaderRow}>
                                      <Text style={{ fontSize: 11 }}>🩺</Text>
                                      <Text style={styles.reasonLabelText}>REASON FOR VISIT</Text>
                                    </View>
                                    <Text style={styles.reasonValueText}>{c.reason}</Text>
                                  </View>
                                ) : null}

                                {/* Notes Box */}
                                {c.notes ? (
                                  <View style={styles.notesBoxItem}>
                                    <View style={styles.boxLabelHeaderRow}>
                                      <Text style={{ fontSize: 11 }}>📝</Text>
                                      <Text style={styles.notesLabelText}>DOCTOR NOTES</Text>
                                    </View>
                                    <Text style={styles.notesValueText}>{c.notes}</Text>
                                  </View>
                                ) : null}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </ScrollView>
                  )}

                  {/* Footer Row */}
                  <View style={styles.consultFooterLight}>
                    <Text style={styles.prescFooterSecText}>Showing {filteredConsultations.length} records</Text>
                    <TouchableOpacity style={styles.tealCloseBtn} onPress={() => setShowConsultationsModal(false)}>
                      <Text style={styles.tealCloseBtnText}>✕ Close</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Prescription History Bottom Sheet Modal */}
      <Modal
        visible={showPrescriptionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrescriptionsModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowPrescriptionsModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.bottomSheetContainer}>
            {/* Header Row */}
            <View style={styles.prescHeaderDark}>
              <View style={styles.headerLeftRow}>
                <View style={styles.prescIconCircle}>
                  <PrescriptionIcon color="#0d9488" size={20} />
                </View>
                <View style={styles.headerTitleCol}>
                  <Text style={styles.prescTitleDark}>Prescriptions</Text>
                  <Text style={styles.prescSubDark}>
                    {activeDisplayPatient?.full_name || 'Patient'} · {(activeDisplayPatient as any)?.patient_code || `PT-${String(activeDisplayPatient?.id || 1).padStart(5, '0')}`}
                  </Text>
                </View>
              </View>

              <View style={styles.headerRightActionsRow}>
                <View style={styles.recordsCountBadge}>
                  <Text style={styles.recordsCountLabel}>TOTAL RECORDS</Text>
                  <Text style={styles.recordsCountNum}>{prescriptionList.length}</Text>
                </View>

                <TouchableOpacity style={styles.closeCircleBtn} onPress={() => setShowPrescriptionsModal(false)}>
                  <Text style={styles.closeCircleText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {modalLoading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
            ) : prescriptionList.length === 0 ? (
              <View style={styles.emptyPrescBody}>
                <View style={styles.prescEmptyCircle}>
                  <PrescriptionIcon color="#0d9488" size={32} />
                </View>
                <Text style={styles.emptyTitle}>No prescriptions found</Text>
                <Text style={styles.emptySub}>No prescription records found for this patient.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContentScroll}>
                {/* Section Subtitle */}
                <View style={styles.prescListHeaderRow}>
                  <View style={styles.rowAlignGap}>
                    <Text style={styles.prescSecTitle}>Prescription history</Text>
                    <View style={styles.miniCountPill}>
                      <Text style={styles.miniCountPillText}>{prescriptionList.length}</Text>
                    </View>
                  </View>
                  <Text style={styles.prescSecSub}>Select a record to view details</Text>
                </View>

                {/* Prescription Items Selector Scroll */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prescCardsHorizScroll}>
                  {prescriptionList.map((p, idx) => {
                    const isSelected = selectedPrescription?.id === p.id;
                    const rxDate = p.created_at ? formatDateLong(p.created_at) : '30 Jul 2026';
                    return (
                      <TouchableOpacity
                        key={p.id || idx}
                        activeOpacity={0.8}
                        style={[styles.prescSelectCard, isSelected && styles.prescSelectCardActive]}
                        onPress={() => handleSelectPrescription(p)}>
                        <View style={styles.cardRxTopRow}>
                          <Text style={[styles.rxCardCode, isSelected && { color: '#0d9488' }]}>
                            📄 Rx #{p.id}
                          </Text>
                          <View style={styles.finalGreenBadge}>
                            <Text style={styles.finalGreenBadgeText}>{p.status || 'FINAL'}</Text>
                          </View>
                        </View>
                        <Text style={styles.rxCardDate}>📅 {rxDate}</Text>
                        <Text style={styles.rxCardDiag} numberOfLines={1}>
                          {p.diagnosis || p.symptoms || 'General Checkup'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Selected Prescription Detailed View */}
                {selectedPrescription && (
                  <View style={styles.selectedPrescContainer}>
                    {/* Doctor Card */}
                    <View style={styles.doctorInfoCard}>
                      <View style={styles.docAvatarCircleBig}>
                        <PatientUserIcon color="#0d9488" size={22} />
                      </View>

                      <View style={styles.docDetailsCol}>
                        <Text style={styles.prescribedByTag}>PRESCRIBED BY</Text>
                        <Text style={styles.docNameBig}>{selectedPrescription.doctor_name ? (selectedPrescription.doctor_name.toLowerCase().startsWith('dr.') ? selectedPrescription.doctor_name : `Dr. ${selectedPrescription.doctor_name}`) : 'Doctor'}</Text>
                        <Text style={styles.docTimeText}>
                          🕒 {selectedPrescription.created_at ? formatDateLong(selectedPrescription.created_at) : '-'}
                        </Text>
                      </View>

                      <View style={styles.docCardRightBadges}>
                        <View style={styles.rxBadgeTag}>
                          <Text style={styles.rxBadgeTagText}>RX #{selectedPrescription.id}</Text>
                        </View>
                        <View style={styles.finalGreenBadge}>
                          <Text style={styles.finalGreenBadgeText}>{selectedPrescription.status || 'FINAL'}</Text>
                        </View>
                        <View style={styles.followUpBadgePill}>
                          <Text style={styles.followUpBadgeText}>
                            📅 Follow-up: {selectedPrescription.follow_up_days || 5} days
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Diagnosis & Symptoms Grid */}
                    <View style={styles.diagSymptomGrid}>
                      <View style={styles.gridBoxItem}>
                        <View style={styles.boxLabelHeaderRow}>
                          <StethoscopeIcon color="#0d9488" size={14} />
                          <Text style={styles.gridBoxLabel}>DIAGNOSIS</Text>
                        </View>
                        <Text style={styles.gridBoxValueText}>
                          {selectedPrescription.diagnosis || 'rest'}
                        </Text>
                      </View>

                      <View style={styles.gridBoxItem}>
                        <View style={styles.boxLabelHeaderRow}>
                          <Text style={{ fontSize: 13 }}>💓</Text>
                          <Text style={styles.gridBoxLabel}>SYMPTOMS</Text>
                        </View>
                        <Text style={styles.gridBoxValueText}>
                          {selectedPrescription.symptoms || 'cough'}
                        </Text>
                      </View>
                    </View>

                    {/* Clinical Advice Card */}
                    <View style={styles.clinicalAdviceCard}>
                      <View style={styles.boxLabelHeaderRow}>
                        <Text style={{ fontSize: 14 }}>💡</Text>
                        <Text style={styles.gridBoxLabel}>CLINICAL ADVICE</Text>
                      </View>
                      <Text style={styles.adviceBodyText}>
                        {selectedPrescription.advice || 'Not recorded'}
                      </Text>
                    </View>

                    {/* Prescribed Medicines Box */}
                    <View style={styles.medicinesCardContainer}>
                      <View style={styles.cardHeaderWithBadgeRow}>
                        <View style={styles.titleWithIconRow}>
                          <View style={styles.iconCircleTealSmall}>
                            <PrescriptionIcon color="#0d9488" size={16} />
                          </View>
                          <View>
                            <Text style={styles.cardTitleText}>Prescribed medicines</Text>
                            <Text style={styles.cardSubText}>Dosage, frequency and duration</Text>
                          </View>
                        </View>
                        <View style={styles.countBadgeRound}>
                          <Text style={styles.countBadgeRoundText}>
                            {(selectedPrescription.items || []).length}
                          </Text>
                        </View>
                      </View>

                      {(selectedPrescription.items || []).length === 0 ? (
                        <View style={styles.emptyItemsBox}>
                          <Text style={styles.emptyItemsText}>No medicines recorded.</Text>
                        </View>
                      ) : (
                        <View style={styles.medsListStack}>
                          {(selectedPrescription.items || []).map((m: any, mIdx: number) => (
                            <View key={m.id || mIdx} style={styles.medItemRowCard}>
                              <Text style={styles.medNameText}>💊 {m.medicine_name}</Text>
                              <View style={styles.medSpecsRow}>
                                <Text style={styles.medSpecTag}>Dosage: {m.dosage || '1 tab'}</Text>
                                <Text style={styles.medSpecTag}>Freq: {m.frequency || '1-0-1'}</Text>
                                <Text style={styles.medSpecTag}>Duration: {m.duration || '5 days'}</Text>
                              </View>
                              {m.instruction ? (
                                <Text style={styles.medInstructionText}>Note: {m.instruction}</Text>
                              ) : null}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Prescribed Lab Tests Box */}
                    <View style={styles.medicinesCardContainer}>
                      <View style={styles.cardHeaderWithBadgeRow}>
                        <View style={styles.titleWithIconRow}>
                          <View style={styles.iconCircleTealSmall}>
                            <Text style={{ fontSize: 14 }}>🧪</Text>
                          </View>
                          <View>
                            <Text style={styles.cardTitleText}>Prescribed lab tests</Text>
                            <Text style={styles.cardSubText}>Required diagnostic tests</Text>
                          </View>
                        </View>
                        <View style={styles.countBadgeRound}>
                          <Text style={styles.countBadgeRoundText}>
                            {(selectedPrescription.tests || []).length}
                          </Text>
                        </View>
                      </View>

                      {(selectedPrescription.tests || []).length === 0 ? (
                        <View style={styles.emptyItemsBox}>
                          <Text style={styles.emptyItemsText}>No lab tests recorded.</Text>
                        </View>
                      ) : (
                        <View style={styles.medsListStack}>
                          {(selectedPrescription.tests || []).map((t: any, tIdx: number) => (
                            <View key={t.id || tIdx} style={styles.medItemRowCard}>
                              <Text style={styles.medNameText}>🧪 {t.test_name}</Text>
                              <View style={styles.medSpecsRow}>
                                <Text style={styles.medSpecTag}>Type: {t.test_type || 'General'}</Text>
                                <Text style={styles.medSpecTag}>Price: ₹{t.price || 0}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Footer */}
            <View style={styles.prescFooterRow}>
              <Text style={styles.prescFooterSecText}>Private patient information · Handle with care</Text>
              <TouchableOpacity style={styles.darkCloseBtn} onPress={() => setShowPrescriptionsModal(false)}>
                <Text style={styles.darkCloseBtnText}>✕ Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Medical History Bottom Sheet Modal */}
      <Modal
        visible={showMedicalHistoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMedicalHistoryModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowMedicalHistoryModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.bottomSheetContainer}>
            {(() => {
              const medPatient = medicalHistoryData?.patient || medicalHistoryData || activeDisplayPatient;
              const visitList = medicalHistoryData?.visits || (Array.isArray(medicalHistoryData) ? medicalHistoryData : []);
              const labReportList = medicalHistoryData?.labReports || medicalHistoryData?.lab_reports || [];
              const age = calculateAge(medPatient?.date_of_birth || medPatient?.dob || activeDisplayPatient?.date_of_birth);
              const emergencyFormatted = [
                medPatient?.emergency_contact_name || medPatient?.emergency_name,
                medPatient?.emergency_relation,
                medPatient?.emergency_contact || medPatient?.emergency_phone
              ].filter(Boolean).join(' · ') || (activeDisplayPatient?.emergency_contact ? `Contact · ${activeDisplayPatient.emergency_contact}` : 'Not recorded');

              const filteredVisits = (visitList || []).filter((v: any) => {
                if (!historySearchQuery.trim()) return true;
                const q = historySearchQuery.toLowerCase();
                return (
                  (v.reason && v.reason.toLowerCase().includes(q)) ||
                  (v.diagnosis && v.diagnosis.toLowerCase().includes(q)) ||
                  (v.symptoms && v.symptoms.toLowerCase().includes(q)) ||
                  (v.doctor_name && v.doctor_name.toLowerCase().includes(q)) ||
                  (v.notes && v.notes.toLowerCase().includes(q)) ||
                  (v.advice && v.advice.toLowerCase().includes(q))
                );
              });

              return (
                <>
                  {/* Header Row (Dark #071624) */}
                  <View style={styles.prescHeaderDark}>
                    <View style={styles.headerLeftRow}>
                      <View style={styles.historyIconCircleTeal}>
                        <MedicalHistoryIcon color="#0d9488" size={20} />
                      </View>
                      <View style={styles.headerTitleCol}>
                        <Text style={styles.prescTitleDark}>Medical history</Text>
                        <Text style={styles.prescSubDark}>
                          {medPatient?.full_name || activeDisplayPatient?.full_name || 'Patient'} ·{' '}
                          {medPatient?.patient_code || (activeDisplayPatient as any)?.patient_code || `PT-${String(activeDisplayPatient?.id || 1).padStart(5, '0')}`} ·{' '}
                          {medPatient?.gender || activeDisplayPatient?.gender || 'female'}
                          {age ? ` · ${age} yrs` : ''}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.headerRightActionsRow}>
                      <View style={styles.recordsCountBadge}>
                        <Text style={styles.recordsCountLabel}>VISITS</Text>
                        <Text style={styles.recordsCountNum}>{visitList.length}</Text>
                      </View>
                      <View style={styles.recordsCountBadge}>
                        <Text style={styles.recordsCountLabel}>REPORTS</Text>
                        <Text style={styles.recordsCountNum}>{labReportList.length}</Text>
                      </View>

                      <TouchableOpacity style={styles.closeCircleBtn} onPress={() => setShowMedicalHistoryModal(false)}>
                        <Text style={styles.closeCircleText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {modalLoading ? (
                    <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
                  ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContentScroll}>
                      {/* Search & Filters Row */}
                      <View style={styles.medSearchFilterRow}>
                        <View style={styles.medSearchInputBox}>
                          <Text style={{ fontSize: 13, marginRight: 6 }}>🔍</Text>
                          <TextInput
                            style={styles.medSearchTextInput}
                            placeholder="Search visits, diagnosis, medicines, lab tests..."
                            placeholderTextColor="#94a3b8"
                            value={historySearchQuery}
                            onChangeText={setHistorySearchQuery}
                          />
                        </View>
                        <View style={styles.medFilterPillBtn}>
                          <Text style={styles.medFilterPillText}>All history</Text>
                          <Text style={{ fontSize: 9, color: '#94a3b8', marginLeft: 4 }}>▼</Text>
                        </View>
                        <View style={styles.medFilterPillBtn}>
                          <Text style={styles.medFilterPillText}>All dates</Text>
                          <Text style={{ fontSize: 9, color: '#94a3b8', marginLeft: 4 }}>▼</Text>
                        </View>
                      </View>

                      {/* Section 1: Patient Overview */}
                      <View style={styles.overviewSectionHeader}>
                        <View style={styles.iconCircleTealSmall}>
                          <MedicalHistoryIcon color="#0d9488" size={16} />
                        </View>
                        <View>
                          <Text style={styles.cardTitleText}>Patient overview</Text>
                          <Text style={styles.cardSubText}>Important health and emergency information</Text>
                        </View>
                      </View>

                      {/* Patient Vitals Metrics Section */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                        {/* Temp */}
                        <View style={{ flex: 1, minWidth: 110, backgroundColor: '#fff7ed', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#ffedd5' }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#c2410c' }}>🌡️ BODY TEMP</Text>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: '#9a3412', marginTop: 4 }}>
                            {(medPatient as any)?.temperature || (activeDisplayPatient as any)?.temperature || '98.6°F'}
                          </Text>
                          <Text style={{ fontSize: 9, color: '#ea580c', fontWeight: '700', marginTop: 2 }}>Normal Range</Text>
                        </View>

                        {/* BP */}
                        <View style={{ flex: 1, minWidth: 110, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#bbf7d0' }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#15803d' }}>❤️ BLOOD PRESSURE</Text>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: '#166534', marginTop: 4 }}>
                            {(medPatient as any)?.blood_pressure || (activeDisplayPatient as any)?.blood_pressure || '120/80 mmHg'}
                          </Text>
                          <Text style={{ fontSize: 9, color: '#16a34a', fontWeight: '700', marginTop: 2 }}>Optimal SYS/DIA</Text>
                        </View>

                        {/* Pulse */}
                        <View style={{ flex: 1, minWidth: 110, backgroundColor: '#f0f9ff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#bae6fd' }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#0369a1' }}>💓 PULSE RATE</Text>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: '#075985', marginTop: 4 }}>
                            {(medPatient as any)?.pulse_rate || (activeDisplayPatient as any)?.pulse_rate || '72 BPM'}
                          </Text>
                          <Text style={{ fontSize: 9, color: '#0284c7', fontWeight: '700', marginTop: 2 }}>Resting Heart Rate</Text>
                        </View>

                        {/* SpO2 */}
                        <View style={{ flex: 1, minWidth: 110, backgroundColor: '#faf5ff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e9d5ff' }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#7e22ce' }}>🫁 SPO2 OXYGEN</Text>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: '#6b21a8', marginTop: 4 }}>
                            {(medPatient as any)?.spo2 || (activeDisplayPatient as any)?.spo2 || '99%'}
                          </Text>
                          <Text style={{ fontSize: 9, color: '#9333ea', fontWeight: '700', marginTop: 2 }}>Normal Saturation</Text>
                        </View>
                      </View>

                      <View style={styles.overviewCardsGridThree}>
                        {/* Card 1: Blood Group */}
                        <View style={styles.overviewSingleBoxCard}>
                          <View style={styles.overviewBoxIconHeader}>
                            <View style={styles.iconBoxLightGrey}>
                              <Text style={{ fontSize: 13 }}>🩸</Text>
                            </View>
                            <Text style={styles.overviewBoxLabelTitle}>BLOOD GROUP</Text>
                          </View>
                          <Text style={styles.overviewBoxBigValText}>
                            {medPatient?.blood_group || activeDisplayPatient?.blood_group || 'Not recorded'}
                          </Text>
                        </View>

                        {/* Card 2: Allergies */}
                        <View style={styles.overviewSingleBoxCard}>
                          <View style={styles.overviewBoxIconHeader}>
                            <View style={styles.iconBoxLightGrey}>
                              <Text style={{ fontSize: 13 }}>🛡️</Text>
                            </View>
                            <Text style={styles.overviewBoxLabelTitle}>ALLERGIES</Text>
                          </View>
                          <Text style={styles.overviewBoxBigValText}>
                            {medPatient?.allergies || activeDisplayPatient?.allergies || 'None recorded'}
                          </Text>
                        </View>

                        {/* Card 3: Emergency Contact */}
                        <View style={styles.overviewSingleBoxCard}>
                          <View style={styles.overviewBoxIconHeader}>
                            <View style={styles.iconBoxLightGrey}>
                              <Text style={{ fontSize: 13 }}>👤</Text>
                            </View>
                            <Text style={styles.overviewBoxLabelTitle}>EMERGENCY CONTACT</Text>
                          </View>
                          <Text style={styles.overviewBoxBigValText} numberOfLines={2}>
                            {emergencyFormatted}
                          </Text>
                        </View>
                      </View>

                      {/* Section 2: Visit History */}
                      <View style={styles.overviewSectionHeader}>
                        <View style={styles.iconCircleTealSmall}>
                          <StethoscopeIcon color="#0d9488" size={16} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.rowAlignGap}>
                            <Text style={styles.cardTitleText}>Visit history</Text>
                            <View style={styles.miniCountPill}>
                              <Text style={styles.miniCountPillText}>{filteredVisits.length}</Text>
                            </View>
                          </View>
                          <Text style={styles.cardSubText}>Consultations, diagnoses and prescribed medicines</Text>
                        </View>
                      </View>

                      {filteredVisits.length === 0 ? (
                        <View style={styles.emptyItemsBox}>
                          <Text style={styles.emptyItemsText}>No visit history found.</Text>
                        </View>
                      ) : (
                        <View style={{ gap: 10 }}>
                          {filteredVisits.map((v: any, vIdx: number) => {
                            const vDate = v.appointment_date
                              ? `${v.appointment_date} ${v.appointment_time || ''}`.trim()
                              : '9/5/2026 10:00:00';
                            return (
                              <View key={v.appointment_id || vIdx} style={styles.visitRowCardItem}>
                                <View style={styles.visitCardTopRow}>
                                  <Text style={styles.visitCardReasonTitle}>
                                    {v.reason || v.diagnosis || v.symptoms || 'General Checkup'}
                                  </Text>
                                  <View style={styles.approvedGreenBadge}>
                                    <Text style={styles.approvedGreenBadgeText}>
                                      {v.status ? String(v.status).toUpperCase() : 'APPROVED'}
                                    </Text>
                                  </View>
                                </View>

                                <View style={styles.visitMetaFlexRow}>
                                  <Text style={styles.visitMetaItemText}>📅 {vDate}</Text>
                                  <Text style={styles.visitMetaItemText}>
                                    🩺 {v.doctor_name || 'Dr. Doctor'}
                                  </Text>
                                </View>

                                {v.notes || v.advice ? (
                                  <View style={styles.visitNotesYellowCard}>
                                    <Text style={styles.visitNotesYellowText}>
                                      💡 Note: {v.advice || v.notes}
                                    </Text>
                                  </View>
                                ) : null}

                                {(v.medicines || []).length > 0 && (
                                  <View style={styles.visitMedsPillsRow}>
                                    {(v.medicines || []).map((m: any, mIdx: number) => (
                                      <View key={mIdx} style={styles.visitMedChip}>
                                        <Text style={styles.visitMedChipText}>
                                          💊 {m.medicine_name} ({m.dosage || '1 tab'})
                                        </Text>
                                      </View>
                                    ))}
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </ScrollView>
                  )}

                  {/* Footer Row */}
                  <View style={styles.prescFooterRow}>
                    <Text style={styles.prescFooterSecText}>Private patient information · Handle with care</Text>
                    <TouchableOpacity style={styles.darkCloseBtn} onPress={() => setShowMedicalHistoryModal(false)}>
                      <Text style={styles.darkCloseBtnText}>✕ Close</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Book Appointment Bottom Sheet Modal */}
      <Modal
        visible={showBookAppointmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBookAppointmentModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowBookAppointmentModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.bottomSheetContainer}>
            <View style={styles.consultHeaderLight}>
              <View style={styles.headerLeftRow}>
                <View style={styles.consultIconCircleTeal}>
                  <Text style={{ fontSize: 18 }}>📅</Text>
                </View>
                <View style={styles.headerTitleCol}>
                  <Text style={styles.consultTitleDark}>Book Appointment</Text>
                  <Text style={styles.consultSubDark}>
                    {activeDisplayPatient?.full_name || 'Patient'} ·{' '}
                    {(activeDisplayPatient as any)?.patient_code || `PT-${String(activeDisplayPatient?.id || 1).padStart(5, '0')}`}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.closeCircleBtn} onPress={() => setShowBookAppointmentModal(false)}>
                <Text style={styles.closeCircleText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14, gap: 14 }}>
              {/* Patient Info Summary Header */}
              <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' }}>
                  <PatientUserIcon color="#0d9488" size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>{activeDisplayPatient?.full_name}</Text>
                  <Text style={{ fontSize: 11, color: '#64748b' }}>📞 {activeDisplayPatient?.phone || 'No phone'} · {activeDisplayPatient?.gender || 'Patient'}</Text>
                </View>
              </View>

              {/* Date Input */}
              <View style={{ gap: 4 }}>
                <Text style={styles.gridBoxLabel}>📅 APPOINTMENT DATE (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.medSearchInputBox}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                  value={bookingDate}
                  onChangeText={setBookingDate}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
                    onPress={() => setBookingDate(new Date().toISOString().split('T')[0])}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284c7' }}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
                    onPress={() => {
                      const tm = new Date();
                      tm.setDate(tm.getDate() + 1);
                      setBookingDate(tm.toISOString().split('T')[0]);
                    }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>Tomorrow</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
                    onPress={() => {
                      const d2 = new Date();
                      d2.setDate(d2.getDate() + 2);
                      setBookingDate(d2.toISOString().split('T')[0]);
                    }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>In 2 Days</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Time Slot Picker */}
              <View style={{ gap: 4 }}>
                <Text style={styles.gridBoxLabel}>🕒 SELECT TIME SLOT</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {['09:30:00', '10:00:00', '11:30:00', '14:00:00', '16:30:00', '18:00:00'].map((slot) => {
                    const isSelected = bookingTime === slot;
                    const displaySlot = slot.slice(0, 5);
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={{
                          backgroundColor: isSelected ? '#0d9488' : '#f8fafc',
                          borderWidth: 1,
                          borderColor: isSelected ? '#0d9488' : '#cbd5e1',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                        }}
                        onPress={() => setBookingTime(slot)}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isSelected ? '#ffffff' : '#334155' }}>
                          {displaySlot}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Consultation Mode */}
              <View style={{ gap: 4 }}>
                <Text style={styles.gridBoxLabel}>🩺 CONSULTATION MODE</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: bookingMode === 'in_person' ? '#e6f4f1' : '#f8fafc',
                      borderWidth: 1.5,
                      borderColor: bookingMode === 'in_person' ? '#0d9488' : '#e2e8f0',
                      padding: 10,
                      borderRadius: 10,
                      alignItems: 'center',
                    }}
                    onPress={() => setBookingMode('in_person')}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: bookingMode === 'in_person' ? '#0d9488' : '#64748b' }}>
                      🏥 In-Person
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: bookingMode === 'video' ? '#e0f2fe' : '#f8fafc',
                      borderWidth: 1.5,
                      borderColor: bookingMode === 'video' ? '#0284c7' : '#e2e8f0',
                      padding: 10,
                      borderRadius: 10,
                      alignItems: 'center',
                    }}
                    onPress={() => setBookingMode('video')}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: bookingMode === 'video' ? '#0284c7' : '#64748b' }}>
                      📹 Video Call
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Consultation Fee */}
              <View style={{ gap: 4 }}>
                <Text style={styles.gridBoxLabel}>💳 CONSULTATION FEE (₹)</Text>
                <TextInput
                  style={styles.medSearchInputBox}
                  keyboardType="numeric"
                  placeholder="500"
                  placeholderTextColor="#94a3b8"
                  value={bookingFee}
                  onChangeText={setBookingFee}
                />
              </View>

              {/* Reason for Visit */}
              <View style={{ gap: 4 }}>
                <Text style={styles.gridBoxLabel}>📄 REASON FOR VISIT</Text>
                <TextInput
                  style={styles.medSearchInputBox}
                  placeholder="e.g. Toothache, Regular Checkup, Fever"
                  placeholderTextColor="#94a3b8"
                  value={bookingReason}
                  onChangeText={setBookingReason}
                />
              </View>

              {/* Notes */}
              <View style={{ gap: 4 }}>
                <Text style={styles.gridBoxLabel}>📝 ADDITIONAL NOTES (OPTIONAL)</Text>
                <TextInput
                  style={[styles.medSearchInputBox, { height: 60, textAlignVertical: 'top', paddingTop: 8 }]}
                  multiline
                  placeholder="Any special instructions or doctor notes..."
                  placeholderTextColor="#94a3b8"
                  value={bookingNotes}
                  onChangeText={setBookingNotes}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#0d9488',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  marginTop: 6,
                }}
                disabled={bookingSubmitting}
                onPress={handleBookAppointmentSubmit}>
                {bookingSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '800' }}>
                    📅 Confirm & Book Appointment
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Blood Group Picker Bottom Sheet Modal */}
      <Modal visible={showEditBloodPicker} transparent animationType="slide" onRequestClose={() => setShowEditBloodPicker(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowEditBloodPicker(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.pickerBottomSheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.pickerModalTitle}>Select Blood Group</Text>
              <TouchableOpacity style={styles.closeCircleBtn} onPress={() => setShowEditBloodPicker(false)}>
                <Text style={styles.closeCircleText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 4, paddingVertical: 10 }}>
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
          </View>
        </View>
      </Modal>

      {/* Gender Filter Picker Bottom Sheet Modal */}
      <Modal visible={showGenderPicker} transparent animationType="slide" onRequestClose={() => setShowGenderPicker(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowGenderPicker(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.pickerBottomSheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.pickerModalTitle}>Select Gender</Text>
              <TouchableOpacity style={styles.closeCircleBtn} onPress={() => setShowGenderPicker(false)}>
                <Text style={styles.closeCircleText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 4, paddingVertical: 10 }}>
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
          </View>
        </View>
      </Modal>

      {/* Blood Group Filter Picker Bottom Sheet Modal */}
      <Modal visible={showBloodPicker} transparent animationType="slide" onRequestClose={() => setShowBloodPicker(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowBloodPicker(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.pickerBottomSheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.pickerModalTitle}>Select Blood Group</Text>
              <TouchableOpacity style={styles.closeCircleBtn} onPress={() => setShowBloodPicker(false)}>
                <Text style={styles.closeCircleText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 4, paddingVertical: 10 }}>
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
          </View>
        </View>
      </Modal>

      {/* Status Filter Picker Bottom Sheet Modal */}
      <Modal visible={showStatusPicker} transparent animationType="slide" onRequestClose={() => setShowStatusPicker(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowStatusPicker(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.pickerBottomSheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.pickerModalTitle}>Select Status</Text>
              <TouchableOpacity style={styles.closeCircleBtn} onPress={() => setShowStatusPicker(false)}>
                <Text style={styles.closeCircleText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 4, paddingVertical: 10 }}>
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
          </View>
        </View>
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
  statusToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1 },
  badgeActiveBg: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  badgeInactiveBg: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a' },
  redDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  statusToggleText: { fontSize: 10, fontWeight: '800' },
  textActiveColor: { color: '#15803d' },
  textInactiveColor: { color: '#b91c1c' },
  toggleSwitchTrack: { width: 26, height: 14, borderRadius: 7, padding: 2, justifyContent: 'center' },
  switchActiveTrack: { backgroundColor: '#10b981' },
  switchInactiveTrack: { backgroundColor: '#cbd5e1' },
  toggleSwitchThumb: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffffff' },
  switchActiveThumb: { alignSelf: 'flex-end' },
  switchInactiveThumb: { alignSelf: 'flex-start' },
  statusToggleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
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

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  bottomSheetContainer: { backgroundColor: '#eef4f4', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: '88%' },
  pickerBottomSheetContainer: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28, maxHeight: '80%', width: '100%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerRightActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activePillBadge: { backgroundColor: '#d1fae5', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  activePillText: { color: '#059669', fontSize: 11, fontWeight: '800' },
  editInfoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  editInfoBtnText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  closeCircleBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  closeCircleText: { fontSize: 14, color: '#475569', fontWeight: 'bold' },
  sheetContentScroll: { gap: 12, paddingBottom: 20 },
  cardsGridTwoCol: { gap: 12 },
  detailCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  contactCardHighlight: { borderColor: '#2dd4bf', borderWidth: 1.5 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardHeaderIconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  detailDataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  dataLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  dataLabelIcon: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  dataValBold: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  billingSummaryRowGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  billingSummaryItem: { flex: 1, gap: 2 },
  billingItemLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  billingItemValTeal: { fontSize: 13, fontWeight: '800', color: '#0d9488' },

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
  docAvatarSmallCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  docHeaderCol: { flex: 1 },
  docNameTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  docSpecSub: { fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 1 },
  approvedBadgePill: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  approvedBadgePillText: { fontSize: 11, fontWeight: '700', color: '#15803d' },
  cardDividerLine: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 2 },
  consultGridTwoRow: { flexDirection: 'row', gap: 10 },
  consultBoxItem: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 10 },
  consultFeeBoxHighlight: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  reasonBoxItem: { backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: 12, padding: 10 },
  reasonLabelText: { fontSize: 10, fontWeight: '800', color: '#0369a1', letterSpacing: 0.5 },
  reasonValueText: { fontSize: 12, fontWeight: '600', color: '#0c4a6e', marginTop: 2 },
  notesBoxItem: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 12, padding: 10 },
  notesLabelText: { fontSize: 10, fontWeight: '800', color: '#c2410c', letterSpacing: 0.5 },
  notesValueText: { fontSize: 12, fontWeight: '600', color: '#7c2d12', marginTop: 2 },
  boxLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 2 },
  gridBoxLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.5 },
  boxVal: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  boxValDate: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  boxValTime: { fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 2 },
  feeValText: { fontSize: 16, fontWeight: '800', color: '#15803d', marginTop: 2 },
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
  prescHeaderDark: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#071624', paddingHorizontal: 16, paddingVertical: 14, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginHorizontal: -18, marginTop: -18, marginBottom: 12 },
  prescTitleDark: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  prescSubDark: { fontSize: 11, color: '#94a3b8' },
  recordsCountBadge: { backgroundColor: '#0f2942', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignItems: 'center' },
  recordsCountLabel: { fontSize: 8, fontWeight: '800', color: '#2dd4bf' },
  recordsCountNum: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  emptyPrescBody: { alignItems: 'center', padding: 40 },
  prescSheetScrollBody: { gap: 12, paddingBottom: 20 },
  prescListHeaderRow: { gap: 2, marginBottom: 4 },
  rowAlignGap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prescSecTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  miniCountPill: { backgroundColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  miniCountPillText: { fontSize: 11, fontWeight: '800', color: '#334155' },
  prescSecSub: { fontSize: 12, color: '#64748b' },
  prescCardsHorizScroll: { gap: 10, paddingVertical: 4 },
  prescSelectCard: { width: 170, backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: '#cbd5e1', gap: 4 },
  prescSelectCardActive: { backgroundColor: '#f0fdf4', borderColor: '#2dd4bf', elevation: 3 },
  cardRxTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rxCardCode: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  finalGreenBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  finalGreenBadgeText: { fontSize: 9, fontWeight: '800', color: '#16a34a' },
  rxCardDate: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  rxCardDiag: { fontSize: 11, color: '#0d9488', fontWeight: '700' },

  selectedPrescContainer: { gap: 12, marginTop: 6 },
  doctorInfoCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', gap: 10 },
  docAvatarCircleBig: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' },
  docDetailsCol: { flex: 1 },
  prescribedByTag: { fontSize: 9, fontWeight: '800', color: '#64748b' },
  docNameBig: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  docTimeText: { fontSize: 11, color: '#64748b', marginTop: 2 },
  docCardRightBadges: { alignItems: 'flex-end', gap: 4 },
  rxBadgeTag: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  rxBadgeTagText: { fontSize: 10, fontWeight: '800', color: '#334155' },
  followUpBadgePill: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  followUpBadgeText: { fontSize: 10, fontWeight: '700', color: '#0284c7' },

  diagSymptomGrid: { flexDirection: 'row', gap: 10 },
  gridBoxItem: { flex: 1, backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  boxLabelHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  gridBoxLabel: { fontSize: 10, fontWeight: '800', color: '#64748b' },
  gridBoxValueText: { fontSize: 14, fontWeight: '800', color: '#0f172a' },

  clinicalAdviceCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  adviceBodyText: { fontSize: 13, color: '#334155', fontWeight: '600' },

  medicinesCardContainer: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
  cardHeaderWithBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleWithIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconCircleTealSmall: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' },
  cardTitleText: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  cardSubText: { fontSize: 10, color: '#64748b' },
  countBadgeRound: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  countBadgeRoundText: { fontSize: 11, fontWeight: '800', color: '#334155' },
  emptyItemsBox: { paddingVertical: 14, alignItems: 'center' },
  emptyItemsText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  medsListStack: { gap: 8 },
  medItemRowCard: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#cbd5e1', gap: 4 },
  medNameText: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  medSpecsRow: { flexDirection: 'row', gap: 10 },
  medSpecTag: { fontSize: 11, color: '#475569', fontWeight: '600' },
  medInstructionText: { fontSize: 11, color: '#0d9488', fontWeight: '600' },
  prescModalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },

  historyIconCircleTeal: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0f2942', alignItems: 'center', justifyContent: 'center' },
  medSearchFilterRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  medSearchInputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  medSearchTextInput: { flex: 1, fontSize: 12, color: '#0f172a', padding: 0 },
  medFilterPillBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  medFilterPillText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  overviewSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 8 },
  overviewCardsGridThree: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  overviewSingleBoxCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  overviewBoxIconHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBoxLightGrey: { width: 24, height: 24, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  overviewBoxLabelTitle: { fontSize: 9, fontWeight: '800', color: '#64748b' },
  overviewBoxBigValText: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  visitRowCardItem: { backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', gap: 6 },
  visitCardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  visitCardReasonTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  approvedGreenBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  approvedGreenBadgeText: { fontSize: 10, fontWeight: '800', color: '#16a34a' },
  visitMetaFlexRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  visitMetaItemText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  visitNotesYellowCard: { backgroundColor: '#fff7ed', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#fed7aa', marginTop: 2 },
  visitNotesYellowText: { fontSize: 11, color: '#c2410c', fontWeight: '600' },
  visitMedsPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  visitMedChip: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  visitMedChipText: { fontSize: 11, color: '#16a34a', fontWeight: '700' },

  consultHeaderLight: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e6f4f1', paddingHorizontal: 16, paddingVertical: 14, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginHorizontal: -18, marginTop: -18, marginBottom: 12 },
  consultTitleDark: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  consultSubDark: { fontSize: 12, color: '#64748b' },
  consultIconCircleTeal: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' },
  consultCardFull: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
  consultFooterLight: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: -18, marginBottom: -18, marginTop: 12, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
});

export default PatientsScreen;
