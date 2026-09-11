import React from 'react';
import {
  Modal,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
  /** Y coordinate of the Columns trigger. Keeps this a real drop-up, not a sheet. */
  anchorY?: number;
}

export const ColumnsModal: React.FC<ColumnsModalProps> = ({
  visible,
  onClose,
  title = 'Show / Hide Columns',
  columns,
  selectedIds,
  onToggle,
  anchorY,
}) => {
  const screenHeight = Dimensions.get('window').height;
  const longestLabelLength = Math.max(title.length, ...columns.map((column) => column.label.length));
  // Compact enough for small phones, while allowing the widest column label to fit.
  const dropdownWidth = Math.min(240, Math.max(190, Math.ceil(longestLabelLength * 6.8) + 58));
  const desiredHeight = Math.min(360, 57 + columns.length * 37);
  const spaceAbove = Math.max(0, (anchorY || 0) - 18);
  const spaceBelow = Math.max(0, screenHeight - (anchorY || 0) - 42);
  const openBelow = anchorY !== undefined && spaceAbove < Math.min(desiredHeight, 230);
  const positionStyle = anchorY === undefined
    ? styles.defaultPosition
    : openBelow
      // When an upward popover would reach the header, keep it under the Columns button.
      ? { top: Math.max(12, anchorY + 28), maxHeight: Math.min(desiredHeight, Math.max(150, spaceBelow)) }
      : { bottom: Math.max(12, screenHeight - anchorY + 30), maxHeight: Math.min(desiredHeight, spaceAbove) };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.dropdownCard, { width: dropdownWidth }, positionStyle]}>
          <View style={styles.headerRow}>
            <Text style={styles.titleText}>{title}</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            nestedScrollEnabled
            scrollEnabled
            showsVerticalScrollIndicator={false}
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
          >
            {columns.map(col => {
              const isChecked = selectedIds.includes(col.id);

              return (
                <React.Fragment key={col.id}>
                  {col.isDividerBefore && <View style={styles.divider} />}
                  <TouchableOpacity
                    activeOpacity={0.65}
                    style={styles.optionRow}
                    onPress={() => onToggle(col.id)}
                  >
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
                      ]}
                    >
                      {col.label}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 99999,
    elevation: 99999,
  },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  dropdownCard: {
    // The runtime width is calculated from the title and visible labels.
    maxHeight: '45%',
    position: 'absolute',
    right: 16,
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
  defaultPosition: { bottom: 88 },
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
    maxHeight: 290,
    flexShrink: 1,
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
