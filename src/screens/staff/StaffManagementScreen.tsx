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
import { StaffMember, StaffRole } from '../../types/clinicTypes';

interface Props {
  onOpenDrawer: () => void;
}

export const StaffManagementScreen: React.FC<Props> = ({ onOpenDrawer }) => {
  const [staffList, setStaffList] = useState<StaffMember[]>([
    { id: 1, clinic_id: 1, full_name: 'Dr. Ramesh Sharma', email: 'dr.ramesh@arogya.clinic', phone: '+91 9876543210', role_name: 'doctor', department: 'Cardiology', specialization: 'Interventional Cardiology', consultation_fee: 800, is_active: true },
    { id: 2, clinic_id: 1, full_name: 'Dr. Ananya Roy', email: 'dr.ananya@arogya.clinic', phone: '+91 9876543211', role_name: 'doctor', department: 'Pediatrics', specialization: 'Child Specialist', consultation_fee: 600, is_active: true },
    { id: 3, clinic_id: 1, full_name: 'Priya Nair', email: 'priya@arogya.clinic', phone: '+91 9876543212', role_name: 'receptionist', department: 'Front Desk', is_active: true },
    { id: 4, clinic_id: 1, full_name: 'Suresh Kumar', email: 'suresh@arogya.clinic', phone: '+91 9876543213', role_name: 'pharmacist', department: 'Pharmacy', is_active: true },
    { id: 5, clinic_id: 1, full_name: 'Kavita Singh', email: 'kavita@arogya.clinic', phone: '+91 9876543214', role_name: 'lab_technician', department: 'Diagnostics', is_active: true },
    { id: 6, clinic_id: 1, full_name: 'Manish Mehta', email: 'manish@arogya.clinic', phone: '+91 9876543215', role_name: 'accountant', department: 'Accounts', is_active: true },
  ]);

  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<StaffRole>('doctor');
  const [department, setDepartment] = useState('');
  const [fee, setFee] = useState('');

  const filteredStaff = selectedRoleFilter === 'all'
    ? staffList
    : staffList.filter(s => s.role_name === selectedRoleFilter);

  const handleAddStaff = () => {
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      Alert.alert('Validation Error', 'Full Name, Email and Phone are required.');
      return;
    }

    const newStaff: StaffMember = {
      id: Date.now(),
      clinic_id: 1,
      full_name: fullName,
      email,
      phone,
      role_name: role,
      department: department || 'OPD',
      consultation_fee: fee ? parseFloat(fee) : undefined,
      is_active: true,
    };

    setStaffList([newStaff, ...staffList]);
    setModalVisible(false);
    setFullName('');
    setEmail('');
    setPhone('');
    setFee('');
    Alert.alert('Success', 'Staff member account created successfully!');
  };

  const ROLES_LIST: { id: string; label: string }[] = [
    { id: 'all', label: 'All Roles' },
    { id: 'doctor', label: 'Doctors' },
    { id: 'receptionist', label: 'Reception' },
    { id: 'pharmacist', label: 'Pharmacy' },
    { id: 'lab_technician', label: 'Lab Tech' },
    { id: 'accountant', label: 'Accounts' },
    { id: 'nurse', label: 'Nurses' },
  ];

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Staff Directory" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header & Add Button */}
        <View style={styles.topRow}>
          <Text style={styles.pageTitle}>Clinic Staff ({filteredStaff.length})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Add Staff Member</Text>
          </TouchableOpacity>
        </View>

        {/* Role Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {ROLES_LIST.map(r => (
            <TouchableOpacity
              key={r.id}
              style={[styles.filterChip, selectedRoleFilter === r.id && styles.filterChipActive]}
              onPress={() => setSelectedRoleFilter(r.id)}>
              <Text style={[styles.filterText, selectedRoleFilter === r.id && styles.filterTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Staff Cards List */}
        <View style={styles.staffGrid}>
          {filteredStaff.map((member) => (
            <View key={member.id} style={styles.staffCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>{member.full_name.charAt(0)}</Text>
              </View>
              <View style={styles.staffInfo}>
                <View style={styles.nameRoleRow}>
                  <Text style={styles.staffName}>{member.full_name}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{member.role_name.replace('_', ' ')}</Text>
                  </View>
                </View>
                <Text style={styles.deptText}>Dept: {member.department || 'General'} {member.specialization ? `• ${member.specialization}` : ''}</Text>
                <Text style={styles.contactText}>📧 {member.email}  |  📞 {member.phone}</Text>
                {member.consultation_fee ? (
                  <Text style={styles.feeText}>Consultation Fee: ₹{member.consultation_fee}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Add Staff Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Create Staff Account</Text>

              <Text style={styles.label}>Full Name *</Text>
              <TextInput style={styles.input} placeholder="Dr. Sarah Jenkins" value={fullName} onChangeText={setFullName} />

              <Text style={styles.label}>Email Address *</Text>
              <TextInput style={styles.input} placeholder="sarah@arogya.clinic" keyboardType="email-address" value={email} onChangeText={setEmail} />

              <Text style={styles.label}>Mobile Phone *</Text>
              <TextInput style={styles.input} placeholder="+91 9876543210" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

              <Text style={styles.label}>Assign Role *</Text>
              <View style={styles.rolePickerRow}>
                {(['doctor', 'receptionist', 'pharmacist', 'lab_technician', 'accountant', 'nurse'] as StaffRole[]).map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleOption, role === r && styles.roleOptionSelected]}
                    onPress={() => setRole(r)}>
                    <Text style={[styles.roleOptionText, role === r && styles.roleOptionTextSelected]}>
                      {r.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Department</Text>
              <TextInput style={styles.input} placeholder="Cardiology / OPD / Pharmacy" value={department} onChangeText={setDepartment} />

              {role === 'doctor' ? (
                <>
                  <Text style={styles.label}>Consultation Fee (₹)</Text>
                  <TextInput style={styles.input} placeholder="500" keyboardType="numeric" value={fee} onChangeText={setFee} />
                </>
              ) : null}

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleAddStaff}>
                  <Text style={styles.saveText}>Save Staff</Text>
                </TouchableOpacity>
              </View>
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
  filterRow: { marginBottom: 16 },
  filterChip: { backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#cbd5e1', marginRight: 8 },
  filterChipActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  filterText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterTextActive: { color: '#ffffff' },
  staffGrid: { gap: 12 },
  staffCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0d9488', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarLetter: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  staffInfo: { flex: 1 },
  nameRoleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  staffName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  roleBadge: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleBadgeText: { color: '#0369a1', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  deptText: { fontSize: 12, color: '#64748b' },
  contactText: { fontSize: 11, color: '#94a3b8', marginTop: 3 },
  feeText: { fontSize: 11, fontWeight: '700', color: '#0d9488', marginTop: 2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center' },
  modalScroll: { padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  rolePickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
  roleOption: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#f8fafc' },
  roleOptionSelected: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  roleOptionText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  roleOptionTextSelected: { color: '#ffffff' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#475569', fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: '#0d9488', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#ffffff', fontWeight: '800' },
});

export default StaffManagementScreen;
