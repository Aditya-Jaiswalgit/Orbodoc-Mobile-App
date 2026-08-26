import React, { useState } from 'react';
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
import { StaffHeader } from '../../components/common/StaffHeader';
import { PatientModel } from '../../types/clinicTypes';

interface Props {
  onOpenDrawer: () => void;
}

export const PatientsManagementScreen: React.FC<Props> = ({ onOpenDrawer }) => {
  const [patients, setPatients] = useState<PatientModel[]>([
    { id: 1, clinic_id: 1, full_name: 'Sunita Sharma', phone: '9876543210', email: 'sunita@gmail.com', gender: 'female', age: 34, blood_group: 'B+', allergies: 'Penicillin', medical_history: 'Hypertension', registered_at: '2025-01-10' },
    { id: 2, clinic_id: 1, full_name: 'Rahul Verma', phone: '9811223344', email: 'rahul@gmail.com', gender: 'male', age: 45, blood_group: 'O+', allergies: 'None', medical_history: 'Type 2 Diabetes', registered_at: '2025-01-12' },
    { id: 3, clinic_id: 1, full_name: 'Pooja Gupta', phone: '9900112233', email: 'pooja@gmail.com', gender: 'female', age: 29, blood_group: 'A+', allergies: 'Dust', medical_history: 'Migraine', registered_at: '2025-01-14' },
    { id: 4, clinic_id: 1, full_name: 'Vikram Singh', phone: '9711002233', email: 'vikram@gmail.com', gender: 'male', age: 52, blood_group: 'AB+', allergies: 'Sulfa drugs', medical_history: 'Coronary Artery Disease', registered_at: '2025-01-15' },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [age, setAge] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');

  const filteredPatients = patients.filter(
    p => p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || p.phone.includes(searchQuery)
  );

  const handleRegisterPatient = () => {
    if (!fullName.trim() || !phone.trim()) {
      Alert.alert('Validation Error', 'Full Name and Phone Number are required.');
      return;
    }

    const newPatient: PatientModel = {
      id: Date.now(),
      clinic_id: 1,
      full_name: fullName,
      phone,
      gender,
      age: age ? parseInt(age) : 30,
      blood_group: bloodGroup,
      registered_at: new Date().toISOString().split('T')[0],
    };

    setPatients([newPatient, ...patients]);
    setModalVisible(false);
    setFullName('');
    setPhone('');
    setAge('');
    Alert.alert('Success', 'Patient registered successfully!');
  };

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Patients Directory" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.topRow}>
          <Text style={styles.pageTitle}>Patients Roster ({filteredPatients.length})</Text>
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

        {/* Patient List */}
        <View style={styles.list}>
          {filteredPatients.map((patient) => (
            <View key={patient.id} style={styles.card}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{patient.full_name.charAt(0)}</Text>
              </View>

              <View style={styles.infoCol}>
                <View style={styles.titleRow}>
                  <Text style={styles.patientName}>{patient.full_name}</Text>
                  <View style={styles.bloodBadge}>
                    <Text style={styles.bloodText}>{patient.blood_group || 'O+'}</Text>
                  </View>
                </View>
                <Text style={styles.metaText}>{patient.age} yrs • {patient.gender} • 📞 {patient.phone}</Text>
                {patient.medical_history ? (
                  <Text style={styles.historyText}>History: {patient.medical_history}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Register Patient Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Register New Patient</Text>

            <Text style={styles.label}>Patient Full Name *</Text>
            <TextInput style={styles.input} placeholder="Rahul Sharma" value={fullName} onChangeText={setFullName} />

            <Text style={styles.label}>Mobile Phone (10 digits) *</Text>
            <TextInput style={styles.input} placeholder="9876543210" keyboardType="phone-pad" maxLength={10} value={phone} onChangeText={setPhone} />

            <View style={styles.rowTwo}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Age</Text>
                <TextInput style={styles.input} placeholder="35" keyboardType="numeric" value={age} onChangeText={setAge} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Blood Group</Text>
                <TextInput style={styles.input} placeholder="O+" value={bloodGroup} onChangeText={setBloodGroup} />
              </View>
            </View>

            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {(['male', 'female', 'other'] as const).map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderChip, gender === g && styles.genderChipActive]}
                  onPress={() => setGender(g)}>
                  <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                    {g.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleRegisterPatient}>
                <Text style={styles.saveText}>Register Patient</Text>
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
  content: { padding: 16, paddingBottom: 80 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  addBtn: { backgroundColor: '#0d9488', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  searchInput: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0f172a', marginBottom: 16 },
  list: { gap: 10 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0284c7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  infoCol: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patientName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  bloodBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  bloodText: { color: '#991b1b', fontSize: 10, fontWeight: '800' },
  metaText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  historyText: { fontSize: 11, color: '#0d9488', marginTop: 3, fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
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
});

export default PatientsManagementScreen;
