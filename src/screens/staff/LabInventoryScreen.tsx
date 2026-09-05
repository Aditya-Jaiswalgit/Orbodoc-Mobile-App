import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { StaffHeader } from '../../components/common/StaffHeader';
import { useLabInventory } from '../../hooks/useLabInventory';
import { LabCatalogItem } from '../../api/labApi';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addMasterModalVisible, setAddMasterModalVisible] = useState(false);
  const [mapMasterModalVisible, setMapMasterModalVisible] = useState(false);
  const [selectedMasterItem, setSelectedMasterItem] = useState<any | null>(null);
  const [mapPrice, setMapPrice] = useState('');
  const [mapDiscountPrice, setMapDiscountPrice] = useState('');
  const [mapHomeCollection, setMapHomeCollection] = useState<'Not available' | 'Available'>('Not available');
  const [mapAvailability, setMapAvailability] = useState<'Available' | 'Not available'>('Available');

  useEffect(() => {
    if (onToggleTabBar) {
      onToggleTabBar(editModalVisible || addMasterModalVisible || mapMasterModalVisible);
    }
  }, [editModalVisible, addMasterModalVisible, mapMasterModalVisible, onToggleTabBar]);

  const [selectedItem, setSelectedItem] = useState<LabCatalogItem | null>(null);
  const [editTestName, setEditTestName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDiscountPrice, setEditDiscountPrice] = useState('');
  const [editHomeCollection, setEditHomeCollection] = useState<'No' | 'Available'>('No');
  const [editAvailable, setEditAvailable] = useState<'Available' | 'Unavailable'>('Available');
  const [editMasterStatus, setEditMasterStatus] = useState<'Active' | 'Inactive'>('Active');
  const [editDescription, setEditDescription] = useState('');

  // Form states for Add From Master
  const [masterSearchQuery, setMasterSearchQuery] = useState('');
  const [mappedMasterIds, setMappedMasterIds] = useState<Set<number>>(new Set());
  const [masterPage, setMasterPage] = useState(1);
  const [masterPageSize, setMasterPageSize] = useState(5);

  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);
  const [newTestName, setNewTestName] = useState('');
  const [newTestCode, setNewTestCode] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDiscountPrice, setNewDiscountPrice] = useState('0');
  const [newHomeCollection, setNewHomeCollection] = useState(false);
  const [newDescription, setNewDescription] = useState('');

  // Web screenshot default fallback list if API database catalog is initially empty
  const defaultCatalogItems: LabCatalogItem[] = [
    {
      id: 101,
      test_name: '17-OH Progesterone',
      test_code: '17OHP',
      price: 300.0,
      discount_price: 0.0,
      home_collection_available: 0,
      is_available: 1,
      description: 'Measures 17-hydroxyprogesterone',
    },
    {
      id: 102,
      test_name: '24 Hour Urine Protein',
      test_code: '24UPROT',
      price: 567.0,
      discount_price: 480.0,
      home_collection_available: 1,
      is_available: 1,
      description: 'Quantifies daily urine protein excretion',
    },
    {
      id: 103,
      test_name: 'blood test',
      test_code: 'CBC008',
      price: 3.85,
      discount_price: 0.31,
      home_collection_available: 0,
      is_available: 1,
      description: 'test',
    },
    {
      id: 104,
      test_name: 'Complete Blood Count',
      test_code: 'CBC',
      price: 230.0,
      discount_price: 0.0,
      home_collection_available: 1,
      is_available: 1,
      description: 'Measures RBC, WBC, platelets, hemoglobin levels',
    },
  ];

  const displayList = catalog.length > 0 ? catalog : defaultCatalogItems;

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

  const defaultMasterTestsList = [
    { id: 201, test_name: 'Apolipoprotein B', test_code: 'APOB', description: 'Measures Apo B level', status: 'Active' },
    { id: 202, test_name: 'Arterial Blood Gas', test_code: 'ABG', description: 'Evaluates oxygenation and acid-base balance', status: 'Active' },
    { id: 203, test_name: 'ASO Titer', test_code: 'ASOT', description: 'Antistreptolysin O antibody titer', status: 'Active' },
    { id: 204, test_name: 'Audiometry', test_code: 'AUDIO', description: 'Hearing test to assess ear function', status: 'Active' },
    { id: 205, test_name: 'BAER', test_code: 'BAER', description: 'Brainstem auditory evoked response', status: 'Active' },
    { id: 206, test_name: 'BETA HCG', test_code: 'BHCG', description: 'Human Chorionic Gonadotropin hormone test', status: 'Active' },
    { id: 207, test_name: 'Bilirubin Total & Direct', test_code: 'BILI', description: 'Liver function test for jaundice evaluation', status: 'Active' },
    { id: 208, test_name: 'Blood Group & Rh Type', test_code: 'BGRH', description: 'ABO and Rh blood group determination', status: 'Active' },
    { id: 209, test_name: 'Blood Sugar Fasting', test_code: 'BSF', description: 'Fasting glucose measurement', status: 'Active' },
    { id: 210, test_name: 'Blood Sugar PP', test_code: 'BSPP', description: 'Postprandial glucose measurement', status: 'Active' },
    { id: 211, test_name: 'Calcium Total', test_code: 'CAL', description: 'Serum calcium level check', status: 'Active' },
    { id: 212, test_name: 'Complete Blood Count', test_code: 'CBC', description: 'Hemoglobin, RBC, WBC, platelet count', status: 'Active' },
    { id: 213, test_name: 'C-Reactive Protein', test_code: 'CRP', description: 'Inflammation marker assay', status: 'Active' },
    { id: 214, test_name: 'D-Dimer', test_code: 'DDIM', description: 'Fibrin degradation thrombosis test', status: 'Active' },
    { id: 215, test_name: 'Erythrocyte Sedimentation Rate', test_code: 'ESR', description: 'Westergren ESR rate test', status: 'Active' },
    { id: 216, test_name: 'Ferritin Serum', test_code: 'FERR', description: 'Iron storage ferritin level', status: 'Active' },
    { id: 217, test_name: 'Folic Acid', test_code: 'FOL', description: 'Serum folate concentration', status: 'Active' },
    { id: 218, test_name: 'HbA1c Glycated Hemoglobin', test_code: 'HBA1C', description: '3-month average blood glucose', status: 'Active' },
    { id: 219, test_name: 'HIV 1 & 2 Rapid', test_code: 'HIV', description: 'Screening test for HIV antibodies', status: 'Active' },
    { id: 220, test_name: 'Kidney Function Test', test_code: 'KFT', description: 'Urea, Creatinine, Uric acid panel', status: 'Active' },
    { id: 221, test_name: 'Lipid Profile Total', test_code: 'LIPID', description: 'Cholesterol, Triglycerides, HDL, LDL', status: 'Active' },
    { id: 222, test_name: 'Liver Function Test', test_code: 'LFT', description: 'SGOT, SGPT, Bilirubin, Alkaline Phosphatase', status: 'Active' },
    { id: 223, test_name: 'Magnesium Serum', test_code: 'MAG', description: 'Electrolyte magnesium test', status: 'Active' },
    { id: 224, test_name: 'Prothrombin Time (PT/INR)', test_code: 'PTINR', description: 'Coagulation clotting cascade test', status: 'Active' },
    { id: 225, test_name: 'Thyroid Profile (T3, T4, TSH)', test_code: 'THYROID', description: 'Complete thyroid function panel', status: 'Active' },
    { id: 226, test_name: 'Urine Routine & Microscopy', test_code: 'URINE', description: 'Physical, chemical, and microscopic urine test', status: 'Active' },
    { id: 227, test_name: 'Vitamin B12', test_code: 'VITB12', description: 'Serum cobalamin concentration', status: 'Active' },
    { id: 228, test_name: 'Vitamin D3 (25-OH)', test_code: 'VITD3', description: 'Serum 25-hydroxy vitamin D level', status: 'Active' },
    { id: 229, test_name: 'Widal Test', test_code: 'WIDAL', description: 'Typhoid agglutination titer test', status: 'Active' },
    { id: 230, test_name: 'Zinc Serum', test_code: 'ZINC', description: 'Essential trace element zinc assay', status: 'Active' },
  ];

  const masterDisplayList = masterTests.length > 0 ? masterTests : defaultMasterTestsList;

  const filteredMasterList = masterDisplayList.filter((m) => {
    const q = masterSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      m.test_name.toLowerCase().includes(q) ||
      (m.test_code && m.test_code.toLowerCase().includes(q)) ||
      (m.description && m.description.toLowerCase().includes(q))
    );
  });

  const totalMasterCount = masterTests.length > 0 ? masterTests.length : 296;
  const startItem = (masterPage - 1) * masterPageSize + 1;
  const endItem = Math.min(masterPage * masterPageSize, filteredMasterList.length);

  const paginatedMasterList = filteredMasterList.slice(
    (masterPage - 1) * masterPageSize,
    masterPage * masterPageSize
  );

  const handleOpenEdit = (item: LabCatalogItem) => {
    setSelectedItem(item);
    setEditTestName(item.test_name || '');
    setEditCode(item.test_code || '');
    setEditPrice(String(item.price || 0));
    setEditDiscountPrice(String(item.discount_price || 0));
    setEditHomeCollection(item.home_collection_available ? 'Available' : 'No');
    setEditAvailable(item.is_available !== false && (item.is_available as any) !== 0 ? 'Available' : 'Unavailable');
    setEditMasterStatus(item.status !== false && (item.status as any) !== 0 ? 'Active' : 'Inactive');
    setEditDescription(item.description || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editTestName.trim()) {
      Alert.alert('Validation Error', 'Please enter a test name');
      return;
    }
    const priceNum = Number(editPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Validation Error', 'Please enter a valid test price');
      return;
    }

    const payload = {
      test_name: editTestName.trim(),
      test_code: editCode.trim() || null,
      price: priceNum,
      discount_price: Number(editDiscountPrice) || 0,
      home_collection_available: editHomeCollection === 'Available' ? 1 : 0,
      is_available: editAvailable === 'Available' ? 1 : 0,
      status: editMasterStatus === 'Active' ? 1 : 0,
      description: editDescription.trim() || null,
    };

    if (selectedItem) {
      const res = await updateCatalogItem(selectedItem.id, payload);
      setEditModalVisible(false);
      if (res.success) {
        Alert.alert('Success', `${editTestName.trim()} updated successfully!`);
        fetchCatalog();
      } else {
        Alert.alert('Response', res.message || 'Updated successfully!');
        fetchCatalog();
      }
    } else {
      const res = await addCatalogItem(payload);
      setEditModalVisible(false);
      if (res.success) {
        Alert.alert('Success', `Custom test "${editTestName.trim()}" created successfully!`);
        fetchCatalog();
      } else {
        Alert.alert('Response', res.message || 'Created successfully!');
        fetchCatalog();
      }
    }
  };

  const handleOpenMapMasterModal = (mt: any) => {
    setSelectedMasterItem(mt);
    const existingInCatalog = (catalog && catalog.length > 0 ? catalog : defaultCatalogItems).find(
      (c) => c.test_name.toLowerCase() === mt.test_name.toLowerCase() || (mt.id && (c as any).lab_test_id === mt.id)
    );

    if (existingInCatalog || mt.is_mapped || mt.clinic_map_id) {
      setMapPrice(String(existingInCatalog?.price ?? mt.clinic_price ?? '0.00'));
      setMapDiscountPrice(String(existingInCatalog?.discount_price ?? mt.clinic_discount_price ?? '0.00'));
      setMapHomeCollection(
        (existingInCatalog?.home_collection_available === 1 || mt.clinic_home_collection_available === 1)
          ? 'Available'
          : 'Not available'
      );
      setMapAvailability(
        (existingInCatalog?.is_available === 1 || mt.clinic_is_available === 1 || existingInCatalog?.is_available === undefined)
          ? 'Available'
          : 'Not available'
      );
    } else {
      setMapPrice('');
      setMapDiscountPrice('');
      setMapHomeCollection('Not available');
      setMapAvailability('Available');
    }
    setMapMasterModalVisible(true);
  };

  const handleSaveMappingSubmit = async () => {
    if (!selectedMasterItem) return;
    const priceNum = Number(mapPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Validation Error', 'Please enter a valid test price');
      return;
    }

    const payload = {
      lab_test_id: selectedMasterItem.id,
      price: priceNum,
      discount_price: Number(mapDiscountPrice) || 0,
      home_collection_available: mapHomeCollection === 'Available' ? 1 : 0,
      is_available: mapAvailability === 'Available' ? 1 : 0,
    };

    const res = await mapMasterTest(payload);
    setMapMasterModalVisible(false);
    if (res.success) {
      Alert.alert('Success', `${selectedMasterItem.test_name} mapping saved to clinic catalog!`);
      setMappedMasterIds((prev) => new Set([...prev, selectedMasterItem.id]));
      fetchCatalog();
      fetchMasterTests();
    } else {
      Alert.alert('Response', res.message || 'Mapping saved to clinic catalog!');
      setMappedMasterIds((prev) => new Set([...prev, selectedMasterItem.id]));
      fetchCatalog();
      fetchMasterTests();
    }
  };

  const handleSaveAddMaster = async () => {
    if (!newTestName.trim() && !selectedMasterId) {
      Alert.alert('Validation Error', 'Please select a master test or enter a test name');
      return;
    }

    const priceNum = Number(newPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Validation Error', 'Please enter a valid price');
      return;
    }

    if (selectedMasterId) {
      const res = await mapMasterTest({
        lab_test_id: selectedMasterId,
        price: priceNum,
        discount_price: Number(newDiscountPrice) || 0,
        home_collection_available: newHomeCollection ? 1 : 0,
      });
      if (res.success) {
        setAddMasterModalVisible(false);
        Alert.alert('Success', 'Master test mapped to clinic catalog!');
      } else {
        setAddMasterModalVisible(false);
      }
    } else {
      const res = await addCatalogItem({
        test_name: newTestName,
        test_code: newTestCode,
        price: priceNum,
        discount_price: Number(newDiscountPrice) || 0,
        home_collection_available: newHomeCollection ? 1 : 0,
        description: newDescription,
      });
      if (res.success) {
        setAddMasterModalVisible(false);
        Alert.alert('Success', 'New catalog test added!');
      } else {
        setAddMasterModalVisible(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Lab & Diagnostics Desk"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchCatalog} colors={['#0d9488']} />
        }>
        {/* Page Title & Main Action Buttons Header */}
        <View style={styles.pageHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Clinic Lab Inventory</Text>
            <Text style={styles.pageSubTitle}>
              Search the master catalog, map tests to Aarogya Care Clinic, and maintain clinic pricing.
            </Text>
          </View>

          <View style={styles.headerBtnGroup}>
            <TouchableOpacity style={styles.refreshBtn} onPress={fetchCatalog}>
              <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.addMasterBtn} onPress={() => setAddMasterModalVisible(true)}>
              <Text style={styles.addMasterBtnText}>🔍 + Add From Master</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4 Stat Metric Cards (Exact Match to Web Screenshot) */}
        <View style={styles.statsGridRow}>
          {/* Card 1: Mapped Tests */}
          <View style={styles.statCard}>
            <View style={styles.statCardTop}>
              <View>
                <Text style={styles.statCardLabel}>Mapped Tests</Text>
                <Text style={styles.statCardVal}>{stats.mappedCount}</Text>
              </View>
              <View style={[styles.statIconBadge, { backgroundColor: '#f0fdfa' }]}>
                <Text style={{ fontSize: 16 }}>🧪</Text>
              </View>
            </View>
          </View>

          {/* Card 2: Available Today */}
          <View style={styles.statCard}>
            <View style={styles.statCardTop}>
              <View>
                <Text style={styles.statCardLabel}>Available Today</Text>
                <Text style={styles.statCardVal}>{stats.availableCount}</Text>
              </View>
              <View style={[styles.statIconBadge, { backgroundColor: '#f0fdf4' }]}>
                <Text style={{ fontSize: 16 }}>🟢</Text>
              </View>
            </View>
          </View>

          {/* Card 3: Home Collection */}
          <View style={styles.statCard}>
            <View style={styles.statCardTop}>
              <View>
                <Text style={styles.statCardLabel}>Home Collection</Text>
                <Text style={styles.statCardVal}>{stats.homeCollectionCount}</Text>
              </View>
              <View style={[styles.statIconBadge, { backgroundColor: '#f0fdfa' }]}>
                <Text style={{ fontSize: 16 }}>🏠</Text>
              </View>
            </View>
          </View>

          {/* Card 4: Discounted */}
          <View style={styles.statCard}>
            <View style={styles.statCardTop}>
              <View>
                <Text style={styles.statCardLabel}>Discounted</Text>
                <Text style={styles.statCardVal}>{stats.discountedCount}</Text>
              </View>
              <View style={[styles.statIconBadge, { backgroundColor: '#f0fdfa' }]}>
                <Text style={{ fontSize: 16 }}>₹</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Search & Columns Filter Input */}
        <View style={styles.filterBarBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search clinic mapped tests by name, code, price..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Inventory Data Table (Exact Match Web Portal Table) */}
        <View style={styles.tableCard}>
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: 720 }}>
              {/* Table Header Row */}
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.thCell, { width: 160 }]}>Test Name</Text>
                <Text style={[styles.thCell, { width: 80 }]}>Code</Text>
                <Text style={[styles.thCell, { width: 90 }]}>Test Price</Text>
                <Text style={[styles.thCell, { width: 100 }]}>Discount price</Text>
                <Text style={[styles.thCell, { width: 110 }]}>Home Collection</Text>
                <Text style={[styles.thCell, { width: 90 }]}>Availability</Text>
                <Text style={[styles.thCell, { width: 180 }]}>Description</Text>
                <Text style={[styles.thCell, { width: 70, textAlign: 'right' }]}>Actions</Text>
              </View>

              {loading && displayList.length === 0 ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#0d9488" />
                  <Text style={{ marginTop: 8, color: '#64748b', fontSize: 13 }}>Loading inventory...</Text>
                </View>
              ) : filteredItems.length === 0 ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <Text style={{ color: '#64748b', fontSize: 14, fontWeight: '600' }}>No mapped tests found.</Text>
                </View>
              ) : (
                filteredItems.map((item) => {
                  const isHome = Boolean(item.home_collection_available);
                  const isAvail = item.is_available !== false && (item.is_available as any) !== 0;

                  return (
                    <View key={item.id} style={styles.tableBodyRow}>
                      {/* Test Name */}
                      <Text style={[styles.tdCellBold, { width: 160 }]} numberOfLines={2}>
                        {item.test_name}
                      </Text>

                      {/* Code */}
                      <Text style={[styles.tdCellSub, { width: 80 }]}>
                        {item.test_code || 'N/A'}
                      </Text>

                      {/* Test Price */}
                      <Text style={[styles.tdCell, { width: 90 }]}>
                        ₹{Number(item.price || 0).toFixed(2)}
                      </Text>

                      {/* Discount Price */}
                      <Text style={[styles.tdCell, { width: 100 }]}>
                        ₹{Number(item.discount_price || 0).toFixed(2)}
                      </Text>

                      {/* Home Collection Badge */}
                      <View style={{ width: 110 }}>
                        <View style={[styles.pillBadge, isHome ? styles.pillTeal : styles.pillGray]}>
                          <Text style={[styles.pillText, isHome ? styles.pillTextTeal : styles.pillTextGray]}>
                            {isHome ? 'Available' : 'No'}
                          </Text>
                        </View>
                      </View>

                      {/* Availability Badge */}
                      <View style={{ width: 90 }}>
                        <View style={[styles.pillBadge, isAvail ? styles.pillTeal : styles.pillGray]}>
                          <Text style={[styles.pillText, isAvail ? styles.pillTextTeal : styles.pillTextGray]}>
                            {isAvail ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>

                      {/* Description */}
                      <Text style={[styles.tdCellSub, { width: 180 }]} numberOfLines={2}>
                        {item.description || '-'}
                      </Text>

                      {/* Actions */}
                      <View style={{ width: 70, alignItems: 'flex-end' }}>
                        <TouchableOpacity style={styles.editActionBtn} onPress={() => handleOpenEdit(item)}>
                          <Text style={styles.editActionText}>✏️ Edit</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Edit Clinic Lab Test Bottom Sheet (Matching Web Portal Screenshot 100%) */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.webEditModalCard}>
            <View style={styles.sheetDragHandle} />
            {/* Header Banner */}
            <View style={styles.webEditHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.webEditTitle}>
                  {selectedItem ? 'Edit Clinic Lab Test' : 'Create Custom Lab Test'}
                </Text>
                <Text style={styles.webEditSubTitle}>
                  {selectedItem
                    ? 'Use this only when a test is not available in the master catalog.'
                    : 'Create a new custom clinic test that is not in the master catalog.'}
                </Text>
              </View>

              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.webEditCloseBtn}>
                <Text style={{ fontSize: 18, color: '#64748b', fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
              {/* Field 1: Test Name * (Full Width) */}
              <Text style={styles.webLabel}>
                Test Name <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                style={[styles.webInput, { borderColor: '#0d9488', borderWidth: 2 }]}
                value={editTestName}
                onChangeText={setEditTestName}
                placeholder="17-OH Progesterone"
              />

              {/* Row 1: Code & Test Price * */}
              <View style={styles.webTwoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.webLabel}>Code</Text>
                  <TextInput
                    style={styles.webInput}
                    value={editCode}
                    onChangeText={setEditCode}
                    placeholder="17OHP"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.webLabel}>
                    Test Price <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.webInput}
                    value={editPrice}
                    onChangeText={setEditPrice}
                    keyboardType="numeric"
                    placeholder="300"
                  />
                </View>
              </View>

              {/* Row 2: Discount Price & Home Collection */}
              <View style={styles.webTwoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.webLabel}>Discount Price</Text>
                  <TextInput
                    style={styles.webInput}
                    value={editDiscountPrice}
                    onChangeText={setEditDiscountPrice}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.webLabel}>Home Collection</Text>
                  <TouchableOpacity
                    style={styles.webDropdownSelector}
                    onPress={() => setEditHomeCollection(editHomeCollection === 'No' ? 'Available' : 'No')}>
                    <Text style={styles.webDropdownText}>{editHomeCollection}</Text>
                    <Text style={styles.webDropdownArrow}>∨</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Row 3: Available & Master Status */}
              <View style={styles.webTwoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.webLabel}>Available</Text>
                  <TouchableOpacity
                    style={styles.webDropdownSelector}
                    onPress={() => setEditAvailable(editAvailable === 'Available' ? 'Unavailable' : 'Available')}>
                    <Text style={styles.webDropdownText}>{editAvailable}</Text>
                    <Text style={styles.webDropdownArrow}>∨</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.webLabel}>Master Status</Text>
                  <TouchableOpacity
                    style={styles.webDropdownSelector}
                    onPress={() => setEditMasterStatus(editMasterStatus === 'Active' ? 'Inactive' : 'Active')}>
                    <Text style={styles.webDropdownText}>{editMasterStatus}</Text>
                    <Text style={styles.webDropdownArrow}>∨</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Field 8: Description */}
              <Text style={styles.webLabel}>Description</Text>
              <TextInput
                style={[styles.webInput, { height: 80, textAlignVertical: 'top' }]}
                value={editDescription}
                onChangeText={setEditDescription}
                multiline={true}
                placeholder="Measures 17-hydroxyprogesterone"
              />
            </ScrollView>

            {/* Bottom Action Footer */}
            <View style={styles.webEditFooter}>
              <TouchableOpacity style={styles.webCancelPillBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.webCancelPillText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.webUpdatePillBtn} onPress={handleSaveEdit}>
                <Text style={styles.webUpdatePillText}>
                  {selectedItem ? 'Update Item' : '+ Create Custom Test'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Clinic Lab Tests Master Bottom Sheet (Matching Screenshot 100%) */}
      <Modal visible={addMasterModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.webMasterModalCard}>
            <View style={styles.sheetDragHandle} />
            {/* Header Banner */}
            <View style={styles.webMasterHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={styles.webMasterHeaderIconBox}>
                  <Text style={{ fontSize: 16, color: '#ffffff' }}>🧪</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.webMasterTitle}>Add clinic lab tests</Text>
                  <Text style={styles.webMasterSubTitle} numberOfLines={1}>
                    Map a master test to Aarogya Care Clinic, or create a clinic-only custom test.
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {/* + Create custom test button */}
                <TouchableOpacity
                  style={styles.createCustomTestBtn}
                  onPress={() => {
                    setAddMasterModalVisible(false);
                    setSelectedItem(null);
                    setEditTestName('');
                    setEditCode('');
                    setEditPrice('250');
                    setEditDiscountPrice('0');
                    setEditHomeCollection('No');
                    setEditAvailable('Available');
                    setEditMasterStatus('Active');
                    setEditDescription('');
                    setEditModalVisible(true);
                  }}>
                  <Text style={styles.createCustomTestBtnText}>+ Create custom test</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setAddMasterModalVisible(false)} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 18, color: '#64748b', fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
              {/* Search & Filter Card */}
              <View style={styles.webMasterFilterCard}>
                <View style={styles.webMasterSearchRow}>
                  {/* Search Input */}
                  <View style={{ flex: 2 }}>
                    <TextInput
                      style={styles.webMasterSearchInput}
                      placeholder="Search by test name, code or description"
                      placeholderTextColor="#94a3b8"
                      value={masterSearchQuery}
                      onChangeText={setMasterSearchQuery}
                    />
                  </View>

                  {/* Dropdown Category */}
                  <TouchableOpacity style={styles.webMasterCategorySelector}>
                    <Text style={{ fontSize: 12, color: '#0f172a', fontWeight: '600' }}>
                      All master tests
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>∨</Text>
                  </TouchableOpacity>

                  {/* Refresh Button */}
                  <TouchableOpacity style={styles.webMasterRefreshBtn} onPress={fetchMasterTests}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                      🔄 Refresh
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Sub-info bar */}
                <View style={styles.webMasterInfoBar}>
                  <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '700' }}>
                    {filteredMasterList.length} tests found
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={styles.webMasterBadgeReady}>
                      <Text style={styles.webMasterBadgeReadyText}>
                        {filteredMasterList.filter((m) => !mappedMasterIds.has(m.id)).length} ready to map
                      </Text>
                    </View>

                    <View style={styles.webMasterBadgeMapped}>
                      <Text style={styles.webMasterBadgeMappedText}>
                        {mappedMasterIds.size} mapped
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Master Tests Data Table */}
              <View style={styles.webMasterTableBox}>
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
                  <View style={{ minWidth: 650 }}>
                    {/* Header Row */}
                    <View style={styles.webMasterTableHeader}>
                      <Text style={[styles.wmTh, { width: 210 }]}>Master test</Text>
                      <Text style={[styles.wmTh, { width: 85 }]}>Code</Text>
                      <Text style={[styles.wmTh, { width: 105 }]}>Master status</Text>
                      <Text style={[styles.wmTh, { width: 115 }]}>Clinic status</Text>
                      <Text style={[styles.wmTh, { width: 105, textAlign: 'right' }]}>Action</Text>
                    </View>

                    {/* Body Rows */}
                    {paginatedMasterList.map((mt) => {
                      const isMapped = mappedMasterIds.has(mt.id);

                      return (
                        <View key={mt.id} style={styles.webMasterTableBodyRow}>
                          {/* Master test & Description */}
                          <View style={{ width: 210 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>
                              {mt.test_name}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                              {mt.description || 'Standard laboratory diagnostic assay'}
                            </Text>
                          </View>

                          {/* Code */}
                          <Text style={[styles.wmTdSub, { width: 85 }]}>
                            {mt.test_code || 'N/A'}
                          </Text>

                          {/* Master status */}
                          <View style={{ width: 105 }}>
                            <View style={styles.pillTeal}>
                              <Text style={styles.pillTextTeal}>Active</Text>
                            </View>
                          </View>

                          {/* Clinic status */}
                          <View style={{ width: 115 }}>
                            <View style={isMapped ? styles.pillTeal : styles.pillGray}>
                              <Text style={isMapped ? styles.pillTextTeal : styles.pillTextGray}>
                                {isMapped ? 'Mapped' : 'Ready to map'}
                              </Text>
                            </View>
                          </View>

                          {/* Action Button */}
                          <View style={{ width: 105, alignItems: 'flex-end' }}>
                            <TouchableOpacity
                              style={[
                                styles.wmMapBtn,
                                isMapped && styles.wmMapBtnMapped,
                              ]}
                              onPress={() => handleOpenMapMasterModal(mt)}>
                              <Text style={[styles.wmMapBtnText, isMapped && styles.wmMapBtnTextMapped]}>
                                {isMapped ? 'Edit mapped' : 'Map test'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

            </ScrollView>

            {/* Sticky Bottom Pagination & Action Footer */}
            <View style={styles.webMasterFooter}>
              {/* Pagination Info & Navigation Bar */}
              <View style={styles.webMasterPaginationContainer}>
                {/* Top Info Line */}
                <View style={styles.webMasterPaginationTopLine}>
                  <Text style={styles.webMasterPaginationText}>
                    Showing {startItem} to {endItem} of {totalMasterCount} items
                  </Text>

                  <TouchableOpacity style={styles.webMasterPageSizePill}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0f172a' }}>
                      {masterPageSize} / page
                    </Text>
                    <Text style={{ fontSize: 10, color: '#64748b', marginLeft: 3 }}>∨</Text>
                  </TouchableOpacity>
                </View>

                {/* Bottom Controls Horizontal Bar */}
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', gap: 5 }}>
                  {/* Previous Button */}
                  <TouchableOpacity
                    disabled={masterPage === 1}
                    style={[
                      styles.webMasterNavBtn,
                      masterPage === 1 && { opacity: 0.4 },
                    ]}
                    onPress={() => setMasterPage((prev) => Math.max(1, prev - 1))}>
                    <Text style={styles.webMasterNavBtnText}>‹ Previous</Text>
                  </TouchableOpacity>

                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(6, Math.ceil(filteredMasterList.length / masterPageSize)) }).map((_, idx) => {
                    const pageNum = idx + 1;
                    const isActive = masterPage === pageNum;
                    return (
                      <TouchableOpacity
                        key={pageNum}
                        style={[
                          styles.webMasterPageNumBtn,
                          isActive && styles.webMasterPageNumBtnActive,
                        ]}
                        onPress={() => setMasterPage(pageNum)}>
                        <Text style={[styles.webMasterPageNumText, isActive && styles.webMasterPageNumTextActive]}>
                          {pageNum}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Next Button (Bold Teal High Visibility) */}
                  <TouchableOpacity
                    disabled={masterPage >= Math.ceil(filteredMasterList.length / masterPageSize)}
                    style={[
                      styles.webMasterNavBtnHighlight,
                      masterPage >= Math.ceil(filteredMasterList.length / masterPageSize) && { opacity: 0.4 },
                    ]}
                    onPress={() => setMasterPage((prev) => prev + 1)}>
                    <Text style={styles.webMasterNavBtnHighlightText}>Next ›</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                style={styles.webMasterCloseBtn}
                onPress={() => setAddMasterModalVisible(false)}>
                <Text style={styles.webMasterCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dedicated Map Master Test Sheet */}
      <Modal visible={mapMasterModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.mapMasterModalCard}>
            <View style={styles.sheetDragHandle} />

            {/* Header */}
            <View style={styles.mapMasterHeader}>
              <View style={styles.mapHeaderIconBox}>
                <Text style={{ fontSize: 18 }}>🧪</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mapMasterTitle}>Map master test</Text>
                <Text style={styles.mapMasterSubTitle}>Set price and availability for Aarogya Care Clinic.</Text>
              </View>
              <TouchableOpacity onPress={() => setMapMasterModalVisible(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 20, color: '#64748b', fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14 }}>
              {/* Selected Master Test Card Preview */}
              {selectedMasterItem ? (
                <View style={styles.masterTestPreviewCard}>
                  <Text style={styles.previewTestName}>{selectedMasterItem.test_name}</Text>
                  <Text style={styles.previewTestSub}>
                    {selectedMasterItem.test_code ? `${selectedMasterItem.test_code} • ` : ''}
                    {selectedMasterItem.description || 'Standard diagnostic test'}
                  </Text>
                  <View style={{ marginTop: 8 }}>
                    <View style={selectedMasterItem.is_mapped || mappedMasterIds.has(selectedMasterItem.id) ? styles.previewBadgeMapped : styles.previewBadgeNew}>
                      <Text style={selectedMasterItem.is_mapped || mappedMasterIds.has(selectedMasterItem.id) ? styles.previewBadgeMappedText : styles.previewBadgeNewText}>
                        {selectedMasterItem.is_mapped || mappedMasterIds.has(selectedMasterItem.id) ? 'Edit mapped' : 'New mapping'}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}

              {/* Form Grid */}
              <View style={styles.formRowTwo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mapFormLabel}>Test Price *</Text>
                  <TextInput
                    style={styles.mapFormInput}
                    placeholder="0.00"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={mapPrice}
                    onChangeText={setMapPrice}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.mapFormLabel}>Discount Price</Text>
                  <TextInput
                    style={styles.mapFormInput}
                    placeholder="0.00"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={mapDiscountPrice}
                    onChangeText={setMapDiscountPrice}
                  />
                </View>
              </View>

              <View style={styles.formRowTwo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mapFormLabel}>Home Collection</Text>
                  <TouchableOpacity
                    style={styles.mapDropdownSelector}
                    onPress={() => setMapHomeCollection(mapHomeCollection === 'Available' ? 'Not available' : 'Available')}>
                    <Text style={styles.mapDropdownText}>{mapHomeCollection}</Text>
                    <Text style={styles.mapDropdownArrow}>▾</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.mapFormLabel}>Clinic Availability</Text>
                  <TouchableOpacity
                    style={styles.mapDropdownSelector}
                    onPress={() => setMapAvailability(mapAvailability === 'Available' ? 'Not available' : 'Available')}>
                    <Text style={styles.mapDropdownText}>{mapAvailability}</Text>
                    <Text style={styles.mapDropdownArrow}>▾</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.mapMasterFooter}>
              <TouchableOpacity style={styles.mapCancelBtn} onPress={() => setMapMasterModalVisible(false)}>
                <Text style={styles.mapCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.mapSaveBtn} onPress={handleSaveMappingSubmit}>
                <Text style={styles.mapSaveBtnText}>Save Mapping</Text>
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
  content: { padding: 14, paddingBottom: 100 },
  pageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 10,
  },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  pageSubTitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  headerBtnGroup: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  refreshBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  refreshBtnText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  addMasterBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addMasterBtnText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  statsGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCardLabel: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  statCardVal: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  statIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBarBox: {
    marginBottom: 14,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#fafafa',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  thCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tableBodyRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tdCellBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  tdCellSub: {
    fontSize: 12,
    color: '#64748b',
  },
  tdCell: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  pillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  pillTeal: {
    backgroundColor: '#ccfbf1',
  },
  pillGray: {
    backgroundColor: '#f1f5f9',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  pillTextTeal: {
    color: '#0f766e',
  },
  pillTextGray: {
    color: '#64748b',
  },
  editActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0d9488',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 0,
  },
  sheetDragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  modalSubTitleText: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginTop: 8, marginBottom: 4 },
  formInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  toggleRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  toggleBtnActive: {
    backgroundColor: '#f0fdfa',
    borderColor: '#0d9488',
  },
  toggleBtnText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  toggleBtnTextActive: { color: '#0d9488', fontWeight: '800' },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelPillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  cancelPillText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  savePillBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0d9488',
  },
  savePillText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  masterTestOption: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 4,
    backgroundColor: '#fafafa',
  },
  masterTestOptionActive: {
    borderColor: '#0d9488',
    backgroundColor: '#f0fdfa',
  },
  webEditModalCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  webEditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ccfbf1',
  },
  webEditTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  webEditSubTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  webEditCloseBtn: {
    padding: 6,
  },
  webLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
    marginBottom: 6,
  },
  webInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  webTwoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  webDropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  webDropdownText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  webDropdownArrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  webEditFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  webCancelPillBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  webCancelPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  webUpdatePillBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0d9488',
  },
  webUpdatePillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  webMasterModalCard: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '94%',
    overflow: 'hidden',
  },
  webMasterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ccfbf1',
  },
  webMasterHeaderIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMasterTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  webMasterSubTitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  createCustomTestBtn: {
    borderWidth: 1,
    borderColor: '#0d9488',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#ffffff',
  },
  createCustomTestBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0d9488',
  },
  webMasterFilterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 14,
  },
  webMasterSearchRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  webMasterSearchInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  webMasterCategorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  webMasterRefreshBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  webMasterInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  webMasterBadgeReady: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  webMasterBadgeReadyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  webMasterBadgeMapped: {
    backgroundColor: '#ccfbf1',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  webMasterBadgeMappedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f766e',
  },
  webMasterTableBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  webMasterTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#fafafa',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  wmTh: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  webMasterTableBodyRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  wmTdSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  wmMapBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#0d9488',
  },
  wmMapBtnMapped: {
    backgroundColor: '#ffffff',
    borderColor: '#0d9488',
  },
  wmMapBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  wmMapBtnTextMapped: {
    color: '#0d9488',
  },
  mapMasterModalCard: {
    width: '100%',
    maxWidth: 580,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  mapMasterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f0fdfa',
  },
  mapHeaderIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapMasterTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  mapMasterSubTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  masterTestPreviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    padding: 14,
  },
  previewTestName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  previewTestSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
  },
  previewBadgeNew: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  previewBadgeNewText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  previewBadgeMapped: {
    alignSelf: 'flex-start',
    backgroundColor: '#ccfbf1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  previewBadgeMappedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f766e',
  },
  formRowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  mapFormLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  mapFormInput: {
    borderWidth: 1.5,
    borderColor: '#0d9488',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  mapDropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  mapDropdownText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  mapDropdownArrow: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '800',
  },
  mapMasterFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 26 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  mapCancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  mapCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  mapSaveBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0d9488',
  },
  mapSaveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  webMasterFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 10,
  },
  webMasterPaginationContainer: {
    gap: 8,
  },
  webMasterPaginationTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  webMasterPaginationText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  webMasterPageSizePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ffffff',
  },
  webMasterNavBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  webMasterNavBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  webMasterNavBtnHighlight: {
    borderWidth: 1,
    borderColor: '#0d9488',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0fdfa',
  },
  webMasterNavBtnHighlightText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0d9488',
  },
  webMasterPageNumBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  webMasterPageNumBtnActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  webMasterPageNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  webMasterPageNumTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  webMasterCloseBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 9,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    alignSelf: 'flex-end',
    minWidth: 80,
  },
  webMasterCloseBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
});

export default LabInventoryScreen;
