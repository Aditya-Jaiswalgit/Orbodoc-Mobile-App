import React from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

export interface ColumnItem {
  id: string;
  label: string;
  isDividerBefore?: boolean;
}

interface ColumnsModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  columns: ColumnItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export const ColumnsModal: React.FC<ColumnsModalProps> = ({
  visible,
  onClose,
  title = 'Show / Hide Columns',
  columns,
  selectedIds,
  onToggle,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.dropdownCard}
          onPress={(e) => {
            if (e && typeof e.stopPropagation === 'function') {
              e.stopPropagation();
            }
          }}>
          <View style={styles.headerRow}>
            <Text style={styles.titleText}>{title}</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}>
            {columns.map((col) => {
              const isChecked = selectedIds.includes(col.id);

              return (
                <React.Fragment key={col.id}>
                  {col.isDividerBefore && <View style={styles.divider} />}
                  <TouchableOpacity
                    activeOpacity={0.65}
                    style={styles.optionRow}
                    onPress={() => onToggle(col.id)}>
                    <View style={styles.checkCol}>
                      {isChecked ? (
                        <Text style={styles.checkMark}>✓</Text>
                      ) : (
                        <View style={styles.emptyCheck} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.labelText,
                        isChecked && styles.labelTextChecked,
                      ]}>
                      {col.label}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 99999,
    elevation: 99999,
  },
  dropdownCard: {
    width: '100%',
    maxWidth: 285,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    zIndex: 100000,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)',
      } as any,
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  titleText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 2,
  },
  closeBtnText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '700',
  },
  scrollList: {
    maxHeight: 380,
  },
  scrollContent: {
    paddingVertical: 6,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  checkCol: {
    width: 20,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyCheck: {
    width: 14,
    height: 14,
  },
  labelText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  labelTextChecked: {
    color: '#0f172a',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
    marginHorizontal: 12,
  },
});

export default ColumnsModal;
