import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { UserPlus, Search, Shield, Key, Trash2 } from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';

interface UserManagementProps {
  onOpenDrawer?: () => void;
}

export function UserManagement({ onOpenDrawer }: UserManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('doctor');

  // Dummy Users List
  const [users, setUsers] = useState([
    { id: '1', name: 'Dr. Rahul Sharma', email: 'rahul@orbodoc.com', role: 'doctor', status: 'Active' },
    { id: '2', name: 'Priya Verma', email: 'priya@orbodoc.com', role: 'receptionist', status: 'Active' },
    { id: '3', name: 'Amit Patel', email: 'amit@orbodoc.com', role: 'pharmacist', status: 'Inactive' },
  ]);

  const handleCreateUser = () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    const newUser = {
      id: String(Date.now()),
      name: fullName,
      email,
      role,
      status: 'Active',
    };
    setUsers([newUser, ...users]);
    setIsAddModalOpen(false);
    setFullName('');
    setEmail('');
    setPassword('');
    Alert.alert('Success', `User ${fullName} created successfully!`);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || u.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  return (
    <View style={styles.container}>
      {onOpenDrawer && <StaffHeader onOpenDrawer={onOpenDrawer} title="User Management" />}

      <View style={styles.body}>
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>User Management</Text>
            <Text style={styles.subtitle}>Manage clinic staff, doctors and roles</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setIsAddModalOpen(true)}>
            <UserPlus color="#FFFFFF" size={18} />
            <Text style={styles.addButtonText}>Add User</Text>
          </TouchableOpacity>
        </View>

        {/* ── SEARCH & FILTER BAR ─────────────────────────────────────────── */}
        <View style={styles.searchBar}>
          <Search color="#94A3B8" size={18} />
          <TextInput
            placeholder="Search by name or email..."
            placeholderTextColor="#64748B"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* ── USERS LIST ─────────────────────────────────────────────────── */}
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 80 }}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <View style={styles.roleBadge}>
                  <Shield color="#14B8A6" size={12} />
                  <Text style={styles.roleBadgeText}>{item.role.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.statusBadge}>
                <Text style={[styles.statusText, { color: item.status === 'Active' ? '#22C55E' : '#EF4444' }]}>
                  {item.status}
                </Text>
              </View>
            </View>
          )}
        />

        {/* ── ADD USER MODAL ─────────────────────────────────────────────── */}
        <Modal visible={isAddModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create New User</Text>

              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput style={styles.input} placeholder="Dr. John Doe" placeholderTextColor="#64748B" value={fullName} onChangeText={setFullName} />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput style={styles.input} placeholder="john@clinic.com" placeholderTextColor="#64748B" value={email} onChangeText={setEmail} keyboardType="email-address" />

              <Text style={styles.inputLabel}>Password</Text>
              <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#64748B" secureTextEntry value={password} onChangeText={setPassword} />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsAddModalOpen(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleCreateUser}>
                  <Text style={styles.saveText}>Create User</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1D' },
  body: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  addButton: { backgroundColor: '#0D9488', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  addButtonText: { color: '#FFFFFF', fontWeight: '700', marginLeft: 6, fontSize: 13 },
  
  searchBar: { backgroundColor: '#0F172A', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 46, borderRadius: 10, borderWidth: 1, borderColor: '#1E293B', marginBottom: 16 },
  searchInput: { flex: 1, color: '#FFFFFF', marginLeft: 10, fontSize: 14 },

  userCard: { backgroundColor: '#0F172A', flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1E293B', marginBottom: 10 },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(20, 184, 166, 0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#14B8A6', fontWeight: '700', fontSize: 16 },
  userInfo: { flex: 1 },
  userName: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  userEmail: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  roleBadgeText: { color: '#14B8A6', fontSize: 10, fontWeight: '700', marginLeft: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#161F33' },
  statusText: { fontSize: 11, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#0F172A', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1E293B' },
  modalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  inputLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#161F33', color: '#FFFFFF', borderRadius: 8, height: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: '#1E293B' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 10 },
  cancelText: { color: '#94A3B8', fontWeight: '600' },
  saveBtn: { backgroundColor: '#0D9488', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  saveText: { color: '#FFFFFF', fontWeight: '700' },
});

export default UserManagement;
