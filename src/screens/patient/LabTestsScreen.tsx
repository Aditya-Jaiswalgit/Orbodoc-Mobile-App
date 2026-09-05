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
    clinics[0]?.name || 'All Clinics'
  );
  const [showClinicPicker, setShowClinicPicker] = useState<boolean>(false);

  const filteredLabTests = labTests.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const pid = String(t.patient_code || t.patient_id || '').toLowerCase();
    const name = (t.patient_name || '').toLowerCase();
    const phone = (t.patient_phone || '').toLowerCase();
    const testName = (t.test_name || '').toLowerCase();

    return q === '' || pid.includes(q) || name.includes(q) || phone.includes(q) || testName.includes(q);
  });

  const getStatusBadgeStyle = (statusStr?: string) => {
    const s = String(statusStr || '').toLowerCase();
    if (s === 'completed' || s === 'verified' || s === 'done') {
      return { bg: '#dcfce7', text: '#15803d', label: 'Completed' };
    }
    if (s === 'processing' || s === 'sample_collected' || s === 'in_progress') {
      return { bg: '#e0f2fe', text: '#0369a1', label: 'In Progress' };
    }
    if (s === 'cancelled' || s === 'cancel') {
      return { bg: '#fee2e2', text: '#b91c1c', label: 'Cancelled' };
    }
    return { bg: '#fef3c7', text: '#d97706', label: statusStr || 'Pending' };
  };

  return (
    <View style={styles.container}>
      <PatientHeader onOpenDrawer={onOpenDrawer} onOpenNotifications={onOpenNotifications} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshLabTests} colors={['#0d9488']} />
        }>
        {/* Title Header Box */}
        <View style={styles.headerBox}>
          <View style={styles.headerTitleRow}>
            <View style={styles.titleIconCircle}>
              <LabTubeIcon color="#0d9488" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>Lab Tests & Reports 🧪</Text>
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

        {/* 3 Native Mobile Stat Cards */}
        <View style={styles.statsThreeRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconCircle}>
              <PatientUserIcon color="#0d9488" size={14} />
            </View>
            <Text style={styles.statLabel}>PATIENTS</Text>
            <Text style={styles.statBigNum}>{patientsCount}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#e0f2fe' }]}>
              <Text style={{ fontSize: 12 }}>📈</Text>
            </View>
            <Text style={styles.statLabel}>ACTIVE</Text>
            <Text style={styles.statBigNum}>{activeCount}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#dcfce7' }]}>
              <Text style={{ fontSize: 12 }}>📋</Text>
            </View>
            <Text style={styles.statLabel}>REPORTS</Text>
            <Text style={styles.statBigNum}>{reportsCount}</Text>
          </View>
        </View>

        {/* Search Card */}
        <View style={styles.searchCard}>
          <View style={styles.searchRowGrid}>
            <View style={styles.searchInputWrapper}>
              <Text style={styles.searchIconText}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by test name, patient, mobile..."
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

        {/* Main List Container (Native App Cards, No Squeezed Web Black Table Header) */}
        <View style={styles.mainContainer}>
          <View style={styles.mainHeaderRow}>
            <View style={styles.mainTitleGroup}>
              <Text style={styles.mainSectionTitle}>Lab Test Orders</Text>
              <View style={styles.countBadgePill}>
                <Text style={styles.countBadgeText}>{filteredLabTests.length}</Text>
              </View>
            </View>
            <Text style={styles.mainSectionSub}>Patient diagnostic records & progress</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
          ) : filteredLabTests.length === 0 ? (
            <View style={styles.emptyLabBox}>
              <View style={styles.emptyLabIconCircle}>
                <LabTubeIcon color="#94a3b8" size={32} />
              </View>
              <Text style={styles.emptyLabTitle}>No Lab Reports Found</Text>
              <Text style={styles.emptyLabSub}>No diagnostic tests found matching your selection.</Text>
            </View>
          ) : (
            <View style={styles.labCardsList}>
              {filteredLabTests.map((t, idx) => {
                const badge = getStatusBadgeStyle(t.status);
                const priceVal = (t as any).total_price || t.price || t.cost || 0;

                return (
                  <View key={t.id ? `lab-${t.id}-${idx}` : `lab-${idx}`} style={styles.labCardItem}>
                    {/* Top Row: Test Name & Status Badge */}
                    <View style={styles.labCardHeader}>
                      <View style={styles.labTestTitleCol}>
                        <Text style={styles.labTestNameText}>
                          🧪 {t.test_name || 'Complete Diagnostic Test'}
                        </Text>
                      </View>
                      <View style={[styles.statusBadgePill, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardDivider} />

                    {/* Meta Info Rows */}
                    <View style={styles.labMetaGrid}>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Patient:</Text>
                        <Text style={styles.metaVal}>
                          👤 {t.patient_name || 'Patient'} ({t.patient_code || `PT-${t.patient_id}`})
                        </Text>
                      </View>

                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Doctor:</Text>
                        <Text style={styles.metaVal}>
                          🩺 {t.doctor_name || 'Doctor Consultation'}
                        </Text>
                      </View>

                      {t.created_at ? (
                        <View style={styles.metaRow}>
                          <Text style={styles.metaLabel}>Date:</Text>
                          <Text style={styles.metaVal}>
                            📅 {String(t.created_at).split(' ')[0]}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.cardDivider} />

                    {/* Bottom Row: Price & Action */}
                    <View style={styles.cardFooterRow}>
                      <View>
                        <Text style={styles.priceLabelText}>Total Test Price</Text>
                        <Text style={styles.priceAmountText}>₹{priceVal}.00</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.viewReportBtn}
                        onPress={() => {}}>
                        <Text style={styles.viewReportBtnText}>📋 View Details</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
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

  statsThreeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    alignItems: 'center',
  },
  statIconCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statLabel: { fontSize: 10, fontWeight: '800', color: '#64748b' },
  statBigNum: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 2 },

  searchCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2, gap: 10 },
  searchRowGrid: { flexDirection: 'row', gap: 8 },
  searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1.8, borderColor: '#0d9488', borderRadius: 10, paddingHorizontal: 10 },
  searchIconText: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 12, color: '#0f172a' },
  searchTealBtn: { backgroundColor: '#0d9488', borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' },
  searchTealBtnText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  showingDataSubtext: { fontSize: 11, color: '#64748b' },

  mainContainer: { gap: 12 },
  mainHeaderRow: { marginBottom: 4 },
  mainTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mainSectionTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  countBadgePill: { backgroundColor: '#0d9488', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  mainSectionSub: { fontSize: 12, color: '#64748b', marginTop: 2 },

  emptyLabBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 45, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyLabIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyLabTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  emptyLabSub: { fontSize: 12, color: '#64748b', marginTop: 4 },

  labCardsList: { gap: 12 },
  labCardItem: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  labCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  labTestTitleCol: { flex: 1, marginRight: 8 },
  labTestNameText: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  statusBadgePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },

  cardDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  labMetaGrid: { gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaLabel: { width: 70, fontSize: 12, color: '#64748b', fontWeight: '600' },
  metaVal: { fontSize: 12, color: '#0f172a', fontWeight: '700', flex: 1 },

  cardFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  priceLabelText: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  priceAmountText: { fontSize: 16, fontWeight: '800', color: '#0d9488' },

  viewReportBtn: { backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  viewReportBtnText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  pickerModalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 320 },
  pickerModalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 14, textAlign: 'center' },
  pickerOptionRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerOptionText: { fontSize: 14, color: '#334155', fontWeight: '600', textAlign: 'center' },
  pickerOptionSelected: { color: '#0d9488', fontWeight: '800' },
});

export default LabTestsScreen;
