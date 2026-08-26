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
import { Clinic } from '../../types/clinicTypes';

interface Props {
  onOpenDrawer: () => void;
}

export const ClinicsManagementScreen: React.FC<Props> = ({ onOpenDrawer }) => {
  const [clinics, setClinics] = useState<Clinic[]>([
    {
      id: 1,
      name: 'Arogya Super Specialty Clinic',
      code: 'CLN-001',
      email: 'admin@arogya.clinic',
      phone: '+91 9876543210',
      address: '12 Hospital Road, Lower Parel',
      city: 'Mumbai',
      status: 'active',
      subscription_plan: 'Enterprise',
      doctors_count: 12,
      patients_count: 1420,
    },
    {
      id: 2,
      name: 'Metro Health Diagnostics',
      code: 'CLN-002',
      email: 'contact@metrohealth.com',
      phone: '+91 9811223344',
      address: '45 Ring Road',
      city: 'Delhi',
      status: 'active',
      subscription_plan: 'Pro',
      doctors_count: 8,
      patients_count: 980,
    },
    {
      id: 3,
      name: 'Sunrise Dental & Eye Clinic',
      code: 'CLN-003',
      email: 'info@sunrisedental.com',
      phone: '+91 9900112233',
      address: '78 MG Road',
      city: 'Bengaluru',
      status: 'active',
      subscription_plan: 'Basic',
      doctors_count: 5,
      patients_count: 520,
    },
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [plan, setPlan] = useState('Pro');

  const handleCreateClinic = () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      Alert.alert('Validation Error', 'Please fill all required clinic details.');
      return;
    }

    const newClinic: Clinic = {
      id: Date.now(),
      name,
      code: `CLN-00${clinics.length + 1}`,
      email,
      phone,
      city: city || 'Mumbai',
      status: 'active',
      subscription_plan: plan,
      doctors_count: 1,
      patients_count: 0,
    };

    setClinics([newClinic, ...clinics]);
    setModalVisible(false);
    setName('');
    setEmail('');
    setPhone('');
    setCity('');
    Alert.alert('Success', 'Tenant clinic registered successfully!');
  };

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Tenant Clinics" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={styles.pageTitle}>Multi-Tenant Clinics ({clinics.length})</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Register Clinic</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.clinicList}>
          {clinics.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleCol}>
                  <Text style={styles.clinicName}>{item.name}</Text>
                  <Text style={styles.codeText}>Code: {item.code} • {item.city}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.detailText}>📧 {item.email}</Text>
                <Text style={styles.detailText}>📞 {item.phone}</Text>
                {item.address ? <Text style={styles.detailText}>📍 {item.address}</Text> : null}
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.statsPill}>
                  <Text style={styles.statsText}>👨‍⚕️ {item.doctors_count} Doctors</Text>
                </View>
                <View style={styles.statsPill}>
                  <Text style={styles.statsText}>👥 {item.patients_count} Patients</Text>
                </View>
                <View style={styles.planPill}>
                  <Text style={styles.planText}>Plan: {item.subscription_plan}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Modal to Register Clinic */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Register New Tenant Clinic</Text>

            <Text style={styles.label}>Clinic Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Hope Multispecialty Clinic"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Admin Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="admin@hopeclinic.com"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Contact Phone *</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 9800000000"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              placeholder="Mumbai"
              value={city}
              onChangeText={setCity}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleCreateClinic}>
                <Text style={styles.saveText}>Register Clinic</Text>
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
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  addBtn: { backgroundColor: '#0d9488', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  clinicList: { gap: 14 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitleCol: { flex: 1, paddingRight: 10 },
  clinicName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  codeText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: '#166534', fontSize: 10, fontWeight: '800' },
  cardBody: { marginVertical: 6, gap: 3 },
  detailText: { fontSize: 13, color: '#334155' },
  cardFooter: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  statsPill: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statsText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  planPill: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 'auto' },
  planText: { fontSize: 11, fontWeight: '800', color: '#0369a1' },
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#475569', fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: '#0d9488', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#ffffff', fontWeight: '800' },
});

export default ClinicsManagementScreen;
