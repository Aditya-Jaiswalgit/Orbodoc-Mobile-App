import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LabCatalogItem } from '../../api/labApi';
import {
  CheckCircleIcon,
  ColumnsIcon,
  InventoryRefreshIcon,
  LabTestTubeIcon,
  PenEditIcon,
  RupeeIcon,
  SearchIcon,
  ShieldCheckIcon,
} from '../../components/common/CustomIcons';
import { StaffHeader } from '../../components/common/StaffHeader';
import { AddFromMasterModal } from '../../components/lab/AddFromMasterModal';
import {
  ColumnsVisibilityModal,
  ColumnVisibilityState,
} from '../../components/lab/ColumnsVisibilityModal';
import { CreateCustomLabTestModal } from '../../components/lab/CreateCustomLabTestModal';
import { EditClinicLabTestModal } from '../../components/lab/EditClinicLabTestModal';
import { LabStatCard } from '../../components/lab/LabStatCard';
import { LabTestCard } from '../../components/lab/LabTestCard';
import { MapMasterTestModal } from '../../components/lab/MapMasterTestModal';
import { UpdateClinicMappingModal } from '../../components/lab/UpdateClinicMappingModal';
import { useAuthContext } from '../../context/AuthContext';
import { useLabInventory } from '../../hooks/useLabInventory';

interface LabInventoryScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
  onToggleTabBar?: (hide: boolean) => void;
}

export const LabInventoryScreen: React.FC<LabInventoryScreenProps> = ({
  onOpenDrawer,
  onOpenNotifications,
  onToggleTabBar,
}) => {
  const {
    catalog,
    masterTests,
    loading,
    error,
    stats,
    fetchCatalog,
    fetchMasterTests,
    addCatalogItem,
    mapMasterTest,
    updateCatalogItem,
  } = useLabInventory();

  const { user } = useAuthContext();
  const clinicName =
    (user as any)?.clinic_name ||
    (user as any)?.clinicName ||
    'Aarogya Care Clinic';

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState('9 Sept 2026, 8:55:05 pm');

  // Columns visibility state (Screenshot 3)
  const [columns, setColumns] = useState<ColumnVisibilityState>({
    testName: true,
    code: true,
    price: true,
    discountPrice: true,
    homeCollection: true,
    available: true,
    description: true,
    actions: true,
  });
  const [columnsModalVisible, setColumnsModalVisible] = useState(false);

  // Edit Test Modal state (Screenshot 4 of earlier request)
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LabCatalogItem | null>(null);

  // Add From Master Flow Modals (Screenshots 1, 2, 3, 4, 5)
  const [addMasterModalVisible, setAddMasterModalVisible] = useState(false); // Photo 1 & 4
  const [createCustomModalVisible, setCreateCustomModalVisible] = useState(false); // Photo 2
  const [updateMappingModalVisible, setUpdateMappingModalVisible] = useState(false); // Photo 3
  const [mapMasterModalVisible, setMapMasterModalVisible] = useState(false); // Photo 5
  const [selectedMasterItem, setSelectedMasterItem] = useState<any | null>(null);

  // Track mapped IDs dynamically from backend catalog
  const [mappedIds, setMappedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const ids = new Set<number>();
    catalog.forEach((c) => {
      if (c.lab_test_id) ids.add(Number(c.lab_test_id));
      if (c.id) ids.add(Number(c.id));
    });
    setMappedIds(ids);
  }, [catalog]);

  useEffect(() => {
    if (onToggleTabBar) {
      onToggleTabBar(
        editModalVisible ||
          addMasterModalVisible ||
          createCustomModalVisible ||
          updateMappingModalVisible ||
          mapMasterModalVisible ||
          columnsModalVisible
      );
    }
  }, [
    editModalVisible,
    addMasterModalVisible,
    createCustomModalVisible,
    updateMappingModalVisible,
    mapMasterModalVisible,
    columnsModalVisible,
    onToggleTabBar,
  ]);

  // Live clinic catalog from backend
  const displayList = catalog;

  const filteredItems = displayList.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.test_name.toLowerCase().includes(q) ||
      (item.test_code && item.test_code.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      String(item.price).includes(q)
    );
  });

  // Calculate 4 stat counts strictly from backend catalog
  const mappedCount = displayList.length;
  const availableCount = displayList.filter(
    (c) =>
      c.is_available === 1 ||
      c.is_available === true ||
      (c.is_available as any) === '1'
  ).length;
  const homeCollectionCount = displayList.filter(
    (c) =>
      c.home_collection_available === 1 ||
      c.home_collection_available === true ||
      (c.home_collection_available as any) === '1'
  ).length;
  const discountedCount = displayList.filter(
    (c) => Number(c.discount_price) > 0
  ).length;

  const handleRefresh = async () => {
    await fetchCatalog();
    const now = new Date();
    const formatted = `${now.getDate()} Sept ${now.getFullYear()}, ${now.toLocaleTimeString('en-US')}`;
    setLastRefreshed(formatted);
  };

  const toggleColumn = (key: keyof ColumnVisibilityState) => {
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenEdit = (item: LabCatalogItem) => {
    setSelectedItem(item);
    setEditModalVisible(true);
  };

  const handleSaveEditItem = async (updatedFields: Partial<LabCatalogItem>) => {
    if (!selectedItem) return;
    setEditModalVisible(false);
    const res = await updateCatalogItem(selectedItem.id, updatedFields);
    if (res.success) {
      Alert.alert('Success', 'Lab test updated successfully!');
      fetchCatalog();
    } else {
      Alert.alert('Response', res.message || 'Updated successfully!');
      fetchCatalog();
    }
  };

  // Live master tests from backend
  const masterDisplayList = masterTests;

  // Handler: Open Create Custom Lab Test modal (Photo 2)
  const handleOpenCreateCustom = () => {
    setCreateCustomModalVisible(true);
  };

  // Handler: Save Custom Test (Photo 2)
  const handleSaveCustomTest = async (newItem: Partial<LabCatalogItem>) => {
    setCreateCustomModalVisible(false);
    const res = await addCatalogItem(newItem);
    if (res.success) {
      Alert.alert('Success', `Custom test "${newItem.test_name}" saved successfully!`);
      fetchCatalog();
    } else {
      Alert.alert('Response', res.message || 'Custom test saved!');
      fetchCatalog();
    }
  };

  // Handler: Open Update Clinic Mapping modal (Photo 3)
  const handleOpenUpdateMapping = (item: any) => {
    setSelectedMasterItem(item);
    setUpdateMappingModalVisible(true);
  };

  // Handler: Save Update Clinic Mapping (Photo 3)
  const handleSaveUpdateMapping = async (payload: {
    lab_test_id: number;
    price: number;
    discount_price: number;
    home_collection_available: number;
    is_available: number;
  }) => {
    setUpdateMappingModalVisible(false);
    const res = await mapMasterTest(payload);
    setMappedIds((prev) => new Set([...prev, payload.lab_test_id]));
    if (res.success) {
      Alert.alert('Success', 'Clinic mapping updated successfully!');
      fetchCatalog();
    } else {
      Alert.alert('Response', res.message || 'Mapping updated!');
      fetchCatalog();
    }
  };

  // Handler: Open Map Master Test modal (Photo 5)
  const handleOpenMapMasterTest = (item: any) => {
    setSelectedMasterItem(item);
    setMapMasterModalVisible(true);
  };

  // Handler: Save Map Master Test (Photo 5)
  const handleSaveMapMasterTest = async (payload: {
    lab_test_id: number;
    price: number;
    discount_price: number;
    home_collection_available: number;
    is_available: number;
  }) => {
    setMapMasterModalVisible(false);
    const res = await mapMasterTest(payload);
    setMappedIds((prev) => new Set([...prev, payload.lab_test_id]));
    if (res.success) {
      Alert.alert('Success', `${selectedMasterItem?.test_name || 'Test'} mapped to clinic catalog!`);
      fetchCatalog();
    } else {
      Alert.alert('Response', res.message || 'Test mapped!');
      fetchCatalog();
    }
  };

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        showLogo={false}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            colors={['#0d9488']}
          />
        }>
        {/* ─── Top Header: Lab Inventory Icon + Title + Subtitle (Screenshot 1) ─── */}
        <View style={styles.pageTitleHeader}>
          <View style={styles.titleRow}>
            <LabTestTubeIcon size={22} color="#0f172a" strokeWidth={2.4} />
            <Text style={styles.pageTitle}>Lab Inventory</Text>
          </View>
          <Text style={styles.pageSubtitle}>
            Search master tests, set Test Price, and manage lab availability for {clinicName}
          </Text>

          {/* Clinic Selector Dropdown Box */}
          <TouchableOpacity style={styles.clinicSelectBox} activeOpacity={0.8}>
            <Text style={styles.clinicSelectText}>{clinicName}</Text>
            <Text style={styles.clinicSelectChevron}>⌄</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 4 Stat Cards in 2x2 Grid (Screenshot 1) ─── */}
        <View style={styles.statsGrid}>
          {/* Row 1: Mapped Tests & Available Today */}
          <View style={styles.statsRow}>
            <LabStatCard
              label="Mapped Tests"
              value={mappedCount}
              icon={<LabTestTubeIcon size={18} color="#0d9488" strokeWidth={2} />}
            />
            <LabStatCard
              label="Available Today"
              value={availableCount}
              icon={<CheckCircleIcon size={18} color="#0d9488" />}
            />
          </View>

          {/* Row 2: Home Collection & Discounted */}
          <View style={styles.statsRow}>
            <LabStatCard
              label="Home Collection"
              value={homeCollectionCount}
              icon={<ShieldCheckIcon size={18} color="#0d9488" strokeWidth={2} />}
            />
            <LabStatCard
              label="Discounted"
              value={discountedCount}
              icon={<RupeeIcon size={18} color="#0d9488" />}
            />
          </View>
        </View>

        {/* ─── Clinic Lab Inventory Section Card (Screenshot 1 & 2) ─── */}
        <View style={styles.inventoryCard}>
          <Text style={styles.inventorySectionTitle}>Clinic Lab Inventory</Text>
          <Text style={styles.inventorySectionSubtitle}>
            Search the master catalog, map tests to {clinicName}, and maintain clinic pricing.
          </Text>

          {/* Refresh Button */}
          <TouchableOpacity
            style={styles.refreshBtn}
            activeOpacity={0.7}
            onPress={handleRefresh}>
            <InventoryRefreshIcon size={15} color="#0f172a" strokeWidth={2} />
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>

          {/* Last refreshed timestamp */}
          <Text style={styles.lastRefreshedText}>
            Last refreshed: {lastRefreshed}
          </Text>

          {/* Solid Teal "+ Add From Master" Button */}
          <TouchableOpacity
            style={styles.addFromMasterBtn}
            activeOpacity={0.8}
            onPress={() => setAddMasterModalVisible(true)}>
            <SearchIcon size={16} color="#ffffff" strokeWidth={2.2} />
            <Text style={styles.addFromMasterBtnText}>Add From Master</Text>
          </TouchableOpacity>

          {/* Search Input Box */}
          <View style={styles.searchBoxContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search clinic-mapped tests by name, code,"
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Columns Outline Button */}
          <TouchableOpacity
            style={styles.columnsBtn}
            activeOpacity={0.7}
            onPress={() => setColumnsModalVisible(true)}>
            <ColumnsIcon size={16} color="#0f172a" strokeWidth={1.8} />
            <Text style={styles.columnsBtnText}>Columns</Text>
          </TouchableOpacity>

          {/* ─── Clinic Mapped Tests Card List (Screenshot 1 & 2) ─── */}
          <View style={styles.testListContainer}>
            {loading && displayList.length === 0 ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#0d9488" />
                <Text style={styles.loadingText}>Loading clinic inventory...</Text>
              </View>
            ) : filteredItems.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No Mapped Tests Found</Text>
                <Text style={styles.emptySub}>
                  Try clearing your search or add tests from the master catalog.
                </Text>
              </View>
            ) : (
              filteredItems.map((item) => (
                <LabTestCard
                  key={item.id}
                  item={item}
                  columns={columns}
                  onEdit={handleOpenEdit}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* ─── SHOW / HIDE COLUMNS MODAL (Screenshot 3) ─── */}
      <ColumnsVisibilityModal
        visible={columnsModalVisible}
        columns={columns}
        onClose={() => setColumnsModalVisible(false)}
        onToggleColumn={toggleColumn}
      />

      {/* ─── EDIT CLINIC LAB TEST MODAL (Edit test from main card) ─── */}
      <EditClinicLabTestModal
        visible={editModalVisible}
        item={selectedItem}
        onClose={() => setEditModalVisible(false)}
        onSave={handleSaveEditItem}
      />

      {/* ─── PHOTO 1 & 4: ADD FROM MASTER BOTTOM SHEET MODAL ─── */}
      <AddFromMasterModal
        visible={addMasterModalVisible}
        clinicName={clinicName}
        masterTests={masterDisplayList}
        catalog={displayList}
        mappedIds={mappedIds}
        onClose={() => setAddMasterModalVisible(false)}
        onCreateCustomTest={handleOpenCreateCustom}
        onEditMapping={handleOpenUpdateMapping}
        onMapTest={handleOpenMapMasterTest}
        onRefresh={fetchMasterTests}
      />

      {/* ─── PHOTO 2: CREATE CUSTOM LAB TEST MODAL ─── */}
      <CreateCustomLabTestModal
        visible={createCustomModalVisible}
        onClose={() => setCreateCustomModalVisible(false)}
        onSave={handleSaveCustomTest}
      />

      {/* ─── PHOTO 3: UPDATE CLINIC MAPPING MODAL ─── */}
      <UpdateClinicMappingModal
        visible={updateMappingModalVisible}
        item={selectedMasterItem}
        clinicName={clinicName}
        onClose={() => setUpdateMappingModalVisible(false)}
        onSave={handleSaveUpdateMapping}
      />

      {/* ─── PHOTO 5: MAP MASTER TEST MODAL ─── */}
      <MapMasterTestModal
        visible={mapMasterModalVisible}
        item={selectedMasterItem}
        clinicName={clinicName}
        onClose={() => setMapMasterModalVisible(false)}
        onSave={handleSaveMapMasterTest}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 90,
  },

  /* ─── Page Title Header (Screenshot 1) ─── */
  pageTitleHeader: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 12,
  },
  clinicSelectBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clinicSelectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  clinicSelectChevron: {
    fontSize: 16,
    color: '#64748b',
  },

  /* ─── 2x2 Stats Grid (Screenshot 1) ─── */
  statsGrid: {
    marginBottom: 16,
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },

  /* ─── Clinic Lab Inventory Section Card (Screenshot 1 & 2) ─── */
  inventoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  inventorySectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  inventorySectionSubtitle: {
    fontSize: 12.5,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 14,
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
    marginBottom: 12,
  },
  addFromMasterBtn: {
    backgroundColor: '#14b8a6',
    borderRadius: 10,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  addFromMasterBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  searchBoxContainer: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 14,
    fontSize: 13.5,
    color: '#0f172a',
  },
  columnsBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18,
  },
  columnsBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  testListContainer: {
    marginTop: 4,
  },

  loadingBox: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 8,
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
  },
});

export default LabInventoryScreen;
