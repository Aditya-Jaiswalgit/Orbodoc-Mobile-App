import { colors, radii, spacing, typography } from '../../../theme/tokens';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LiquidBorderScrollView } from '../../../components/common/LiquidBorderScrollView';
import { BadgeCheck, Building2, Check, ChevronDown, ChevronRight, MapPin, Search, Stethoscope, X } from 'lucide-react-native';
import { LiquidBorderTouchable } from '../../../components/common/LiquidBorderSurface';

export type BookingLocation = { id: string; name: string; code?: string };
export type BookingDoctor = {
  id: string; name: string; specialty: string; doctorType: string; fee: number;
  videoRatePerMinute: number; availableDays: string; isDoctor: boolean;
  videoEnabled: boolean; imageUrl?: string; verified: boolean;
};
export type BookingClinic = {
  id: string; name: string; city: string; state: string; imageUrl?: string;
  verified: boolean; doctors: BookingDoctor[];
};

export function BookingProgress({ step }: { step: 1 | 2 | 3 }) {
  const items = ['Clinic', 'Doctor', 'Schedule'] as const;
  return <View style={ui.progress}>
    {items.map((label, index) => {
      const value = index + 1;
      const active = value === step;
      const complete = value < step;
      return <View key={label} style={[ui.progressItem, active && ui.progressActive]}>
        <View style={[ui.progressNumber, active && ui.progressNumberActive, complete && ui.progressNumberDone]}>
          {complete ? <Check size={13} color="#064E3B" /> : <Text style={[ui.progressNumberText, active && ui.progressNumberTextActive]}>{value}</Text>}
        </View><Text style={[ui.progressLabel, active && ui.progressLabelActive]}>{label}</Text>
      </View>;
    })}
  </View>;
}

export function SearchField({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return <View style={ui.searchField}><Search size={16} color={colors.subtle} /><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.subtle} style={ui.searchInput} clearButtonMode="while-editing" /></View>;
}

export function LocationPicker({ label, placeholder, value, options, loading, disabled, onSelect }: {
  label: string; placeholder: string; value: string; options: BookingLocation[]; loading?: boolean; disabled?: boolean; onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const current = options.find(option => option.id === value);
  const filtered = useMemo(() => options.filter(option => `${option.name} ${option.code || ''}`.toLowerCase().includes(search.trim().toLowerCase())), [options, search]);
  return <>
    <Text style={ui.fieldLabel}>{label}</Text>
    <TouchableOpacity style={[ui.locationTrigger, disabled && ui.disabled]} disabled={disabled || loading} onPress={() => { setSearch(''); setOpen(true); }}>
      <Text numberOfLines={1} style={[ui.locationValue, !current && ui.placeholder]}>{loading ? 'Loading…' : current?.name || placeholder}</Text>
      {loading ? <ActivityIndicator size="small" color={colors.primaryDark} /> : <ChevronDown size={16} color={colors.muted} />}
    </TouchableOpacity>
    <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
      <View style={ui.modalShade}><TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        <View style={ui.pickerModal}><View style={ui.pickerHeader}><Text style={ui.pickerTitle}>Select {label.toLowerCase()}</Text><TouchableOpacity onPress={() => setOpen(false)}><X size={20} color={colors.muted} /></TouchableOpacity></View>
          <SearchField value={search} onChangeText={setSearch} placeholder={`Search ${label.toLowerCase()}…`} />
          <LiquidBorderScrollView keyboardShouldPersistTaps="handled" style={ui.pickerList}>
            {filtered.map(option => <TouchableOpacity key={option.id} style={ui.pickerOption} onPress={() => { onSelect(option.id); setOpen(false); }}><Text style={ui.pickerOptionText}>{option.name}</Text>{option.id === value ? <Check size={17} color={colors.primaryDark} /> : null}</TouchableOpacity>)}
            {!filtered.length ? <Text style={ui.emptyText}>No matching {label.toLowerCase()} found.</Text> : null}
          </LiquidBorderScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

export function ClinicCard({ clinic, selected, onPress }: { clinic: BookingClinic; selected: boolean; onPress: () => void }) {
  return <LiquidBorderTouchable radius={12} activeOpacity={0.8} onPress={onPress} style={[ui.clinicCard, selected && ui.clinicSelected]}>
    <View style={[ui.clinicIcon, selected && ui.clinicIconSelected]}>{clinic.imageUrl ? <Image source={{ uri: clinic.imageUrl }} style={ui.image} /> : <Building2 size={19} color={selected ? colors.primaryDark : colors.muted} />}</View>
    <View style={ui.grow}>
      <View style={ui.nameLine}><Text numberOfLines={1} style={ui.clinicName}>{clinic.name}</Text>{clinic.verified ? <BadgeCheck size={15} color={colors.primary} /> : null}</View>
      <Text numberOfLines={1} style={ui.locationLine}><MapPin size={12} color={colors.muted} /> {clinic.city || clinic.state ? [clinic.city, clinic.state].filter(Boolean).join(', ') : 'Location unavailable'}</Text>
      <Text style={ui.countText}>{clinic.doctors.length} doctor{clinic.doctors.length === 1 ? '' : 's'}</Text>
    </View>
    {selected ? <Check size={17} color={colors.primary} /> : <ChevronRight size={17} color={colors.subtle} />}
  </LiquidBorderTouchable>;
}

export function DoctorCard({ doctor, clinicName, selected, onPress }: { doctor: BookingDoctor; clinicName: string; selected: boolean; onPress: () => void }) {
  return <LiquidBorderTouchable radius={15} activeOpacity={0.8} onPress={onPress} style={[ui.doctorCard, selected && ui.doctorSelected]}>
    <View style={[ui.doctorIcon, selected && ui.doctorIconSelected]}>{doctor.imageUrl ? <Image source={{ uri: doctor.imageUrl }} style={ui.image} /> : <Stethoscope size={19} color={selected ? colors.primaryDark : '#0891B2'} />}</View>
    <View style={ui.grow}>
      <View style={ui.nameLine}><Text numberOfLines={1} style={ui.doctorName}>Dr. {doctor.name}</Text>{doctor.verified ? <BadgeCheck size={15} color={colors.primary} /> : null}</View>
      <Text numberOfLines={1} style={ui.doctorSpecialty}>{doctor.specialty || 'General Physician'}</Text>
      <Text numberOfLines={1} style={ui.doctorClinic}>{clinicName}</Text>
      <View style={ui.feeLine}><Text style={ui.feeLabel}>Consultation fee</Text><Text style={ui.feeValue}>{doctor.fee > 0 ? `₹${doctor.fee.toLocaleString('en-IN')}` : 'At clinic'}</Text></View>
    </View>
    {selected ? <Check size={17} color="#0891B2" /> : <ChevronRight size={17} color={colors.subtle} />}
  </LiquidBorderTouchable>;
}

const ui = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 5, padding: spacing.tiny, borderRadius: radii.lg, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  progressItem: { flex: 1, minHeight: 44, flexDirection: 'row', gap: spacing.tiny, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, paddingHorizontal: 5 },
  progressActive: { backgroundColor: colors.surface }, progressNumber: { width: 23, height: 23, borderRadius: radii.lg, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' },
  progressNumberActive: { backgroundColor: colors.mintBorder }, progressNumberDone: { backgroundColor: colors.mintBorder }, progressNumberText: { fontFamily: typography.family, color: colors.surface, fontSize: typography.size.xs, fontWeight: typography.weight.extrabold },
  progressNumberTextActive: { color: colors.primaryDark }, progressLabel: { fontFamily: typography.family, color: 'rgba(255,255,255,0.82)', fontSize: typography.size.micro, fontWeight: typography.weight.bold }, progressLabelActive: { color: '#115E59' },
  searchField: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.surface },
  searchInput: { fontFamily: typography.family, flex: 1, height: 40, color: colors.text, fontSize: typography.size.caption }, fieldLabel: { fontFamily: typography.family, color: colors.primaryDark, fontSize: typography.size.body, fontWeight: typography.weight.extrabold, textTransform: 'uppercase', letterSpacing: 0.7, marginLeft: 3, marginBottom: 5 },
  locationTrigger: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.tiny, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  locationValue: { fontFamily: typography.family, flex: 1, color: colors.foreground, fontSize: typography.size.sm, fontWeight: typography.weight.semibold }, placeholder: { color: colors.subtle, fontWeight: typography.weight.regular }, disabled: { opacity: 0.5 },
  modalShade: { flex: 1, backgroundColor: 'rgba(15,23,42,0.48)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl }, pickerModal: { width: '100%', maxWidth: 420, maxHeight: '75%', borderRadius: radii.xl, backgroundColor: colors.surface, padding: 14, elevation: 12 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }, pickerTitle: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.subtitle, fontWeight: typography.weight.extrabold }, pickerList: { marginTop: spacing.sm },
  pickerOption: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.secondary, paddingHorizontal: spacing.xs }, pickerOptionText: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.caption }, emptyText: { fontFamily: typography.family, textAlign: 'center', padding: spacing.xxl, color: colors.muted, fontSize: typography.size.sm },
  clinicCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, marginBottom: 9 }, clinicSelected: { borderColor: '#5EEAD4', backgroundColor: colors.mint }, clinicIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, backgroundColor: colors.secondary }, clinicIconSelected: { backgroundColor: colors.mintBorder },
  grow: { flex: 1, minWidth: 0 }, nameLine: { flexDirection: 'row', alignItems: 'center', gap: 5 }, clinicName: { fontFamily: typography.family, flexShrink: 1, color: colors.text, fontSize: typography.size.caption, fontWeight: typography.weight.extrabold }, locationLine: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.micro, marginTop: spacing.xs }, countText: { fontFamily: typography.family, color: colors.primaryDark, fontSize: typography.size.micro, fontWeight: typography.weight.bold, marginTop: spacing.xs },
  image: { width: '100%', height: '100%', borderRadius: radii.lg },
  doctorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.surface, marginBottom: 9 }, doctorSelected: { borderColor: '#67E8F9', backgroundColor: '#ECFEFF' }, doctorIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, backgroundColor: '#ECFEFF' }, doctorIconSelected: { backgroundColor: colors.infoSoft },
  doctorName: { fontFamily: typography.family, flexShrink: 1, color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.extrabold }, doctorSpecialty: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.xs, marginTop: 3 }, doctorClinic: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.micro, marginTop: 2 }, feeLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.secondary, marginTop: spacing.sm, paddingTop: 7 }, feeLabel: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.micro }, feeValue: { fontFamily: typography.family, color: colors.primaryDark, fontSize: typography.size.sm, fontWeight: typography.weight.extrabold },
});
