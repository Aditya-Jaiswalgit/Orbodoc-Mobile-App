import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import { usePatientProfile } from '../../hooks/usePatientProfile';

interface PatientsProfileScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
}

export const PatientsProfileScreen: React.FC<PatientsProfileScreenProps> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
}) => {
  const { profile, updateProfile } = usePatientProfile();
  const [showEditModal, setShowEditModal] = useState(false);

  const [formData, setFormData] = useState({ ...profile });

  useEffect(() => {
    setFormData({ ...profile });
  }, [profile]);

  const handleSaveProfile = async () => {
    await updateProfile(formData);
    setShowEditModal(false);
    Alert.alert('Success', 'Profile information updated successfully!');
  };

  const initial = (profile.full_name || 'B').charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <PatientHeader onOpenDrawer={onOpenDrawer} onOpenNotifications={onOpenNotifications} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Title & Edit Profile Button */}
        <View style={styles.topHeaderRow}>
          <View style={styles.titleCol}>
            <View style={styles.titleWithIcon}>
              <Text style={styles.titleIcon}>👤</Text>
              <Text style={styles.pageTitle}>My Profile</Text>
            </View>
            <Text style={styles.pageSub}>View and manage your personal information</Text>
          </View>

          <TouchableOpacity style={styles.editProfileBtn} onPress={() => { setFormData({ ...profile }); setShowEditModal(true); }}>
            <Text style={styles.editBtnIcon}>📝</Text>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Top Main Profile Card */}
        <View style={styles.mainProfileCard}>
          <View style={styles.profileHeroRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>

            <View style={styles.heroDetailsCol}>
              <View style={styles.nameBadgeRow}>
                <Text style={styles.userNameText}>{profile.full_name}</Text>
                <View style={styles.patientBadge}>
                  <Text style={styles.patientBadgeText}>Patient</Text>
                </View>
              </View>

              <View style={styles.clinicRow}>
                <Text style={styles.clinicIcon}>🏢</Text>
                <Text style={styles.clinicNameText}>{profile.clinic_name}</Text>
              </View>
            </View>
          </View>

          <View style={styles.contactStripRow}>
            <View style={styles.contactItemPill}>
              <Text style={styles.contactIcon}>✉️</Text>
              <Text style={styles.contactText}>{profile.email}</Text>
            </View>

            <View style={styles.contactItemPill}>
              <Text style={styles.contactIcon}>📞</Text>
              <Text style={styles.contactText}>{profile.phone}</Text>
            </View>
          </View>
        </View>

        {/* Section 1: Patient & Medical Information */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderIconCircle}>
              <Text style={styles.sectionHeaderIcon}>🩵</Text>
            </View>
            <Text style={styles.sectionTitle}>Patient & Medical Information</Text>
          </View>

          <View style={styles.gridContainer}>
            <View style={styles.gridCard}>
              <Text style={styles.cardIcon}>👤</Text>
              <Text style={styles.cardLabel}>Gender</Text>
              <Text style={styles.cardValue}>{profile.gender}</Text>
            </View>

            <View style={styles.gridCard}>
              <Text style={styles.cardIcon}>📅</Text>
              <Text style={styles.cardLabel}>Date of Birth</Text>
              <Text style={styles.cardValue}>{profile.dob}</Text>
            </View>

            <View style={styles.gridCard}>
              <Text style={styles.cardIcon}>🔢</Text>
              <Text style={styles.cardLabel}>Age</Text>
              <Text style={styles.cardValue}>{profile.age}</Text>
            </View>

            <View style={styles.gridCard}>
              <Text style={styles.cardIcon}>🩸</Text>
              <Text style={styles.cardLabel}>Blood Group</Text>
              <Text style={styles.cardValue}>{profile.blood_group}</Text>
            </View>

            <View style={styles.gridCard}>
              <Text style={styles.cardIcon}>⚠️</Text>
              <Text style={styles.cardLabel}>Allergies</Text>
              <Text style={styles.cardValue}>{profile.allergies}</Text>
            </View>

            <View style={styles.gridCard}>
              <Text style={styles.cardIcon}>📈</Text>
              <Text style={styles.cardLabel}>Chronic Conditions</Text>
              <Text style={styles.cardValue}>{profile.chronic_conditions}</Text>
            </View>

            <View style={styles.gridCard}>
              <Text style={styles.cardIcon}>🩺</Text>
              <Text style={styles.cardLabel}>Medical History</Text>
              <Text style={styles.cardValue}>{profile.medical_history}</Text>
            </View>

            <View style={styles.gridCard}>
              <Text style={styles.cardIcon}>💊</Text>
              <Text style={styles.cardLabel}>Current Medications</Text>
              <Text style={styles.cardValue}>{profile.current_medications}</Text>
            </View>

            <View style={styles.gridCard}>
              <Text style={styles.cardIcon}>👤</Text>
              <Text style={styles.cardLabel}>Emergency Contact</Text>
              <Text style={styles.cardValue}>{profile.emergency_contact}</Text>
            </View>

            <View style={styles.gridCard}>
              <Text style={styles.cardIcon}>📞</Text>
              <Text style={styles.cardLabel}>Emergency Phone</Text>
              <Text style={styles.cardValue}>{profile.emergency_phone}</Text>
            </View>

            <View style={styles.gridCard}>
              <Text style={styles.cardIcon}>🛡️</Text>
              <Text style={styles.cardLabel}>Relation</Text>
              <Text style={styles.cardValue}>{profile.relation}</Text>
            </View>
          </View>
        </View>

        {/* Section 2: Account Information */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderIconCircle}>
              <Text style={styles.sectionHeaderIcon}>🛡️</Text>
            </View>
            <Text style={styles.sectionTitle}>Account Information</Text>
          </View>

          <View style={styles.accountCard}>
            <Text style={styles.cardIcon}>🏢</Text>
            <Text style={styles.cardLabel}>Clinic</Text>
            <Text style={styles.cardValue}>{profile.clinic_name}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <Text style={styles.modalTitle}>Edit Profile Information</Text>

            <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.full_name}
                  onChangeText={(val) => setFormData({ ...formData, full_name: val })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.email}
                  onChangeText={(val) => setFormData({ ...formData, email: val })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.phone}
                  onChangeText={(val) => setFormData({ ...formData, phone: val })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gender</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.gender}
                  onChangeText={(val) => setFormData({ ...formData, gender: val })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date of Birth</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.dob}
                  onChangeText={(val) => setFormData({ ...formData, dob: val })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Blood Group</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.blood_group}
                  onChangeText={(val) => setFormData({ ...formData, blood_group: val })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Emergency Contact Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.emergency_contact}
                  onChangeText={(val) => setFormData({ ...formData, emergency_contact: val })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Emergency Phone</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.emergency_phone}
                  onChangeText={(val) => setFormData({ ...formData, emergency_phone: val })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Relation</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.relation}
                  onChangeText={(val) => setFormData({ ...formData, relation: val })}
                />
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
                <Text style={styles.saveBtnText}>Save Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 60 },

  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleCol: { flex: 1 },
  titleWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titleIcon: { fontSize: 20 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  pageSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d9488',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  editBtnIcon: { fontSize: 13, color: '#ffffff' },
  editBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },

  mainProfileCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#99f6e4',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    gap: 14,
  },
  profileHeroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#ffffff' },
  heroDetailsCol: { flex: 1, gap: 4 },
  nameBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userNameText: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  patientBadge: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  patientBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
  clinicRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clinicIcon: { fontSize: 13 },
  clinicNameText: { fontSize: 13, color: '#64748b', fontWeight: '600' },

  contactStripRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  contactItemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    flex: 1,
    minWidth: 150,
  },
  contactIcon: { fontSize: 13 },
  contactText: { fontSize: 12, fontWeight: '700', color: '#334155' },

  sectionContainer: { marginBottom: 20, gap: 12 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHeaderIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderIcon: { fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  accountCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  cardIcon: { fontSize: 16, marginBottom: 2 },
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  cardValue: { fontSize: 13, fontWeight: '800', color: '#0f172a' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalContent: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 4 },
  inputGroup: { gap: 4, marginBottom: 10 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#334155' },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
  },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  saveBtn: {
    flex: 1,
    backgroundColor: '#0d9488',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
});

export default PatientsProfileScreen;
