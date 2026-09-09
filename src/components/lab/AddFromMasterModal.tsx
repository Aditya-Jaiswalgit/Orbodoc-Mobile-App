import React, { useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  InventoryRefreshIcon,
  PenEditIcon,
  SearchIcon,
} from '../common/CustomIcons';

interface MasterLabTestItem {
  id: number;
  test_name: string;
  test_code: string;
  description?: string;
  status?: string | number;
  is_mapped?: boolean;
  clinic_price?: number;
  clinic_discount_price?: number;
  clinic_home_collection_available?: number;
  clinic_is_available?: number;
}

interface AddFromMasterModalProps {
  visible: boolean;
  clinicName?: string;
  masterTests: MasterLabTestItem[];
  catalog?: any[];
  mappedIds: Set<number>;
  onClose: () => void;
  onCreateCustomTest: () => void;
  onEditMapping: (item: MasterLabTestItem) => void;
  onMapTest: (item: MasterLabTestItem) => void;
  onRefresh?: () => void;
}

export const AddFromMasterModal: React.FC<AddFromMasterModalProps> = ({
  visible,
  clinicName = 'Aarogya Care Clinic',
  masterTests,
  catalog = [],
  mappedIds,
  onClose,
  onCreateCustomTest,
  onEditMapping,
  onMapTest,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'ready' | 'mapped'>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState('9 Sept 2026, 9:14:49 pm');

  // Helper to check if a test is already mapped
  const checkIsMapped = (item: MasterLabTestItem) => {
    const matchedInCatalog = (catalog || []).some(
      (c) =>
        (c.lab_test_id && Number(c.lab_test_id) === Number(item.id)) ||
        (c.id && Number(c.id) === Number(item.id)) ||
        (c.test_name && item.test_name && c.test_name.toLowerCase().trim() === item.test_name.toLowerCase().trim()) ||
        (c.test_code && item.test_code && c.test_code.toLowerCase().trim() === item.test_code.toLowerCase().trim())
    );

    return Boolean(
      matchedInCatalog ||
      (mappedIds && mappedIds.has(item.id)) ||
      item.is_mapped === true ||
      item.is_mapped === 1 ||
      (item as any).is_mapped_for_clinic === 1 ||
      (item as any).is_mapped_for_clinic === true ||
      Boolean((item as any).clinic_map_id)
    );
  };

  const filteredList = masterTests.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      item.test_name.toLowerCase().includes(q) ||
      (item.test_code && item.test_code.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q));

    if (!matchesQuery) return false;

    const isMapped = checkIsMapped(item);
    if (selectedFilter === 'ready') return !isMapped;
    if (selectedFilter === 'mapped') return isMapped;
    return true;
  });

  const readyToMapCount = masterTests.filter((m) => !checkIsMapped(m)).length;
  const mappedCount = masterTests.filter((m) => checkIsMapped(m)).length;

  const handleRefreshClick = () => {
    if (onRefresh) onRefresh();
    const now = new Date();
    setLastRefreshed(
      `${now.getDate()} Sept ${now.getFullYear()}, ${now.toLocaleTimeString('en-US')}`
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.sheetContainer}>
          {/* Top Header matching Screenshot 1 */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconSquircle}>
                <PenEditIcon size={20} color="#ffffff" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Add clinic lab tests</Text>
                <Text style={styles.headerSubtitle}>
                  Map a master test to {clinicName}, or create a clinic-only custom test.
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            {/* "+ Create custom test" Button matching Screenshot 1 */}
            <TouchableOpacity
              style={styles.createCustomBtn}
              activeOpacity={0.7}
              onPress={onCreateCustomTest}>
              <Text style={styles.createCustomPlus}>+</Text>
              <Text style={styles.createCustomText}>Create custom test</Text>
            </TouchableOpacity>

            {/* Search Input Box */}
            <View style={styles.searchBox}>
              <SearchIcon size={16} color="#94a3b8" strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by test name, code or des"
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Filter Dropdown Selector */}
            <TouchableOpacity
              style={styles.filterDropdownBtn}
              activeOpacity={0.7}
              onPress={() => setShowFilterDropdown(!showFilterDropdown)}>
              <Text style={styles.filterDropdownText}>
                {selectedFilter === 'all'
                  ? 'All master tests'
                  : selectedFilter === 'ready'
                  ? 'Ready to map tests'
                  : 'Mapped tests'}
              </Text>
              <Text style={styles.filterDropdownChevron}>⌄</Text>
            </TouchableOpacity>

            {showFilterDropdown && (
              <View style={styles.filterMenu}>
                <TouchableOpacity
                  style={styles.filterMenuItem}
                  onPress={() => {
                    setSelectedFilter('all');
                    setShowFilterDropdown(false);
                  }}>
                  <Text
                    style={[
                      styles.filterMenuText,
                      selectedFilter === 'all' && styles.filterMenuTextActive,
                    ]}>
                    All master tests
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.filterMenuItem}
                  onPress={() => {
                    setSelectedFilter('ready');
                    setShowFilterDropdown(false);
                  }}>
                  <Text
                    style={[
                      styles.filterMenuText,
                      selectedFilter === 'ready' && styles.filterMenuTextActive,
                    ]}>
                    Ready to map
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.filterMenuItem}
                  onPress={() => {
                    setSelectedFilter('mapped');
                    setShowFilterDropdown(false);
                  }}>
                  <Text
                    style={[
                      styles.filterMenuText,
                      selectedFilter === 'mapped' && styles.filterMenuTextActive,
                    ]}>
                    Mapped
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Refresh Button */}
            <TouchableOpacity
              style={styles.refreshBtn}
              activeOpacity={0.7}
              onPress={handleRefreshClick}>
              <InventoryRefreshIcon size={15} color="#0f172a" strokeWidth={2} />
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>

            {/* Last Refreshed Timestamp */}
            <Text style={styles.lastRefreshedText}>
              Last refreshed: {lastRefreshed}
            </Text>

            {/* Counts Meta Row */}
            <View style={styles.countsRow}>
              <Text style={styles.testsFoundCount}>
                {masterTests.length} tests found
              </Text>

              <View style={styles.badgesGroup}>
                <View style={styles.readyBadge}>
                  <Text style={styles.readyBadgeText}>
                    {readyToMapCount} ready to map
                  </Text>
                </View>
                <View style={styles.mappedBadge}>
                  <Text style={styles.mappedBadgeText}>
                    {mappedCount} mapped
                  </Text>
                </View>
              </View>
            </View>

            {/* Master Tests Cards List */}
            <View style={styles.cardsList}>
              {filteredList.map((item) => {
                const isMapped = checkIsMapped(item);
                const isActive = item.status !== 'Inactive' && item.status !== 0;

                const matchedInCatalog = catalog.find(
                  (c) =>
                    (c.lab_test_id && Number(c.lab_test_id) === Number(item.id)) ||
                    (c.test_name && item.test_name && c.test_name.toLowerCase().trim() === item.test_name.toLowerCase().trim()) ||
                    (c.test_code && item.test_code && c.test_code.toLowerCase().trim() === item.test_code.toLowerCase().trim())
                );
                const priceVal = parseFloat(String(matchedInCatalog?.price ?? item.clinic_price ?? 1.0)) || 1.0;

                if (isMapped) {
                  // Mapped Card (Screenshot 1 & Top Card of User Screenshot)
                  return (
                    <View key={item.id} style={[styles.testCard, styles.testCardMapped]}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle}>{item.test_name}</Text>
                        <View
                          style={[
                            styles.statusPill,
                            isActive ? styles.statusActive : styles.statusInactive,
                          ]}>
                          <Text
                            style={[
                              styles.statusPillText,
                              isActive ? styles.statusActiveText : styles.statusInactiveText,
                            ]}>
                            {isActive ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>

                      {Boolean(item.test_code) && (
                        <Text style={styles.cardCode}>{item.test_code}</Text>
                      )}

                      {Boolean(item.description) && (
                        <Text style={styles.cardDesc}>{item.description}</Text>
                      )}

                      <View style={styles.cardPillsRow}>
                        <View style={styles.pillMapped}>
                          <Text style={styles.pillMappedText}>Mapped</Text>
                        </View>
                        <View style={styles.pillPrice}>
                          <Text style={styles.pillPriceText}>
                            ₹{priceVal.toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.editMappingBtn}
                        activeOpacity={0.7}
                        onPress={() => onEditMapping({ ...item, price: priceVal })}>
                        <Text style={styles.editMappingBtnText}>Edit mapping</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }

                // Ready to Map Card (Screenshot 4 & Bottom Card of User Screenshot)
                return (
                  <View key={item.id} style={styles.testCard}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>{item.test_name}</Text>
                      <View
                        style={[
                          styles.statusPill,
                          isActive ? styles.statusActive : styles.statusInactive,
                        ]}>
                        <Text
                          style={[
                            styles.statusPillText,
                            isActive ? styles.statusActiveText : styles.statusInactiveText,
                          ]}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>

                    {Boolean(item.test_code) && (
                      <Text style={styles.cardCode}>{item.test_code}</Text>
                    )}

                    {Boolean(item.description) && (
                      <Text style={styles.cardDesc}>{item.description}</Text>
                    )}

                    <View style={styles.cardPillsRow}>
                      <View style={styles.pillReady}>
                        <Text style={styles.pillReadyText}>Ready to map</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.mapTestBtn}
                      activeOpacity={0.8}
                      onPress={() => onMapTest(item)}>
                      <Text style={styles.mapTestBtnText}>Map test</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Bottom Close Button matching Screenshot 1 */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={styles.bottomCloseBtn}
              activeOpacity={0.7}
              onPress={onClose}>
              <Text style={styles.bottomCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '94%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconSquircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  createCustomBtn: {
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  createCustomPlus: {
    fontSize: 18,
    color: '#0d9488',
    fontWeight: '700',
  },
  createCustomText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0d9488',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0f172a',
  },
  filterDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  filterDropdownText: {
    fontSize: 14,
    color: '#0f172a',
  },
  filterDropdownChevron: {
    fontSize: 16,
    color: '#64748b',
  },
  filterMenu: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  filterMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterMenuText: {
    fontSize: 13.5,
    color: '#334155',
  },
  filterMenuTextActive: {
    color: '#0d9488',
    fontWeight: '700',
  },
  refreshBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  refreshBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  lastRefreshedText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 14,
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  testsFoundCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  badgesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readyBadge: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
  },
  readyBadgeText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  mappedBadge: {
    backgroundColor: '#ccfbf1',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
  },
  mappedBadgeText: {
    fontSize: 12,
    color: '#0d9488',
    fontWeight: '700',
  },
  cardsList: {
    gap: 12,
  },
  testCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
  },
  testCardMapped: {
    borderWidth: 1.5,
    borderColor: '#5eead4',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#0d9488',
  },
  statusInactive: {
    backgroundColor: '#f1f5f9',
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  statusActiveText: {
    color: '#ffffff',
  },
  statusInactiveText: {
    color: '#64748b',
  },
  cardCode: {
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  cardDesc: {
    fontSize: 13,
    color: '#475569',
    marginTop: 8,
    lineHeight: 18,
  },
  cardPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 12,
  },
  pillMapped: {
    backgroundColor: '#0d9488',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillMappedText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  pillPrice: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillPriceText: {
    color: '#334155',
    fontSize: 11.5,
    fontWeight: '700',
  },
  pillReady: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillReadyText: {
    color: '#334155',
    fontSize: 11.5,
    fontWeight: '600',
  },
  editMappingBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editMappingBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  mapTestBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 10,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTestBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  footerContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  bottomCloseBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomCloseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
});
