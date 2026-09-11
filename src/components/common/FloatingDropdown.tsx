import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, Search } from 'lucide-react-native';

export interface FloatingDropdownOption {
  id: string;
  label: string;
}

interface FloatingDropdownProps {
  visible: boolean;
  anchorY?: number;
  anchorX?: number;
  anchorWidth?: number;
  anchorHeight?: number;
  options: FloatingDropdownOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
}

/**
 * A visual dropdown rendered above the screen tree. The transparent Modal is
 * used only as a portal layer—there is no sheet, backdrop, or dialog UI.
 * This keeps its option ScrollView independent from the page ScrollView.
 */
export const FloatingDropdown: React.FC<FloatingDropdownProps> = ({
  visible,
  anchorY,
  anchorX,
  anchorWidth,
  anchorHeight = 44,
  options,
  selectedId,
  onSelect,
  onClose,
  searchPlaceholder = 'Search options...',
  showSearch = true,
}) => {
  const [query, setQuery] = useState('');
  const screen = Dimensions.get('window');
  const filteredOptions = useMemo(
    () => showSearch ? options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase())) : options,
    [options, query, showSearch],
  );
  const optionListHeight = Math.min(214, Math.max(40, filteredOptions.length * 37 + 4));
  const menuHeight = (showSearch ? 50 : 12) + optionListHeight;
  // anchorY is the trigger's real window Y (not the press-event Y).
  const top = Math.min(Math.max(12, (anchorY || 0) + anchorHeight + 6), Math.max(12, screen.height - menuHeight - 12));
  const width = anchorWidth || screen.width - 32;
  const left = anchorX === undefined ? 16 : anchorX;

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.menu, { top, left, width, height: menuHeight }]}>
          {showSearch ? (
            <View style={styles.searchBox}>
              <Search size={15} color="#94a3b8" />
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
              />
            </View>
          ) : null}
          <ScrollView style={[styles.options, { height: optionListHeight }]} contentContainerStyle={styles.optionsContent} showsVerticalScrollIndicator nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {filteredOptions.length === 0 ? (
              <Text style={styles.emptyText}>No matching option found.</Text>
            ) : filteredOptions.map((option) => {
              const selected = option.id === selectedId;
              return (
                <TouchableOpacity key={option.id} style={[styles.option, selected && styles.optionSelected]} onPress={() => onSelect(option.id)}>
                  <View style={styles.checkSlot}>{selected && <Check size={15} color="#0f9488" strokeWidth={2.6} />}</View>
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]} numberOfLines={1}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'transparent' },
  // Do not rely on `StyleSheet.absoluteFillObject`: older Android runtime
  // builds can leave that overlay without dimensions, so outside taps miss it.
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  menu: { position: 'absolute', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4eb', borderRadius: 12, paddingVertical: 6, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 10, elevation: 24 },
  searchBox: { height: 39, marginHorizontal: 7, marginBottom: 5, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8 },
  searchInput: { flex: 1, height: '100%', paddingVertical: 0, color: '#334155', fontSize: 12.5 },
  options: { flexGrow: 0 },
  optionsContent: { paddingBottom: 4 },
  option: { minHeight: 37, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginHorizontal: 3, borderRadius: 7 },
  optionSelected: { backgroundColor: '#dff7f4' },
  checkSlot: { width: 20, alignItems: 'center' },
  optionText: { flex: 1, color: '#334155', fontSize: 13, fontWeight: '500' },
  optionTextSelected: { color: '#0f9488', fontWeight: '700' },
  emptyText: { padding: 16, textAlign: 'center', color: '#64748b', fontSize: 13 },
});

export default FloatingDropdown;
