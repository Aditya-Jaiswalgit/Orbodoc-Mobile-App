import React, { useEffect, useState } from 'react';
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
import { useMedicineBills } from '../../hooks/useMedicineBills';
import { MedicineBill, MedicineBillItem } from '../../api/medicineBillApi';
import { InvoiceModal } from '../../components/billing/InvoiceModal';
import {
  BillingEyeIcon,
  ColumnsIcon,
  MoreVerticalIcon,
  ReceiptIcon,
  SearchInputIcon,
} from '../../components/common/CustomIcons';
import {
  MedicineColumnKey,
  MedicineColumnsModal,
  MedicineColumnVisibilityState,
} from '../../components/medicineBilling/MedicineColumnsModal';
import { MedicineBillActionModal } from '../../components/medicineBilling/MedicineBillActionModal';
import { EditMedicineBillModal } from '../../components/medicineBilling/EditMedicineBillModal';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onToggleTabBar?: (hide: boolean) => void;
}

const DEFAULT_COLUMNS: MedicineColumnVisibilityState = {
  billNumber: true,
  patientName: true,
  patientPhone: true,
  patientCode: false,
  subtotal: false,
  tax: false,
  totalAmount: true,
  paid: false,
  paymentMethod: false,
  status: true,
  date: false,
  pharmacist: false,
  actions: true,
};

export const MedicineBillingScreen: React.FC<Props> = ({
  onOpenDrawer,
  onOpenNotifications,
  onToggleTabBar,
}) => {
  const {
    bills,
    loading,
    refreshBills,
    fetchBillDetails,
    createBill,
    updateBill,
    cancelBill,
  } = useMedicineBills();

  // Modal States
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [columnsModalVisible, setColumnsModalVisible] = useState(false);
  const [columnsAnchorY, setColumnsAnchorY] = useState<number | undefined>(undefined);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Selected Bill
  const [selectedBill, setSelectedBill] = useState<MedicineBill | null>(null);

  // Columns visibility state matching Screenshots 2 & 3
  const [columns, setColumns] = useState<MedicineColumnVisibilityState>(DEFAULT_COLUMNS);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // New Bill Form State
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientCode, setPatientCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [billItems, setBillItems] = useState<Array<{ name: string; qty: number; price: number }>>([
    { name: 'Paracetamol 650mg', qty: 10, price: 2.5 },
  ]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedQty, setNewMedQty] = useState('1');
  const [newMedPrice, setNewMedPrice] = useState('10');

  useEffect(() => {
    const isAnyModalOpen =
      createModalVisible ||
      detailsModalVisible ||
      columnsModalVisible ||
      actionSheetVisible ||
      editModalVisible;
    if (onToggleTabBar) {
      onToggleTabBar(isAnyModalOpen);
    }
  }, [
    createModalVisible,
    detailsModalVisible,
    columnsModalVisible,
    actionSheetVisible,
    editModalVisible,
    onToggleTabBar,
  ]);

  useEffect(() => {
    return () => {
      onToggleTabBar?.(false);
    };
  }, [onToggleTabBar]);

  const handleToggleColumn = (key: MedicineColumnKey) => {
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddItem = () => {
    if (!newMedName.trim() || !newMedQty.trim() || !newMedPrice.trim()) {
      Alert.alert('Validation Error', 'Enter medicine name, quantity, and price.');
      return;
    }
    const q = parseInt(newMedQty, 10);
    const p = parseFloat(newMedPrice);
    if (isNaN(q) || q <= 0 || isNaN(p) || p <= 0) {
      Alert.alert('Validation Error', 'Enter valid quantity and price.');
      return;
    }
    setBillItems((prev) => [...prev, { name: newMedName.trim(), qty: q, price: p }]);
    setNewMedName('');
    setNewMedQty('1');
    setNewMedPrice('10');
  };

  const handleRemoveItem = (index: number) => {
    setBillItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const calculateSubtotal = () => {
    return billItems.reduce((sum, item) => sum + item.qty * item.price, 0);
  };

  const calculateGrandTotal = () => {
    const sub = calculateSubtotal();
    const disc = parseFloat(discountAmount) || 0;
    return Math.max(0, sub - disc);
  };

  const handleCreateBill = async () => {
    if (!patientName.trim()) {
      Alert.alert('Validation Error', 'Patient Name is required.');
      return;
    }
    if (billItems.length === 0) {
      Alert.alert('Validation Error', 'Add at least one medicine item to the invoice.');
      return;
    }

    const subtotal = calculateSubtotal();
    const disc = parseFloat(discountAmount) || 0;
    const grandTotal = Math.max(0, subtotal - disc);

    const formattedItems: MedicineBillItem[] = billItems.map((it, idx) => ({
      id: Date.now() + idx,
      medicine_name: it.name,
      quantity: it.qty,
      unit_price: it.price,
      total_price: it.qty * it.price,
    }));

    const newBillPayload: Partial<MedicineBill> = {
      patient_name: patientName.trim(),
      patient_phone: patientPhone.trim() || undefined,
      patient_code: patientCode.trim() || undefined,
      total_amount: grandTotal,
      subtotal: subtotal,
      net_amount: grandTotal,
      discount_amount: disc,
      paid_amount: grandTotal,
      due_amount: 0,
      payment_status: 'paid',
      status: 'paid',
      items: formattedItems,
    };

    try {
      const res = await createBill(newBillPayload);
      if (res.success) {
        setCreateModalVisible(false);
        setPatientName('');
        setPatientPhone('');
        setPatientCode('');
        setDiscountAmount('0');
        setBillItems([{ name: 'Paracetamol 650mg', qty: 10, price: 2.5 }]);
        Alert.alert('Success ✅', 'Medicine Bill created & saved successfully!');
      } else {
        Alert.alert('Error', res.message || 'Could not create bill');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Server error creating bill');
    }
  };

  const handleOpenDetails = async (bill: MedicineBill) => {
    setSelectedBill(bill);
    setDetailsModalVisible(true);
    const detail = await fetchBillDetails(bill.id);
    if (detail) {
      setSelectedBill(detail);
    }
  };

  const handleOpenActionMenu = (bill: MedicineBill) => {
    setSelectedBill(bill);
    setActionSheetVisible(true);
  };

  const handleEditBillFromMenu = (bill: MedicineBill) => {
    setActionSheetVisible(false);
    setSelectedBill(bill);
    setEditModalVisible(true);
  };

  const handleCancelBillFromMenu = (bill: MedicineBill) => {
    setActionSheetVisible(false);
    Alert.alert(
      'Cancel Bill',
      `Are you sure you want to cancel ${bill.bill_number || `Bill #${bill.id}`}? This will restore medicine stocks to inventory.`,
      [
        { text: 'No, Keep Bill', style: 'cancel' },
        {
          text: 'Yes, Cancel Bill',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await cancelBill(bill.id, 'Cancelled by staff user');
              if (res.success) {
                Alert.alert('Cancelled ✅', `Bill ${bill.bill_number || `#${bill.id}`} has been cancelled.`);
              } else {
                Alert.alert('Error', res.message || 'Failed to cancel bill');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not cancel bill');
            }
          },
        },
      ]
    );
  };

  const handleSaveEditedBill = async (id: number, data: Partial<MedicineBill>) => {
    const res = await updateBill(id, data);
    if (res.success) {
      Alert.alert('Saved ✅', 'Medicine bill updated successfully');
      return true;
    } else {
      Alert.alert('Error', res.message || 'Failed to update bill');
      return false;
    }
  };

  // Filter bills purely based on backend data
  const filteredBills = bills.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      b.patient_name?.toLowerCase().includes(q) ||
      b.bill_number?.toLowerCase().includes(q) ||
      (b.patient_phone && b.patient_phone.includes(q)) ||
      (b.patient_code && b.patient_code.toLowerCase().includes(q)) ||
      String(b.id).includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        showLogo={false}
        showRolePill={false}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshBills} colors={['#0d9488']} />
        }>
        {/* Header Section matching Screenshot 1 */}
        <View style={styles.topHeaderSection}>
          <View style={styles.topTitleRow}>
            <ReceiptIcon color="#0f172a" size={24} strokeWidth={2} />
            <Text style={styles.topPageTitle}>Medicine Bills</Text>
          </View>
          <Text style={styles.topSubtitleText}>Manage medicine bills and payments</Text>

          <TouchableOpacity
            style={styles.headerCreateBillBtn}
            activeOpacity={0.85}
            onPress={() => setCreateModalVisible(true)}>
            <Text style={styles.createBillPlus}>+</Text>
            <Text style={styles.headerCreateBillBtnText}>Create Bill</Text>
          </TouchableOpacity>
        </View>

        {/* Card 1: Search Card matching Screenshot 1 */}
        <View style={styles.searchCard}>
          <View style={styles.searchInputWrapper}>
            <SearchInputIcon size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by patient ID, name, or mobile..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity
            style={styles.searchBtn}
            activeOpacity={0.8}
            onPress={refreshBills}>
            <SearchInputIcon size={16} color="#0f172a" />
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Card 2: All Bills Card matching Screenshot 1 */}
        <View style={styles.allBillsCard}>
          {/* Header row: [$] All Bills (count) */}
          <View style={styles.allBillsTitleRow}>
            <ReceiptIcon color="#0f172a" size={20} strokeWidth={2} />
            <Text style={styles.allBillsTitle}>All Bills ({filteredBills.length})</Text>
          </View>

          {/* Full-width Columns Button matching Screenshot 1 */}
          <TouchableOpacity
            style={styles.columnsBtn}
            activeOpacity={0.8}
            onPress={(event) => { setColumnsAnchorY(event.nativeEvent.pageY); setColumnsModalVisible(true); }}>
            <ColumnsIcon size={16} color="#0f172a" />
            <Text style={styles.columnsBtnText}>Columns</Text>
          </TouchableOpacity>

          {/* Bills List Rendering */}
          {loading && bills.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#0d9488" />
              <Text style={styles.loadingText}>Fetching medicine bills from backend API...</Text>
            </View>
          ) : filteredBills.length === 0 ? (
            <View style={styles.emptyMedicineBox}>
              <ReceiptIcon color="#cbd5e1" size={52} strokeWidth={1.5} />
              <Text style={styles.emptyMedicineText}>No medicine bills found</Text>
            </View>
          ) : (
            <View style={styles.billList}>
              {filteredBills.map((bill) => {
                const statusStr = String(
                  bill.payment_status || bill.status || 'pending'
                ).toLowerCase();
                const isPaid =
                  statusStr === 'paid' || statusStr === 'settled' || statusStr === 'completed';
                const isPartial =
                  statusStr === 'partially_paid' || statusStr === 'partial';
                const isCancelled =
                  statusStr === 'cancelled' || statusStr === 'canceled';

                const totalAmt = Number(bill.total_amount || bill.net_amount || bill.subtotal || 0);
                const subtotalAmt = Number(bill.subtotal || bill.total_amount || 0);
                const taxAmt = Number(bill.tax_amount || 0);
                const paidAmt = Number(bill.paid_amount || (isPaid ? totalAmt : 0));
                const dateStr = bill.created_at ? String(bill.created_at).split('T')[0] : 'N/A';

                return (
                  <View key={bill.id} style={styles.card}>
                    {/* Top Row: Bill Number + Status badge */}
                    <View style={styles.cardHeaderRow}>
                      {columns.billNumber && (
                        <Text style={styles.billNoText}>
                          {bill.bill_number || `MB-${bill.id}`}
                        </Text>
                      )}

                      {columns.status && (
                        <View
                          style={[
                            styles.statusBadgePill,
                            isPaid
                              ? styles.paidBg
                              : isPartial
                              ? styles.partialBg
                              : isCancelled
                              ? styles.cancelledBg
                              : styles.pendingBg,
                          ]}>
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isPaid
                                ? styles.paidText
                                : isPartial
                                ? styles.partialText
                                : isCancelled
                                ? styles.cancelledText
                                : styles.pendingText,
                            ]}>
                            {isPaid
                              ? 'paid'
                              : isPartial
                              ? 'partial'
                              : isCancelled
                              ? 'cancelled'
                              : 'pending'}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Patient Name */}
                    {columns.patientName && (
                      <Text style={styles.patientNameText}>
                        {bill.patient_name || 'Patient'}
                      </Text>
                    )}

                    {/* Divider line if column values follow */}
                    <View style={styles.cardDivider} />

                    {/* Dynamically Visible Columns Grid */}
                    <View style={styles.columnsGrid}>
                      {/* Total Amount */}
                      {columns.totalAmount && (
                        <View style={styles.gridItem}>
                          <Text style={styles.columnLabel}>TOTAL</Text>
                          <Text style={styles.columnValueBold}>₹{totalAmt.toFixed(2)}</Text>
                        </View>
                      )}

                      {/* Patient Phone */}
                      {columns.patientPhone && bill.patient_phone ? (
                        <View style={styles.gridItem}>
                          <Text style={styles.columnLabel}>PHONE</Text>
                          <Text style={styles.columnValueBold}>{bill.patient_phone}</Text>
                        </View>
                      ) : null}

                      {/* Patient Code */}
                      {columns.patientCode && bill.patient_code ? (
                        <View style={styles.gridItem}>
                          <Text style={styles.columnLabel}>CODE</Text>
                          <Text style={styles.columnValueBold}>{bill.patient_code}</Text>
                        </View>
                      ) : null}

                      {/* Subtotal */}
                      {columns.subtotal && (
                        <View style={styles.gridItem}>
                          <Text style={styles.columnLabel}>SUBTOTAL</Text>
                          <Text style={styles.columnValueBold}>₹{subtotalAmt.toFixed(2)}</Text>
                        </View>
                      )}

                      {/* Tax */}
                      {columns.tax && (
                        <View style={styles.gridItem}>
                          <Text style={styles.columnLabel}>TAX</Text>
                          <Text style={styles.columnValueBold}>₹{taxAmt.toFixed(2)}</Text>
                        </View>
                      )}

                      {/* Paid */}
                      {columns.paid && (
                        <View style={styles.gridItem}>
                          <Text style={styles.columnLabel}>PAID</Text>
                          <Text style={styles.columnValueBold}>₹{paidAmt.toFixed(2)}</Text>
                        </View>
                      )}

                      {/* Payment Method */}
                      {columns.paymentMethod && (
                        <View style={styles.gridItem}>
                          <Text style={styles.columnLabel}>PAY METHOD</Text>
                          <Text style={styles.columnValueBold}>
                            {String(bill.payment_method || (bill as any).payment_mode || 'Cash').toUpperCase()}
                          </Text>
                        </View>
                      )}

                      {/* Date */}
                      {columns.date && (
                        <View style={styles.gridItem}>
                          <Text style={styles.columnLabel}>DATE</Text>
                          <Text style={styles.columnValueBold}>{dateStr}</Text>
                        </View>
                      )}

                      {/* Pharmacist */}
                      {columns.pharmacist && bill.pharmacist_name ? (
                        <View style={styles.gridItem}>
                          <Text style={styles.columnLabel}>PHARMACIST</Text>
                          <Text style={styles.columnValueBold}>{bill.pharmacist_name}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Actions Row (Bottom Right) matching Screenshot 1 */}
                    {columns.actions && (
                      <View style={styles.cardActionsRow}>
                        {/* 1. Eye Button: Cyan border, light teal bg, teal eye icon */}
                        <TouchableOpacity
                          style={styles.eyeActionBtn}
                          activeOpacity={0.7}
                          onPress={() => handleOpenDetails(bill)}>
                          <BillingEyeIcon size={18} color="#0d9488" strokeWidth={2} />
                        </TouchableOpacity>

                        {/* 2. 3-Dots Button: Grey border, light bg, 3 dots icon */}
                        <TouchableOpacity
                          style={styles.moreActionBtn}
                          activeOpacity={0.7}
                          onPress={() => handleOpenActionMenu(bill)}>
                          <MoreVerticalIcon size={18} color="#0f172a" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 1. COLUMNS MODAL matching Screenshots 2 & 3 */}
      <MedicineColumnsModal
        visible={columnsModalVisible}
        anchorY={columnsAnchorY}
        columns={columns}
        onClose={() => setColumnsModalVisible(false)}
        onToggleColumn={handleToggleColumn}
      />

      {/* 2. 3-DOTS ACTION MENU BOTTOM SHEET matching Screenshot 4 */}
      <MedicineBillActionModal
        visible={actionSheetVisible}
        bill={selectedBill}
        onClose={() => setActionSheetVisible(false)}
        onEdit={handleEditBillFromMenu}
        onCancel={handleCancelBillFromMenu}
      />

      {/* 3. EDIT MEDICINE BILL MODAL */}
      <EditMedicineBillModal
        visible={editModalVisible}
        bill={selectedBill}
        onClose={() => setEditModalVisible(false)}
        onSave={handleSaveEditedBill}
      />

      {/* 4. CREATE MULTI-ITEM MEDICINE BILL MODAL */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCardWide}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>New Medicine Invoice</Text>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(false)}
                style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingBottom: 10 }}>
              <View style={styles.formRowTwo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Patient Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Patient Name"
                    placeholderTextColor="#94a3b8"
                    value={patientName}
                    onChangeText={setPatientName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Mobile Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+91 98765 43210"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={patientPhone}
                    onChangeText={setPatientPhone}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.label}>Patient Code (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. P-101"
                  placeholderTextColor="#94a3b8"
                  value={patientCode}
                  onChangeText={setPatientCode}
                />
              </View>

              {/* Itemized Medicine Rows List */}
              <Text style={styles.sectionHeading}>Itemized Prescribed Medicines</Text>
              <View style={styles.itemsTableCard}>
                {billItems.map((item, idx) => (
                  <View key={idx} style={styles.itemTableRow}>
                    <Text style={styles.itemTableTitle}>{item.name}</Text>
                    <Text style={styles.itemTableQty}>Qty: {item.qty}</Text>
                    <Text style={styles.itemTablePrice}>₹{item.price.toFixed(2)}/unit</Text>
                    <Text style={styles.itemTableTotal}>
                      ₹{(item.qty * item.price).toFixed(2)}
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveItem(idx)}>
                      <Text style={styles.removeItemText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Add New Item Inputs */}
              <View style={styles.addItemInputRow}>
                <TextInput
                  style={[styles.input, { flex: 2 }]}
                  placeholder="Medicine Name"
                  placeholderTextColor="#94a3b8"
                  value={newMedName}
                  onChangeText={setNewMedName}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Qty"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={newMedQty}
                  onChangeText={setNewMedQty}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Price ₹"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={newMedPrice}
                  onChangeText={setNewMedPrice}
                />
                <TouchableOpacity style={styles.addItemBtn} onPress={handleAddItem}>
                  <Text style={styles.addItemBtnText}>+ Add</Text>
                </TouchableOpacity>
              </View>

              {/* Discount & Totals */}
              <View style={styles.totalsBoxCard}>
                <View style={styles.totalRowLine}>
                  <Text style={styles.totalRowLabel}>Subtotal:</Text>
                  <Text style={styles.totalRowVal}>₹{calculateSubtotal().toFixed(2)}</Text>
                </View>
                <View style={styles.totalRowLine}>
                  <Text style={styles.totalRowLabel}>Discount Amount (₹):</Text>
                  <TextInput
                    style={styles.discountInput}
                    keyboardType="numeric"
                    value={discountAmount}
                    onChangeText={setDiscountAmount}
                  />
                </View>
                <View
                  style={[
                    styles.totalRowLine,
                    { borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingTop: 6, marginTop: 4 },
                  ]}>
                  <Text style={[styles.totalRowLabel, { fontWeight: '800' }]}>
                    Grand Payable Total:
                  </Text>
                  <Text style={styles.grandTotalVal}>₹{calculateGrandTotal().toFixed(2)}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.primarySaveBtn} onPress={handleCreateBill}>
                <Text style={styles.primarySaveBtnText}>🧾 Generate & Issue Bill (Hit API)</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 5. INVOICE DETAILS REUSABLE MODAL (Opened by eye icon) */}
      {selectedBill && (
        <InvoiceModal
          visible={detailsModalVisible}
          title="Medicine Invoice"
          invoiceType="medicine"
          invoiceNumber={selectedBill.bill_number || `MB-${selectedBill.id}`}
          invoiceDate={
            selectedBill.created_at ? String(selectedBill.created_at).split('T')[0] : undefined
          }
          clinicName={selectedBill.clinic_name || 'Aarogya Care Clinic'}
          patientName={selectedBill.patient_name || 'Patient'}
          patientPhone={selectedBill.patient_phone || ''}
          doctorName={selectedBill.doctor_name || (selectedBill as any).doctor_name || 'Dr. Rahul Sharma'}
          prescriptionId={selectedBill.prescription_id || selectedBill.id}
          paymentMethod={String(
            (selectedBill as any).payment_mode ||
              (selectedBill as any).payment_method ||
              selectedBill.payment_method ||
              'Cash'
          ).toUpperCase()}
          paymentStatus={selectedBill.payment_status || selectedBill.status || 'paid'}
          items={(selectedBill.items || []).map((it) => ({
            name: it.medicine_name,
            quantity: it.quantity,
            unitPrice: Number(it.unit_price || 0),
            totalPrice: Number(it.total_price || 0),
          }))}
          subtotal={Number(selectedBill.subtotal || selectedBill.total_amount || 0)}
          discount={Number(selectedBill.discount_amount || 0)}
          tax={Number(selectedBill.tax_amount || 0)}
          grandTotal={Number(selectedBill.net_amount || selectedBill.total_amount || 0)}
          paidAmount={Number(
            selectedBill.paid_amount ||
              (selectedBill.payment_status === 'paid'
                ? selectedBill.net_amount || selectedBill.total_amount || 0
                : 0)
          )}
          dueAmount={selectedBill.due_amount}
          onClose={() => setDetailsModalVisible(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 90,
  },

  /* Header Section matching Screenshot 1 */
  topHeaderSection: {
    marginBottom: 16,
    marginTop: 4,
  },
  topTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topPageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  topSubtitleText: {
    fontSize: 13.5,
    color: '#64748b',
    marginTop: 4,
  },
  headerCreateBillBtn: {
    backgroundColor: '#169b91',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 14,
  },
  createBillPlus: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 18,
  },
  headerCreateBillBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },

  /* Search Card matching Screenshot 1 */
  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 13.5,
    color: '#0f172a',
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  searchBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },

  /* All Bills Section matching Screenshot 1 */
  allBillsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  allBillsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  allBillsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  columnsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  columnsBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },

  /* Empty / Loading */
  emptyMedicineBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyMedicineText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 12,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 10,
  },

  /* Bill Cards matching Screenshot 1 */
  billList: {
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billNoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  patientNameText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 3,
  },
  statusBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  paidBg: {
    backgroundColor: '#dcfce7',
  },
  paidText: {
    color: '#166534',
  },
  partialBg: {
    backgroundColor: '#fef3c7',
  },
  partialText: {
    color: '#b45309',
  },
  pendingBg: {
    backgroundColor: '#fee2e2',
  },
  pendingText: {
    color: '#b91c1c',
  },
  cancelledBg: {
    backgroundColor: '#f1f5f9',
  },
  cancelledText: {
    color: '#64748b',
  },

  cardDivider: {
    height: 1,
    backgroundColor: '#f8fafc',
    marginVertical: 10,
  },

  columnsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  gridItem: {
    minWidth: 90,
  },
  columnLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  columnValueBold: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },

  /* Card Action Buttons (Bottom Right) matching Screenshot 1 */
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  eyeActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: '#5eead4',
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Create Bill Modal */
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCardWide: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 6,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  formRowTwo: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8,
  },
  itemsTableCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  itemTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  itemTableTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemTableQty: {
    fontSize: 11,
    color: '#64748b',
  },
  itemTablePrice: {
    fontSize: 11,
    color: '#64748b',
  },
  itemTableTotal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0d9488',
  },
  removeItemText: {
    fontSize: 14,
  },
  addItemInputRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  addItemBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  addItemBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  totalsBoxCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginTop: 6,
  },
  totalRowLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRowLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  totalRowVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  discountInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    width: 80,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  grandTotalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0d9488',
  },
  primarySaveBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  primarySaveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default MedicineBillingScreen;
