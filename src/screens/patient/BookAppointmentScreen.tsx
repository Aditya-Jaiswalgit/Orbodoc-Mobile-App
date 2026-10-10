import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CalendarClock, CheckCircle2, ChevronRight, Search, Video } from 'lucide-react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import { useAuthContext } from '../../context/AuthContext';
import { bookMarketplaceVideoAppointmentApi, getMarketplaceVideoDoctorsApi, getMarketplaceVideoSlotsApi, getVideoPricingPreviewApi, MarketplaceVideoDoctor } from '../../api/videoServicesApi';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

interface Props { onOpenDrawer?: () => void; onViewVideoServices?: () => void }
const localDate = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
const asRows = <T,>(value: unknown): T[] => Array.isArray(value) ? value as T[] : Array.isArray((value as any)?.data) ? (value as any).data as T[] : [];
const money = (value: unknown) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const BookAppointmentScreen: React.FC<Props> = ({ onOpenDrawer = () => {}, onViewVideoServices }) => {
  const { token, user } = useAuthContext();
  const [doctors, setDoctors] = useState<MarketplaceVideoDoctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<MarketplaceVideoDoctor | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(localDate());
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [consultationFee, setConsultationFee] = useState<number | null>(null);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState<{ id?: number; doctor: string; date: string; time: string } | null>(null);

  useEffect(() => {
    let active = true;
    getMarketplaceVideoDoctorsApi().then(result => {
      if (!active) return;
      if (!result.success) throw new Error(result.message || 'Unable to load doctors.');
      setDoctors(asRows<MarketplaceVideoDoctor>(result.data).filter(doctor => doctor.is_video_enabled !== false && Number(doctor.is_video_enabled ?? 1) !== 0));
    }).catch(error => { if (active) showErrorToast('Doctor list unavailable', error instanceof Error ? error.message : 'Please try again.'); })
      .finally(() => { if (active) setLoadingDoctors(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedDoctor || !appointmentDate) { setSlots([]); return; }
    let active = true;
    setLoadingSlots(true);
    getMarketplaceVideoSlotsApi(selectedDoctor.id, appointmentDate).then(result => {
      if (!active) return;
      if (!result.success) throw new Error(result.message || 'Unable to load appointment slots.');
      const raw = result.data?.slots || [];
      const available = raw.filter(slot => typeof slot === 'string' || (slot.available !== false && slot.is_available !== false)).map(slot => typeof slot === 'string' ? slot : String(slot.time || '')).filter(Boolean);
      setSlots(available);
      setSelectedTime(current => available.includes(current) ? current : '');
    }).catch(error => { if (active) { setSlots([]); showErrorToast('Slots unavailable', error instanceof Error ? error.message : 'Please choose another date.'); } })
      .finally(() => { if (active) setLoadingSlots(false); });
    return () => { active = false; };
  }, [selectedDoctor, appointmentDate]);

  useEffect(() => {
    if (!token || !user?.id || !selectedDoctor) { setWalletBalance(null); setConsultationFee(Number(selectedDoctor?.consultation_fee || 0)); return; }
    let active = true;
    getVideoPricingPreviewApi(token, selectedDoctor.id, Number(user.id), selectedDoctor.clinic_id).then(result => {
      if (!active || !result.success) return;
      setWalletBalance(Number(result.data?.pricing?.wallet_balance || 0));
      setConsultationFee(Number(result.data?.pricing?.consultation_fee ?? selectedDoctor.consultation_fee ?? 0));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [selectedDoctor, token, user?.id]);

  const filteredDoctors = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return doctors;
    return doctors.filter(doctor => [doctor.full_name, doctor.name, doctor.specialization, doctor.department, doctor.clinic_name].some(value => String(value || '').toLowerCase().includes(needle)));
  }, [doctors, search]);

  const submit = async () => {
    const fullName = String(user?.full_name || user?.fullName || '').trim();
    const phone = String(user?.phone || '').replace(/\D/g, '').slice(-10);
    if (!token || !selectedDoctor) { showErrorToast('Doctor required', 'Choose a video consultation doctor.'); return; }
    if (!fullName || phone.length !== 10) { showErrorToast('Profile details required', 'Add your name and valid 10-digit phone number to your profile before booking.'); return; }
    if (!appointmentDate || appointmentDate < localDate()) { showErrorToast('Invalid date', 'Choose today or a future date.'); return; }
    if (!selectedTime) { showErrorToast('Time required', 'Choose an available appointment time.'); return; }
    setBooking(true);
    const result = await bookMarketplaceVideoAppointmentApi({
      doctor_id: selectedDoctor.id,
      full_name: fullName,
      phone,
      appointment_date: appointmentDate,
      appointment_time: selectedTime,
      consultation_mode: 'video',
      reason: reason.trim() || 'Video consultation',
    });
    setBooking(false);
    if (!result.success) { showErrorToast('Booking failed', result.message); return; }
    const appointment = result.data?.appointment;
    setBooked({ id: appointment?.id, doctor: selectedDoctor.full_name || selectedDoctor.name || 'Doctor', date: appointment?.appointment_date || appointmentDate, time: appointment?.appointment_time || selectedTime });
    setSelectedDoctor(null);
    setSlots([]);
    setSelectedTime('');
    setReason('');
    showSuccessToast('Video appointment booked', 'Your appointment is scheduled. The consultation fee is charged when your doctor starts the call.');
  };

  return <View style={styles.container}>
    <PatientHeader onOpenDrawer={onOpenDrawer} />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}><View style={styles.heroIcon}><Video size={23} color="#0f766e" /></View><Text style={styles.title}>Book a video consultation</Text><Text style={styles.subtitle}>Choose a video-enabled doctor and an available time.</Text></View>
      {booked && <View style={styles.successCard}><CheckCircle2 size={22} color="#047857" /><View style={styles.flex}><Text style={styles.successTitle}>Appointment confirmed</Text><Text style={styles.detail}>Dr. {booked.doctor} · {booked.date} at {booked.time}</Text>{booked.id ? <Text style={styles.detail}>Appointment #{booked.id}</Text> : null}</View><TouchableOpacity onPress={() => { setBooked(null); onViewVideoServices?.(); }}><ChevronRight size={22} color="#047857" /></TouchableOpacity></View>}
      {!selectedDoctor ? <>
        <Text style={styles.sectionTitle}>Select a doctor</Text>
        <View style={styles.search}><Search size={17} color="#94a3b8" /><TextInput value={search} onChangeText={setSearch} placeholder="Search name or specialization" placeholderTextColor="#94a3b8" style={styles.searchInput} /></View>
        {loadingDoctors ? <ActivityIndicator style={styles.loading} color="#0f766e" /> : filteredDoctors.map(doctor => <TouchableOpacity key={doctor.id} style={styles.doctorCard} onPress={() => setSelectedDoctor(doctor)}>
          <View style={styles.avatar}><Video size={18} color="#0f766e" /></View><View style={styles.flex}><Text style={styles.doctorName}>Dr. {doctor.full_name || doctor.name || 'Doctor'}</Text><Text style={styles.detail}>{doctor.specialization || doctor.department || 'General'} · {doctor.clinic_name || 'Online'}</Text><Text style={styles.fee}>{money(doctor.consultation_fee)} consultation fee</Text></View><ChevronRight size={20} color="#94a3b8" />
        </TouchableOpacity>)}
        {!loadingDoctors && !filteredDoctors.length && <View style={styles.empty}><Text style={styles.detail}>No video-enabled doctors found.</Text></View>}
      </> : <>
        <TouchableOpacity onPress={() => { setSelectedDoctor(null); setSlots([]); }} style={styles.backLink}><Text style={styles.backText}>‹  Change doctor</Text></TouchableOpacity>
        <View style={styles.selectedCard}><View style={styles.avatar}><Video size={18} color="#0f766e" /></View><View style={styles.flex}><Text style={styles.doctorName}>Dr. {selectedDoctor.full_name || selectedDoctor.name || 'Doctor'}</Text><Text style={styles.detail}>{selectedDoctor.specialization || selectedDoctor.department || 'Video consultation'}</Text></View><Text style={styles.fee}>{money(consultationFee)}</Text></View>
        {walletBalance !== null && <View style={styles.walletNotice}><Text style={styles.detail}>Wallet balance: <Text style={styles.fee}>{money(walletBalance)}</Text></Text><Text style={styles.walletHelp}>Fee is charged when the doctor starts the call.</Text></View>}
        <Text style={styles.label}>Appointment date (YYYY-MM-DD)</Text><TextInput value={appointmentDate} onChangeText={value => { setAppointmentDate(value); setSelectedTime(''); }} placeholder="2026-12-31" style={styles.input} />
        <Text style={styles.label}>Available time</Text>
        {loadingSlots ? <ActivityIndicator color="#0f766e" style={styles.slotLoading} /> : <View style={styles.slotWrap}>{slots.map(slot => <TouchableOpacity key={slot} style={[styles.slot, selectedTime === slot && styles.selectedSlot]} onPress={() => setSelectedTime(slot)}><Text style={[styles.slotText, selectedTime === slot && styles.selectedSlotText]}>{slot.slice(0, 5)}</Text></TouchableOpacity>)}</View>}
        {!loadingSlots && !slots.length && <Text style={styles.walletHelp}>No slots available on this date. Select another day.</Text>}
        <Text style={styles.label}>Reason for consultation</Text><TextInput value={reason} onChangeText={setReason} placeholder="Describe your concern (optional)" multiline style={[styles.input, styles.reasonInput]} />
        <TouchableOpacity disabled={booking || loadingSlots || !slots.length} style={[styles.bookButton, (booking || loadingSlots || !slots.length) && styles.disabled]} onPress={submit}>{booking ? <ActivityIndicator color="#fff" /> : <CalendarClock size={17} color="#fff" />}<Text style={styles.bookText}>{booking ? 'Booking…' : 'Confirm video appointment'}</Text></TouchableOpacity>
      </>}
    </ScrollView>
  </View>;
};

export default BookAppointmentScreen;

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#f1f5f9' }, content: { padding: 16, paddingBottom: 40 }, flex: { flex: 1 }, loading: { marginTop: 30 }, slotLoading: { marginVertical: 14 }, hero: { backgroundColor: '#fff', borderRadius: 18, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 18 }, heroIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center', marginBottom: 9 }, title: { color: '#0f172a', fontSize: 20, fontWeight: '800', textAlign: 'center' }, subtitle: { color: '#64748b', fontSize: 13, marginTop: 5, textAlign: 'center' }, sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800', marginBottom: 10 }, search: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, height: 46, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }, searchInput: { flex: 1, color: '#0f172a', fontSize: 14 }, doctorCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 15, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 10 }, avatar: { width: 40, height: 40, backgroundColor: '#ccfbf1', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, doctorName: { color: '#0f172a', fontSize: 14, fontWeight: '700' }, detail: { color: '#64748b', fontSize: 12, marginTop: 4 }, fee: { color: '#0f766e', fontWeight: '800', fontSize: 13, marginTop: 5 }, empty: { padding: 22, backgroundColor: '#fff', borderRadius: 14, alignItems: 'center' }, backLink: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 2 }, backText: { color: '#0f766e', fontWeight: '700', fontSize: 13 }, selectedCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 13, marginBottom: 13 }, walletNotice: { borderWidth: 1, borderColor: '#99f6e4', backgroundColor: '#f0fdfa', padding: 13, borderRadius: 12, marginBottom: 14 }, walletHelp: { color: '#64748b', fontSize: 12, lineHeight: 17, marginTop: 4 }, label: { color: '#334155', fontWeight: '700', fontSize: 13, marginTop: 13, marginBottom: 7 }, input: { minHeight: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 12, color: '#0f172a', fontSize: 14 }, reasonInput: { paddingTop: 10, minHeight: 74, textAlignVertical: 'top' }, slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, slot: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10 }, selectedSlot: { backgroundColor: '#0f766e', borderColor: '#0f766e' }, slotText: { color: '#334155', fontWeight: '600', fontSize: 12 }, selectedSlotText: { color: '#fff' }, bookButton: { marginTop: 20, minHeight: 46, borderRadius: 11, backgroundColor: '#0f766e', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, bookText: { color: '#fff', fontWeight: '700', fontSize: 13 }, disabled: { opacity: 0.5 }, successCard: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', marginBottom: 15 }, successTitle: { color: '#047857', fontWeight: '800', fontSize: 14 } });
