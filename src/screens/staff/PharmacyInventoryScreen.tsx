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
import { Medicine } from '../../types/clinicTypes';

interface Props {
  onOpenDrawer: () => void;
}

export const PharmacyInventoryScreen: React.FC<Props> = ({ onOpenDrawer }) => {
  const [medicines, setMedicines] = useState<Medicine[]>([
    { id: 1, clinic_id: 1, name: 'Paracetamol 650mg', generic_name: 'Acetaminophen', category: 'Analgesics', unit_price: 1.5, selling_price: 2.5, stock_quantity: 15, reorder_level: 50, location_rack: 'Rack A1', is_active: true },
    { id: 2, clinic_id: 1, name: 'Amoxicillin 500mg', generic_name: 'Amoxicillin Trihydrate', category: 'Antibiotics', unit_price: 5.0, selling_price: 8.5, stock_quantity: 8, reorder_level: 30, location_rack: 'Rack B3', is_active: true },
    { id: 3, clinic_id: 1, name: 'Cetirizine 10mg', generic_name: 'Cetirizine Dihydrochloride', category: 'Antihistamines', unit_price: 1.0, selling_price: 2.0, stock_quantity: 12, reorder_level: 40, location_rack: 'Rack A3', is_active: true },
    { id: 4, clinic_id: 1, name: 'Pantoprazole 40mg', generic_name: 'Pantoprazole Sodium', category: 'Antacids', unit_price: 3.0, selling_price: 5.0, stock_quantity: 120, reorder_level: 40, location_rack: 'Rack C2', is_active: true },
    { id: 5, clinic_id: 1, name: 'Azithromycin 500mg', generic_name: 'Azithromycin', category: 'Antibiotics', unit_price: 12.0, selling_price: 18.0, stock_quantity: 45, reorder_level: 20, location_rack: 'Rack B1', is_active: true },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [newStockQty, setNewStockQty] = useState('');

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Analgesics');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [reorder, setReorder] = useState('30');

  const filteredMedicines = medicines.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (m.generic_name && m.generic_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesLowStock = lowStockOnly ? m.stock_quantity <= m.reorder_level : true;
    return matchesSearch && matchesLowStock;
  });

  const handleAdjustStock = () => {
    if (!selectedMedicine || !newStockQty) return;
    const qty = parseInt(newStockQty);
    setMedicines(prev =>
      prev.map(m => (m.id === selectedMedicine.id ? { ...m, stock_quantity: qty } : m))
    );
    setAdjustModalVisible(false);
    setSelectedMedicine(null);
    Alert.alert('Stock Updated', `Updated stock for ${selectedMedicine.name} to ${qty} units.`);
  };

  const handleAddMedicine = () => {
    if (!name.trim() || !price.trim() || !stock.trim()) {
      Alert.alert('Validation Error', 'Name, price, and initial stock quantity are required.');
      return;
    }

    const newMed: Medicine = {
      id: Date.now(),
      clinic_id: 1,
      name,
      category,
      unit_price: parseFloat(price) * 0.7,
      selling_price: parseFloat(price),
      stock_quantity: parseInt(stock),
      reorder_level: parseInt(reorder) || 20,
      is_active: true,
    };

    setMedicines([newMed, ...medicines]);
    setAddModalVisible(false);
    setName('');
    setPrice('');
    setStock('');
    Alert.alert('Medicine Added', `${name} added to pharmacy inventory!`);
  };

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Pharmacy Inventory" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.topRow}>
          <Text style={styles.pageTitle}>Medicines Stock ({filteredMedicines.length})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Add Medicine</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Low Stock Toggle Row */}
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search medicine by name or generic active ingredient..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterToggle, lowStockOnly && styles.filterToggleActive]}
            onPress={() => setLowStockOnly(!lowStockOnly)}>
            <Text style={[styles.filterToggleText, lowStockOnly && styles.filterToggleTextActive]}>
              ⚠️ Low Stock Only ({medicines.filter(m => m.stock_quantity <= m.reorder_level).length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Medicines Inventory List */}
        <View style={styles.medList}>
          {filteredMedicines.map((med) => {
            const isLow = med.stock_quantity <= med.reorder_level;
            return (
              <View key={med.id} style={[styles.card, isLow && styles.lowStockCard]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{med.name}</Text>
                    {med.generic_name ? <Text style={styles.genericText}>{med.generic_name}</Text> : null}
                  </View>
                  <View style={[styles.stockBadge, isLow ? styles.lowBadgeBg : styles.normalBadgeBg]}>
                    <Text style={[styles.stockBadgeText, isLow ? styles.lowBadgeText : styles.normalBadgeText]}>
                      {med.stock_quantity} Units Left
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaItem}>Category: <Text style={styles.boldVal}>{med.category}</Text></Text>
                  <Text style={styles.metaItem}>Price: <Text style={styles.priceVal}>₹{med.selling_price}</Text></Text>
                  <Text style={styles.metaItem}>Reorder: {med.reorder_level}</Text>
                </View>

                <TouchableOpacity
                  style={styles.adjustBtn}
                  onPress={() => {
                    setSelectedMedicine(med);
                    setNewStockQty(med.stock_quantity.toString());
                    setAdjustModalVisible(true);
                  }}>
                  <Text style={styles.adjustBtnText}>✏️ Adjust Stock Quantity</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Adjust Stock Modal */}
      <Modal visible={adjustModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Adjust Stock Quantity</Text>
            {selectedMedicine ? (
              <Text style={styles.medSubTitle}>{selectedMedicine.name} (Current: {selectedMedicine.stock_quantity})</Text>
            ) : null}

            <Text style={styles.label}>New Available Units</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={newStockQty}
              onChangeText={setNewStockQty}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAdjustModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdjustStock}>
                <Text style={styles.saveText}>Update Stock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Medicine Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add New Medicine</Text>

            <Text style={styles.label}>Medicine Brand Name *</Text>
            <TextInput style={styles.input} placeholder="e.g. Paracetamol 650mg" value={name} onChangeText={setName} />

            <Text style={styles.label}>Category</Text>
            <TextInput style={styles.input} placeholder="Analgesics / Antibiotics" value={category} onChangeText={setCategory} />

            <View style={styles.rowTwo}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Selling Price (₹) *</Text>
                <TextInput style={styles.input} placeholder="2.50" keyboardType="numeric" value={price} onChangeText={setPrice} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Initial Stock *</Text>
                <TextInput style={styles.input} placeholder="100" keyboardType="numeric" value={stock} onChangeText={setStock} />
              </View>
            </View>

            <Text style={styles.label}>Low Stock Reorder Threshold</Text>
            <TextInput style={styles.input} placeholder="30" keyboardType="numeric" value={reorder} onChangeText={setReorder} />

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
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  addBtn: { backgroundColor: '#0d9488', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  searchInput: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0f172a', marginBottom: 10 },
  filterRow: { marginBottom: 16 },
  filterToggle: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  filterToggleActive: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  filterToggleText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  filterToggleTextActive: { color: '#991b1b' },
  medList: { gap: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  lowStockCard: { borderColor: '#fca5a5', backgroundColor: '#fff5f5' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  medName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  genericText: { fontSize: 12, color: '#64748b', marginTop: 1 },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  stockBadgeText: { fontSize: 11, fontWeight: '800' },
  lowBadgeBg: { backgroundColor: '#fee2e2' },
  lowBadgeText: { color: '#991b1b', fontSize: 11, fontWeight: '800' },
  normalBadgeBg: { backgroundColor: '#dcfce7' },
  normalBadgeText: { color: '#166534', fontSize: 11, fontWeight: '800' },
  metaRow: { flexDirection: 'row', gap: 12, marginVertical: 6 },
  metaItem: { fontSize: 12, color: '#64748b' },
  boldVal: { fontWeight: '700', color: '#0f172a' },
  priceVal: { fontWeight: '800', color: '#0d9488' },
  adjustBtn: { marginTop: 8, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 8, alignItems: 'center' },
  adjustBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
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
});

export default PharmacyInventoryScreen;
