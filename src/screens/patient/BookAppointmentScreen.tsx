import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AlertCircle, Building2, FilterX, Globe2, Sparkles, Stethoscope } from 'lucide-react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import { getAvailableSlotsApi, bookAppointmentApi } from '../../api/appointmentApi';
import { BASE_URL } from '../../api/apiConfig';
import { useAuthContext } from '../../context/AuthContext';
import { fetchCitiesApi, fetchStatesApi } from '../../api/labProfileApi';
import { createWalletRechargeOrderApi, getPatientWalletBalanceApi, getVideoPricingPreviewApi, verifyWalletRechargeApi } from '../../api/videoServicesApi';
import RazorpayCheckout from 'react-native-razorpay';
import { Appointment } from '../../types/clinicTypes';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { publishPatientWalletBalance, subscribePatientWalletBalance } from '../../utils/patientWalletEvents';
import { AppointmentScheduleModal } from '../../features/patient/booking/AppointmentScheduleModal';
import { BookingProgress, ClinicCard, DoctorCard, LocationPicker, SearchField } from '../../features/patient/booking/BookingComponents';
import type { BookingClinic, BookingDoctor, BookingLocation } from '../../features/patient/booking/BookingComponents';

interface Props { onOpenDrawer?: () => void; onViewAppointments?: () => void }
type ApiProvider = Record<string, any>;
const localDate = () => { const date = new Date(); date.setHours(0, 0, 0, 0); return date; };
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const rowsFrom = (value: any): any[] => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];
const enabled = (value: unknown, fallback = false) => {
  if (value == null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return ['1', 'true', 'yes', 'enabled'].includes(String(value).trim().toLowerCase());
};

export const BookAppointmentScreen: React.FC<Props> = ({ onOpenDrawer = () => {}, onViewAppointments }) => {
  const { token, user } = useAuthContext();
  const [clinics, setClinics] = useState<BookingClinic[]>([]);
  const [states, setStates] = useState<BookingLocation[]>([]);
  const [cities, setCities] = useState<BookingLocation[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [clinicSearch, setClinicSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<BookingDoctor | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [providerReload, setProviderReload] = useState(0);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [providerError, setProviderError] = useState('');
  const [mode, setMode] = useState<'in_person' | 'video'>('video');
  const [date, setDate] = useState(localDate());
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [slotRetry, setSlotRetry] = useState(0);
  const slotCache = useRef(new Map<string, { slots: string[]; expiresAt: number }>());
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletBalanceLoading, setWalletBalanceLoading] = useState(false);
  const [videoRequiredAmount, setVideoRequiredAmount] = useState<number | null>(null);
  const [videoPricingLoading, setVideoPricingLoading] = useState(false);
  const [videoPricingError, setVideoPricingError] = useState('');
  const [videoPricingRetry, setVideoPricingRetry] = useState(0);
  const [rechargingWallet, setRechargingWallet] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingProviders(true); setProviderError('');
    const load = async () => {
      try {
        const allProviders: ApiProvider[] = [];
        let offset = 0;
        while (true) {
          const response = await fetch(`${BASE_URL}/public/providers?category=clinic&limit=100&offset=${offset}`);
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result?.success) throw new Error(result?.message || 'Unable to load clinics and doctors.');
          const page = rowsFrom(result.data);
          allProviders.push(...page);
          const pagination = result.pagination;
          if (!pagination?.has_more || page.length === 0) break;
          offset += page.length;
        }
        const normalized: BookingClinic[] = allProviders.map(provider => {
          const id = String(provider.id ?? provider.source_id ?? '');
          const clinicName = String(provider.name || 'Clinic');
          const doctors: BookingDoctor[] = (Array.isArray(provider.doctors) ? provider.doctors : []).map((doctor: ApiProvider) => ({
            id: String(doctor.id ?? ''), name: String(doctor.name || 'Doctor'), specialty: String(doctor.specialty || 'General Physician'),
            doctorType: String(doctor.doctor_type || 'clinic_doctor'), fee: Number(doctor.consultation_fee || 0),
            videoRatePerMinute: Number(doctor.video_rate_per_minute || 0), availableDays: String(doctor.available_days || ''),
            isDoctor: enabled(doctor.is_doctor, true), videoEnabled: enabled(doctor.is_doctor, true) && enabled(doctor.is_video_enabled), imageUrl: doctor.image_url ? String(doctor.image_url) : undefined,
            verified: enabled(doctor.is_verified),
          })).filter((doctor: BookingDoctor) => Boolean(doctor.id));
          return { id, name: clinicName, city: String(provider.city || ''), state: String(provider.state || ''), imageUrl: provider.image_url ? String(provider.image_url) : undefined, verified: enabled(provider.is_verified), doctors };
        }).filter(clinic => clinic.id && clinic.doctors.length > 0);
        if (active) setClinics(normalized);
      } catch (error) {
        if (active) setProviderError(error instanceof Error ? error.message : 'Unable to load clinics and doctors.');
      } finally { if (active) setLoadingProviders(false); }
    };
    void load();
    return () => { active = false; };
  }, [providerReload]);

  useEffect(() => {
    let active = true; setLoadingStates(true);
    fetchStatesApi().then(result => { if (active) setStates(result.map(item => ({ id: String(item.id), name: item.name }))); })
      .catch(() => { if (active) setStates([]); }).finally(() => { if (active) setLoadingStates(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true; setCities([]); setSelectedCity('');
    if (!selectedState) { setLoadingCities(false); return () => { active = false; }; }
    setLoadingCities(true);
    fetchCitiesApi(selectedState).then(result => { if (active) setCities(result.map(item => ({ id: String(item.id), name: item.name }))); })
      .catch(() => { if (active) setCities([]); }).finally(() => { if (active) setLoadingCities(false); });
    return () => { active = false; };
  }, [selectedState]);

  useEffect(() => {
    let active = true;
    if (!token) return () => { active = false; };
    setWalletBalanceLoading(true);
    getPatientWalletBalanceApi(token).then(result => { if (active && result.success) setWalletBalance(Number(result.data?.balance || 0)); }).catch(() => undefined).finally(() => { if (active) setWalletBalanceLoading(false); });
    return () => { active = false; };
  }, [token]);

  useEffect(() => subscribePatientWalletBalance(setWalletBalance), []);

  useEffect(() => {
    if (mode !== 'video' || !scheduleOpen || !selectedDoctor || !selectedClinicId || !token || !user?.id) {
      setVideoRequiredAmount(null);
      setVideoPricingError('');
      setVideoPricingLoading(false);
      return;
    }
    let active = true;
    setVideoPricingLoading(true);
    setVideoPricingError('');
    getVideoPricingPreviewApi(token, Number(selectedDoctor.id), Number(user.id), selectedClinicId)
      .then(result => {
        if (!result.success || !result.data?.pricing) throw new Error(result.message || 'Unable to check video consultation billing.');
        if (!active) return;
        const pricing = result.data.pricing;
        setVideoRequiredAmount(Number(pricing.required_amount ?? pricing.consultation_fee ?? selectedDoctor.fee ?? 0));
        if (pricing.wallet_balance != null) setWalletBalance(Number(pricing.wallet_balance));
      })
      .catch(error => {
        if (active) {
          setVideoRequiredAmount(null);
          setVideoPricingError(error instanceof Error ? error.message : 'Unable to check video consultation billing.');
        }
      })
      .finally(() => { if (active) setVideoPricingLoading(false); });
    return () => { active = false; };
  }, [mode, scheduleOpen, selectedDoctor, selectedClinicId, token, user?.id, videoPricingRetry]);

  const selectedClinic = clinics.find(clinic => clinic.id === selectedClinicId) || null;
  const visibleClinics = useMemo(() => {
    const query = clinicSearch.trim().toLowerCase();
    const stateName = states.find(item => item.id === selectedState)?.name.toLowerCase();
    const cityName = cities.find(item => item.id === selectedCity)?.name.toLowerCase();
    return clinics.filter(clinic => {
      if (stateName && clinic.state.trim().toLowerCase() !== stateName) return false;
      if (cityName && clinic.city.trim().toLowerCase() !== cityName) return false;
      return !query || [clinic.name, clinic.city, clinic.state].some(value => value.toLowerCase().includes(query));
    });
  }, [cities, clinicSearch, clinics, selectedCity, selectedState, states]);
  const visibleDoctors = useMemo(() => {
    const query = doctorSearch.trim().toLowerCase();
    return (selectedClinic?.doctors || []).filter(doctor => !query || `${doctor.name} ${doctor.specialty}`.toLowerCase().includes(query));
  }, [doctorSearch, selectedClinic]);
  const step = (selectedDoctor ? 3 : selectedClinic ? 2 : 1) as 1 | 2 | 3;

  useEffect(() => {
    if (!selectedDoctor || !token || !scheduleOpen) { setSlots([]); setSlotsError(''); return; }
    let active = true;
    const key = `${selectedDoctor.id}|${selectedClinicId}|${dateKey(date)}`;
    const cached = slotCache.current.get(key);
    if (cached && cached.expiresAt > Date.now()) { setSlots(cached.slots); setTime(current => cached.slots.includes(current) ? current : ''); setSlotsLoading(false); setSlotsError(''); return; }
    setSlotsLoading(true); setSlotsError('');
    const fetchSlots = async () => {
      try {
        let result = await getAvailableSlotsApi(token, Number(selectedDoctor.id), dateKey(date), selectedClinicId);
        if (!result.success && result.error?.startsWith('HTTP_5')) {
          await new Promise<void>(resolve => setTimeout(resolve, 450));
          result = await getAvailableSlotsApi(token, Number(selectedDoctor.id), dateKey(date), selectedClinicId);
        }
        if (!result.success) throw new Error(result.message || 'Time slots are temporarily unavailable.');
        const payload: any = result.data;
        const raw = Array.isArray(payload?.slots) ? payload.slots : Array.isArray(payload?.data?.slots) ? payload.data.slots : [];
        const available = raw.filter((item: any) => typeof item === 'string' || (item?.available !== false && item?.is_available !== false))
          .map((item: any) => typeof item === 'string' ? item : String(item.time || '')).filter(Boolean);
        if (!active) return;
        slotCache.current.set(key, { slots: available, expiresAt: Date.now() + 30_000 });
        setSlots(available); setTime(current => available.includes(current) ? current : '');
      } catch (error) { if (active) { setSlots([]); setSlotsError(error instanceof Error ? error.message : 'Time slots are temporarily unavailable.'); } }
      finally { if (active) setSlotsLoading(false); }
    };
    void fetchSlots();
    return () => { active = false; };
  }, [date, scheduleOpen, selectedClinicId, selectedDoctor, slotRetry, token]);

  const clearSelection = useCallback(() => { setScheduleOpen(false); setSelectedClinicId(''); setSelectedDoctor(null); setTime(''); setDoctorSearch(''); }, []);
  const handleSelectState = (value: string) => { setSelectedState(value); setSelectedCity(''); clearSelection(); };
  const handleSelectCity = (value: string) => { setSelectedCity(value); clearSelection(); };
  const clearLocationFilters = () => { setSelectedState(''); setSelectedCity(''); setClinicSearch(''); clearSelection(); };
  const rechargeWallet = async (amount: number) => {
    if (!token || !Number.isFinite(amount) || amount <= 0) {
      showErrorToast('Recharge unavailable', 'Please sign in again and retry your wallet recharge.');
      return;
    }
    setRechargingWallet(true);
    try {
      const orderResult = await createWalletRechargeOrderApi(token, amount);
      const order = orderResult.data;
      if (!orderResult.success || !order?.order_id || !order.key_id) throw new Error(orderResult.message || 'Unable to create Razorpay order.');
      const payment = await RazorpayCheckout.open({
        key: order.key_id,
        amount: String(order.amount),
        currency: order.currency || 'INR',
        order_id: order.order_id,
        name: 'OrboDoc',
        description: 'Patient wallet recharge',
        prefill: { name: user?.full_name || user?.fullName, email: user?.email, contact: user?.phone },
        theme: { color: '#1d7c72' },
      });
      const verifyResult = await verifyWalletRechargeApi(token, payment);
      if (!verifyResult.success) throw new Error(verifyResult.message || 'Razorpay payment verification failed.');
      const balance = Number(verifyResult.data?.balance || 0);
      setWalletBalance(balance);
      publishPatientWalletBalance(balance);
      setVideoPricingRetry(value => value + 1);
      showSuccessToast('Wallet recharged', `${balance.toFixed(2)} is now available. Confirm the appointment to continue.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment was cancelled or could not be verified.';
      const cancelled = /cancel/i.test(message);
      showErrorToast(cancelled ? 'Payment cancelled' : 'Recharge failed', message);
    } finally {
      setRechargingWallet(false);
    }
  };
  const handleConfirmBooking = async () => {
    if (!token || !user || !selectedDoctor || !selectedClinic) { showErrorToast('Booking details missing', 'Please choose a clinic and doctor again.'); return; }
    if (!time) { showErrorToast('Time required', 'Choose an available appointment time.'); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      if (mode === 'video') {
        if (videoPricingLoading || videoPricingError) {
          throw new Error(videoPricingError || 'Please wait while we check your wallet balance.');
        }
        const patientData = user as typeof user & { patient_id?: number | string; user_id?: number | string };
        const patientId = Number(patientData.patient_id ?? patientData.user_id ?? user.id);
        const preview = await getVideoPricingPreviewApi(token, Number(selectedDoctor.id), patientId, selectedClinic.id);
        if (!preview.success || !preview.data?.pricing) throw new Error(preview.message || 'Unable to verify your video consultation balance.');
        const pricing = preview.data.pricing;
        const requiredAmount = Number(pricing.required_amount ?? pricing.consultation_fee ?? selectedDoctor.fee ?? 0);
        const currentBalance = Number(pricing.wallet_balance ?? walletBalance ?? 0);
        setWalletBalance(currentBalance);
        setVideoRequiredAmount(requiredAmount);
        if (requiredAmount > 0 && (pricing.sufficient_balance === false || pricing.has_sufficient_balance === false || currentBalance < requiredAmount)) {
          showErrorToast('Recharge required', 'Opening secure Razorpay checkout for the required amount.');
          await rechargeWallet(Math.max(1, Math.ceil(requiredAmount - currentBalance)));
          return;
        }
      }
      const patientData = user as typeof user & { patient_id?: number | string; user_id?: number | string };
      const patientId = Number(patientData.patient_id ?? patientData.user_id ?? user.id);
      const result = await bookAppointmentApi(token, {
        clinic_id: Number(selectedClinic.id), patient_id: patientId, doctor_id: Number(selectedDoctor.id),
        appointment_date: dateKey(date), appointment_time: time, consultation_mode: mode,
        duration_minutes: 30, booking_source: 'patient_app', reason: symptoms.trim() || null,
        symptoms: symptoms.trim(), notes: notes.trim(),
      } as Partial<Appointment>);
      if (!result.success) throw new Error(result.message || 'Unable to book your appointment.');
      showSuccessToast('Appointment booked', `Your appointment is scheduled for ${dateKey(date)} at ${time}.`);
      setScheduleOpen(false); setSelectedDoctor(null); setSelectedClinicId(''); setTime(''); setSymptoms(''); setNotes('');
      onViewAppointments?.();
    } catch (error) {
      showErrorToast(mode === 'video' ? 'Wallet check or booking failed' : 'Booking failed', error instanceof Error ? error.message : 'Unable to book your appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  return <View style={styles.container}>
    <PatientHeader onOpenDrawer={onOpenDrawer} />
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <View style={styles.kicker}><Sparkles size={13} color="#CCFBF1" /><Text style={styles.kickerText}>SIMPLE & SECURE BOOKING</Text></View>
          <View style={styles.heroTitleRow}><View style={styles.heroIcon}><Stethoscope size={20} color="#FFFFFF" /></View><Text style={styles.heroTitle}>Book an Appointment</Text></View>
          <Text style={styles.heroDescription}>Find the right clinic and doctor, then reserve a convenient appointment slot.</Text>
        </View>
        <BookingProgress step={step} />
      </View>

      <View style={styles.contentCard}>
        {!selectedClinic ? <>
          <View style={styles.sectionIntro}><View style={styles.sectionIcon}><Globe2 size={17} color="#FFFFFF" /></View><View style={styles.grow}><Text style={styles.sectionTitle}>Find care near you</Text><Text style={styles.sectionHint}>Choose a location or search by clinic name</Text></View><View style={styles.foundBadge}><Text style={styles.foundText}>{visibleClinics.length} clinics</Text></View><TouchableOpacity onPress={clearLocationFilters} disabled={!selectedState && !selectedCity && !clinicSearch.trim()} style={[styles.clearFilterIcon, !selectedState && !selectedCity && !clinicSearch.trim() && styles.clearDisabled]} accessibilityLabel="Clear location filters"><FilterX size={16} color="#64748B" /></TouchableOpacity></View>
          <View style={styles.filters}>
            <View style={styles.filter}><LocationPicker label="State" placeholder="Select state" value={selectedState} options={states} loading={loadingStates} onSelect={handleSelectState} /></View>
            <View style={styles.filter}><LocationPicker label="City" placeholder={selectedState ? 'Select city' : 'Select state first'} value={selectedCity} options={cities} loading={loadingCities} disabled={!selectedState} onSelect={handleSelectCity} /></View>
            <View style={styles.filterWide}><Text style={styles.filterLabel}>CLINIC SEARCH</Text><SearchField value={clinicSearch} onChangeText={setClinicSearch} placeholder="Search clinic or city" /></View>
          </View>
          <View style={styles.clinicSectionHead}><View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View><Text style={styles.listTitle}>Find a clinic</Text><View style={styles.countBadge}><Text style={styles.countText}>{visibleClinics.length}</Text></View></View>
          {loadingProviders ? <View style={styles.loadingBox}><ActivityIndicator color="#1D7C72" size="large" /><Text style={styles.loadingText}>Loading clinics...</Text></View> : providerError ? <View style={styles.messageBox}><AlertCircle size={19} color="#DC2626" /><Text style={styles.errorText}>{providerError}</Text><TouchableOpacity onPress={() => { setProviderError(''); setProviderReload(value => value + 1); }}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View> : visibleClinics.length ? visibleClinics.map(clinic => <ClinicCard key={clinic.id} clinic={clinic} selected={false} onPress={() => { setSelectedClinicId(clinic.id); setDoctorSearch(''); }} />) : <View style={styles.emptyBox}><Building2 size={28} color="#94A3B8" /><Text style={styles.emptyTitle}>No clinic found</Text><Text style={styles.emptyText}>Try clearing a location filter or changing your search.</Text>{selectedState || selectedCity || clinicSearch ? <TouchableOpacity style={styles.clearButton} onPress={clearLocationFilters}><FilterX size={15} color="#1D7C72" /><Text style={styles.clearButtonText}>Clear filters</Text></TouchableOpacity> : null}</View>}
        </> : <>
          <View style={styles.doctorHeader}><View style={styles.stepBadgeDoctor}><Text style={styles.stepBadgeText}>2</Text></View><View style={styles.grow}><Text style={styles.listTitle}>Choose a doctor</Text><Text numberOfLines={1} style={styles.sectionHint}>Available at {selectedClinic.name}</Text></View><TouchableOpacity onPress={clearSelection} style={styles.backButton}><Text style={styles.backButtonText}>Change clinic</Text></TouchableOpacity></View>
          <SearchField value={doctorSearch} onChangeText={setDoctorSearch} placeholder="Search doctor or specialty" />
          {visibleDoctors.length ? visibleDoctors.map(doctor => <DoctorCard key={doctor.id} doctor={doctor} clinicName={selectedClinic.name} selected={selectedDoctor?.id === doctor.id} onPress={() => { setSelectedDoctor(doctor); setMode(doctor.videoEnabled ? 'video' : 'in_person'); setDate(localDate()); setTime(''); setSymptoms(''); setNotes(''); setScheduleOpen(true); }} />) : <View style={styles.emptyBox}><Stethoscope size={28} color="#94A3B8" /><Text style={styles.emptyTitle}>No matching doctor found</Text><Text style={styles.emptyText}>Try another search.</Text></View>}
        </>}
      </View>
    </ScrollView>
    <AppointmentScheduleModal visible={scheduleOpen} doctor={selectedDoctor} clinicName={selectedClinic?.name || ''} patientName={user?.full_name || user?.fullName} patientCode={(user as any)?.patient_code || `PT-${user?.id ?? ''}`} patientPhone={user?.phone} bloodGroup={(user as any)?.blood_group} date={date} time={time} mode={mode} slots={slots} slotsLoading={slotsLoading} slotsError={slotsError} retrying={slotsLoading && slotRetry > 0} symptoms={symptoms} notes={notes} walletBalance={walletBalance} walletBalanceLoading={walletBalanceLoading || (mode === 'video' && videoPricingLoading)} walletRequiredAmount={videoRequiredAmount ?? Number(selectedDoctor?.fee || 0)} walletPricingError={videoPricingError} walletRecharging={rechargingWallet} submitting={submitting}
      onClose={() => setScheduleOpen(false)} onDateChange={value => { setDate(value); setTime(''); }} onTimeChange={setTime} onModeChange={value => { setMode(value); setTime(''); }} onSymptomsChange={setSymptoms} onNotesChange={setNotes} onRetrySlots={() => setSlotRetry(value => value + 1)} onRetryWallet={() => setVideoPricingRetry(value => value + 1)} onRecharge={() => { const required = videoRequiredAmount ?? Number(selectedDoctor?.fee || 0); void rechargeWallet(walletBalance < required ? Math.max(1, Math.ceil(required - walletBalance)) : 500); }} onConfirm={() => void handleConfirmBooking()} />
  </View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' }, page: { padding: 14, paddingBottom: 32, gap: 13 },
  hero: { overflow: 'hidden', padding: 17, gap: 15, borderRadius: 20, backgroundColor: '#1D7C72', borderWidth: 1, borderColor: '#27A599' }, heroText: { gap: 8 }, kicker: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }, kickerText: { fontFamily: 'Inter', color: '#CCFBF1', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 }, heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, heroIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.16)' }, heroTitle: { fontFamily: 'Inter', flex: 1, color: '#FFFFFF', fontSize: 21, fontWeight: '900' }, heroDescription: { fontFamily: 'Inter', color: '#D9F7F2', fontSize: 12, lineHeight: 18 },
  contentCard: { padding: 14, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, sectionIntro: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }, sectionIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1D7C72' }, grow: { flex: 1, minWidth: 0 }, sectionTitle: { fontFamily: 'Inter', color: '#0F172A', fontSize: 18, fontWeight: '800' }, sectionHint: { fontFamily: 'Inter', color: '#64748B', fontSize: 10, marginTop: 3 }, foundBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 15, backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#CCFBF1' }, foundText: { fontFamily: 'Inter', color: '#115E59', fontSize: 10, fontWeight: '800' }, clearFilterIcon: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }, clearDisabled: { opacity: 0.38 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 17 }, filter: { flexGrow: 1, flexBasis: '47%' }, filterWide: { width: '100%' }, filterLabel: { fontFamily: 'Inter', color: '#1D7C72', fontSize: 10, fontWeight: '800', letterSpacing: 0.7, marginLeft: 3, marginBottom: 5 },
  clinicSectionHead: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 13, borderTopWidth: 1, borderTopColor: '#E2E8F0', marginBottom: 12 }, stepBadge: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#CCFBF1' }, stepBadgeDoctor: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#CFFAFE' }, stepBadgeText: { fontFamily: 'Inter', color: '#1D7C72', fontSize: 14, fontWeight: '900' }, listTitle: { fontFamily: 'Inter', color: '#0F172A', fontSize: 15, fontWeight: '800' }, countBadge: { minWidth: 26, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' }, countText: { fontFamily: 'Inter', color: '#475569', fontSize: 11, fontWeight: '800' },
  loadingBox: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 10 }, loadingText: { fontFamily: 'Inter', color: '#64748B', fontSize: 12 }, messageBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, backgroundColor: '#FEF2F2' }, errorText: { fontFamily: 'Inter', flex: 1, color: '#B91C1C', fontSize: 11 }, retryText: { fontFamily: 'Inter', color: '#991B1B', fontSize: 11, fontWeight: '800' }, emptyBox: { alignItems: 'center', padding: 25, borderWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1', borderRadius: 14, backgroundColor: '#F8FAFC', gap: 6 }, emptyTitle: { fontFamily: 'Inter', color: '#334155', fontWeight: '800', fontSize: 13 }, emptyText: { fontFamily: 'Inter', color: '#64748B', textAlign: 'center', fontSize: 11, lineHeight: 16 }, clearButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#99F6E4', borderRadius: 9, marginTop: 5 }, clearButtonText: { fontFamily: 'Inter', color: '#1D7C72', fontSize: 11, fontWeight: '800' },
  doctorHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 13 }, backButton: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 9 }, backButtonText: { fontFamily: 'Inter', color: '#1D7C72', fontSize: 10, fontWeight: '800' },
});

export default BookAppointmentScreen;
