import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LabCatalogItem } from '../../api/labApi';
import { PenEditIcon } from '../common/CustomIcons';
import { ColumnVisibilityState } from './ColumnsVisibilityModal';

interface LabTestCardProps {
  item: LabCatalogItem;
  columns: ColumnVisibilityState;
  onEdit: (item: LabCatalogItem) => void;
}

export const LabTestCard: React.FC<LabTestCardProps> = ({ item, columns, onEdit }) => {
  const isAvailable =
    item.is_available !== false && (item.is_available as any) !== 0;
  const isHomeCollection = Boolean(item.home_collection_available);
  const testPrice = parseFloat(String(item.price || 0)) || 0;
  const discountPrice = parseFloat(String(item.discount_price || 0)) || 0;

  return (
    <View style={styles.card}>
      {/* Top Row: Test Name + Active/Inactive Badge */}
      <View style={styles.headerRow}>
        {columns.testName && (
          <Text style={styles.testName} numberOfLines={2}>
            {item.test_name}
          </Text>
        )}
        {columns.available && (
          <View style={[styles.statusBadge, isAvailable ? styles.statusActive : styles.statusInactive]}>
            <Text style={styles.statusText}>{isAvailable ? 'Active' : 'Inactive'}</Text>
          </View>
        )}
      </View>

      {/* Code */}
      {columns.code && Boolean(item.test_code) && (
        <Text style={styles.codeText}>{item.test_code}</Text>
      )}

      {/* Price Row: Test Price & Discount Price */}
      {(columns.price || columns.discountPrice) && (
        <View style={styles.priceRow}>
          {columns.price && (
            <View style={styles.priceCol}>
              <Text style={styles.priceLabel}>Test Price</Text>
              <Text style={styles.priceValue}>₹{testPrice.toFixed(2)}</Text>
            </View>
          )}

          {columns.discountPrice && (
            <View style={styles.priceCol}>
              <Text style={styles.priceLabel}>Discount Price</Text>
              <Text style={styles.priceValue}>₹{discountPrice.toFixed(2)}</Text>
            </View>
          )}
        </View>
      )}

      {/* Home Collection Pill */}
      {columns.homeCollection && (
        <View style={styles.pillContainer}>
          <View style={styles.homePill}>
            <Text style={styles.homePillText}>
              Home collection: {isHomeCollection ? 'Yes' : 'No'}
            </Text>
          </View>
        </View>
      )}

      {/* Description */}
      {columns.description && Boolean(item.description) && (
        <Text style={styles.descriptionText} numberOfLines={3}>
          {item.description}
        </Text>
      )}

      {/* Edit Test Button */}
      {columns.actions && (
        <TouchableOpacity
          style={styles.editBtn}
          activeOpacity={0.7}
          onPress={() => onEdit(item)}>
          <PenEditIcon size={16} color="#0f172a" strokeWidth={2} />
          <Text style={styles.editBtnText}>Edit test</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  testName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 3.5,
    borderRadius: 14,
  },
  statusActive: {
    backgroundColor: '#0d9488',
  },
  statusInactive: {
    backgroundColor: '#94a3b8',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  codeText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 3,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 24,
  },
  priceCol: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 3,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  pillContainer: {
    flexDirection: 'row',
    marginTop: 12,
  },
  homePill: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  homePillText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 12,
    lineHeight: 18,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    height: 44,
    marginTop: 16,
    gap: 8,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
});
