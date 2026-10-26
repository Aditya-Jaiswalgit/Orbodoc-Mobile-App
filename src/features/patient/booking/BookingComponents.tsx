import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BadgeCheck, Building2, Check, ChevronDown, ChevronRight, MapPin, Search, Stethoscope, X } from 'lucide-react-native';

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
  return <View style={ui.searchField}><Search size={16} color="#94A3B8" /><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#94A3B8" style={ui.searchInput} clearButtonMode="while-editing" /></View>;
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
      {loading ? <ActivityIndicator size="small" color="#1D7C72" /> : <ChevronDown size={16} color="#64748B" />}
    </TouchableOpacity>
    <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
      <View style={ui.modalShade}><TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        <View style={ui.pickerModal}><View style={ui.pickerHeader}><Text style={ui.pickerTitle}>Select {label.toLowerCase()}</Text><TouchableOpacity onPress={() => setOpen(false)}><X size={20} color="#64748B" /></TouchableOpacity></View>
          <SearchField value={search} onChangeText={setSearch} placeholder={`Search ${label.toLowerCase()}…`} />
          <ScrollView keyboardShouldPersistTaps="handled" style={ui.pickerList}>
            {filtered.map(option => <TouchableOpacity key={option.id} style={ui.pickerOption} onPress={() => { onSelect(option.id); setOpen(false); }}><Text style={ui.pickerOptionText}>{option.name}</Text>{option.id === value ? <Check size={17} color="#1D7C72" /> : null}</TouchableOpacity>)}
            {!filtered.length ? <Text style={ui.emptyText}>No matching {label.toLowerCase()} found.</Text> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

export function ClinicCard({ clinic, selected, onPress }: { clinic: BookingClinic; selected: boolean; onPress: () => void }) {
  return <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[ui.clinicCard, selected && ui.clinicSelected]}>
    <View style={[ui.clinicIcon, selected && ui.clinicIconSelected]}>{clinic.imageUrl ? <Image source={{ uri: clinic.imageUrl }} style={ui.image} /> : <Building2 size={19} color={selected ? '#1D7C72' : '#64748B'} />}</View>
    <View style={ui.grow}>
      <View style={ui.nameLine}><Text numberOfLines={1} style={ui.clinicName}>{clinic.name}</Text>{clinic.verified ? <BadgeCheck size={15} color="#27A599" /> : null}</View>
      <Text numberOfLines={1} style={ui.locationLine}><MapPin size={12} color="#64748B" /> {clinic.city || clinic.state ? [clinic.city, clinic.state].filter(Boolean).join(', ') : 'Location unavailable'}</Text>
      <Text style={ui.countText}>{clinic.doctors.length} doctor{clinic.doctors.length === 1 ? '' : 's'}</Text>
    </View>
    {selected ? <Check size={17} color="#27A599" /> : <ChevronRight size={17} color="#94A3B8" />}
  </TouchableOpacity>;
}

export function DoctorCard({ doctor, clinicName, selected, onPress }: { doctor: BookingDoctor; clinicName: string; selected: boolean; onPress: () => void }) {
  return <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[ui.doctorCard, selected && ui.doctorSelected]}>
    <View style={[ui.doctorIcon, selected && ui.doctorIconSelected]}>{doctor.imageUrl ? <Image source={{ uri: doctor.imageUrl }} style={ui.image} /> : <Stethoscope size={19} color={selected ? '#1D7C72' : '#0891B2'} />}</View>
    <View style={ui.grow}>
      <View style={ui.nameLine}><Text numberOfLines={1} style={ui.doctorName}>Dr. {doctor.name}</Text>{doctor.verified ? <BadgeCheck size={15} color="#27A599" /> : null}</View>
      <Text numberOfLines={1} style={ui.doctorSpecialty}>{doctor.specialty || 'General Physician'}</Text>
      <Text numberOfLines={1} style={ui.doctorClinic}>{clinicName}</Text>
      <View style={ui.feeLine}><Text style={ui.feeLabel}>Consultation fee</Text><Text style={ui.feeValue}>{doctor.fee > 0 ? `₹${doctor.fee.toLocaleString('en-IN')}` : 'At clinic'}</Text></View>
    </View>
    {selected ? <Check size={17} color="#0891B2" /> : <ChevronRight size={17} color="#94A3B8" />}
  </TouchableOpacity>;
}

const ui = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 5, padding: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  progressItem: { flex: 1, minHeight: 44, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: 5 },
  progressActive: { backgroundColor: '#FFFFFF' }, progressNumber: { width: 23, height: 23, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' },
  progressNumberActive: { backgroundColor: '#CCFBF1' }, progressNumberDone: { backgroundColor: '#6EE7B7' }, progressNumberText: { fontFamily: 'Inter', color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  progressNumberTextActive: { color: '#1D7C72' }, progressLabel: { fontFamily: 'Inter', color: 'rgba(255,255,255,0.82)', fontSize: 10, fontWeight: '700' }, progressLabelActive: { color: '#115E59' },
  searchField: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 11, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 11, backgroundColor: '#FFFFFF' },
  searchInput: { fontFamily: 'Inter', flex: 1, height: 40, color: '#0F172A', fontSize: 13 }, fieldLabel: { fontFamily: 'Inter', color: '#1D7C72', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7, marginLeft: 3, marginBottom: 5 },
  locationTrigger: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#FFFFFF' },
  locationValue: { fontFamily: 'Inter', flex: 1, color: '#1E293B', fontSize: 12, fontWeight: '600' }, placeholder: { color: '#94A3B8', fontWeight: '400' }, disabled: { opacity: 0.5 },
  modalShade: { flex: 1, backgroundColor: 'rgba(15,23,42,0.48)', justifyContent: 'center', alignItems: 'center', padding: 20 }, pickerModal: { width: '100%', maxWidth: 420, maxHeight: '75%', borderRadius: 16, backgroundColor: '#FFFFFF', padding: 14, elevation: 12 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, pickerTitle: { fontFamily: 'Inter', color: '#0F172A', fontSize: 16, fontWeight: '800' }, pickerList: { marginTop: 8 },
  pickerOption: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingHorizontal: 4 }, pickerOptionText: { fontFamily: 'Inter', color: '#334155', fontSize: 13 }, emptyText: { fontFamily: 'Inter', textAlign: 'center', padding: 24, color: '#64748B', fontSize: 12 },
  clinicCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, backgroundColor: '#FFFFFF', marginBottom: 9 }, clinicSelected: { borderColor: '#5EEAD4', backgroundColor: '#F0FDFA' }, clinicIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#F1F5F9' }, clinicIconSelected: { backgroundColor: '#CCFBF1' },
  grow: { flex: 1, minWidth: 0 }, nameLine: { flexDirection: 'row', alignItems: 'center', gap: 5 }, clinicName: { fontFamily: 'Inter', flexShrink: 1, color: '#0F172A', fontSize: 13, fontWeight: '800' }, locationLine: { fontFamily: 'Inter', color: '#64748B', fontSize: 10, marginTop: 4 }, countText: { fontFamily: 'Inter', color: '#1D7C72', fontSize: 10, fontWeight: '700', marginTop: 4 },
  image: { width: '100%', height: '100%', borderRadius: 12 },
  doctorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 15, backgroundColor: '#FFFFFF', marginBottom: 9 }, doctorSelected: { borderColor: '#67E8F9', backgroundColor: '#ECFEFF' }, doctorIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#ECFEFF' }, doctorIconSelected: { backgroundColor: '#CFFAFE' },
  doctorName: { fontFamily: 'Inter', flexShrink: 1, color: '#0F172A', fontSize: 14, fontWeight: '800' }, doctorSpecialty: { fontFamily: 'Inter', color: '#475569', fontSize: 11, marginTop: 3 }, doctorClinic: { fontFamily: 'Inter', color: '#64748B', fontSize: 10, marginTop: 2 }, feeLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 8, paddingTop: 7 }, feeLabel: { fontFamily: 'Inter', color: '#64748B', fontSize: 10 }, feeValue: { fontFamily: 'Inter', color: '#1D7C72', fontSize: 12, fontWeight: '800' },
});
