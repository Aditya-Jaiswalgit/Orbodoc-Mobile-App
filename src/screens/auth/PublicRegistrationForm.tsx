import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { BriefcaseMedical, ChevronDown, Eye, EyeOff, FlaskConical, Globe2, MapPin, Search, UserRound, X } from 'lucide-react-native';
import { CustomCalendarPicker } from '../../components/common/CustomCalendarPicker';
import { RegistrationLocation } from '../../hooks/usePublicRegistration';
import { PublicDoctorRegistration, PublicLabRegistration, PublicPatientRegistration } from '../../api/publicRegistrationApi';

type Props = {
  kind: 'patient' | 'doctor' | 'lab';
  states: RegistrationLocation[];
  cities: RegistrationLocation[];
  selectedStateId: number | null;
  locationsLoading: boolean;
  citiesLoading: boolean;
  submitting: boolean;
  error: string;
  onSelectState: (id: number | null) => void;
  onSubmitPatient: (data: PublicPatientRegistration) => Promise<boolean>;
  onSubmitDoctor: (data: PublicDoctorRegistration) => Promise<boolean>;
  onSubmitLab: (data: PublicLabRegistration) => Promise<boolean>;
  onBackToLogin: () => void;
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[6-9]\d{9}$/;

export function PublicRegistrationForm(props: Props) {
  const { kind } = props;
  const { width } = useWindowDimensions();
  const isPatient = kind === 'patient';
  const isDoctor = kind === 'doctor';
  const isLab = kind === 'lab';
  const [values, setValues] = useState<Record<string, string>>({ gender: 'Male', country: 'India' });
  const [homeCollection, setHomeCollection] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [picker, setPicker] = useState<'state' | 'city' | 'blood' | 'gender' | 'country' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const choices = useMemo(() => picker === 'state' ? props.states : picker === 'city' ? props.cities : picker === 'blood' ? BLOOD_GROUPS.map((name, i) => ({ id: i, name })) : picker === 'country' ? [{ id: 1, name: 'India' }] : ['Male', 'Female', 'Other'].map((name, i) => ({ id: i, name })), [picker, props.states, props.cities]);
  const visibleChoices = useMemo(() => choices.filter(item => item.name.toLowerCase().includes(pickerSearch.trim().toLowerCase())), [choices, pickerSearch]);
  const requiredFields = isPatient
    ? ['full_name', 'phone', 'gender', 'date_of_birth', 'state', 'city', 'password', 'confirm_password']
    : isDoctor ? ['full_name', 'email', 'phone', 'country', 'state', 'city', 'specialization', 'qualification', 'registration_number', 'video_rate_per_minute', 'password', 'confirm_password']
      : ['lab_name', 'owner_name', 'lab_mobile_number', 'email', 'state', 'city', 'license_number', 'address', 'password', 'confirm_password'];
  const fieldError = (key: string, source: Record<string, string>) => {
    const value = source[key] || '';
    if (requiredFields.includes(key) && !value.trim()) return 'This field is required.';
    if (isPatient && key === 'full_name' && (value.trim().length < 2 || value.trim().length > 100)) return 'Name must be between 2 and 100 characters.';
    if ((key === 'phone' || key === 'lab_mobile_number') && value && !phonePattern.test(value.trim())) return 'Enter a valid 10-digit Indian mobile number.';
    if (key === 'email' && value && !emailPattern.test(value.trim())) return 'Enter a valid email address.';
    if (key === 'password' && value && value.length < 8) return 'Password must be at least 8 characters.';
    if (key === 'confirm_password' && value && source.password !== value) return 'Passwords do not match.';
    if (isDoctor && key === 'video_rate_per_minute' && value && Number(value) <= 0) return 'Fee must be greater than zero.';
    if (isPatient && key === 'date_of_birth' && value) {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!date || date.getFullYear() !== Number(match?.[1]) || date.getMonth() !== Number(match?.[2]) - 1 || date.getDate() !== Number(match?.[3]) || date > today) {
        return 'Enter a valid date in YYYY-MM-DD format.';
      }
    }
    return '';
  };
  const set = (key: string, value: string) => {
    const updated = { ...values, [key]: value };
    setValues(updated);
    setErrors(current => ({
      ...current,
      [key]: fieldError(key, updated),
      ...(key === 'password' ? { confirm_password: fieldError('confirm_password', updated) } : {}),
    }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    requiredFields.forEach(key => { const message = fieldError(key, values); if (message) next[key] = message; });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    const state = props.states.find(item => item.id === props.selectedStateId)?.name || values.state;
    const city = props.cities.find(item => item.name === values.city)?.name || values.city;
    const common = { full_name: values.full_name.trim(), phone: values.phone.trim(), password: values.password, state, city };
    const ok = isPatient
      ? await props.onSubmitPatient({ ...common, gender: values.gender, date_of_birth: values.date_of_birth, blood_group: values.blood_group || null })
      : isDoctor ? await props.onSubmitDoctor({ ...common, email: values.email.trim(), country: values.country.trim(), specialization: values.specialization.trim(), qualification: values.qualification.trim(), registration_number: values.registration_number.trim(), consultation_fee: Number(values.video_rate_per_minute), video_rate_per_minute: Number(values.video_rate_per_minute) })
        : await props.onSubmitLab({ lab_name: values.lab_name.trim(), owner_name: values.owner_name.trim(), lab_mobile_number: values.lab_mobile_number.trim(), email: values.email.trim(), password: values.password, license_number: values.license_number.trim(), address: values.address.trim(), state, city, home_collection_available: homeCollection });
    if (ok) props.onBackToLogin();
  };

  const field = (key: string, label: string, placeholder: string, options: { keyboardType?: any; secure?: boolean; multiline?: boolean; suffix?: React.ReactNode } = {}) => (
    <View style={styles.field} key={key}>
      <Text style={styles.label}>{label}{key !== 'blood_group' ? <Text style={styles.required}> *</Text> : null}</Text>
      <View style={[styles.inputWrap, errors[key] ? styles.inputError : null]}>
        <TextInput style={[styles.input, options.multiline ? styles.multiline : null]} value={values[key] || ''} onChangeText={text => set(key, ['phone', 'lab_mobile_number'].includes(key) ? text.replace(/\D/g, '').slice(0, 10) : text)} placeholder={placeholder} placeholderTextColor="#94a3b8" keyboardType={options.keyboardType || 'default'} autoCapitalize={options.secure || key === 'email' ? 'none' : 'sentences'} secureTextEntry={options.secure && !(key === 'password' ? showPassword : showConfirm)} multiline={options.multiline} />
        {options.suffix}
      </View>
      {errors[key] ? <Text style={styles.errorText}>{errors[key]}</Text> : null}
    </View>
  );

  const select = (key: string, label: string, placeholder: string, type: NonNullable<typeof picker>, required = true, disabled = false) => (
    <View style={styles.field} key={key}>
      <Text style={styles.label}>{label}{required ? <Text style={styles.required}> *</Text> : null}</Text>
      <TouchableOpacity disabled={disabled} style={[styles.select, errors[key] ? styles.inputError : null, disabled && styles.disabledSelect]} onPress={() => setPicker(type)} activeOpacity={0.8}>
        <View style={styles.selectTextRow}>{type === 'country' ? <Globe2 size={16} color="#64748b" /> : type === 'state' || type === 'city' ? <MapPin size={16} color="#64748b" /> : null}<Text style={values[key] ? styles.selectValue : styles.placeholder}>{values[key] || placeholder}</Text></View>
        <ChevronDown size={18} color="#64748b" />
      </TouchableOpacity>
      {errors[key] ? <Text style={styles.errorText}>{errors[key]}</Text> : null}
    </View>
  );

  const passwordField = (key: 'password' | 'confirm_password', label: string) => field(key, label, key === 'password' ? 'At least 8 characters' : 'Re-enter password', { secure: true, suffix: <TouchableOpacity onPress={() => key === 'password' ? setShowPassword(v => !v) : setShowConfirm(v => !v)} style={styles.eye}>{key === 'password' ? (showPassword ? <EyeOff size={19} color="#64748b" /> : <Eye size={19} color="#64748b" />) : (showConfirm ? <EyeOff size={19} color="#64748b" /> : <Eye size={19} color="#64748b" />)}</TouchableOpacity> });

  return (
    <View style={[styles.card, width >= 640 && styles.cardWide]}>
      <View style={styles.headingRow}><View style={styles.iconBadge}>{isPatient ? <UserRound size={20} color="#059669" /> : isDoctor ? <BriefcaseMedical size={20} color="#059669" /> : <FlaskConical size={20} color="#059669" />}</View><View style={styles.headingText}><Text style={[styles.title, width >= 640 && styles.titleWide]}>{isPatient ? 'Register as a patient' : isDoctor ? 'Register doctor for teleconsultation' : 'Register as Lab'}</Text><Text style={styles.subtitle}>{isPatient ? 'Create your patient portal account.' : isDoctor ? 'Apply for an independent doctor profile.' : 'Share the main lab and contact details to create your lab account.'}</Text></View></View>
      {props.error ? <View style={styles.errorBanner}><Text style={styles.errorText}>{props.error}</Text></View> : null}
      <View style={styles.formScroll}>
        {isLab ? <>
          {field('lab_name', 'Lab Name', 'Enter lab name')}
          {field('owner_name', 'Owner / Contact Person', 'Enter owner name')}
          {field('lab_mobile_number', 'Lab Mobile Number', 'Enter lab contact number', { keyboardType: 'phone-pad' })}
          {field('license_number', 'Lab Registration / License Number', 'Enter license number')}
          {field('email', 'Email', 'lab@example.com', { keyboardType: 'email-address' })}
          {passwordField('password', 'Password')}
          {passwordField('confirm_password', 'Confirm Password')}
          {select('state', 'State', props.locationsLoading ? 'Loading states...' : 'Select state / UT', 'state', true, props.locationsLoading)}
          {select('city', 'City', !props.selectedStateId ? 'Select state first' : props.citiesLoading ? 'Loading cities...' : 'Select city', 'city', true, !props.selectedStateId || props.citiesLoading)}
          {field('address', 'Address', 'Enter complete lab address', { multiline: true })}
          <View style={styles.homeCollectionRow}><View style={styles.homeCollectionText}><Text style={styles.label}>Available for Home Collection</Text><Text style={styles.helperText}>Patients can request sample collection from their address.</Text></View><Switch value={homeCollection} onValueChange={setHomeCollection} trackColor={{ false: '#cbd5e1', true: '#6ee7b7' }} thumbColor={homeCollection ? '#059669' : '#f8fafc'} /></View>
        </> : <>
        {field('full_name', 'Full Name', isPatient ? 'Enter patient name' : 'Enter full name')}
        {isPatient ? <>
          {field('phone', 'Mobile Number', '10-digit mobile number', { keyboardType: 'phone-pad' })}
          <View style={styles.field}>
            <Text style={styles.label}>Date of Birth <Text style={styles.required}>*</Text></Text>
            <CustomCalendarPicker
              selectedDate={values.date_of_birth ? new Date(`${values.date_of_birth}T00:00:00`) : undefined}
              placeholder="Select date of birth"
              fromYear={1900}
              toYear={new Date().getFullYear()}
              maximumDate={new Date()}
              formatTriggerDate={date => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)}
              triggerStyle={[styles.select, errors.date_of_birth ? styles.inputError : null]}
              triggerTextStyle={values.date_of_birth ? styles.selectValue : styles.placeholder}
              iconColor="#64748b"
              onDateChange={date => set('date_of_birth', `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`)}
            />
            {errors.date_of_birth ? <Text style={styles.errorText}>{errors.date_of_birth}</Text> : null}
          </View>
          {select('gender', 'Gender', 'Select gender', 'gender')}
          {select('blood_group', 'Blood Group', 'Select blood group', 'blood', false)}
          {select('state', 'State', props.locationsLoading ? 'Loading states...' : 'Select state', 'state', true, props.locationsLoading)}
          {select('city', 'City', !props.selectedStateId ? 'Select state first' : props.citiesLoading ? 'Loading cities...' : 'Select city', 'city', true, !props.selectedStateId || props.citiesLoading)}
          {passwordField('password', 'Password')}
          {passwordField('confirm_password', 'Confirm Password')}
        </> : <>
          {field('email', 'Email Address', 'name@example.com', { keyboardType: 'email-address' })}
          {field('phone', 'Phone', 'Enter 10-digit mobile number', { keyboardType: 'phone-pad' })}
          {passwordField('password', 'Password')}
          {passwordField('confirm_password', 'Confirm Password')}
          {field('specialization', 'Specialization', 'e.g. Cardiology')}
          {field('qualification', 'Qualification', 'e.g. MBBS, MD')}
          {select('country', 'Country', 'Select country', 'country')}
          {select('state', 'State', props.locationsLoading ? 'Loading states...' : 'Select state', 'state', true, props.locationsLoading)}
          {select('city', 'City', !props.selectedStateId ? 'Select state first' : props.citiesLoading ? 'Loading cities...' : 'Select city', 'city', true, !props.selectedStateId || props.citiesLoading)}
          {field('registration_number', 'Registration Number', 'Enter medical registration number')}
          {field('video_rate_per_minute', 'Consultation Fees (₹)', 'Enter consultation fees', { keyboardType: 'decimal-pad' })}
        </>}
        </>}
        <TouchableOpacity style={[styles.submit, props.submitting && styles.disabled]} onPress={submit} disabled={props.submitting} activeOpacity={0.85}>{props.submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{isPatient ? 'Create Patient Profile' : isDoctor ? 'Register Now' : 'Register Lab'}</Text>}</TouchableOpacity>
        <TouchableOpacity onPress={props.onBackToLogin} style={styles.backButton}><Text style={styles.backText}>Already have an account? Sign in</Text></TouchableOpacity>
      </View>
      <Modal transparent visible={picker !== null} animationType="fade" onRequestClose={() => setPicker(null)}>
        <View style={styles.modalBackdrop}><View style={styles.pickerCard}><View style={styles.pickerHeader}><Text style={styles.pickerTitle}>Select {picker === 'blood' ? 'blood group' : picker}</Text><TouchableOpacity onPress={() => { setPicker(null); setPickerSearch(''); }}><X size={21} color="#475569" /></TouchableOpacity></View><View style={styles.searchWrap}><Search size={17} color="#64748b" /><TextInput style={styles.searchInput} placeholder={`Search ${picker || ''}...`} placeholderTextColor="#94a3b8" value={pickerSearch} onChangeText={setPickerSearch} autoCapitalize="none" /></View><FlatList data={visibleChoices} keyExtractor={item => String(item.id)} ListEmptyComponent={<Text style={styles.empty}>{picker === 'city' && !props.selectedStateId ? 'Select a state first.' : 'No matching options.'}</Text>} renderItem={({ item }) => <TouchableOpacity style={styles.option} onPress={() => { const key = picker === 'blood' ? 'blood_group' : picker; if (key === 'state') { set('state', item.name); set('city', ''); void props.onSelectState(item.id); } else if (key === 'city') set('city', item.name); else set(key || '', item.name); setErrors(current => ({ ...current, [key || '']: '' })); setPicker(null); setPickerSearch(''); }}><Text style={styles.optionText}>{item.name}</Text></TouchableOpacity>} /></View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 28, borderWidth: 1, borderColor: '#f1f5f9', padding: 20, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.07, shadowRadius: 18, elevation: 3 }, cardWide: { padding: 24 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }, iconBadge: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' }, headingText: { flex: 1 }, title: { fontFamily: 'Inter', color: '#0f172a', fontSize: 24, lineHeight: 32, fontWeight: '700' }, titleWide: { fontFamily: 'Inter', fontSize: 30, lineHeight: 36 }, subtitle: { fontFamily: 'Inter', color: '#64748b', fontSize: 14, lineHeight: 24, marginTop: 3 },
  formScroll: { paddingBottom: 6 }, field: { marginBottom: 16 }, label: { fontFamily: 'Inter', color: '#334155', fontSize: 14, fontWeight: '600', marginBottom: 6 }, required: { color: '#ef4444' }, inputWrap: { minHeight: 46, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 16, paddingHorizontal: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center' }, input: { fontFamily: 'Inter', flex: 1, minHeight: 46, color: '#0f172a', fontSize: 16, paddingVertical: 9 }, multiline: { minHeight: 70, textAlignVertical: 'top' }, eye: { padding: 7 }, select: { minHeight: 46, paddingHorizontal: 16, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff' }, disabledSelect: { opacity: 0.55 }, selectValue: { fontFamily: 'Inter', color: '#0f172a', fontSize: 16 }, placeholder: { fontFamily: 'Inter', color: '#94a3b8', fontSize: 16 }, inputError: { borderColor: '#ef4444' }, errorText: { fontFamily: 'Inter', color: '#dc2626', fontSize: 12, marginTop: 4 }, errorBanner: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, padding: 11, borderRadius: 10, marginBottom: 12 }, helper: { fontFamily: 'Inter', color: '#64748b', fontSize: 12, marginTop: -7, marginBottom: 9 },
  secureNote: { backgroundColor: '#f0fdfa', borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 }, secureText: { fontFamily: 'Inter', color: '#1d7c72', fontSize: 12, flex: 1 }, submit: { minHeight: 50, borderRadius: 12, marginTop: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#27A599' }, disabled: { opacity: 0.65 }, submitText: { fontFamily: 'Inter', color: '#fff', fontSize: 14, fontWeight: '600' }, backButton: { alignItems: 'center', paddingVertical: 15 }, backText: { fontFamily: 'Inter', color: '#27a599', fontSize: 14, fontWeight: '600' }, modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 22 }, pickerCard: { backgroundColor: '#fff', borderRadius: 18, maxHeight: '75%', overflow: 'hidden' }, pickerHeader: { padding: 16, borderBottomWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, pickerTitle: { fontFamily: 'Inter', color: '#0f172a', fontSize: 20, fontWeight: '700', textTransform: 'capitalize' }, searchWrap: { minHeight: 46, margin: 12, marginBottom: 6, paddingHorizontal: 12, borderRadius: 11, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', gap: 8 }, searchInput: { fontFamily: 'Inter', flex: 1, paddingVertical: 9, color: '#0f172a', fontSize: 16 }, option: { paddingHorizontal: 17, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e2e8f0' }, optionText: { fontFamily: 'Inter', color: '#334155', fontSize: 14 }, empty: { fontFamily: 'Inter', padding: 20, color: '#64748b', textAlign: 'center' }, selectTextRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  homeCollectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderWidth: 1, borderColor: '#ccfbf1', backgroundColor: '#f0fdfa', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10, marginBottom: 12 }, homeCollectionText: { flex: 1 }, helperText: { fontFamily: 'Inter', color: '#64748b', fontSize: 12, marginTop: 2 },
});
