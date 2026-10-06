import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  IndianRupee,
  Monitor,
  Search,
  Stethoscope,
  X,
} from 'lucide-react-native';
import {
  bookAppointmentApi,
  getAvailableSlotsApi,
} from '../../../api/appointmentApi';
import { getDoctorsApi } from '../../../api/staffApi';
import { CustomCalendarPicker } from '../../../components/common/CustomCalendarPicker';
import {
  Appointment,
  PatientModel,
  StaffMember,
} from '../../../types/clinicTypes';
import { showSuccessToast } from '../../../utils/toast';

interface Props {
  visible: boolean;
  patient: PatientModel | null;
  clinicId?: number | string | null;
  token: string | null;
  onClose: () => void;
  onBooked: () => void;
}

type ConsultationMode = 'in_person' | 'video';
type DoctorOption = StaffMember & {
  doctor_type?: string;
  is_doctor?: number | boolean;
  is_video_enabled?: number | boolean;
  available_days?: string;
  video_rate_per_minute?: number | string;
};
type SelectOption = { id: string; label: string; description?: string };
const getRows = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const data = value as Record<string, any>;
    if (Array.isArray(data.data)) return data.data as T[];
    if (Array.isArray(data.doctors)) return data.doctors as T[];
  }
  return [];
};

const toDateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getDateTokens = (value?: string) =>
  String(value || '').split(/[\s,/-]+/).map(token => token.trim().toLowerCase()).filter(Boolean);

const isAllowedWeekday = (date: Date, availability?: string) => {
  const tokens = getDateTokens(availability);
  if (!tokens.length) return true;
  const shortName = date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
  const fullName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  return tokens.some(token => token === shortName || token === fullName || shortName.startsWith(token) || token.startsWith(shortName));
};

const formatTime = (value: string) => {
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const hour = Number(match[1]);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${String(hour % 12 || 12).padStart(2, '0')}:${match[2]} ${suffix}`;
};

function isDoctorUser(doctor?: DoctorOption) {
  return String(doctor?.role_name || '').trim().toLowerCase() === 'doctor' || Number(doctor?.is_doctor ?? 0) === 1;
}

function isVideoAvailable(doctor?: DoctorOption) {
  return isDoctorUser(doctor) && Number(doctor?.is_video_enabled ?? 0) === 1;
}

export function PatientAppointmentModal({
  visible,
  patient,
  clinicId,
  token,
  onClose,
  onBooked,
}: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [consultationMode, setConsultationMode] = useState<ConsultationMode>('in_person');
  const [appointmentDate, setAppointmentDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [slotsError, setSlotsError] = useState('');
  const [slotRetry, setSlotRetry] = useState(0);
  const [picker, setPicker] = useState<'doctor' | 'mode' | 'time' | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const targetClinicId = clinicId ?? patient?.clinic_id;
  const selectedDoctor = doctors.find(doctor => String(doctor.id) === doctorId);
  const isIndependentVideoDoctor =
    String(selectedDoctor?.doctor_type || '').toLowerCase() === 'independent_doctor' &&
    isVideoAvailable(selectedDoctor);
  const consultationModes: SelectOption[] = isIndependentVideoDoctor
    ? [{ id: 'video', label: 'Video Consultation' }]
    : [
        { id: 'in_person', label: 'In Person' },
        ...(isVideoAvailable(selectedDoctor) ? [{ id: 'video', label: 'Video Consultation' }] : []),
      ];

  useEffect(() => {
    if (!visible) return;
    setDoctorId('');
    setConsultationMode('in_person');
    setAppointmentDate(undefined);
    setAvailableSlots([]);
    setSelectedTime('');
    setSymptoms('');
    setNotes('');
    setError('');
    setSlotsError('');
    setPicker(null);
    setFocusedField(null);
  }, [patient?.id, visible]);

  useEffect(() => {
    if (!visible || !token) return;
    let cancelled = false;
    setLoadingDoctors(true);
    getDoctorsApi(token, targetClinicId)
      .then(response => {
        if (!response.success) throw new Error(response.message || 'Unable to load doctors.');
        const rows = getRows<DoctorOption>(response.data).filter(doctor => Number(doctor.is_active ?? 1) === 1);
        if (!cancelled) setDoctors(rows);
      })
      .catch((loadError: any) => {
        if (!cancelled) setError(loadError?.message || 'Unable to load doctors for this clinic.');
      })
      .finally(() => { if (!cancelled) setLoadingDoctors(false); });
    return () => { cancelled = true; };
  }, [targetClinicId, token, visible]);

  useEffect(() => {
    if (!selectedDoctor) return;
    if (isIndependentVideoDoctor) setConsultationMode('video');
    else if (!isVideoAvailable(selectedDoctor)) setConsultationMode('in_person');
  }, [isIndependentVideoDoctor, selectedDoctor]);

  useEffect(() => {
    if (!visible || !token || !doctorId || !appointmentDate) {
      setAvailableSlots([]);
      setSelectedTime('');
      setSlotsError('');
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    setSelectedTime('');
    setSlotsError('');
    getAvailableSlotsApi(token, Number(doctorId), toDateString(appointmentDate), targetClinicId)
      .then(response => {
        if (!response.success) throw new Error(response.message || 'Failed to load available time slots.');
        const raw = response.data && typeof response.data === 'object' && 'slots' in response.data
          ? (response.data as { slots?: unknown }).slots
          : response.data;
        const slots = Array.isArray(raw)
          ? raw.filter(slot => {
              if (typeof slot === 'string') return Boolean(slot);
              if (!slot || typeof slot !== 'object') return false;
              const item = slot as { time?: unknown; available?: unknown; is_available?: unknown };
              return Boolean(item.time) && item.available !== false && item.is_available !== false;
            }).map(slot => typeof slot === 'string' ? slot.slice(0, 5) : String((slot as { time: string }).time).slice(0, 5))
          : [];
        if (!cancelled) setAvailableSlots(slots);
      })
      .catch((loadError: any) => {
        if (!cancelled) {
          setAvailableSlots([]);
          setSlotsError(loadError?.message || 'Failed to load available time slots.');
        }
      })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [appointmentDate, doctorId, slotRetry, targetClinicId, token, visible]);

  const options: SelectOption[] = useMemo(() => {
    if (picker === 'doctor') return doctors.map(doctor => ({
      id: String(doctor.id),
      label: doctor.full_name,
      description: doctor.specialization || doctor.department || 'General consultation',
    }));
    if (picker === 'mode') return consultationModes;
    if (picker === 'time') return availableSlots.map(slot => ({ id: slot, label: formatTime(slot) }));
    return [];
  }, [availableSlots, consultationModes, doctors, picker]);
  const filteredOptions = options.filter(option =>
    `${option.label} ${option.description || ''}`.toLowerCase().includes(pickerQuery.trim().toLowerCase()),
  );

  const openPicker = (kind: 'doctor' | 'mode' | 'time') => {
    setPickerQuery('');
    setPicker(kind);
  };

  const chooseOption = (option: SelectOption) => {
    if (picker === 'doctor') {
      setDoctorId(option.id);
      setSelectedTime('');
      setAppointmentDate(undefined);
    } else if (picker === 'mode') {
      setConsultationMode(option.id as ConsultationMode);
    } else if (picker === 'time') {
      setSelectedTime(option.id);
      setError('');
    }
    setPicker(null);
  };

  const submit = async () => {
    if (!patient || !token || !doctorId || !appointmentDate || !selectedTime) {
      setError('Select a doctor, appointment date and available time slot.');
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today || !isAllowedWeekday(appointmentDate, selectedDoctor?.available_days)) {
      setError('Choose a valid appointment date based on the doctor’s schedule.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload: Partial<Appointment> = {
        clinic_id: Number(targetClinicId || 1),
        patient_id: Number(patient.id),
        doctor_id: Number(doctorId),
        appointment_date: toDateString(appointmentDate),
        appointment_time: selectedTime,
        time_slot: selectedTime,
        consultation_mode: consultationMode,
        duration_minutes: 30,
        type: 'consultation',
        reason: symptoms.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      const response = await bookAppointmentApi(token, payload);
      if (!response.success) throw new Error(response.message || 'Appointment could not be booked.');
      showSuccessToast('Appointment booked', `Appointment created for ${patient.full_name}.`);
      onBooked();
    } catch (submitError: any) {
      setError(submitError?.message || 'Appointment could not be booked.');
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedPickerId = picker === 'doctor' ? doctorId : picker === 'mode' ? consultationMode : selectedTime;

  const selectField = (
    kind: 'doctor' | 'mode' | 'time',
    label: string,
    icon: React.ReactNode,
    value: string,
    placeholder: string,
    disabled = false,
    required = true,
  ) => {
    const isOpen = picker === kind;
    return (
      <View style={styles.field}>
        <Text style={styles.labelRow}>{icon}<Text style={styles.label}>{label}{required ? <Text style={styles.required}> *</Text> : null}</Text></Text>
        <TouchableOpacity
          style={[styles.selectInput, (focusedField === label || isOpen) && styles.focusedInput, disabled && styles.disabledInput]}
          onPress={() => {
            setFocusedField(label);
            if (isOpen) setPicker(null);
            else openPicker(kind);
          }}
          disabled={disabled}
          activeOpacity={0.75}
        >
          <Text style={[styles.selectText, !value && styles.placeholder]} numberOfLines={1}>{value || placeholder}</Text>
          <ChevronDown size={17} color="#94A3B8" />
        </TouchableOpacity>
        {isOpen ? (
          <View style={styles.inlinePicker}>
            {kind !== 'mode' ? (
              <View style={styles.inlineSearch}>
                <Search size={14} color="#718096" />
                <TextInput
                  value={pickerQuery}
                  onChangeText={setPickerQuery}
                  placeholder={`Search ${kind === 'doctor' ? 'doctor' : 'time slot'}...`}
                  placeholderTextColor="#94A3B8"
                  style={styles.inlineSearchInput}
                />
              </View>
            ) : null}
            {kind === 'doctor' && loadingDoctors ? <ActivityIndicator color="#0D9488" style={styles.loading} /> : (
              <ScrollView
                style={[styles.inlineOptions, { height: Math.min(168, Math.max(42, filteredOptions.length * 42)) }]}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={filteredOptions.length > 4}
              >
                {filteredOptions.length ? filteredOptions.map(item => {
                  const selected = selectedPickerId === item.id;
                  return (
                    <TouchableOpacity key={item.id} style={[styles.pickerOption, selected && styles.pickerOptionSelected]} onPress={() => chooseOption(item)}>
                      {selected ? <Check size={15} color="#0D9488" /> : <View style={styles.checkSpacer} />}
                      <View style={styles.optionCopy}>
                        <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{item.label}</Text>
                        {item.description ? <Text style={styles.optionDescription}>{item.description}</Text> : null}
                      </View>
                    </TouchableOpacity>
                  );
                }) : <Text style={styles.emptyText}>{kind === 'doctor' ? 'No doctors are available for this clinic.' : kind === 'time' && loadingSlots ? 'Loading time slots...' : 'No matching options.'}</Text>}
              </ScrollView>
            )}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modal, { width: Math.min(420, screenWidth - 28), maxHeight: screenHeight * 0.9 }]}>
          <View style={styles.header}>
            <View style={styles.iconBox}><CalendarDays size={19} color="#0D9488" /></View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Book Appointment</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {patient?.full_name || 'Patient'} ({patient?.patient_code || `PT-${patient?.id ?? ''}`}) • {patient?.phone || '—'} | {patient?.blood_group || '—'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.close}><X size={19} color="#64748B" /></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {selectField('doctor', 'Select Doctor', <Stethoscope size={15} color="#334155" />, selectedDoctor ? `${selectedDoctor.full_name}${selectedDoctor.specialization ? ` - ${selectedDoctor.specialization}` : ''}` : '', loadingDoctors ? 'Loading doctors...' : 'Choose a doctor', loadingDoctors)}
            {selectedDoctor ? (
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorDetails}>Specialization: {selectedDoctor.specialization || selectedDoctor.department || 'General consultation'}</Text>
                {Number(selectedDoctor.consultation_fee || 0) > 0 ? (
                  <View style={styles.feeCard}>
                    <View style={styles.feeHeading}><IndianRupee size={15} color="#0D9488" /><Text style={styles.feeTitle}>Consultation Fee</Text></View>
                    <Text style={styles.feeAmount}>₹{Number(selectedDoctor.consultation_fee).toFixed(2)}</Text>
                    <Text style={styles.feeHint}>The consultation fee applies to both video and in-person appointments.</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {selectField('mode', 'Consultation Mode', <Monitor size={15} color="#334155" />, consultationModes.find(mode => mode.id === consultationMode)?.label || '', 'Select mode')}

            <View style={styles.field}>
              <Text style={styles.labelRow}><CalendarDays size={15} color="#334155" /><Text style={styles.label}>Appointment Date<Text style={styles.required}> *</Text></Text></Text>
              <CustomCalendarPicker
                selectedDate={appointmentDate}
                placeholder="Pick a date"
                fromYear={today.getFullYear()}
                toYear={today.getFullYear() + 10}
                minimumDate={today}
                isDateDisabled={date => !isAllowedWeekday(date, selectedDoctor?.available_days)}
                triggerStyle={[styles.selectInput, styles.calendarTrigger, focusedField === 'Appointment Date' && styles.focusedInput]}
                triggerTextStyle={[styles.selectText, !appointmentDate && styles.placeholder]}
                iconColor="#718096"
                onOpen={() => setFocusedField('Appointment Date')}
                onDateChange={date => { setAppointmentDate(date); setSelectedTime(''); setError(''); }}
              />
            </View>

            {selectField('time', 'Appointment Time', <Clock3 size={15} color="#334155" />, availableSlots.find(slot => slot === selectedTime) ? formatTime(selectedTime) : '', loadingSlots ? 'Loading time slots...' : 'Select time slot', !doctorId || !appointmentDate || loadingSlots)}
            {slotsError ? <TouchableOpacity onPress={() => setSlotRetry(value => value + 1)}><Text style={styles.retryText}>{slotsError}  Retry</Text></TouchableOpacity> : null}
            {!slotsError && doctorId && appointmentDate && !loadingSlots && !availableSlots.length ? <Text style={styles.helpText}>No time slots available for this date.</Text> : null}

            <View style={styles.field}>
              <Text style={styles.label}>Symptoms</Text>
              <TextInput value={symptoms} onChangeText={setSymptoms} onFocus={() => setFocusedField('Symptoms')} placeholder="Enter symptoms" placeholderTextColor="#718096" multiline textAlignVertical="top" style={[styles.textArea, focusedField === 'Symptoms' && styles.focusedInput]} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Notes</Text>
              <TextInput value={notes} onChangeText={setNotes} onFocus={() => setFocusedField('Notes')} placeholder="Enter notes" placeholderTextColor="#718096" multiline textAlignVertical="top" style={[styles.textArea, focusedField === 'Notes' && styles.focusedInput]} />
            </View>

            {consultationMode === 'video' ? <Text style={styles.videoBillingNote}>Video billing will start when the call starts.</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={[styles.confirm, submitting && styles.disabled]} disabled={submitting} onPress={submit}>
              {submitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.confirmText}>Book Appointment</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancel} disabled={submitting} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </View>

    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.62)', alignItems: 'center', justifyContent: 'center', padding: 14 },
  modal: { maxWidth: 420, borderRadius: 15, overflow: 'hidden', backgroundColor: '#F8FAFC', borderTopWidth: 4, borderTopColor: '#14B8A6', elevation: 12 },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  iconBox: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#DDF5F2', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: '#1F2937', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  subtitle: { color: '#64748B', fontSize: 9, marginTop: 2, textAlign: 'center' },
  close: { padding: 6 },
  content: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14, gap: 10 },
  field: { gap: 5 },
  labelRow: { minHeight: 18, flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { color: '#1F2937', fontSize: 11, fontWeight: '600' },
  required: { color: '#EF4444', fontWeight: '700' },
  selectInput: { minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC' },
  selectText: { flex: 1, color: '#334155', fontSize: 11 },
  placeholder: { color: '#718096' },
  focusedInput: { borderColor: '#27B8AB', borderWidth: 2 },
  disabledInput: { opacity: 0.55 },
  calendarTrigger: { paddingVertical: 0 },
  inlinePicker: { overflow: 'hidden', padding: 5, borderWidth: 1, borderColor: '#D9E2EA', borderRadius: 10, backgroundColor: '#FFFFFF', elevation: 3 },
  inlineSearch: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, paddingHorizontal: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#F8FAFC' },
  inlineSearchInput: { flex: 1, paddingVertical: 5, color: '#334155', fontSize: 11 },
  inlineOptions: { maxHeight: 168, flexGrow: 0 },
  doctorInfo: { gap: 6 },
  doctorDetails: { marginTop: -4, color: '#64748B', fontSize: 10 },
  feeCard: { padding: 10, borderWidth: 1, borderColor: '#BFEAE5', borderRadius: 10, backgroundColor: '#EAF7F5', gap: 3 },
  feeHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  feeTitle: { color: '#1F2937', fontSize: 11, fontWeight: '600' },
  feeAmount: { color: '#1F2937', fontSize: 14, fontWeight: '800' },
  feeHint: { color: '#718096', fontSize: 9, lineHeight: 13 },
  textArea: { minHeight: 64, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC', color: '#334155', fontSize: 11 },
  helpText: { color: '#64748B', fontSize: 10, lineHeight: 15 },
  retryText: { color: '#B45309', fontSize: 10, textDecorationLine: 'underline' },
  videoBillingNote: { color: '#047857', backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, borderRadius: 9, padding: 10, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  error: { color: '#DC2626', fontSize: 11, fontWeight: '600' },
  footer: { gap: 7, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  confirm: { minHeight: 39, alignItems: 'center', justifyContent: 'center', backgroundColor: '#26A69A', borderRadius: 10 },
  confirmText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  cancel: { minHeight: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC' },
  cancelText: { color: '#1F2937', fontSize: 11, fontWeight: '600' },
  disabled: { opacity: 0.65 },
  loading: { paddingVertical: 18 },
  emptyText: { paddingHorizontal: 10, paddingVertical: 18, color: '#64748B', fontSize: 11, textAlign: 'center' },
  pickerOption: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 8, borderRadius: 8 },
  pickerOptionSelected: { backgroundColor: '#DDF5F2' },
  checkSpacer: { width: 16 },
  optionCopy: { flex: 1 },
  optionLabel: { color: '#334155', fontSize: 11, fontWeight: '600' },
  optionLabelSelected: { color: '#0D9488' },
  optionDescription: { marginTop: 2, color: '#64748B', fontSize: 9 },
});
