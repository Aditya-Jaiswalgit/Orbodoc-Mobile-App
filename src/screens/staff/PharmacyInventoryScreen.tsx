import { AppModal } from '../../components/common/AppModal';
import { styles } from './styles/PharmacyInventory.styles';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import {
  Check,
  ChevronDown,
  Columns3,
  Edit2,
  MoreVertical,
  Package,
  Pill,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  Upload,
  X,
  IndianRupee,
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { Pagination } from '../../components/common/Pagination';
import { ColumnSelectorModal } from '../../components/common/ColumnSelectorModal';
import { CustomCalendarPicker } from '../../components/common/CustomCalendarPicker';
import { useAuthContext } from '../../context/AuthContext';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { showErrorToast } from '../../utils/toast';
import { useMedicineInventory } from '../../hooks/useMedicineInventory';
import {
  MedicineActionAnchor,
  useMedicineInventoryActions,
} from '../../hooks/useMedicineInventoryActions';
import {
  FormModal,
  InfoTile,
  MenuAction,
  StatCard,
} from './pharmacy/InventoryComponents';
import {
  DEFAULT_INVENTORY_COLUMNS as DEFAULT_VISIBLE_COLUMNS,
  formatExpiryDate as formatExpiry,
  INVENTORY_COLUMN_OPTIONS as COLUMN_OPTIONS,
  INVENTORY_PAGE_SIZE as PAGE_SIZE,
  MedicineFormState as FormState,
  medicineStockStatus as stockStatus,
  numberOrZero,
} from './pharmacy/inventoryUtils';

interface Props {
  onOpenDrawer: () => void;
  initialStock?: string;
}
export const PharmacyInventoryScreen: React.FC<Props> = ({ onOpenDrawer, initialStock }) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const actionButtonRefs = useRef<Record<number, MedicineActionAnchor | null>>(
    {},
  );
  const { token, activeClinicId, role, permissionsMap = {} } = useAuthContext();
  const canView = canUseStaffScreen(
    role,
    permissionsMap,
    'pharmacy_inventory',
    'view',
  );
  const canAdd = canUseStaffScreen(
    role,
    permissionsMap,
    'pharmacy_inventory',
    'add',
  );
  const canEdit = canUseStaffScreen(
    role,
    permissionsMap,
    'pharmacy_inventory',
    'edit',
  );
  const canDelete = canUseStaffScreen(
    role,
    permissionsMap,
    'pharmacy_inventory',
    'delete',
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All categories');
  const [selectedStatus, setSelectedStatus] = useState(
    initialStock === 'low' ? 'Low Stock' : 'All status',
  );
  const [columnsVisible, setColumnsVisible] = useState(false);
  const [openFilter, setOpenFilter] = useState<'category' | 'status' | null>(
    null,
  );
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const {
    saving,
    refreshKey,
    menu,
    setMenu,
    formVisible,
    setFormVisible,
    formMode,
    selectedMedicine,
    form,
    stockVisible,
    setStockVisible,
    stockType,
    setStockType,
    stockQuantity,
    setStockQuantity,
    focusedField,
    setFocusedField,
    importVisible,
    setImportVisible,
    pickedFile,
    setPickedFile,
    importPreview,
    setImportPreview,
    setField,
    openAdd,
    openEdit,
    openStock,
    openMedicineMenu,
    saveMedicine,
    saveStock,
    confirmDelete,
    chooseImportFile,
    uploadImport,
  } = useMedicineInventoryActions({
    token,
    clinicId: activeClinicId,
    canAdd,
    canEdit,
    canDelete,
    screenWidth,
    screenHeight,
    setCurrentPage,
    actionButtonRefs,
  });
  const {
    medicines,
    total: totalItems,
    loading,
    error: loadError,
  } = useMedicineInventory({
    token,
    clinicId: activeClinicId,
    canView,
    page: currentPage,
    pageSize,
    search: debouncedSearch,
    refreshKey,
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeClinicId]);

  useEffect(() => {
    if (loadError) showErrorToast('Could not load medicines', loadError);
  }, [loadError]);

  const lowStockCount = useMemo(
    () =>
      medicines.filter(
        medicine => medicine.stock_quantity <= medicine.reorder_level,
      ).length,
    [medicines],
  );
  const categories = useMemo(
    () =>
      Array.from(
        new Set(medicines.map(medicine => medicine.category).filter(Boolean)),
      ),
    [medicines],
  );
  const visibleMedicines = useMemo(
    () =>
      medicines.filter(
        medicine =>
          (selectedCategory === 'All categories' ||
            medicine.category === selectedCategory) &&
          (selectedStatus === 'All status' ||
            stockStatus(medicine) === selectedStatus),
      ),
    [medicines, selectedCategory, selectedStatus],
  );
  const inStockCount = useMemo(
    () =>
      medicines.filter(medicine => stockStatus(medicine) === 'In Stock').length,
    [medicines],
  );
  const inventoryValue = useMemo(
    () =>
      medicines.reduce(
        (total, medicine) =>
          total +
          numberOrZero(medicine.unit_price) *
            numberOrZero(medicine.stock_quantity),
        0,
      ),
    [medicines],
  );
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const updateField = (
    key: keyof FormState,
    label: string,
    keyboardType: 'default' | 'decimal-pad' | 'numeric' = 'default',
    placeholder = '',
  ) => (
    <View style={[styles.field, styles.medicineField]} key={key}>
      <Text style={[styles.label, styles.medicineFieldLabel]}>
        {label.replace(' *', '')}
        {label.endsWith(' *') ? (
          <Text style={styles.requiredStar}> *</Text>
        ) : null}
      </Text>
      <TextInput
        style={[
          styles.input,
          styles.medicineFormInput,
          focusedField === key && styles.focusedInput,
        ]}
        value={form[key]}
        onChangeText={value => setField(key, value)}
        placeholder={placeholder || label}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        autoCapitalize={
          key === 'name' || key === 'generic_name' || key === 'manufacturer'
            ? 'words'
            : 'none'
        }
        onFocus={() => setFocusedField(key)}
        onBlur={() => setFocusedField(null)}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Medicine Inventory" />
      {!canView ? (
        <View style={styles.permissionBox}>
          <Pill size={28} color="#0D9488" />
          <Text style={styles.emptyTitle}>
            Medicine inventory access required
          </Text>
          <Text style={styles.muted}>
            Your role does not have permission to view medicines.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.pageHeading}>
            <View style={styles.headingIcon}>
              <Pill size={19} color="#0D9488" />
            </View>
            <View style={styles.headingText}>
              <Text style={styles.pageTitle}>Medicine Inventory</Text>
              <Text style={styles.muted}>
                {totalItems} medicines in this clinic
              </Text>
            </View>
          </View>
          {canAdd ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                accessibilityLabel="Import medicines"
                style={styles.patientStyleSecondaryButton}
                onPress={() => {
                  setPickedFile(null);
                  setImportPreview(null);
                  setImportVisible(true);
                }}
              >
                <Upload size={16} color="#0F172A" />
                <Text style={styles.patientStyleSecondaryText}>Import</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Add medicine"
                style={styles.patientStylePrimaryButton}
                onPress={openAdd}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.patientStylePrimaryText}>Add Medicine</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.statsGrid}>
            <StatCard
              icon={<Pill size={16} color="#0D9488" />}
              label="Total Medicines"
              value={String(totalItems)}
              tone="teal"
            />
            <StatCard
              icon={<Package size={16} color="#16A34A" />}
              label="In Stock"
              value={String(inStockCount)}
              tone="green"
            />
            <StatCard
              icon={<TriangleAlert size={16} color="#D97706" />}
              label="Low Stock"
              value={String(lowStockCount)}
              tone="amber"
            />
            <StatCard
              icon={<IndianRupee size={16} color="#2563EB" />}
              label="Stock Value"
              value={`\u20B9${inventoryValue.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              tone="blue"
            />
          </View>

          <View style={styles.searchBox}>
            <Search size={17} color="#64748B" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search medicines, batch, category..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              returnKeyType="search"
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.filtersCard}>
            <View style={styles.filterSelectRow}>
              <View
                style={[
                  styles.filterSelectWrap,
                  openFilter === 'category' && styles.filterSelectWrapTop,
                ]}
              >
                <TouchableOpacity
                  style={styles.filterSelect}
                  onPress={() =>
                    setOpenFilter(openFilter === 'category' ? null : 'category')
                  }
                >
                  <Text numberOfLines={1} style={styles.filterSelectText}>
                    {selectedCategory === 'All categories'
                      ? 'All Categories'
                      : selectedCategory}
                  </Text>
                  <ChevronDown size={16} color="#64748B" />
                </TouchableOpacity>
                {openFilter === 'category' ? (
                  <ScrollView
                    style={styles.filterPopover}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    {['All categories', ...categories].map(option => (
                      <TouchableOpacity
                        key={option}
                        style={styles.filterOption}
                        onPress={() => {
                          setSelectedCategory(option);
                          setOpenFilter(null);
                        }}
                      >
                        <Text style={styles.filterOptionText}>
                          {option === 'All categories'
                            ? 'All Categories'
                            : option}
                        </Text>
                        {selectedCategory === option ? (
                          <Check size={15} color="#0D9488" />
                        ) : null}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}
              </View>
              <View
                style={[
                  styles.filterSelectWrap,
                  openFilter === 'status' && styles.filterSelectWrapTop,
                ]}
              >
                <TouchableOpacity
                  style={styles.filterSelect}
                  onPress={() =>
                    setOpenFilter(openFilter === 'status' ? null : 'status')
                  }
                >
                  <Text numberOfLines={1} style={styles.filterSelectText}>
                    {selectedStatus === 'All status'
                      ? 'All Status'
                      : selectedStatus}
                  </Text>
                  <ChevronDown size={16} color="#64748B" />
                </TouchableOpacity>
                {openFilter === 'status' ? (
                  <View style={styles.filterPopover}>
                    {[
                      'All status',
                      'In Stock',
                      'Low Stock',
                      'Out of Stock',
                    ].map(option => (
                      <TouchableOpacity
                        key={option}
                        style={styles.filterOption}
                        onPress={() => {
                          setSelectedStatus(option);
                          setOpenFilter(null);
                        }}
                      >
                        <Text style={styles.filterOptionText}>
                          {option === 'All status' ? 'All Status' : option}
                        </Text>
                        {selectedStatus === option ? (
                          <Check size={15} color="#0D9488" />
                        ) : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
            <TouchableOpacity
              style={styles.columnsButton}
              onPress={() => setColumnsVisible(true)}
            >
              <Columns3 size={16} color="#1E293B" />
              <Text style={styles.columnsButtonText}>Columns</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listHeader}>
            <Pill size={17} color="#0F172A" />
            <Text style={styles.listTitle}>
              All Medicines ({visibleMedicines.length})
            </Text>
          </View>
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color="#0D9488" />
              <Text style={styles.muted}>Loading medicines...</Text>
            </View>
          ) : visibleMedicines.length === 0 ? (
            <View style={styles.empty}>
              <Package size={28} color="#94A3B8" />
              <Text style={styles.emptyTitle}>
                {loadError
                  ? 'Inventory could not be loaded'
                  : 'No medicines found'}
              </Text>
              <Text style={styles.muted}>
                {loadError ||
                  (debouncedSearch ||
                  selectedCategory !== 'All categories' ||
                  selectedStatus !== 'All status'
                    ? 'Try changing your search or filters.'
                    : 'Add a medicine to start managing stock.')}
              </Text>
            </View>
          ) : (
            <View style={styles.cards}>
              {visibleMedicines.map(medicine => {
                const status = stockStatus(medicine);
                const statusStyle =
                  status === 'In Stock'
                    ? styles.inStock
                    : status === 'Low Stock'
                    ? styles.lowStock
                    : styles.outStock;
                return (
                  <View key={medicine.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={styles.medicineIcon}>
                        <Pill size={17} color="#0D9488" />
                      </View>
                      <View style={styles.cardTitleBlock}>
                        {visibleColumns.medicine ? (
                          <Text style={styles.medicineName} numberOfLines={2}>
                            {medicine.name}
                          </Text>
                        ) : null}
                        {visibleColumns.id ? (
                          <Text style={styles.medicineForm}>
                            ID: {medicine.id}
                          </Text>
                        ) : null}
                        {visibleColumns.generic || visibleColumns.category ? (
                          <Text style={styles.medicineForm}>
                            {[
                              visibleColumns.generic
                                ? medicine.generic_name
                                : null,
                              visibleColumns.category
                                ? medicine.category
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' · ') || 'Medicine details'}
                          </Text>
                        ) : null}
                      </View>
                      {visibleColumns.actions && (canEdit || canDelete) ? (
                        <View
                          ref={node => {
                            actionButtonRefs.current[medicine.id] = node;
                          }}
                          collapsable={false}
                        >
                          <TouchableOpacity
                            accessibilityLabel={`Actions for ${medicine.name}`}
                            style={styles.moreButton}
                            onPress={() => openMedicineMenu(medicine)}
                          >
                            <MoreVertical size={18} color="#334155" />
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.detailGrid}>
                      {visibleColumns.unit_price ? (
                        <InfoTile
                          label="Price"
                          value={`Rs ${numberOrZero(
                            medicine.unit_price,
                          ).toFixed(2)}`}
                        />
                      ) : null}
                      {visibleColumns.stock_qty ? (
                        <InfoTile
                          label="Stock"
                          value={String(medicine.stock_quantity ?? 0)}
                        />
                      ) : null}
                      {visibleColumns.expiry ? (
                        <InfoTile
                          label="Expiry"
                          value={formatExpiry(medicine.expiry_date)}
                        />
                      ) : null}
                      {visibleColumns.status ? (
                        <View style={styles.infoTile}>
                          <Text style={styles.infoLabel}>Status</Text>
                          <View style={[styles.statusPill, statusStyle]}>
                            <Text
                              style={[
                                styles.statusText,
                                status === 'Low Stock'
                                  ? styles.lowStatusText
                                  : null,
                              ]}
                            >
                              {status}
                            </Text>
                          </View>
                        </View>
                      ) : null}
                      {visibleColumns.manufacturer ? (
                        <InfoTile
                          label="Manufacturer"
                          value={medicine.manufacturer || '—'}
                        />
                      ) : null}
                      {visibleColumns.form ? (
                        <InfoTile label="Form" value={medicine.form || '—'} />
                      ) : null}
                      {visibleColumns.reorder_level ? (
                        <InfoTile
                          label="Reorder Level"
                          value={String(medicine.reorder_level ?? 0)}
                        />
                      ) : null}
                      {visibleColumns.batch ? (
                        <InfoTile
                          label="Batch"
                          value={medicine.batch_number || '—'}
                        />
                      ) : null}
                      {visibleColumns.gst ? (
                        <InfoTile
                          label="GST %"
                          value={`${numberOrZero(medicine.gst_percent)}%`}
                        />
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          {totalItems > 0 ? (
            <Pagination
              currentPage={currentPage}
              totalPages={pageCount}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={size => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          ) : null}
        </ScrollView>
      )}

      <ColumnSelectorModal
        visible={columnsVisible}
        onClose={() => setColumnsVisible(false)}
        columns={[...COLUMN_OPTIONS]}
        visibleColumns={visibleColumns}
        onToggleColumn={key =>
          setVisibleColumns(current => ({ ...current, [key]: !current[key] }))
        }
        onReset={() => setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)}
        title="Show / Hide Columns"
        subtitle="Toggle columns to show or hide in the list"
      />

      <AppModal
        visible={Boolean(menu)}
        transparent
        animationType="fade"
        onRequestClose={() => setMenu(null)}
      >
        <View style={styles.actionMenuOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMenu(null)}
          />
          <View
            style={[
              styles.actionMenuCard,
              { top: menu?.top ?? 12, left: menu?.left ?? 12 },
            ]}
          >
            {canEdit ? (
              <MenuAction
                highlighted
                icon={<Edit2 size={16} color="#0D9488" />}
                label="Edit"
                onPress={() => menu && openEdit(menu.medicine)}
              />
            ) : null}
            {canEdit ? (
              <MenuAction
                icon={<Package size={16} color="#334155" />}
                label="Update Stock"
                onPress={() => menu && openStock(menu.medicine)}
              />
            ) : null}
            {canEdit && canDelete ? <View style={styles.menuDivider} /> : null}
            {canDelete ? (
              <MenuAction
                icon={<Trash2 size={16} color="#EF4444" />}
                label="Delete"
                destructive
                onPress={() => menu && confirmDelete(menu.medicine)}
              />
            ) : null}
          </View>
        </View>
      </AppModal>

      <FormModal
        visible={formVisible}
        variant="medicine"
        title={formMode === 'add' ? 'Add New Medicine' : 'Edit Medicine'}
        subtitle={
          formMode === 'add'
            ? 'Enter medicine details manually'
            : 'Update medicine details'
        }
        saving={saving}
        onClose={() => setFormVisible(false)}
        onSave={saveMedicine}
        saveLabel={formMode === 'add' ? 'Add Medicine' : 'Update Medicine'}
      >
        {updateField(
          'name',
          'Medicine Name *',
          'default',
          'e.g., Paracetamol 500mg',
        )}
        {updateField(
          'generic_name',
          'Generic Name',
          'default',
          'e.g., Paracetamol',
        )}
        {updateField(
          'manufacturer',
          'Manufacturer *',
          'default',
          'e.g., Sun Pharma',
        )}
        {updateField('category', 'Category *', 'default', 'e.g., Analgesic')}
        {updateField('form', 'Form', 'default', 'e.g., Tablet, Capsule')}
        {updateField(
          'batch_number',
          'Batch Number *',
          'default',
          'e.g., BTH001',
        )}
        <View style={[styles.field, styles.medicineField]}>
          <Text style={[styles.label, styles.medicineFieldLabel]}>
            Expiry Date<Text style={styles.requiredStar}> *</Text>
          </Text>
          <CustomCalendarPicker
            selectedDate={
              form.expiry_date
                ? new Date(`${form.expiry_date}T00:00:00`)
                : undefined
            }
            placeholder="Select expiry date"
            fromYear={new Date().getFullYear() - 10}
            toYear={new Date().getFullYear() + 30}
            triggerStyle={[
              styles.dateTrigger,
              styles.medicineFormInput,
              focusedField === 'expiry_date' && styles.focusedInput,
            ]}
            triggerTextStyle={[
              styles.dateTriggerText,
              styles.medicineDateTriggerText,
            ]}
            iconColor="#718096"
            onOpen={() => setFocusedField('expiry_date')}
            onDateChange={date => {
              setField(
                'expiry_date',
                `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
                  2,
                  '0',
                )}-${String(date.getDate()).padStart(2, '0')}`,
              );
              setFocusedField(null);
            }}
          />
        </View>
        {updateField('unit_price', 'Unit Price *', 'decimal-pad', '0.00')}
        {updateField('stock_quantity', 'Stock Quantity *', 'numeric', '0')}
        {updateField('reorder_level', 'Reorder Level *', 'numeric', '10')}
        {updateField('gst_percent', 'GST Percent', 'decimal-pad', '12')}
        {formMode === 'edit' ? (
          <Text style={styles.formHint}>
            For stock changes, use Ã¢â‚¬Å“Update StockÃ¢â‚¬Â so the adjustment
            is recorded separately.
          </Text>
        ) : null}
      </FormModal>

      <FormModal
        visible={stockVisible}
        variant="stock"
        title="Update Stock"
        subtitle={
          selectedMedicine
            ? `Current stock: ${selectedMedicine.stock_quantity} units`
            : ''
        }
        saving={saving}
        onClose={() => setStockVisible(false)}
        onSave={saveStock}
        saveLabel="Update Stock"
      >
        <View style={styles.stockOptions}>
          <TouchableOpacity
            style={[
              styles.stockOption,
              stockType === 'add' && styles.stockOptionActive,
            ]}
            onPress={() => setStockType('add')}
          >
            <Plus
              size={17}
              color={stockType === 'add' ? '#FFFFFF' : '#334155'}
            />
            <Text
              style={[
                styles.stockOptionText,
                stockType === 'add' && styles.stockOptionTextActive,
              ]}
            >
              Add Stock
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.stockOption,
              stockType === 'remove' && styles.stockOptionActive,
            ]}
            onPress={() => setStockType('remove')}
          >
            <Package
              size={16}
              color={stockType === 'remove' ? '#FFFFFF' : '#334155'}
            />
            <Text
              style={[
                styles.stockOptionText,
                stockType === 'remove' && styles.stockOptionTextActive,
              ]}
            >
              Remove Stock
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.stockQuantityField}>
          <Text style={styles.stockQuantityLabel}>Quantity</Text>
          <TextInput
            value={stockQuantity}
            onChangeText={setStockQuantity}
            style={[
              styles.input,
              styles.stockQuantityInput,
              focusedField === 'stockQuantity' && styles.focusedInput,
            ]}
            keyboardType="numeric"
            placeholder="Enter quantity"
            placeholderTextColor="#718096"
            onFocus={() => setFocusedField('stockQuantity')}
            onBlur={() => setFocusedField(null)}
          />
        </View>
      </FormModal>

      <FormModal
        visible={importVisible}
        title="Import Medicines"
        saving={saving}
        disableSave={
          !pickedFile || !importPreview || Boolean(importPreview.error)
        }
        onClose={() => {
          setImportVisible(false);
          setPickedFile(null);
          setImportPreview(null);
        }}
        onSave={uploadImport}
        saveLabel="Import file"
      >
        <Text style={styles.formHint}>
          Select an .xlsx workbook or CSV. The first worksheet is checked for
          required columns and existing batch numbers before upload.
        </Text>
        <TouchableOpacity
          style={styles.filePicker}
          onPress={() => chooseImportFile()}
        >
          <Upload size={18} color="#0D9488" />
          <Text style={styles.filePickerText}>
            {pickedFile
              ? 'Choose a different file'
              : 'Choose Excel or CSV file'}
          </Text>
        </TouchableOpacity>
        {pickedFile ? (
          <View style={styles.selectedFile}>
            <Package size={16} color="#0D9488" />
            <View style={styles.fileCopy}>
              <Text style={styles.fileName} numberOfLines={1}>
                {pickedFile.name}
              </Text>
              <Text style={styles.formHint}>
                {importPreview
                  ? `${importPreview.inserts} new · ${importPreview.updates} update · ${importPreview.invalid} skipped`
                  : 'Reading and validating file…'}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Remove selected file"
              onPress={() => {
                setPickedFile(null);
                setImportPreview(null);
              }}
            >
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
        ) : null}
        {importPreview?.error ? (
          <Text style={styles.importError}>{importPreview.error}</Text>
        ) : null}
        {importPreview && !importPreview.error ? (
          <View style={styles.importPreviewBox}>
            <Text style={styles.fileName}>
              Preview · {importPreview.total} rows
            </Text>
            <ScrollView nestedScrollEnabled style={styles.extractedInline1}>
              {importPreview.rows.slice(0, 30).map(row => (
                <View key={row.rowNumber} style={styles.importPreviewRow}>
                  <Text style={styles.formHint}>
                    Row {row.rowNumber}: {row.name || row.batch}
                  </Text>
                  <Text style={styles.formHint}>{row.action}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
        <Text style={styles.formHint}>
          Required columns: name, generic_name, manufacturer, category,
          unit_price, stock_quantity, reorder_level, expiry_date and
          batch_number.
        </Text>
      </FormModal>
    </View>
  );
};

export default PharmacyInventoryScreen;
