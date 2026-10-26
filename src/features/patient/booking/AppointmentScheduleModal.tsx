import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { CalendarDays, Check, ChevronDown, Clock3, IndianRupee, Monitor, Search, ShieldCheck, Stethoscope, Wallet, X } from 'lucide-react-native';
import { AppModal } from '../../../components/common/AppModal';
import { CustomCalendarPicker } from '../../../components/common/CustomCalendarPicker';
import type { BookingDoctor } from './BookingComponents';

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
const timeLabel = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;
  const date = new Date(); date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};
const isDoctorAvailable = (date: Date, availableDays: string) => {
  const days = availableDays.split(/[\s,/-]+/).map(item => item.trim().toLowerCase()).filter(Boolean);
  if (!days.length) return true;
  const short = date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
  const full = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  return days.some(day => day === short || day === full || short.startsWith(day) || day.startsWith(short));
};

interface Props {
  visible: boolean; doctor: BookingDoctor | null; clinicName: string; patientName?: string; patientCode?: string; patientPhone?: string; bloodGroup?: string;
  date: Date; time: string; mode: 'in_person' | 'video'; slots: string[]; slotsLoading: boolean; slotsError: string;
  retrying?: boolean; symptoms: string; notes: string; walletBalance: number; walletRequiredAmount?: number; walletPricingError?: string; walletBalanceLoading?: boolean; walletRecharging?: boolean;
  submitting: boolean; onClose: () => void; onDateChange: (date: Date) => void;
  onTimeChange: (time: string) => void; onModeChange: (mode: 'in_person' | 'video') => void;
  onSymptomsChange: (value: string) => void; onNotesChange: (value: string) => void;
  onRetrySlots: () => void; onRetryWallet: () => void; onRecharge: () => void; onConfirm: () => void;
}

export function AppointmentScheduleModal(props: Props) {
  const doctor = props.doctor;
  const { width, height } = useWindowDimensions();
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timeSearch, setTimeSearch] = useState('');
  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<'symptoms' | 'notes' | null>(null);
  const modes: { value: 'in_person' | 'video'; label: string }[] = [];
  if (doctor && !(doctor.doctorType.toLowerCase() === 'independent_doctor' && doctor.videoEnabled)) modes.push({ value: 'in_person', label: 'In Person' });
  if (doctor?.videoEnabled) modes.push({ value: 'video', label: 'Video Consultation' });
  const fee = Number(doctor?.fee || 0);
  const requiredAmount = Number(props.walletRequiredAmount ?? fee);
  const insufficient = props.mode === 'video' && requiredAmount > 0 && !props.walletBalanceLoading && props.walletBalance < requiredAmount;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const filteredSlots = useMemo(() => props.slots.filter(slot => timeLabel(slot).toLowerCase().includes(timeSearch.trim().toLowerCase())), [props.slots, timeSearch]);
  if (!doctor) return null;

  return <AppModal visible={props.visible} transparent animationType="fade" statusBarTranslucent onRequestClose={props.onClose}>
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={props.onClose} />
      <View style={[styles.modal, { width: Math.min(390, width - 30), maxHeight: height * 0.94 }]}>
        <View style={styles.header}>
          <View style={styles.iconBox}><Stethoscope size={19} color="#FFFFFF" /></View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Schedule appointment</Text>
            <Text style={styles.subtitle} numberOfLines={1}>Dr {doctor.name} · {doctor.specialty || 'General Physician'}</Text>
          </View>
          <TouchableOpacity onPress={props.onClose} style={styles.close}><X size={19} color="#D9F7F2" /></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.field}>
            <Text style={styles.labelRow}><Monitor size={15} color="#334155" /><Text style={styles.label}>Consultation Mode<Text style={styles.required}> *</Text></Text></Text>
            <TouchableOpacity style={styles.selectInput} disabled={modes.length < 2} onPress={() => { setModePickerOpen(open => !open); setTimePickerOpen(false); }}>
              <Text style={styles.selectText}>{modes.find(item => item.value === props.mode)?.label || 'In Person'}</Text>{modes.length > 1 ? <ChevronDown size={17} color="#94A3B8" /> : null}
            </TouchableOpacity>
            {modePickerOpen ? <View style={styles.inlinePicker}>{modes.map(({ value, label }) => <TouchableOpacity key={value} style={[styles.pickerOption, props.mode === value && styles.pickerOptionSelected]} onPress={() => { props.onModeChange(value); setModePickerOpen(false); }}>
              {props.mode === value ? <Check size={15} color="#27A599" /> : <View style={styles.checkSpacer} />}<Text style={[styles.optionLabel, props.mode === value && styles.optionLabelSelected]}>{label}</Text>
            </TouchableOpacity>)}</View> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.labelRow}><CalendarDays size={15} color="#334155" /><Text style={styles.label}>Appointment Date<Text style={styles.required}> *</Text></Text></Text>
            <CustomCalendarPicker selectedDate={props.date} placeholder="Pick a date" fromYear={today.getFullYear()} toYear={today.getFullYear() + 10} minimumDate={today} isDateDisabled={date => Boolean(doctor.availableDays) && !isDoctorAvailable(date, doctor.availableDays)} triggerStyle={styles.selectInput} triggerTextStyle={styles.selectText} iconColor="#718096" onDateChange={date => { props.onDateChange(date); setTimePickerOpen(false); }} />
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}><Clock3 size={15} color="#334155" /><Text style={styles.label}>Appointment Time<Text style={styles.required}> *</Text></Text>{props.slotsLoading ? <ActivityIndicator size="small" color="#27A599" /> : null}</View>
            <TouchableOpacity style={[styles.selectInput, (!props.slots.length || props.slotsLoading) && styles.disabledInput]} disabled={!props.slots.length || props.slotsLoading} onPress={() => { setTimeSearch(''); setTimePickerOpen(value => !value); setModePickerOpen(false); }}>
              <Clock3 size={15} color="#94A3B8" /><Text style={[styles.selectText, !props.time && styles.placeholder]}>{props.time ? timeLabel(props.time) : props.slotsLoading ? 'Loading time slots...' : 'Select time slot'}</Text><ChevronDown size={17} color="#94A3B8" />
            </TouchableOpacity>
            {timePickerOpen ? <View style={styles.inlinePicker}>
              <View style={styles.inlineSearch}><Search size={14} color="#718096" /><TextInput value={timeSearch} onChangeText={setTimeSearch} placeholder="Search time slot..." placeholderTextColor="#94A3B8" style={styles.inlineSearchInput} /></View>
              <ScrollView style={styles.inlineOptions} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={filteredSlots.length > 4}>
                {filteredSlots.length ? filteredSlots.map(slot => <TouchableOpacity key={slot} style={[styles.pickerOption, props.time === slot && styles.pickerOptionSelected]} onPress={() => { props.onTimeChange(slot); setTimePickerOpen(false); }}>
                  {props.time === slot ? <Check size={15} color="#27A599" /> : <View style={styles.checkSpacer} />}<Text style={[styles.optionLabel, props.time === slot && styles.optionLabelSelected]}>{timeLabel(slot)}</Text>
                </TouchableOpacity>) : <Text style={styles.emptyText}>No matching time slots.</Text>}
              </ScrollView>
            </View> : null}
            {props.slotsError ? <View style={styles.slotError}><Text style={styles.slotErrorText}>{props.slotsError}</Text><TouchableOpacity onPress={props.onRetrySlots} disabled={props.retrying}><Text style={styles.retry}>{props.retrying ? 'Retrying…' : 'Retry'}</Text></TouchableOpacity></View> : null}
            {!props.slotsError && !props.slotsLoading && !props.slots.length ? <Text style={styles.helpText}>No time slots available for this date.</Text> : null}
          </View>

          <View style={styles.field}><Text style={styles.label}>Symptoms</Text><TextInput value={props.symptoms} onChangeText={props.onSymptomsChange} onFocus={() => setFocusedField('symptoms')} onBlur={() => setFocusedField(current => current === 'symptoms' ? null : current)} placeholder="Enter symptoms" placeholderTextColor="#718096" multiline textAlignVertical="top" style={[styles.textArea, focusedField === 'symptoms' && styles.focusedInput]} /></View>
          <View style={styles.field}><Text style={styles.label}>Notes</Text><TextInput value={props.notes} onChangeText={props.onNotesChange} onFocus={() => setFocusedField('notes')} onBlur={() => setFocusedField(current => current === 'notes' ? null : current)} placeholder="Enter notes" placeholderTextColor="#718096" multiline textAlignVertical="top" style={[styles.textArea, focusedField === 'notes' && styles.focusedInput]} /></View>

          {props.mode === 'video' ? <View style={styles.walletCard}>
            <View style={styles.walletHead}>
              <View style={styles.walletBalanceCopy}><View style={styles.walletLabelRow}><Wallet size={15} color="#0D766E" /><Text style={styles.walletTitle}>WALLET BALANCE</Text></View><Text style={styles.walletValue}>{props.walletBalanceLoading ? 'लोड हो रहा है…' : money(props.walletBalance)}</Text></View>
              <TouchableOpacity style={[styles.rechargeButton, props.walletRecharging && styles.disabled]} disabled={props.walletRecharging} onPress={props.onRecharge}>{props.walletRecharging ? <ActivityIndicator size="small" color="#27A599" /> : <IndianRupee size={14} color="#1E293B" />}<Text style={styles.rechargeText}>{props.walletRecharging ? 'Opening…' : 'Recharge'}</Text></TouchableOpacity>
            </View>
            <View style={styles.walletDivider} />
            <Text style={styles.walletFee}>Consultation fee: {money(requiredAmount)}</Text>
            <Text style={styles.walletHelper}>Booking par charge nahi hoga. Call start hote hi consultation fee deduct hogi.</Text>
            {insufficient ? <Text style={styles.insufficientText}>Balance insufficient. Please recharge to continue.</Text> : null}
            {props.walletPricingError ? <View style={styles.walletError}><Text style={styles.insufficientText}>{props.walletPricingError}</Text><TouchableOpacity onPress={props.onRetryWallet}><Text style={styles.retry}>Retry</Text></TouchableOpacity></View> : null}
          </View> : null}
        </ScrollView>
        <View style={styles.footer}>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancel} disabled={props.submitting} onPress={props.onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.confirm, (!props.time || props.submitting || props.walletRecharging || Boolean(props.walletPricingError) || (props.mode === 'video' && props.walletBalanceLoading)) && styles.disabled]} disabled={!props.time || props.submitting || props.walletRecharging || Boolean(props.walletPricingError) || (props.mode === 'video' && Boolean(props.walletBalanceLoading))} onPress={props.onConfirm}>
              {props.submitting || props.walletRecharging ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.confirmText}>{props.mode === 'video' && props.walletBalanceLoading ? 'Checking wallet…' : 'Confirm Appointment'}</Text>}
            </TouchableOpacity>
          </View>
          <View style={styles.secure}><ShieldCheck size={13} color="#059669" /><Text style={styles.secureText}>Your booking details are secure</Text></View>
        </View>
      </View>
    </View>
  </AppModal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'center', padding: 14 },
  modal: { maxWidth: 420, borderRadius: 13, overflow: 'hidden', backgroundColor: '#FFFFFF', elevation: 18 },
  header: { minHeight: 87, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 17, paddingVertical: 12, backgroundColor: '#1D7C72' },
  iconBox: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }, headerCopy: { flex: 1, minWidth: 0 }, title: { fontFamily: 'Inter', color: '#FFFFFF', fontSize: 20, fontWeight: '800' }, subtitle: { fontFamily: 'Inter', color: '#CCFBF1', fontSize: 14, marginTop: 4 }, close: { alignSelf: 'flex-start', padding: 4 },
  content: { paddingHorizontal: 15, paddingTop: 18, paddingBottom: 18, gap: 15 }, field: { gap: 6 }, labelRow: { minHeight: 18, flexDirection: 'row', alignItems: 'center', gap: 5 }, label: { fontFamily: 'Inter', color: '#1F2937', fontSize: 14, fontWeight: '600' }, required: { color: '#EF4444', fontWeight: '700' },
  selectInput: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 11, backgroundColor: '#F8FAFC' }, selectText: { fontFamily: 'Inter', flex: 1, color: '#334155', fontSize: 12 }, placeholder: { color: '#718096' }, disabledInput: { opacity: 0.55 },
  inlinePicker: { overflow: 'hidden', padding: 4, borderWidth: 1, borderColor: '#D9E2EA', borderRadius: 10, backgroundColor: '#FFFFFF', elevation: 3 }, inlineSearch: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, paddingHorizontal: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#F8FAFC' }, inlineSearchInput: { fontFamily: 'Inter', flex: 1, paddingVertical: 5, color: '#334155', fontSize: 11 }, inlineOptions: { maxHeight: 168, flexGrow: 0 }, pickerOption: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }, pickerOptionSelected: { backgroundColor: '#F0FDFA' }, checkSpacer: { width: 15 }, optionLabel: { fontFamily: 'Inter', color: '#334155', fontSize: 11 }, optionLabelSelected: { color: '#27A599', fontWeight: '700' }, emptyText: { fontFamily: 'Inter', padding: 10, color: '#64748B', fontSize: 11 }, slotError: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 10, borderRadius: 9, borderWidth: 1, borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }, slotErrorText: { fontFamily: 'Inter', flex: 1, color: '#92400E', fontSize: 11 }, retry: { fontFamily: 'Inter', color: '#78350F', fontWeight: '800', textDecorationLine: 'underline', fontSize: 11 }, helpText: { fontFamily: 'Inter', color: '#64748B', fontSize: 10 },
  textArea: { fontFamily: 'Inter', minHeight: 75, paddingHorizontal: 11, paddingVertical: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 11, backgroundColor: '#F8FAFC', color: '#334155', fontSize: 12, textAlignVertical: 'top' }, focusedInput: { borderColor: '#14B8A6', borderWidth: 2 }, walletCard: { padding: 12, borderWidth: 1, borderColor: '#99F6E4', borderRadius: 13, backgroundColor: '#F0FDFA', marginTop: 3 }, walletHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, walletBalanceCopy: { flex: 1, gap: 3 }, walletLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, walletTitle: { fontFamily: 'Inter', color: '#115E59', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }, walletValue: { fontFamily: 'Inter', color: '#1F2937', fontSize: 17, fontWeight: '800' }, walletDivider: { height: 1, backgroundColor: '#99F6E4', marginVertical: 9 }, walletFee: { fontFamily: 'Inter', color: '#1F2937', fontSize: 11, fontWeight: '600' }, walletHelper: { fontFamily: 'Inter', color: '#64748B', fontSize: 10, lineHeight: 15, marginTop: 3 }, insufficientText: { fontFamily: 'Inter', color: '#DC2626', fontSize: 10, fontWeight: '600', marginTop: 6 }, walletError: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, rechargeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#99F6E4', borderRadius: 11, backgroundColor: '#FFFFFF' }, rechargeText: { fontFamily: 'Inter', color: '#1E293B', fontSize: 11, fontWeight: '600' },
  footer: { gap: 10, paddingHorizontal: 15, paddingTop: 13, paddingBottom: 14, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F1F5F9' }, actions: { flexDirection: 'row', gap: 8 }, confirm: { flex: 1.45, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 11, backgroundColor: '#27A599' }, confirmText: { fontFamily: 'Inter', color: '#FFFFFF', fontSize: 12, fontWeight: '700' }, cancel: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 11, backgroundColor: '#F8FAFC' }, cancelText: { fontFamily: 'Inter', color: '#334155', fontSize: 12, fontWeight: '600' }, secure: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }, secureText: { fontFamily: 'Inter', color: '#64748B', fontSize: 10 }, disabled: { opacity: 0.45 },
});
