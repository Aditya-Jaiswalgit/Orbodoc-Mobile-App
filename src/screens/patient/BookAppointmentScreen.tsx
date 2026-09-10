import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeftIcon,
  ChevronsUpDownIcon,
  FilterResetIcon,
  SearchInputIcon,
  SparklesIcon,
  StethoscopeIcon,
} from '../../components/common/CustomIcons';
import { BadgeCheck, Building2, CalendarDays, Check, Clock3, Globe2, MapPin, Monitor, Search, ShieldCheck, X } from 'lucide-react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import { InlineCalendarPicker } from '../../components/common/InlineCalendarPicker';
import { useAuthContext } from '../../context/AuthContext';
import { useAppointments } from '../../hooks/useAppointments';
import { useClinics } from '../../hooks/useClinics';
import { useDoctors } from '../../hooks/useDoctors';
import { Clinic, StaffMember } from '../../types/clinicTypes';

// This screen follows the web app's compact mobile layout. Do not let the
// device-wide accessibility font multiplier break the booking sheet geometry.
(Text as any).defaultProps = { ...((Text as any).defaultProps || {}), maxFontSizeMultiplier: 1 };
(TextInput as any).defaultProps = { ...((TextInput as any).defaultProps || {}), maxFontSizeMultiplier: 1 };

interface BookAppointmentScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
  onToggleTabBar?: (hide: boolean) => void;
}

const TIME_SLOTS = {
  morning: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'],
  afternoon: ['01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM'],
  evening: ['05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM'],
};

const formatTimeTo24Hr = (time12h: string): string => {
  if (!time12h) return '10:00:00';
  const parts = time12h.trim().split(' ');
  if (parts.length < 2) return `${parts[0]}:00`;
  const [time, modifier] = parts;
  let [hoursStr, minutesStr] = time.split(':');
  let hours = parseInt(hoursStr, 10);
  if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
  if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutesStr.padStart(2, '0')}:00`;
};

const generateNext30Days = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const formatted = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const label = i === 0 ? `Today (${formatted})` : i === 1 ? `Tomorrow (${formatted})` : formatted;
    dates.push({ dateStr, label });
  }
  return dates;
};

const calendarCells = (month: Date) => {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const firstWeekday = start.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  while (cells.length % 7) cells.push(null);
  return cells;
};

export const BookAppointmentScreen: React.FC<BookAppointmentScreenProps> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
  onToggleTabBar,
}) => {
  const { user } = useAuthContext();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const {
    clinics,
    loading: clinicsLoading,
    statesList,
    citiesList,
    selectedStateId,
    setSelectedStateId,
  } = useClinics();
  const { bookAppointment, fetchAvailableSlots } = useAppointments();

  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [clinicSearch, setClinicSearch] = useState<string>('');
  const [doctorSearch, setDoctorSearch] = useState<string>('');

  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const { doctors: doctorsList, loading: doctorsLoading } = useDoctors(selectedClinic?.id);
  const [selectedDoctor, setSelectedDoctor] = useState<StaffMember | null>(null);

  const [consultationMode, setConsultationMode] = useState<'In Person' | 'Video Call'>('In Person');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [symptomsInput, setSymptomsInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');

  const [patientNameInput, setPatientNameInput] = useState<string>(user?.fullName || user?.full_name || '');
  const [patientPhoneInput, setPatientPhoneInput] = useState<string>(user?.phone || '');

  const [showModePicker, setShowModePicker] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showSlotPicker, setShowSlotPicker] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [bookedAppointmentId, setBookedAppointmentId] = useState<number | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [slotReloadKey, setSlotReloadKey] = useState(0);
  const [showInlineCalendar, setShowInlineCalendar] = useState(false);
  const [showTimeOptions, setShowTimeOptions] = useState(false);
  const [timeSearch, setTimeSearch] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  useEffect(() => {
    if (onToggleTabBar) {
      const isAnyModalOpen =
        showModePicker ||
        showDatePicker ||
        showSlotPicker ||
        showScheduleModal ||
        showSuccessModal ||
        showStatePicker ||
        showCityPicker;
      onToggleTabBar(isAnyModalOpen);
    }
  }, [
    showModePicker,
    showDatePicker,
    showSlotPicker,
    showScheduleModal,
    showSuccessModal,
    showStatePicker,
    showCityPicker,
    onToggleTabBar,
  ]);

  useEffect(() => {
    return () => {
      onToggleTabBar?.(false);
    };
  }, [onToggleTabBar]);

  const availableDatesList = generateNext30Days();

  const selectedState = statesList.find((state) => state.id === selectedStateId);
  const selectedCity = citiesList.find((city) => city.id === selectedCityId);

  const filteredClinics = clinics.filter((c) => {
    const matchesState =
      !selectedState ||
      String(c.state || '').trim().toLowerCase() === selectedState.state_name.trim().toLowerCase();
    const matchesCity =
      !selectedCity ||
      String(c.city || '').trim().toLowerCase() === selectedCity.city_name.trim().toLowerCase();
    const matchesSearch =
      clinicSearch.trim() === '' ||
      c.name.toLowerCase().includes(clinicSearch.toLowerCase()) ||
      (c.city && c.city.toLowerCase().includes(clinicSearch.toLowerCase()));
    return matchesState && matchesCity && matchesSearch;
  });

  const filteredDoctors = doctorsList.filter((d) => {
    const matchesClinic = !d.clinic_id || Number(d.clinic_id) === Number(selectedClinic?.id);
    const matchesSearch =
      doctorSearch.trim() === '' ||
      d.full_name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      (d.specialization && d.specialization.toLowerCase().includes(doctorSearch.toLowerCase())) ||
      (d.department && d.department.toLowerCase().includes(doctorSearch.toLowerCase()));
    return matchesClinic && matchesSearch;
  });

  const handleSelectClinic = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setSelectedDoctor(null);
    setCurrentStep(2);
  };

  const handleSelectDoctor = (doctor: StaffMember) => {
    setSelectedDoctor(doctor);
    setSelectedTimeSlot('');
    setSlotError(null);
    setCurrentStep(3);
    setShowScheduleModal(true);
  };

  const handleCloseScheduleSheet = () => {
    setShowScheduleModal(false);
    setShowInlineCalendar(false);
    setShowTimeOptions(false);
    setShowModePicker(false);
    setCurrentStep(2);
  };

  useEffect(() => {
    const loadSlots = async () => {
      if (!selectedDoctor?.id || !selectedDate) {
        setAvailableSlots([]);
        setSlotError(null);
        setSlotsLoading(false);
        return;
      }
      setSelectedTimeSlot('');
      setSlotError(null);
      setSlotsLoading(true);
      try {
        const slots = await fetchAvailableSlots(
          Number(selectedDoctor.id),
          selectedDate,
          Number(selectedClinic?.id || selectedDoctor.clinic_id || 0) || undefined,
        );
        setAvailableSlots(slots);
      } catch (error: any) {
        setAvailableSlots([]);
        setSlotError(error?.message || 'Doctor not found in your clinic');
      } finally {
        setSlotsLoading(false);
      }
    };
    void loadSlots();
  }, [selectedDoctor?.id, selectedClinic?.id, selectedDate, slotReloadKey, fetchAvailableSlots]);

  const handleResetFilters = () => {
    setSelectedStateId(null);
    setSelectedCityId(null);
    setClinicSearch('');
  };

  const handleConfirmBooking = async () => {
    if (!selectedClinic || !selectedDoctor) {
      Alert.alert('Selection Error', 'Please select a clinic and doctor first.');
      return;
    }

    if (slotError) {
      Alert.alert('Doctor not found', slotError);
      return;
    }

    if (!selectedDate || !selectedTimeSlot) {
      Alert.alert('Validation Error', 'Please select appointment date and time slot.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        patient_id: Number(user?.userId || user?.id || user?.patient_id || 1),
        clinic_id: Number(selectedClinic.id),
        doctor_id: Number(selectedDoctor.id),
        patient_name: patientNameInput.trim() || user?.fullName || user?.full_name || 'Patient',
        patient_phone: patientPhoneInput.trim() || user?.phone || '',
        doctor_name: selectedDoctor.full_name,
        doctor_specialization: selectedDoctor.specialization || selectedDoctor.department || 'General Physician',
        appointment_date: selectedDate,
        appointment_time: formatTimeTo24Hr(selectedTimeSlot),
        consultation_mode: consultationMode === 'Video Call' ? 'video' : 'in_person',
        reason: symptomsInput || notesInput || 'General Medical Consultation',
        status: 'approved',
      };

      const res = await bookAppointment(payload as any);
      if (!res?.success) {
        Alert.alert('Booking Error', res?.message || 'Unable to complete appointment booking.');
        return;
      }

      if ((res as any).id || (res as any).appointment_id || (res as any).data?.id) {
        const newId = (res as any).id || (res as any).appointment_id || (res as any).data?.id;
        setBookedAppointmentId(newId);
      } else {
        setBookedAppointmentId(null);
      }
      setShowScheduleModal(false);
      setShowSuccessModal(true);
    } catch (err: any) {
      Alert.alert('Booking Error', err.message || 'Unable to complete appointment booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDateObj = availableDatesList.find((d) => d.dateStr === selectedDate);
  const formattedSelectedDate = selectedDateObj ? selectedDateObj.label : selectedDate;
  const visibleCalendarDays = calendarCells(calendarMonth);
  const filteredTimeSlots = availableSlots.filter((slot) =>
    slot.toLowerCase().includes(timeSearch.trim().toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Patient Header without logo to match screenshot */}
      <PatientHeader
        showLogo={false}
        showRolePill={false}
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.bookingFlowShell}>
        {/* Top Dark Pine/Teal Hero Banner */}
        <LinearGradient
          colors={['#042f2e', '#115e59', '#0e7490']}
          locations={[0, 0.56, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}>
          {/* Top Pill Badge */}
          <View style={styles.heroBadgePill}>
            <SparklesIcon size={12} color="#ffffff" />
            <Text style={styles.heroBadgeText}>SIMPLE & SECURE BOOKING</Text>
          </View>

          {/* Title Row with Stethoscope Icon Badge */}
          <View style={styles.heroTitleRow}>
            <View style={styles.heroIconBadge}>
              <StethoscopeIcon size={20} color="#ffffff" />
            </View>
            <Text style={styles.heroTitle}>Book an Appointment</Text>
          </View>

          {/* Subtitle */}
          <Text style={styles.heroSubtitle}>
            Find the right clinic and doctor, then reserve a convenient appointment slot.
          </Text>

          {/* 3-Step Wizard Capsule */}
          <View style={styles.wizardCapsule}>
            {/* Step 1: Clinic */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.wizardStepBtn, currentStep === 1 && styles.wizardStepBtnActive]}
              onPress={() => setCurrentStep(1)}>
              {currentStep > 1 ? (
                <View style={styles.wizardStepCircleCompleted}>
                  <Check size={13} color="#ffffff" strokeWidth={3} />
                </View>
              ) : (
                <View style={[styles.wizardStepCircle, currentStep === 1 && styles.wizardStepCircleActive]}>
                  <Text style={[styles.wizardStepNumber, currentStep === 1 && styles.wizardStepNumberActive]}>1</Text>
                </View>
              )}
              <Text style={[styles.wizardStepText, currentStep === 1 && styles.wizardStepTextActive]}>Clinic</Text>
            </TouchableOpacity>

            {/* Step 2: Doctor */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.wizardStepBtn, currentStep === 2 && styles.wizardStepBtnActive]}
              onPress={() => {
                if (!selectedClinic) {
                  Alert.alert('Clinic Required', 'Please select a clinic first.');
                  return;
                }
                setCurrentStep(2);
              }}>
              {currentStep > 2 ? (
                <View style={styles.wizardStepCircleCompleted}>
                  <Check size={13} color="#ffffff" strokeWidth={3} />
                </View>
              ) : (
                <View style={[styles.wizardStepCircle, currentStep === 2 && styles.wizardStepCircleActive]}>
                  <Text style={[styles.wizardStepNumber, currentStep === 2 && styles.wizardStepNumberActive]}>2</Text>
                </View>
              )}
              <Text style={[styles.wizardStepText, currentStep === 2 && styles.wizardStepTextActive]}>Doctor</Text>
            </TouchableOpacity>

            {/* Step 3: Schedule */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.wizardStepBtn, currentStep === 3 && styles.wizardStepBtnActive]}
              onPress={() => {
                if (!selectedClinic) {
                  Alert.alert('Clinic Required', 'Please select a clinic first.');
                  return;
                }
                if (!selectedDoctor) {
                  Alert.alert('Doctor Required', 'Please select a doctor first.');
                  return;
                }
                setCurrentStep(3);
                setShowScheduleModal(true);
              }}>
              <View style={[styles.wizardStepCircle, currentStep === 3 && styles.wizardStepCircleActive]}>
                <Text style={[styles.wizardStepNumber, currentStep === 3 && styles.wizardStepNumberActive]}>3</Text>
              </View>
              <Text style={[styles.wizardStepText, currentStep === 3 && styles.wizardStepTextActive]}>Schedule</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* STEP 1: FIND CARE NEAR YOU & CLINIC LIST */}
        {currentStep === 1 && (
          <View style={styles.mainCard}>
            {/* Header: Teal Circle + Title + Subtitle */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderIconCircle}>
                <Globe2 size={16} color="#ffffff" strokeWidth={2} />
              </View>
              <View style={styles.cardHeaderTextCol}>
                <Text style={styles.cardHeaderTitle}>Find care near you</Text>
                <Text style={styles.cardHeaderSubtitle}>Choose a location or search by clinic name</Text>
              </View>
            </View>

            {/* Badges Row: Count Pill + Reset Filter Button */}
            <View style={styles.badgeAndActionRow}>
              <View style={styles.clinicsFoundBadge}>
                <Text style={styles.clinicsFoundText}>{filteredClinics.length} clinics found</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.filterResetBtn}
                onPress={handleResetFilters}>
                <FilterResetIcon size={14} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Filter Inputs Section */}
            <View style={styles.filtersSection}>
              {/* STATE */}
              <View style={styles.filterFieldGroup}>
                <Text style={styles.filterFieldLabel}>STATE</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.filterSelectBox}
                  onPress={() => setShowStatePicker(true)}>
                  <Text
                    style={[
                      styles.filterSelectBoxText,
                      !selectedState && styles.filterSelectBoxPlaceholder,
                    ]}
                    numberOfLines={1}>
                    {selectedState ? selectedState.state_name : 'Select state'}
                  </Text>
                  <ChevronsUpDownIcon size={14} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* CITY */}
              <View style={styles.filterFieldGroup}>
                <Text style={styles.filterFieldLabel}>CITY</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.filterSelectBox}
                  onPress={() => {
                    if (!selectedStateId) {
                      setShowStatePicker(true);
                    } else {
                      setShowCityPicker(true);
                    }
                  }}>
                  <Text
                    style={[
                      styles.filterSelectBoxText,
                      (!selectedState || !selectedCity) &&
                        styles.filterSelectBoxPlaceholder,
                    ]}
                    numberOfLines={1}>
                    {!selectedState
                      ? 'Select state first'
                      : !selectedCity
                      ? 'Select city'
                      : selectedCity.city_name}
                  </Text>
                  <ChevronsUpDownIcon size={14} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* CLINIC SEARCH */}
              <View style={styles.filterFieldGroup}>
                <Text style={styles.filterFieldLabel}>CLINIC SEARCH</Text>
                <View style={styles.searchInputBox}>
                  <SearchInputIcon size={15} color="#94a3b8" />
                  <TextInput
                    style={styles.searchTextInput}
                    placeholder="Search clinic or city"
                    placeholderTextColor="#94a3b8"
                    value={clinicSearch}
                    onChangeText={setClinicSearch}
                  />
                </View>
              </View>
            </View>

            {/* Divider Line */}
            <View style={styles.cardDivider} />

            {/* Section Header: Step Circle "1" + "Find a clinic" + Count Badge "8" */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionStepBadge}>
                <Text style={styles.sectionStepBadgeText}>1</Text>
              </View>
              <Text style={styles.sectionHeadingText}>Find a clinic</Text>
              <View style={styles.countBadgePill}>
                <Text style={styles.countBadgePillText}>{filteredClinics.length}</Text>
              </View>
            </View>

            {/* Clinics List */}
            {clinicsLoading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 36 }} />
            ) : filteredClinics.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIconText}>🏥</Text>
                <Text style={styles.emptyTitleText}>No Clinics Found</Text>
                <Text style={styles.emptySubText}>Try selecting a different state, city, or clearing the search.</Text>
                <TouchableOpacity style={styles.resetSearchBtn} onPress={handleResetFilters}>
                  <Text style={styles.resetSearchBtnText}>Reset Filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.clinicsListContainer}>
                {filteredClinics.map((clinic) => {
                  const isSelected = selectedClinic?.id === clinic.id;
                  const clinicImage = clinic.image_url || clinic.logo_url;
                  const docCount =
                    clinic.doctors_count || 0;

                  return (
                    <TouchableOpacity
                      key={clinic.id}
                      activeOpacity={0.8}
                      style={[styles.clinicItemCard, isSelected && styles.clinicItemCardSelected]}
                      onPress={() => handleSelectClinic(clinic)}>
                      {/* Left Building Icon Box */}
                      <View style={styles.buildingIconBox}>
                        {clinicImage ? (
                          <Image source={{ uri: clinicImage }} style={styles.clinicLogoImage} resizeMode="cover" />
                        ) : (
                          <Building2 size={20} color="#64748b" strokeWidth={1.8} />
                        )}
                      </View>

                      {/* Right Content */}
                      <View style={styles.clinicInfoCol}>
                        {/* Name + Verified Badge */}
                        <View style={styles.clinicTitleRow}>
                          <Text style={styles.clinicTitleText} numberOfLines={1}>
                            {clinic.name}
                          </Text>
                          <BadgeCheck size={14} color="#0d9488" strokeWidth={2} />
                        </View>

                        {/* Location Row */}
                        <View style={styles.clinicLocationRow}>
                          <MapPin size={12} color="#64748b" strokeWidth={2} />
                          <Text style={styles.clinicLocationText} numberOfLines={1}>
                            {clinic.city || 'Location unavailable'}{clinic.state ? `, ${clinic.state}` : ''}
                          </Text>
                        </View>

                        {/* Doctor Count */}
                        <Text style={styles.doctorsCountText}>
                          {docCount} {docCount === 1 ? 'doctor' : 'doctors'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* STEP 2: CHOOSE DOCTOR (Matching user's screenshot exactly) */}
        {currentStep === 2 && selectedClinic && (
          <View style={styles.mainCard}>
            {/* Header: Back Button + Step 2 Badge + "Choose a doctor" */}
            <View style={styles.doctorHeaderTopRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.doctorBackBtn}
                onPress={() => setCurrentStep(1)}>
                <ArrowLeftIcon size={18} color="#334155" />
              </TouchableOpacity>

              <View style={styles.doctorStepBadge}>
                <Text style={styles.doctorStepBadgeText}>2</Text>
              </View>

              <Text style={styles.doctorStepTitle}>Choose a doctor</Text>
            </View>

            {/* Subtitle */}
            <Text style={styles.doctorStepSubtitle}>
              Available at {selectedClinic.name}
            </Text>

            {/* Doctor Search Input Box */}
            <View style={styles.doctorSearchInputBox}>
              <SearchInputIcon size={16} color="#94a3b8" />
              <TextInput
                style={styles.doctorSearchTextInput}
                placeholder="Search doctor or specialty"
                placeholderTextColor="#94a3b8"
                value={doctorSearch}
                onChangeText={setDoctorSearch}
              />
            </View>

            {/* Divider Line */}
            <View style={styles.cardDivider} />

            {/* Doctors List */}
            {doctorsLoading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 36 }} />
            ) : filteredDoctors.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIconText}>🩺</Text>
                <Text style={styles.emptyTitleText}>No Doctors Found</Text>
                <Text style={styles.emptySubText}>
                  No doctors currently available at {selectedClinic.name}.
                </Text>
              </View>
            ) : (
              <View style={styles.doctorsListContainer}>
                {filteredDoctors.map((doc) => {
                  const isSelected = selectedDoctor?.id === doc.id;
                  const feeValue =
                    doc.consultation_fee && Number(doc.consultation_fee) > 0
                      ? `₹${Number(doc.consultation_fee).toFixed(2)}`
                      : 'At clinic';

                  return (
                    <TouchableOpacity
                      key={doc.id}
                      activeOpacity={0.8}
                      style={[styles.doctorCardNew, isSelected && styles.doctorCardNewSelected]}
                      onPress={() => handleSelectDoctor(doc)}>
                      {/* Top Part: Squircle Avatar + Details */}
                      <View style={styles.docCardTopRow}>
                        <View style={styles.docSquircleAvatar}>
                          {doc.profile_photo ? (
                            <Image
                              source={{ uri: doc.profile_photo }}
                              style={styles.docSquircleImg}
                              resizeMode="cover"
                            />
                          ) : (
                            <StethoscopeIcon size={22} color="#0891b2" />
                          )}
                        </View>

                        <View style={styles.docDetailsCol}>
                          <Text style={styles.docNameNew}>{doc.full_name}</Text>
                          <Text style={styles.docSpecNew}>
                            {doc.specialization || doc.department || 'general'}
                          </Text>
                        </View>
                      </View>

                      {/* Card Divider */}
                      <View style={styles.docCardDivider} />

                      {/* Bottom Row: Consultation fee label + Value */}
                      <View style={styles.docCardBottomRow}>
                        <Text style={styles.docFeeLabelNew}>Consultation fee</Text>
                        <Text style={styles.docFeeValNew}>{feeValue}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* STEP 3: SCHEDULE & CONFIRM APPOINTMENT */}
        {false && currentStep === 3 && selectedClinic && selectedDoctor && (
          <View style={styles.mainCard}>
            {/* Summary Top Card */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Appointment Booking Summary</Text>

              <View style={styles.summaryRow}>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>CLINIC</Text>
                  <Text style={styles.summaryVal}>🏥 {selectedClinic.name}</Text>
                  <Text style={styles.summarySub}>
                    📍 {selectedClinic.city}, {selectedClinic.state}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setCurrentStep(1)}>
                  <Text style={styles.summaryChangeLink}>Change</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.summaryRow, { marginTop: 10 }]}>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>DOCTOR</Text>
                  <Text style={styles.summaryVal}>🩺 {selectedDoctor.full_name}</Text>
                  <Text style={styles.summarySub}>
                    {selectedDoctor.specialization || selectedDoctor.department || 'General Physician'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setCurrentStep(2)}>
                  <Text style={styles.summaryChangeLink}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Schedule Form */}
            <View style={styles.formContainer}>
              <Text style={styles.formHeading}>Consultation & Schedule</Text>

              {/* Mode */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Consultation Mode <Text style={styles.asterisk}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.formPickerBtn}
                  onPress={() => setShowModePicker(true)}>
                  <Text style={styles.formPickerBtnText}>
                    {consultationMode === 'Video Call' ? '📹 Video Call' : '🏥 In Person'}
                  </Text>
                  <ChevronsUpDownIcon size={14} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Date */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Select Date <Text style={styles.asterisk}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.formPickerBtn}
                  onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.formPickerBtnText}>📅 {formattedSelectedDate}</Text>
                  <ChevronsUpDownIcon size={14} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Slot */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Select Time Slot <Text style={styles.asterisk}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.formPickerBtn}
                  onPress={() => setShowSlotPicker(true)}>
                  <Text style={styles.formPickerBtnText}>⏰ {selectedTimeSlot}</Text>
                  <ChevronsUpDownIcon size={14} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Symptoms */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Symptoms / Reason for Visit</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputMulti]}
                  placeholder="Describe symptoms or reason for visit..."
                  placeholderTextColor="#94a3b8"
                  value={symptomsInput}
                  onChangeText={setSymptomsInput}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Patient Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Patient Full Name <Text style={styles.asterisk}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={patientNameInput}
                  onChangeText={setPatientNameInput}
                />
              </View>

              {/* Patient Phone */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Patient Phone Number <Text style={styles.asterisk}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={patientPhoneInput}
                  onChangeText={setPatientPhoneInput}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.submitBookingBtn}
                onPress={handleConfirmBooking}
                disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitBookingBtnText}>Confirm & Book Appointment →</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        </View>
      </ScrollView>

      {/* Step 3 is a focused modal, matching the responsive web booking flow. */}
      <Modal
        visible={showScheduleModal && Boolean(selectedClinic && selectedDoctor)}
        transparent
        animationType="slide"
        onRequestClose={handleCloseScheduleSheet}>
        <View style={styles.scheduleOverlay}>
          <View style={styles.scheduleModalCard}>
            <LinearGradient
              colors={['#042f2e', '#115e59', '#0e7490']}
              locations={[0, 0.56, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scheduleModalHeader}>
              <View style={styles.scheduleHeaderIcon}><StethoscopeIcon color="#ffffff" size={22} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scheduleModalTitle}>Schedule appointment</Text>
                <Text style={styles.scheduleModalSubtitle} numberOfLines={1}>
                  {selectedDoctor?.full_name}{' \u00B7 '}{selectedDoctor?.specialization || selectedDoctor?.department || 'General Physician'}
                </Text>
              </View>
              <TouchableOpacity onPress={handleCloseScheduleSheet} hitSlop={12}>
                <X color="#bce8e7" size={20} strokeWidth={2} />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.scheduleModalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.scheduleFieldLabel}><Monitor color="#0f172a" size={14} /> Consultation Mode <Text style={styles.asterisk}>*</Text></Text>
                <TouchableOpacity style={styles.formPickerBtn} onPress={() => setShowModePicker(true)}>
                  <Text style={styles.formPickerBtnText}>{consultationMode === 'Video Call' ? 'Video Call' : 'In Person'}</Text>
                  <ChevronsUpDownIcon size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.scheduleFieldLabel}><CalendarDays color="#0f172a" size={14} /> Appointment Date <Text style={styles.asterisk}>*</Text></Text>
                <TouchableOpacity style={styles.formPickerBtn} onPress={() => { setShowInlineCalendar((current) => !current); setShowTimeOptions(false); }}>
                  <CalendarDays color="#334155" size={16} />
                  <Text style={[styles.formPickerBtnText, { flex: 1 }]}>{new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                  <ChevronsUpDownIcon size={16} color="#64748b" />
                </TouchableOpacity>
                {showInlineCalendar ? (
                  <InlineCalendarPicker
                    value={selectedDate}
                    minimumDate={new Date().toISOString().slice(0, 10)}
                    onSelect={(date) => setSelectedDate(date)}
                    onClose={() => setShowInlineCalendar(false)}
                  />
                ) : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.scheduleFieldLabel}><Clock3 color="#0f172a" size={14} /> Appointment Time <Text style={styles.asterisk}>*</Text></Text>
                <TouchableOpacity
                  disabled={Boolean(slotError)}
                  style={[styles.formPickerBtn, Boolean(slotError) && styles.formPickerDisabled]}
                  onPress={() => { setShowTimeOptions((current) => !current); setShowInlineCalendar(false); }}>
                  <Clock3 color="#94a3b8" size={16} />
                  <Text style={[styles.formPickerBtnText, !selectedTimeSlot && styles.placeholderPickerText]}>
                    {slotsLoading ? 'Loading available slots…' : selectedTimeSlot || 'Select time slot'}
                  </Text>
                  <ChevronsUpDownIcon size={16} color="#64748b" />
                </TouchableOpacity>
                {slotError ? (
                  <View style={styles.providerUnavailableNotice} accessibilityRole="alert">
                    <Text style={styles.providerUnavailableText}>{slotError}</Text>
                    <TouchableOpacity onPress={() => setSlotReloadKey((current) => current + 1)} hitSlop={6}>
                      <Text style={styles.providerUnavailableRetry}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                {showTimeOptions ? (
                  <View style={styles.timeOptionsCard}>
                    <View style={styles.timeSearchRow}><Search color="#94a3b8" size={16} /><TextInput value={timeSearch} onChangeText={setTimeSearch} placeholder="Search time slot..." placeholderTextColor="#94a3b8" style={styles.timeSearchInput} /></View>
                    <ScrollView style={styles.timeOptionsList} nestedScrollEnabled>
                      {slotsLoading ? <ActivityIndicator color="#0d9488" style={{ marginVertical: 16 }} /> : filteredTimeSlots.length === 0 ? <Text style={styles.noSlotsText}>No available slots found.</Text> : filteredTimeSlots.map((slot) => <TouchableOpacity key={slot} style={[styles.timeOption, selectedTimeSlot === slot && styles.timeOptionSelected]} onPress={() => { setSelectedTimeSlot(slot); setShowTimeOptions(false); setTimeSearch(''); }}><Text style={[styles.timeOptionText, selectedTimeSlot === slot && styles.timeOptionTextSelected]}>{slot}</Text></TouchableOpacity>)}
                    </ScrollView>
                  </View>
                ) : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Symptoms</Text>
                <TextInput style={[styles.formInput, styles.formInputMulti]} placeholder="Enter symptoms" placeholderTextColor="#94a3b8" value={symptomsInput} onChangeText={setSymptomsInput} multiline />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput style={[styles.formInput, styles.formInputMulti]} placeholder="Enter notes" placeholderTextColor="#94a3b8" value={notesInput} onChangeText={setNotesInput} multiline />
              </View>
            </ScrollView>

            <View style={styles.scheduleModalFooter}>
              <TouchableOpacity style={styles.scheduleCancelBtn} onPress={handleCloseScheduleSheet}><Text style={styles.scheduleCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity
                style={[styles.scheduleConfirmBtn, selectedTimeSlot && !slotError ? styles.scheduleConfirmReady : styles.scheduleConfirmDisabled]}
                disabled={submitting || !selectedTimeSlot || Boolean(slotError)}
                onPress={handleConfirmBooking}>
                {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.scheduleConfirmText}>Confirm Appointment</Text>}
              </TouchableOpacity>
            </View>
            <View style={styles.scheduleSecurityRow}><ShieldCheck color="#059669" size={13} /><Text style={styles.scheduleSecurityText}>Your booking details are secure</Text></View>
          </View>
        </View>
      </Modal>

      {/* State Picker Modal */}
      <Modal visible={showStatePicker} transparent animationType="fade" onRequestClose={() => setShowStatePicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowStatePicker(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalBoxTitle}>Select State</Text>
            <ScrollView style={{ maxHeight: 320, width: '100%' }}>
              {statesList.map((state) => (
                <TouchableOpacity
                  key={state.id}
                  style={styles.modalOptionItem}
                  onPress={() => {
                    setSelectedStateId(state.id);
                    setSelectedCityId(null);
                    setShowStatePicker(false);
                  }}>
                  <Text style={[styles.modalOptionText, selectedStateId === state.id && styles.modalOptionTextActive]}>
                    {state.state_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* City Picker Modal */}
      <Modal visible={showCityPicker} transparent animationType="fade" onRequestClose={() => setShowCityPicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowCityPicker(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalBoxTitle}>Select City</Text>
            <ScrollView style={{ maxHeight: 320, width: '100%' }}>
              {citiesList.map((city) => (
                <TouchableOpacity
                  key={city.id}
                  style={styles.modalOptionItem}
                  onPress={() => {
                    setSelectedCityId(city.id);
                    setShowCityPicker(false);
                  }}>
                  <Text style={[styles.modalOptionText, selectedCityId === city.id && styles.modalOptionTextActive]}>
                    {city.city_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Consultation Mode Picker Modal */}
      <Modal visible={showModePicker} transparent animationType="fade" onRequestClose={() => setShowModePicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowModePicker(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalBoxTitle}>Consultation Mode</Text>
            {['In Person', 'Video Call'].map((m) => (
              <TouchableOpacity
                key={m}
                style={styles.modalOptionItem}
                onPress={() => {
                  setConsultationMode(m as any);
                  setShowModePicker(false);
                }}>
                <Text style={[styles.modalOptionText, consultationMode === m && styles.modalOptionTextActive]}>
                  {m === 'Video Call' ? '📹 Video Call' : '🏥 In Person'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View style={{ width: '92%', maxWidth: 340 }}>
            <InlineCalendarPicker
              value={selectedDate}
              minimumDate={new Date().toISOString().slice(0, 10)}
              onSelect={(date) => setSelectedDate(date)}
              onClose={() => setShowDatePicker(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Time Slot Picker Modal */}
      <Modal visible={showSlotPicker} transparent animationType="slide" onRequestClose={() => setShowSlotPicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowSlotPicker(false)}>
          <View style={[styles.modalBox, { maxHeight: '75%' }]}>
            <Text style={styles.modalBoxTitle}>Select Time Slot</Text>
            <ScrollView style={{ width: '100%' }}>
              {slotsLoading ? <ActivityIndicator color="#0d9488" style={{ marginVertical: 20 }} /> : null}
              {!slotsLoading && availableSlots.length === 0 ? <Text style={styles.noSlotsText}>No available slots for this date. Please choose another date.</Text> : null}
              <Text style={styles.slotGroupTitle}>🌅 Morning Slots</Text>
              {availableSlots.map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={styles.modalOptionItem}
                  onPress={() => {
                    setSelectedTimeSlot(slot);
                    setShowSlotPicker(false);
                  }}>
                  <Text style={[styles.modalOptionText, selectedTimeSlot === slot && styles.modalOptionTextActive]}>
                    ⏰ {slot}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.slotGroupTitle, { marginTop: 12 }]}>☀️ Afternoon Slots</Text>
              {([] as string[]).map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={styles.modalOptionItem}
                  onPress={() => {
                    setSelectedTimeSlot(slot);
                    setShowSlotPicker(false);
                  }}>
                  <Text style={[styles.modalOptionText, selectedTimeSlot === slot && styles.modalOptionTextActive]}>
                    ⏰ {slot}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.slotGroupTitle, { marginTop: 12 }]}>🌙 Evening Slots</Text>
              {([] as string[]).map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={styles.modalOptionItem}
                  onPress={() => {
                    setSelectedTimeSlot(slot);
                    setShowSlotPicker(false);
                  }}>
                  <Text style={[styles.modalOptionText, selectedTimeSlot === slot && styles.modalOptionTextActive]}>
                    ⏰ {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="slide" onRequestClose={() => setShowSuccessModal(false)}>
        <View style={styles.modalBackdropDark}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <Text style={{ fontSize: 32 }}>✅</Text>
            </View>
            <Text style={styles.successTitle}>Appointment Booked!</Text>
            <Text style={styles.successSub}>
              Your appointment has been successfully scheduled and saved.
            </Text>

            <View style={styles.successInfoBox}>
              <Text style={styles.successInfoLabel}>BOOKING ID</Text>
              <Text style={styles.successInfoVal}>{bookedAppointmentId ? `#${bookedAppointmentId}` : 'Confirmed'}</Text>

              <Text style={[styles.successInfoLabel, { marginTop: 8 }]}>CLINIC & DOCTOR</Text>
              <Text style={styles.successInfoVal}>🏥 {selectedClinic?.name}</Text>
              <Text style={styles.successInfoSub}>🩺 {selectedDoctor?.full_name}</Text>

              <Text style={[styles.successInfoLabel, { marginTop: 8 }]}>DATE & TIME</Text>
              <Text style={styles.successInfoVal}>📅 {selectedDate} · ⏰ {selectedTimeSlot}</Text>
            </View>

            <TouchableOpacity
              style={styles.doneSuccessBtn}
              onPress={() => {
                setShowSuccessModal(false);
                setCurrentStep(1);
                setSelectedClinic(null);
                setSelectedDoctor(null);
              }}>
              <Text style={styles.doneSuccessBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 110,
  },
  bookingFlowShell: {
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#2dd4bf',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },

  /* Hero Banner */
  heroBanner: {
    borderTopLeftRadius: 10.5,
    borderTopRightRadius: 10.5,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 17,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#075a5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  heroBadgePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 14,
  },
  heroBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  heroIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.82)',
    marginBottom: 18,
  },

  /* 3-Step Wizard Capsule */
  wizardCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 28,
    padding: 4,
  },
  wizardStepBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 24,
  },
  wizardStepBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  wizardStepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardStepCircleActive: {
    backgroundColor: '#a7f3d0',
  },
  wizardStepCircleCompleted: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardStepCheckmark: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  wizardStepNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  wizardStepNumberActive: {
    color: '#074c50',
  },
  wizardStepText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  wizardStepTextActive: {
    color: '#074c50',
    fontWeight: '800',
  },

  /* Step 1 & Step 2 Main White Card */
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cardHeaderIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTextCol: {
    flex: 1,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardHeaderSubtitle: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 1,
  },

  /* Badge and Action Row */
  badgeAndActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  clinicsFoundBadge: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  clinicsFoundText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  filterResetBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Filter Fields */
  filtersSection: {
    gap: 10,
  },
  filterFieldGroup: {
    gap: 4,
  },
  filterFieldLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0d9488',
    letterSpacing: 0.5,
  },
  filterSelectBox: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterSelectBoxText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
    marginRight: 6,
  },
  filterSelectBoxPlaceholder: {
    color: '#94a3b8',
    fontWeight: '400',
  },
  searchInputBox: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0f172a',
    paddingVertical: 0,
  },

  /* Divider */
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },

  /* Section Title Row */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionStepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionStepBadgeText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0d9488',
  },
  sectionHeadingText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  countBadgePill: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },

  /* Clinics List */
  clinicsListContainer: {
    gap: 10,
  },
  clinicItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 12,
  },
  clinicItemCardSelected: {
    borderColor: '#0d9488',
    backgroundColor: '#f0fdfa',
    borderWidth: 1.6,
  },
  buildingIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  clinicLogoImage: {
    width: '100%',
    height: '100%',
  },
  clinicInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  clinicTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  clinicTitleText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  clinicLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  clinicLocationText: {
    fontSize: 12,
    color: '#64748b',
  },
  doctorsCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0d9488',
    marginTop: 3,
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyIconText: {
    fontSize: 34,
  },
  emptyTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySubText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 240,
  },
  resetSearchBtn: {
    marginTop: 8,
    backgroundColor: '#0d9488',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  resetSearchBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },

  /* Step 2: Choose a doctor header */
  doctorHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  doctorBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorStepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorStepBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f766e',
  },
  doctorStepTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  doctorStepSubtitle: {
    fontSize: 12.5,
    color: '#64748b',
    marginLeft: 48,
    marginTop: -2,
    marginBottom: 14,
  },
  doctorSearchInputBox: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  doctorSearchTextInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 0,
  },

  /* Doctor Cards (Exact match to screenshot) */
  doctorsListContainer: {
    gap: 12,
  },
  doctorCardNew: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  doctorCardNewSelected: {
    borderColor: '#0d9488',
    backgroundColor: '#f0fdfa',
    borderWidth: 1.6,
  },
  docCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docSquircleAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#cffafe',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  docSquircleImg: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  docDetailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  docNameNew: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  docSpecNew: {
    fontSize: 12.5,
    color: '#64748b',
    textTransform: 'lowercase',
    marginTop: 2,
  },
  docCardDivider: {
    height: 1,
    backgroundColor: '#f8fafc',
    marginVertical: 12,
  },
  docCardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docFeeLabelNew: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '500',
  },
  docFeeValNew: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#075985',
  },

  /* Step 3: Summary & Form */
  summaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 10,
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
  summaryCol: {
    gap: 2,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  summarySub: {
    fontSize: 11,
    color: '#64748b',
  },
  summaryChangeLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0d9488',
  },

  formContainer: {
    gap: 12,
  },
  formHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  formGroup: {
    gap: 4,
    marginBottom: 13,
  },
  formLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  asterisk: {
    color: '#ef4444',
  },
  formPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    height: 36,
    paddingHorizontal: 10,
  },
  formPickerBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0f172a',
  },
  formPickerDisabled: {
    backgroundColor: '#f8fafc',
    opacity: 0.72,
  },
  formInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12.5,
    color: '#0f172a',
  },
  formInputMulti: {
    height: 78,
    textAlignVertical: 'top',
  },
  submitBookingBtn: {
    backgroundColor: '#074c50',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBookingBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
  },

  /* Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalBackdropDark: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
    alignSelf: 'center',
    maxHeight: '78%',
  },
  modalBoxTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalOptionItem: {
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalOptionText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOptionTextActive: {
    color: '#0d9488',
    fontWeight: '800',
  },
  slotGroupTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748b',
    marginTop: 8,
    marginBottom: 4,
    width: '100%',
  },
  noSlotsText: { color: '#64748b', fontSize: 13, textAlign: 'center', paddingVertical: 20 },

  scheduleOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.72)', justifyContent: 'flex-end' },
  scheduleModalCard: { width: '100%', maxWidth: 430, height: '99%', alignSelf: 'center', backgroundColor: '#f8fafc', borderTopLeftRadius: 10, borderTopRightRadius: 10, overflow: 'visible' },
  scheduleModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 18, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  scheduleHeaderIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  scheduleModalTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  scheduleModalSubtitle: { color: '#d5f5f1', fontSize: 11, marginTop: 2, fontWeight: '600' },
  scheduleCloseText: { color: '#bce8e7', fontSize: 25, lineHeight: 28 },
  scheduleModalBody: { paddingHorizontal: 14, paddingTop: 28, backgroundColor: '#f8fafc' },
  scheduleFieldLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, color: '#0f172a', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  inlineCalendarCard: { position: 'absolute', zIndex: 30, top: 72, left: 40, right: 18, backgroundColor: '#ffffff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#0f172a', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  calendarControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 6 },
  calendarArrow: { color: '#475569', fontSize: 26, lineHeight: 28, paddingHorizontal: 6 },
  calendarMonthTitle: { color: '#334155', fontSize: 13, fontWeight: '700' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarWeekday: { width: '14.285%', color: '#64748b', fontSize: 11, textAlign: 'center', marginBottom: 7 },
  calendarDay: { width: '14.285%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginBottom: 2 },
  calendarDaySelected: { backgroundColor: '#20aaa7' },
  calendarDayText: { color: '#475569', fontSize: 12 },
  calendarDayTextSelected: { color: '#ffffff', fontWeight: '800' },
  timeOptionsCard: { position: 'absolute', zIndex: 30, top: 72, left: 0, right: 0, backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', shadowColor: '#0f172a', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  timeSearchRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  timeSearchInput: { flex: 1, color: '#334155', fontSize: 13, paddingVertical: 10 },
  timeOptionsList: { maxHeight: 200 },
  timeOption: { paddingHorizontal: 14, paddingVertical: 9 },
  timeOptionSelected: { backgroundColor: '#d9f3f0' },
  timeOptionText: { color: '#334155', fontSize: 13 },
  timeOptionTextSelected: { color: '#0d9488', fontWeight: '700' },
  providerUnavailableNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fffbeb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginTop: 7 },
  providerUnavailableText: { flex: 1, color: '#92400e', fontSize: 12, fontWeight: '600' },
  providerUnavailableRetry: { color: '#78350f', fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' },
  scheduleModalFooter: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  scheduleCancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 12, backgroundColor: '#f8fafc' },
  scheduleCancelText: { color: '#334155', fontSize: 12, fontWeight: '700' },
  scheduleConfirmBtn: { flex: 1.35, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 10, backgroundColor: '#8dc4cd' },
  scheduleConfirmReady: { backgroundColor: '#087d84' },
  scheduleConfirmDisabled: { opacity: 0.75 },
  scheduleConfirmText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  scheduleSecurityRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#ffffff', paddingBottom: 12 },
  scheduleSecurityText: { color: '#64748b', textAlign: 'center', fontSize: 11 },
  placeholderPickerText: { color: '#94a3b8' },

  /* Success Modal */
  successModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    gap: 10,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
  },
  successSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  successInfoBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
  },
  successInfoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
  },
  successInfoVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  successInfoSub: {
    fontSize: 11,
    color: '#0d9488',
    fontWeight: '700',
  },
  doneSuccessBtn: {
    backgroundColor: '#074c50',
    borderRadius: 12,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  doneSuccessBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default BookAppointmentScreen;
