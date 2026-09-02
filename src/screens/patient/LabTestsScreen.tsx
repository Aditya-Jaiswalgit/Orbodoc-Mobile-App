import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import { LabTubeIcon, PatientUserIcon } from '../../components/common/CustomIcons';
import { useLabTests } from '../../hooks/useLabTests';
import { useClinics } from '../../hooks/useClinics';

interface LabTestsScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
}

export const LabTestsScreen: React.FC<LabTestsScreenProps> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
}) => {
  const {
    labTests,
    patientsCount,
    activeCount,
    reportsCount,
    loading,
    lastRefreshed,
    refreshLabTests,
  } = useLabTests();

  const { clinics } = useClinics();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClinicName, setSelectedClinicName] = useState<string>(
    clinics[0]?.name || "All Clinics"
  );
  const [showClinicPicker, setShowClinicPicker] = useState<boolean>(false);

  const filteredLabTests = labTests.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const pid = String(t.patient_code || t.patient_id || '').toLowerCase();
    const name = (t.patient_name || '').toLowerCase();
    const phone = (t.patient_phone || '').toLowerCase();

    return q === '' || pid.includes(q) || name.includes(q) || phone.includes(q);
  });

  return (
    <View style={styles.container}>
      <PatientHeader onOpenDrawer={onOpenDrawer} onOpenNotifications={onOpenNotifications} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBox}>
          <View style={styles.headerTitleRow}>
            <View style={styles.titleIconCircle}>
              <LabTubeIcon color="#0d9488" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>Lab Tests</Text>
              <Text style={styles.pageSub}>Manage clinic tests and diagnostic reports</Text>
            </View>
          </View>

          <View style={styles.headerRightControls}>
            <TouchableOpacity style={styles.clinicSelectBtn} onPress={() => setShowClinicPicker(true)}>
              <Text style={styles.clinicSelectText} numberOfLines={1}>{selectedClinicName}</Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.refreshBtn} onPress={refreshLabTests}>
              <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>
          {lastRefreshed ? (
            <Text style={styles.lastRefreshedText}>Last refreshed: {lastRefreshed}</Text>
          ) : null}
        </View>

        <View style={styles.searchCard}>
          <View style={styles.searchRowGrid}>
            <View style={styles.searchInputWrapper}>
              <Text style={styles.searchIconText}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by patient ID, name, or mobile..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <TouchableOpacity style={styles.searchTealBtn} onPress={refreshLabTests}>
              <Text style={styles.searchTealBtnText}>Search</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.showingDataSubtext}>
            🟢 Showing data for <Text style={{ fontWeight: '800', color: '#0f172a' }}>{selectedClinicName}</Text>
          </Text>
        </View>

        <View style={styles.mainLabCard}>
          <View style={styles.mainCardHeaderRow}>
            <View style={styles.mainCardHeaderLeft}>
              <View style={styles.mainCardIconCircle}>
                <LabTubeIcon color="#ffffff" size={18} />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.mainCardTitle}>Lab Tests</Text>
                  <View style={styles.countBadgePill}>
                    <Text style={styles.countBadgeText}>{filteredLabTests.length}</Text>
                  </View>
                </View>
                <Text style={styles.mainCardSub}>Patient-wise diagnostic orders and report progress</Text>
              </View>
            </View>

            <View style={styles.statsBadgesRow}>
              <View style={styles.miniStatBadge}>
                <PatientUserIcon color="#475569" size={12} />
                <Text style={styles.miniStatLabel}>PATIENTS</Text>
                <Text style={styles.miniStatVal}>{patientsCount}</Text>
              </View>

              <View style={styles.miniStatBadge}>
                <Text style={{ fontSize: 10 }}>📈</Text>
                <Text style={styles.miniStatLabel}>ACTIVE</Text>
                <Text style={styles.miniStatVal}>{activeCount}</Text>
              </View>

              <View style={styles.miniStatBadge}>
                <Text style={{ fontSize: 10 }}>📋</Text>
                <Text style={styles.miniStatLabel}>REPORTS</Text>
                <Text style={styles.miniStatVal}>{reportsCount}</Text>
              </View>
            </View>
          </View>

          <View style={styles.blackTableHeaderRow}>
            <Text style={[styles.blackColText, { flex: 0.9 }]}>PATIENT ID</Text>
            <Text style={[styles.blackColText, { flex: 1.2 }]}>PATIENT</Text>
            <Text style={[styles.blackColText, { flex: 1 }]}>TESTS</Text>
            <Text style={[styles.blackColText, { flex: 1 }]}>DOCTORS</Text>
            <Text style={[styles.blackColText, { flex: 0.9 }]}>STATUS</Text>
            <Text style={[styles.blackColText, { flex: 0.9 }]}>PRICE</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
          ) : filteredLabTests.length === 0 ? (
            <View style={styles.emptyLabBox}>
              <View style={styles.emptyLabIconCircle}>
                <LabTubeIcon color="#94a3b8" size={32} />
              </View>
              <Text style={styles.emptyLabText}>No lab reports created yet</Text>
            </View>
          ) : (
            <View style={styles.labTestsList}>
              {filteredLabTests.map((t, idx) => (
                <View key={t.id ? `lab-${t.id}-${idx}` : `lab-${idx}`} style={styles.labTableRow}>
                  <Text style={[styles.tableCellText, { flex: 0.9, fontWeight: '800' }]}>
                    {t.patient_code || `PT-${t.patient_id}`}
                  </Text>
                  <Text style={[styles.tableCellText, { flex: 1.2 }]}>{t.patient_name || 'Patient'}</Text>
                  <Text style={[styles.tableCellText, { flex: 1 }]}>{t.test_name || 'Diagnostic Test'}</Text>
                  <Text style={[styles.tableCellText, { flex: 1 }]}>{t.doctor_name || 'Doctor'}</Text>
                  <View style={[styles.statusTag, { flex: 0.9 }]}>
                    <Text style={styles.statusTagText}>{t.status || 'Pending'}</Text>
                  </View>
                  <Text style={[styles.tableCellText, { flex: 0.9, fontWeight: '800', color: '#0d9488' }]}>
                    ₹{t.total_price || 0}.00
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showClinicPicker} transparent animationType="fade" onRequestClose={() => setShowClinicPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowClinicPicker(false)}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Select Healthcare Clinic</Text>
            {(clinics.length > 0 ? clinics.map((c) => c.name) : ["Dr Agrawal's healthcare clinic"]).map((cName) => (
              <TouchableOpacity
                key={cName}
                style={styles.pickerOptionRow}
                onPress={() => {
                  setSelectedClinicName(cName);
                  setShowClinicPicker(false);
                }}>
                <Text style={[styles.pickerOptionText, selectedClinicName === cName && styles.pickerOptionSelected]}>
                  🏥 {cName}
                </Text>
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
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  titleIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  pageSub: { fontSize: 12, color: '#64748b', marginTop: 1 },

  headerRightControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clinicSelectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  clinicSelectText: { fontSize: 12, fontWeight: '700', color: '#334155', flex: 1 },
  pickerArrow: { fontSize: 9, color: '#94a3b8', marginLeft: 4 },
  refreshBtn: { backgroundColor: '#ffffff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  refreshBtnText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  lastRefreshedText: { fontSize: 10, color: '#94a3b8', textAlign: 'right', marginTop: 4 },

  searchCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2, gap: 10 },
  searchRowGrid: { flexDirection: 'row', gap: 8 },
  searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1.8, borderColor: '#0d9488', borderRadius: 10, paddingHorizontal: 10 },
  searchIconText: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 12, color: '#0f172a' },
  searchTealBtn: { backgroundColor: '#0d9488', borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' },
  searchTealBtnText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  showingDataSubtext: { fontSize: 11, color: '#64748b' },

  mainLabCard: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#cbd5e1', overflow: 'hidden', elevation: 2 },
  mainCardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  mainCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  mainCardIconCircle: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#0d9488', alignItems: 'center', justifyContent: 'center' },
  mainCardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  countBadgePill: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  countBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  mainCardSub: { fontSize: 11, color: '#64748b', marginTop: 1 },

  statsBadgesRow: { flexDirection: 'row', gap: 6 },
  miniStatBadge: { backgroundColor: '#f8fafc', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  miniStatLabel: { fontSize: 8, fontWeight: '800', color: '#64748b', marginTop: 1 },
  miniStatVal: { fontSize: 12, fontWeight: '800', color: '#0f172a' },

  blackTableHeaderRow: { flexDirection: 'row', backgroundColor: '#090d16', paddingVertical: 10, paddingHorizontal: 14 },
  blackColText: { fontSize: 10, fontWeight: '800', color: '#ffffff' },

  emptyLabBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyLabIconCircle: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyLabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },

  labTestsList: { padding: 10, gap: 8 },
  labTableRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  tableCellText: { fontSize: 12, color: '#0f172a' },
  statusTag: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' },
  statusTagText: { fontSize: 10, fontWeight: '800', color: '#16a34a' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  pickerModalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 320 },
  pickerModalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 14, textAlign: 'center' },
  pickerOptionRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerOptionText: { fontSize: 14, color: '#334155', fontWeight: '600', textAlign: 'center' },
  pickerOptionSelected: { color: '#0d9488', fontWeight: '800' },
});

export default LabTestsScreen;
