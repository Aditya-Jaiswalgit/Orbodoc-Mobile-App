import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import {
  ActivityPulseIcon,
  ChevronDownIcon,
  ClipboardCheckIcon,
  LabTubeIcon,
  LabUsersIcon,
  RefreshCwIcon,
  SearchInputIcon,
} from '../../components/common/CustomIcons';
import { useLabTests } from '../../hooks/useLabTests';
import { useClinics } from '../../hooks/useClinics';

interface LabTestsScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
  onToggleTabBar?: (hide: boolean) => void;
}

export const LabTestsScreen: React.FC<LabTestsScreenProps> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
  onToggleTabBar,
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
    clinics[0]?.name || 'Maihar City Dental Care'
  );
  const [showClinicPicker, setShowClinicPicker] = useState<boolean>(false);

  useEffect(() => {
    if (clinics && clinics.length > 0 && selectedClinicName === 'Maihar City Dental Care') {
      const match = clinics.find((c) => c.name.toLowerCase().includes('maihar'));
      if (match) setSelectedClinicName(match.name);
      else if (clinics[0]?.name) setSelectedClinicName(clinics[0].name);
    }
  }, [clinics]);

  useEffect(() => {
    if (onToggleTabBar) {
      onToggleTabBar(showClinicPicker);
    }
  }, [showClinicPicker, onToggleTabBar]);

  useEffect(() => {
    return () => {
      onToggleTabBar?.(false);
    };
  }, [onToggleTabBar]);

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
      {/* ─── HEADER: HAMBURGER ON LEFT (NO LOGO), NOTIFICATION & AVATAR ON RIGHT ─── */}
      <PatientHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        showLogo={false}
        showRolePill={false}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshLabTests} colors={['#0d9488']} />
        }>
        {/* ─── TOP PAGE HEADER: MINT SQUIRCLE ICON + LAB TESTS ─── */}
        <View style={styles.topHeaderSection}>
          <View style={styles.topHeaderRow}>
            <View style={styles.topIconSquircle}>
              <LabTubeIcon color="#0f766e" size={24} strokeWidth={2.2} />
            </View>
            <View style={styles.topTitleCol}>
              <Text style={styles.topPageTitle}>Lab Tests</Text>
              <Text style={styles.topSubtitleText}>
                Manage clinic tests and diagnostic reports
              </Text>
            </View>
          </View>
        </View>

        {/* ─── CARD 1: CLINIC SELECTOR + REFRESH BUTTON ─── */}
        <View style={styles.topControlsContainer}>
          <TouchableOpacity
            style={styles.clinicDropdownBtn}
            activeOpacity={0.8}
            onPress={() => setShowClinicPicker(true)}>
            <Text style={styles.clinicDropdownText} numberOfLines={1}>
              {selectedClinicName}
            </Text>
            <ChevronDownIcon size={18} color="#64748b" strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshMintBtn}
            activeOpacity={0.8}
            onPress={refreshLabTests}>
            <RefreshCwIcon size={16} color="#0d9488" />
            <Text style={styles.refreshMintBtnText}>Refresh</Text>
          </TouchableOpacity>

          <Text style={styles.lastRefreshedText}>
            Last refreshed: {lastRefreshed || '9 Sept 2026, 4:47:57 pm'}
          </Text>
        </View>

        {/* ─── CARD 2: SEARCH CARD WITH FULL WIDTH TEAL SEARCH BUTTON ─── */}
        <View style={styles.searchCard}>
          <View style={styles.searchInputWrapper}>
            <SearchInputIcon size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by patient ID, name, or mobile.."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity
            style={styles.searchTealBtn}
            activeOpacity={0.85}
            onPress={refreshLabTests}>
            <Text style={styles.searchTealBtnText}>Search</Text>
          </TouchableOpacity>

          <View style={styles.showingDataRow}>
            <View style={styles.greenDot} />
            <Text style={styles.showingDataLabel}>Showing data for </Text>
            <Text style={styles.showingDataClinic}>{selectedClinicName}</Text>
          </View>
        </View>

        {/* ─── CARD 3: MAIN LAB TESTS CARD (STATS + EMPTY STATE / LIST) ─── */}
        <View style={styles.mainLabCard}>
          {/* Main Lab Header */}
          <View style={styles.mainLabHeaderRow}>
            <View style={styles.mainLabIconBox}>
              <LabTubeIcon color="#ffffff" size={24} strokeWidth={2.2} />
            </View>
            <View style={styles.mainLabTitleCol}>
              <View style={styles.mainLabTitleBadgeRow}>
                <Text style={styles.mainLabTitle}>Lab Tests</Text>
                <View style={styles.blackBadgePill}>
                  <Text style={styles.blackBadgeText}>{filteredLabTests.length}</Text>
                </View>
              </View>
              <Text style={styles.mainLabSubtitle}>
                Patient-wise diagnostic orders and report progress
              </Text>
            </View>
          </View>

          {/* 3-Stats Row */}
          <View style={styles.statsThreeBox}>
            <View style={styles.statCol}>
              <LabUsersIcon color="#3b82f6" size={20} strokeWidth={2} />
              <View style={styles.statTextCol}>
                <Text style={styles.statLabel}>PATIENTS</Text>
                <Text style={styles.statNum}>
                  {patientsCount || (filteredLabTests.length > 0 ? filteredLabTests.length : 0)}
                </Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <ActivityPulseIcon color="#0d9488" size={20} strokeWidth={2.2} />
              <View style={styles.statTextCol}>
                <Text style={styles.statLabel}>ACTIVE</Text>
                <Text style={styles.statNum}>{activeCount || 0}</Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <ClipboardCheckIcon color="#f59e0b" size={20} strokeWidth={2} />
              <View style={styles.statTextCol}>
                <Text style={styles.statLabel}>REPORTS</Text>
                <Text style={styles.statNum}>{reportsCount || 0}</Text>
              </View>
            </View>
          </View>

          {/* Divider Line */}
          <View style={styles.accentDividerLine} />

          {/* Empty State / List */}
          {loading ? (
            <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
          ) : filteredLabTests.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptySquircleBox}>
                <LabTubeIcon color="#94a3b8" size={28} strokeWidth={1.8} />
              </View>
              <Text style={styles.emptyStateText}>No lab reports created yet</Text>
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
                          {t.test_name || 'Complete Diagnostic Test'}
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
                          {t.patient_name || 'Patient'} ({t.patient_code || `PT-${t.patient_id}`})
                        </Text>
                      </View>

                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Doctor:</Text>
                        <Text style={styles.metaVal}>
                          {t.doctor_name || 'Doctor Consultation'}
                        </Text>
                      </View>

                      {t.created_at ? (
                        <View style={styles.metaRow}>
                          <Text style={styles.metaLabel}>Date:</Text>
                          <Text style={styles.metaVal}>
                            {String(t.created_at).split(' ')[0]}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.cardDivider} />

                    {/* Bottom Row: Price */}
                    <View style={styles.cardFooterRow}>
                      <View>
                        <Text style={styles.priceLabelText}>Total Test Price</Text>
                        <Text style={styles.priceAmountText}>₹{priceVal}.00</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ─── CLINIC SELECTION MODAL ─── */}
      <Modal
        visible={showClinicPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClinicPicker(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowClinicPicker(false)}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Select Healthcare Clinic</Text>
            {(clinics.length > 0 ? clinics.map((c) => c.name) : ['Maihar City Dental Care']).map((cName) => (
              <TouchableOpacity
                key={cName}
                style={styles.pickerOptionRow}
                onPress={() => {
                  setSelectedClinicName(cName);
                  setShowClinicPicker(false);
                }}>
                <Text
                  style={[
                    styles.pickerOptionText,
                    selectedClinicName === cName && styles.pickerOptionSelected,
                  ]}>
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
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 100 },

  /* ─── TOP PAGE HEADER ─── */
  topHeaderSection: { marginBottom: 14, marginTop: 4 },
  topHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topIconSquircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitleCol: { flex: 1 },
  topPageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  topSubtitleText: { fontSize: 13, color: '#64748b', marginTop: 2 },

  /* ─── CARD 1: CLINIC & REFRESH ─── */
  topControlsContainer: { marginBottom: 14 },
  clinicDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ccfbf1',
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 16,
  },
  clinicDropdownText: { fontSize: 14, fontWeight: '600', color: '#0f172a', flex: 1 },
  refreshMintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#e6f7f5',
    borderWidth: 1,
    borderColor: '#99f6e4',
    borderRadius: 12,
    height: 44,
    marginTop: 10,
  },
  refreshMintBtnText: { fontSize: 14, fontWeight: '700', color: '#0d9488' },
  lastRefreshedText: { fontSize: 11.5, color: '#64748b', marginTop: 8 },

  /* ─── CARD 2: SEARCH CARD ─── */
  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ccfbf1',
    padding: 16,
    marginBottom: 14,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
  },
  searchInput: { flex: 1, fontSize: 13.5, color: '#0f172a', paddingVertical: 0 },
  searchTealBtn: {
    backgroundColor: '#14b8a6',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  searchTealBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  showingDataRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  greenDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10b981' },
  showingDataLabel: { fontSize: 12, color: '#64748b' },
  showingDataClinic: { fontSize: 12, fontWeight: '700', color: '#0f172a' },

  /* ─── CARD 3: MAIN LAB TESTS CARD ─── */
  mainLabCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  mainLabHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mainLabIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainLabTitleCol: { flex: 1 },
  mainLabTitleBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mainLabTitle: { fontSize: 19, fontWeight: '800', color: '#0f172a' },
  blackBadgePill: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  blackBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  mainLabSubtitle: { fontSize: 12.5, color: '#64748b', marginTop: 3 },

  /* 3-Stats Row */
  statsThreeBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statTextCol: { gap: 1 },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  statNum: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  statDivider: { width: 1, height: 26, backgroundColor: '#f1f5f9', marginHorizontal: 4 },

  accentDividerLine: {
    height: 2,
    backgroundColor: '#14b8a6',
    marginTop: 16,
    marginBottom: 20,
    opacity: 0.8,
  },

  /* Empty State */
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptySquircleBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 14,
  },

  /* Lab Cards List */
  labCardsList: { gap: 12 },
  labCardItem: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 14,
    textAlign: 'center',
  },
  pickerOptionRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerOptionText: { fontSize: 14, color: '#334155', fontWeight: '600', textAlign: 'center' },
  pickerOptionSelected: { color: '#0d9488', fontWeight: '800' },
});

export default LabTestsScreen;
