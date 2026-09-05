import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { useMedicines } from '../../hooks/useMedicines';
import { Medicine } from '../../types/clinicTypes';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
}

export const PharmacyInventoryScreen: React.FC<Props> = ({ onOpenDrawer, onOpenNotifications }) => {
  const {
    medicines,
    stats,
    loading,
    refreshMedicines,
    searchMedicines,
    addMedicine,
    updateStock,
  } = useMedicines();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock'>('in_stock');

  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [newStockQty, setNewStockQty] = useState('');

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Capsule');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [reorder, setReorder] = useState('30');

  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  const formatExpiryDate = (d?: string) => {
    if (!d) return 'N/A';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d).split('T')[0];
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return String(d).split('T')[0];
    }
  };

  const isLowStockItem = (m: Medicine) => {
    const qty = Number(m.stock_quantity || m.quantity || 0);
    const minQty = Number(m.reorder_level || m.min_stock || 10);
    return qty > 0 && qty <= minQty;
  };

  const isInStockItem = (m: Medicine) => {
    const qty = Number(m.stock_quantity || m.quantity || 0);
    const minQty = Number(m.reorder_level || m.min_stock || 10);
    return qty > minQty; // Normal stock ONLY - excludes low stock
  };

  const allFilteredMedicines = (medicines || []).filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    const mName = String(m.name || '').toLowerCase();
    const gName = String(m.generic_name || '').toLowerCase();
    const matchesSearch = !q || mName.includes(q) || gName.includes(q);

    let matchesStatus = true;
    if (statusFilter === 'in_stock') {
      matchesStatus = isInStockItem(m); // Excludes low stock
    } else if (statusFilter === 'low_stock') {
      matchesStatus = isLowStockItem(m);
    }

    return matchesSearch && matchesStatus;
  });

  const totalItems = allFilteredMedicines.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = totalItems > 0 ? (safeCurrentPage - 1) * pageSize : 0;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  // Active 5 medicines for current page
  const currentPageMedicines = allFilteredMedicines.slice(startIndex, endIndex);

  // Calculated stock value for ONLY the 5 medicines showing on current active page
  const currentPageStockValue = currentPageMedicines.reduce((sum, m) => {
    const qty = Number(m.stock_quantity || m.quantity || 0);
    const price = Number(m.selling_price || m.unit_price || m.price || 0);
    return sum + qty * price;
  }, 0);

  // In Stock count on current page (normal stock > minQty ONLY)
  const currentPageInStockCount = currentPageMedicines.filter(isInStockItem).length;

  // Low Stock count on current page (qty > 0 && qty <= minQty)
  const currentPageLowStockCount = currentPageMedicines.filter(isLowStockItem).length;

  // Total catalog counts
  const totalInStockCatalogCount = (medicines || []).filter(isInStockItem).length;
  const totalLowStockCatalogCount = (medicines || []).filter(isLowStockItem).length;

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setCurrentPage(1);
    searchMedicines(text);
  };

  const handleAdjustStock = async () => {
    if (!selectedMedicine || !newStockQty) return;
    const qty = parseInt(newStockQty, 10);
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Validation Error', 'Enter a valid non-negative quantity.');
      return;
    }

    const res = await updateStock(selectedMedicine.id, qty);
    if (res.success) {
      setAdjustModalVisible(false);
      setSelectedMedicine(null);
      Alert.alert('Success', `Updated stock for ${selectedMedicine.name} to ${qty} units.`);
    } else {
      Alert.alert('Error', res.message || 'Failed to update stock');
    }
  };

  const handleAddMedicine = async () => {
    if (!name.trim() || !price.trim() || !stock.trim()) {
      Alert.alert('Validation Error', 'Name, price, and initial stock quantity are required.');
      return;
    }

    const newMedPayload: Partial<Medicine> = {
      name: name.trim(),
      category: category.trim() || 'General',
      selling_price: parseFloat(price),
      unit_price: parseFloat(price),
      stock_quantity: parseInt(stock, 10),
      reorder_level: parseInt(reorder, 10) || 20,
      is_active: true,
    };

    const res = await addMedicine(newMedPayload);
    if (res.success) {
      setAddModalVisible(false);
      setName('');
      setPrice('');
      setStock('');
      Alert.alert('Success', `${name} added to pharmacy inventory!`);
    } else {
      Alert.alert('Error', res.message || 'Could not add medicine');
    }
  };

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Medicines Inventory"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshMedicines} colors={['#0d9488']} />
        }>
        {/* Top Workflow Banner */}
        <View style={styles.topBanner}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.pageTitle}>Medicine Inventory</Text>
              <Text style={styles.pageSub}>Aarogya Care Clinic • Stock Management</Text>
            </View>
          </View>
        </View>

        {/* 4 Stat Cards Matching Web Portal */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={[styles.statCard, statusFilter === 'all' && styles.statCardActive]}
            onPress={() => { setStatusFilter('all'); setCurrentPage(1); }}>
            <View style={styles.statHeader}>
              <Text style={styles.statIcon}>💊</Text>
              <Text style={styles.statVal}>{stats.total_medicines || (medicines || []).length || totalItems}</Text>
            </View>
            <Text style={styles.statLabel}>Total Medicines</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, statusFilter === 'in_stock' && styles.statCardActive]}
            onPress={() => { setStatusFilter('in_stock'); setCurrentPage(1); }}>
            <View style={styles.statHeader}>
              <Text style={styles.statIcon}>📦</Text>
              <Text style={[styles.statVal, { color: '#166534' }]}>
                {currentPageInStockCount}
              </Text>
            </View>
            <Text style={styles.statLabel}>In Stock</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, statusFilter === 'low_stock' && styles.statCardActive]}
            onPress={() => { setStatusFilter('low_stock'); setCurrentPage(1); }}>
            <View style={styles.statHeader}>
              <Text style={styles.statIcon}>⚠️</Text>
              <Text style={[styles.statVal, { color: '#b45309' }]}>{currentPageLowStockCount}</Text>
            </View>
            <Text style={styles.statLabel}>Low Stock</Text>
          </TouchableOpacity>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statIcon}>₹</Text>
              <Text style={[styles.statVal, { color: '#0d9488', fontSize: 14 }]}>
                ₹{Number(currentPageStockValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <Text style={styles.statLabel}>Stock Value</Text>
          </View>
        </View>

        {/* Search Bar & Filter Tabs */}
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Search medicines..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={handleSearchChange}
          />

          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[styles.filterPill, statusFilter === 'all' && styles.filterPillActive]}
              onPress={() => { setStatusFilter('all'); setCurrentPage(1); }}>
              <Text style={[styles.filterPillText, statusFilter === 'all' && styles.filterPillTextActive]}>
                All ({(medicines || []).length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, statusFilter === 'in_stock' && styles.filterPillActive]}
              onPress={() => { setStatusFilter('in_stock'); setCurrentPage(1); }}>
              <Text style={[styles.filterPillText, statusFilter === 'in_stock' && styles.filterPillTextActive]}>
                In Stock ({totalInStockCatalogCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, statusFilter === 'low_stock' && styles.filterPillActive]}
              onPress={() => { setStatusFilter('low_stock'); setCurrentPage(1); }}>
              <Text style={[styles.filterPillText, statusFilter === 'low_stock' && styles.filterPillTextActive]}>
                Low Stock ({totalLowStockCatalogCount})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Medicines List Header */}
        <Text style={styles.sectionHeader}>
          All Medicines ({currentPageMedicines.length})
        </Text>

        {/* Medicines Cards (Showing 5 per page) */}
        {loading && medicines.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0d9488" />
            <Text style={styles.loadingText}>Loading medicines from DB...</Text>
          </View>
        ) : currentPageMedicines.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Medicines Found</Text>
            <Text style={styles.emptySub}>No medicine records match the current filter.</Text>
          </View>
        ) : (
          <View style={styles.medList}>
            {currentPageMedicines.map((med) => {
              const qty = Number(med.stock_quantity || med.quantity || 0);
              const minQty = Number(med.reorder_level || med.min_stock || 10);
              const isLow = qty > 0 && qty <= minQty;
              const isOut = qty === 0;
              const priceVal = Number(med.selling_price || med.unit_price || 0).toFixed(2);

              return (
                <View key={med.id} style={[styles.card, isLow && styles.lowStockCard]}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.medName}>{med.name}</Text>
                      <Text style={styles.categoryBadge}>{med.category || 'Capsule'}</Text>
                    </View>
                    <View style={[styles.stockBadge, isOut ? styles.outBadgeBg : isLow ? styles.lowBadgeBg : styles.normalBadgeBg]}>
                      <Text style={[styles.stockBadgeText, isOut ? styles.outBadgeText : isLow ? styles.lowBadgeText : styles.normalBadgeText]}>
                        {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaGrid}>
                    <View style={styles.metaBox}>
                      <Text style={styles.metaLabel}>PRICE</Text>
                      <Text style={styles.metaVal}>Rs {priceVal}</Text>
                    </View>

                    <View style={styles.metaBox}>
                      <Text style={styles.metaLabel}>STOCK</Text>
                      <Text style={styles.metaVal}>{qty}</Text>
                    </View>

                    <View style={styles.metaBox}>
                      <Text style={styles.metaLabel}>EXPIRY</Text>
                      <Text style={styles.metaVal}>{formatExpiryDate(med.expiry_date)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Web Portal Style Pagination Component */}
        {totalItems > 0 && (
          <View style={styles.paginationCard}>
            <Text style={styles.paginationSummaryText}>
              Showing {totalItems > 0 ? startIndex + 1 : 0} to {endIndex} of {totalItems} medicines
            </Text>

            <View style={styles.paginationRow}>
              {/* Page Limit Badge */}
              <View style={styles.limitChip}>
                <Text style={styles.limitChipText}>5 / page ▾</Text>
              </View>

              {/* Previous Button */}
              <TouchableOpacity
                style={[styles.navPillBtn, safeCurrentPage <= 1 && styles.navPillBtnDisabled]}
                disabled={safeCurrentPage <= 1}
                onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                <Text style={[styles.navPillBtnText, safeCurrentPage <= 1 && styles.navPillBtnTextDisabled]}>
                  ‹ Previous
                </Text>
              </TouchableOpacity>

              {/* Page Number Buttons */}
              <View style={styles.pageNumbersGroup}>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 5) return true;
                    if (p === 1 || p === totalPages) return true;
                    return Math.abs(p - safeCurrentPage) <= 1;
                  })
                  .map((p, idx, arr) => {
                    const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsisBefore && <Text style={styles.ellipsisDot}>...</Text>}
                        <TouchableOpacity
                          style={[styles.numBtn, safeCurrentPage === p && styles.numBtnActive]}
                          onPress={() => setCurrentPage(p)}>
                          <Text style={[styles.numBtnText, safeCurrentPage === p && styles.numBtnTextActive]}>
                            {p}
                          </Text>
                        </TouchableOpacity>
                      </React.Fragment>
                    );
                  })}
              </View>

              {/* Next Button */}
              <TouchableOpacity
                style={[styles.navPillBtn, safeCurrentPage >= totalPages && styles.navPillBtnDisabled]}
                disabled={safeCurrentPage >= totalPages}
                onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                <Text style={[styles.navPillBtnText, safeCurrentPage >= totalPages && styles.navPillBtnTextDisabled]}>
                  Next ›
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Medicine Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add New Medicine</Text>

            <Text style={styles.label}>Medicine Brand Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Aldactone / Paracetamol"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Form / Category</Text>
            <TextInput
              style={styles.input}
              placeholder="Capsule / Tablet / Syrup"
              placeholderTextColor="#94a3b8"
              value={category}
              onChangeText={setCategory}
            />

            <View style={styles.rowTwo}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Selling Price (Rs) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="155.24"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Initial Stock *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="279"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={stock}
                  onChangeText={setStock}
                />
              </View>
            </View>

            <Text style={styles.label}>Low Stock Alert Threshold</Text>
            <TextInput
              style={styles.input}
              placeholder="30"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={reorder}
              onChangeText={setReorder}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddMedicine}>
                <Text style={styles.saveText}>Save Medicine</Text>
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
  topBanner: { marginBottom: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  pageSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  addBtn: { backgroundColor: '#0d9488', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statCardActive: {
    borderColor: '#0d9488',
    backgroundColor: '#f0fdfa',
  },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statIcon: { fontSize: 18 },
  statVal: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 6 },
  searchSection: { gap: 10, marginBottom: 14 },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  filterPillsRow: { flexDirection: 'row', gap: 8 },
  filterPill: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterPillActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  filterPillText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterPillTextActive: { color: '#ffffff' },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  medList: { gap: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  lowStockCard: { borderColor: '#fca5a5', backgroundColor: '#fff5f5' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  medName: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  categoryBadge: { fontSize: 12, color: '#64748b', marginTop: 2 },
  stockBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  stockBadgeText: { fontSize: 11, fontWeight: '800' },
  outBadgeBg: { backgroundColor: '#f1f5f9' },
  outBadgeText: { color: '#64748b' },
  lowBadgeBg: { backgroundColor: '#fee2e2' },
  lowBadgeText: { color: '#991b1b' },
  normalBadgeBg: { backgroundColor: '#dcfce7' },
  normalBadgeText: { color: '#166534' },
  metaGrid: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: 10, borderRadius: 10, marginVertical: 6 },
  metaBox: { flex: 1, alignItems: 'flex-start' },
  metaLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8' },
  metaVal: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  adjustBtn: { marginTop: 8, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 8, alignItems: 'center' },
  adjustBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  loadingBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748b', fontWeight: '600' },
  emptyCard: { backgroundColor: '#ffffff', padding: 30, borderRadius: 16, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 },
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  medSubTitle: { fontSize: 13, color: '#0d9488', fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  rowTwo: { flexDirection: 'row', gap: 10 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#475569', fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: '#0d9488', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#ffffff', fontWeight: '800' },
  paginationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 12,
  },
  paginationSummaryText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  limitChip: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginRight: 4,
  },
  limitChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  navPillBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  navPillBtnDisabled: {
    opacity: 0.4,
    backgroundColor: '#f8fafc',
  },
  navPillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  navPillBtnTextDisabled: {
    color: '#94a3b8',
  },
  pageNumbersGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  numBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numBtnActive: {
    backgroundColor: '#f1f5f9',
    borderColor: '#0d9488',
    borderWidth: 1.5,
  },
  numBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  numBtnTextActive: {
    color: '#0d9488',
    fontWeight: '800',
  },
  ellipsisDot: {
    fontSize: 12,
    color: '#94a3b8',
    paddingHorizontal: 2,
  },
});

export default PharmacyInventoryScreen;
