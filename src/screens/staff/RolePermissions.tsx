import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import { ShieldCheck, Check } from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';

interface RolePermissionsProps {
  onOpenDrawer?: () => void;
}

export function RolePermissions({ onOpenDrawer }: RolePermissionsProps) {
  const roles = [
    { id: 'clinic_admin', name: 'Clinic Admin' },
    { id: 'doctor', name: 'Doctor' },
    { id: 'receptionist', name: 'Receptionist' },
    { id: 'pharmacist', name: 'Pharmacist' },
  ];

  const [selectedRole, setSelectedRole] = useState('clinic_admin');

  // Permission Matrix State
  const [permissions, setPermissions] = useState([
    { id: 'staff_users', name: 'User Management', view: true, add: true, edit: true, delete: false },
    { id: 'patients', name: 'Patients', view: true, add: true, edit: true, delete: true },
    { id: 'appointments', name: 'Appointments', view: true, add: true, edit: true, delete: true },
    { id: 'medicines', name: 'Medicines', view: true, add: false, edit: false, delete: false },
    { id: 'lab_tests', name: 'Lab Tests', view: true, add: true, edit: false, delete: false },
  ]);

  const togglePermission = (id: string, key: 'view' | 'add' | 'edit' | 'delete') => {
    setPermissions(
      permissions.map((item) =>
        item.id === id ? { ...item, [key]: !item[key] } : item
      )
    );
  };

  const handleSavePermissions = () => {
    Alert.alert('Saved', `Permissions updated for role ${selectedRole.toUpperCase()}`);
  };

  return (
    <View style={styles.container}>
      {onOpenDrawer && <StaffHeader onOpenDrawer={onOpenDrawer} title="Role Permissions" />}

      <View style={styles.body}>
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Role Permissions</Text>
            <Text style={styles.subtitle}>Configure access levels for each staff role</Text>
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={handleSavePermissions}>
            <Check color="#FFFFFF" size={16} />
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* ── ROLE TABS ───────────────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleTabs}>
          {roles.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.tab, selectedRole === r.id && styles.activeTab]}
              onPress={() => setSelectedRole(r.id)}
            >
              <ShieldCheck color={selectedRole === r.id ? '#14B8A6' : '#94A3B8'} size={16} />
              <Text style={[styles.tabText, selectedRole === r.id && styles.activeTabText]}>
                {r.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── PERMISSIONS MATRIX ──────────────────────────────────────────── */}
        <ScrollView style={styles.matrixContainer} showsVerticalScrollIndicator={false}>
          {permissions.map((perm) => (
            <View key={perm.id} style={styles.permRow}>
              <Text style={styles.permName}>{perm.name}</Text>

              <View style={styles.switchGroup}>
                <View style={styles.switchBox}>
                  <Text style={styles.switchLabel}>View</Text>
                  <Switch
                    value={perm.view}
                    onValueChange={() => togglePermission(perm.id, 'view')}
                    trackColor={{ false: '#1E293B', true: '#0D9488' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.switchBox}>
                  <Text style={styles.switchLabel}>Add</Text>
                  <Switch
                    value={perm.add}
                    onValueChange={() => togglePermission(perm.id, 'add')}
                    trackColor={{ false: '#1E293B', true: '#0D9488' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.switchBox}>
                  <Text style={styles.switchLabel}>Edit</Text>
                  <Switch
                    value={perm.edit}
                    onValueChange={() => togglePermission(perm.id, 'edit')}
                    trackColor={{ false: '#1E293B', true: '#0D9488' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.switchBox}>
                  <Text style={styles.switchLabel}>Delete</Text>
                  <Switch
                    value={perm.delete}
                    onValueChange={() => togglePermission(perm.id, 'delete')}
                    trackColor={{ false: '#1E293B', true: '#0D9488' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
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
  saveButton: { backgroundColor: '#0D9488', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  saveButtonText: { color: '#FFFFFF', fontWeight: '700', marginLeft: 6 },

  roleTabs: { marginBottom: 16, maxHeight: 44 },
  tab: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginRight: 10, borderWidth: 1, borderColor: '#1E293B' },
  activeTab: { borderColor: '#0D9488', backgroundColor: 'rgba(13, 148, 136, 0.15)' },
  tabText: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  activeTabText: { color: '#FFFFFF', fontWeight: '700' },

  matrixContainer: { flex: 1 },
  permRow: { backgroundColor: '#0F172A', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#1E293B', marginBottom: 12 },
  permName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  switchGroup: { flexDirection: 'row', justifyContent: 'space-between' },
  switchBox: { alignItems: 'center' },
  switchLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '600', marginBottom: 4 },
});

export default RolePermissions;
