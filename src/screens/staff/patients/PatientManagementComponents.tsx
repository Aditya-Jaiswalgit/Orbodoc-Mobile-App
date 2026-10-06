import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
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
  Activity,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  Columns3,
  FileText,
  Edit3,
  FilterX,
  FlaskConical,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  User,
  UserRound,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react-native';
import { PatientModel } from '../../../types/clinicTypes';
import { CustomCalendarPicker } from '../../../components/common/CustomCalendarPicker';
import { focusedCardOutline, usePatientCardFocus } from '../../../components/common/PatientCardFocusContext';
import { apiFetch } from '../../../api/apiConfig';
import {
  PatientBillingSummary,
  PatientConsultation,
} from '../../../api/patientApi';

const COLORS = {
  teal: '#0D9488',
  ink: '#0F172A',
  muted: '#64748B',
  line: '#E2E8F0',
  pale: '#F8FAFC',
};

export interface PatientFormValues {
  full_name: string;
  phone: string;
  email: string;
  gender: 'male' | 'female' | 'other' | '';
  date_of_birth: string;
  blood_group: string;
  address: string;
  city: string;
  state: string;
  emergency_contact: string;
  emergency_contact_name: string;
  emergency_relation: string;
  allergies: string;
  medical_history: string;
}

interface PatientLocationState {
  id: number;
  state_name: string;
  state_code?: string;
}

interface PatientLocationCity {
  id: number;
  city_name: string;
}

export const emptyPatientForm: PatientFormValues = {
  full_name: '',
  phone: '',
  email: '',
  gender: '',
  date_of_birth: '',
  blood_group: '',
  address: '',
  city: '',
  state: '',
  emergency_contact: '',
  emergency_contact_name: '',
  emergency_relation: '',
  allergies: '',
  medical_history: '',
};

const patientToForm = (patient?: PatientModel | null): PatientFormValues => ({
  ...emptyPatientForm,
  ...Object.fromEntries(
    Object.keys(emptyPatientForm).map(key => [
      key,
      String((patient as any)?.[key] ?? ''),
    ]),
  ),
  gender: patient?.gender || '',
});

export function PatientStatsCards({
  total,
  active,
  inactive,
  today,
  thisWeek,
  onSelect,
}: {
  total: number;
  active: number;
  inactive: number;
  today: number;
  thisWeek: number;
  onSelect?: (
    selection: 'total' | 'active' | 'inactive' | 'today' | 'week',
  ) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const { focusedCard, focusCard } = usePatientCardFocus();
  const wideLayout = screenWidth >= 720;
  const selectStat = (
    selection: 'total' | 'active' | 'inactive' | 'today' | 'week',
  ) => {
    focusCard(`stat-${selection}`);
    onSelect?.(selection);
  };
  const cards = [
    {
      key: 'total' as const,
      label: 'Total Patients',
      value: total,
      tint: '#E6F4F1',
      color: COLORS.teal,
      icon: Users,
    },
    {
      key: 'active' as const,
      label: 'Active / Inactive',
      value: `${active} / ${inactive}`,
      tint: '#E8F7EF',
      color: '#16A36A',
      icon: Activity,
    },
    {
      key: 'today' as const,
      label: "Today's Patient Registration",
      value: today,
      tint: '#E6F4F1',
      color: COLORS.teal,
      icon: Calendar,
    },
    {
      key: 'week' as const,
      label: 'New This Week',
      value: thisWeek,
      tint: '#FFF4E5',
      color: '#F59E0B',
      icon: UserPlus,
    },
  ];

  return (
    <View style={styles.statsGrid}>
      {cards.map(({ key, label, value, tint, color, icon: Icon }) => {
        const selected = focusedCard === `stat-${key}` ||
          (key === 'active' && focusedCard === 'stat-inactive');
        const cardStyle = [
          styles.statCard,
          wideLayout ? styles.statCardWide : styles.statCardNarrow,
          selected && styles.statCardSelected,
        ];
        const cardContent = (
          <>
            <View style={[styles.statIcon, { backgroundColor: tint }]}>
              <Icon size={17} color={color} />
            </View>
            {key === 'active' ? (
              <View style={styles.activeStats}>
                <TouchableOpacity
                  style={styles.activeStatColumn}
                  onPress={() => selectStat('active')}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${active} active patients`}
                >
                  <Text style={[styles.statValue, styles.activeStatValue]}>
                    {active}
                  </Text>
                  <Text style={styles.statLabel}>Active</Text>
                </TouchableOpacity>
                <View style={styles.statDivider} />
                <TouchableOpacity
                  style={styles.activeStatColumn}
                  onPress={() => selectStat('inactive')}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${inactive} inactive patients`}
                >
                  <Text style={[styles.statValue, styles.inactiveStatValue]}>
                    {inactive}
                  </Text>
                  <Text style={styles.statLabel}>Inactive</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.statCopy}>
                <Text style={styles.statValue} numberOfLines={1}>
                  {value}
                </Text>
                <Text style={styles.statLabel} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            )}
          </>
        );

        return key === 'active' ? (
          <View key={key} style={cardStyle}>
            {cardContent}
          </View>
        ) : (
          <TouchableOpacity
            key={key}
            style={cardStyle}
            activeOpacity={0.8}
            onPress={() => selectStat(key)}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${value}`}
          >
            {cardContent}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function FilterDropdown({
  value,
  placeholder,
  options,
  onChange,
  style,
}: {
  value: string;
  placeholder: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  style?: any;
}) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 300 });
  const triggerRef = useRef<any>(null);
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const { focusCard } = usePatientCardFocus();
  const selected = options.find(option => option.value === value);

  const showMenu = () => {
    focusCard('filters');
    triggerRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      const left = Math.max(8, Math.min(x, screenWidth - width - 8));
      setMenuPosition({
        top: y + height + 3,
        left,
        width: Math.min(width, screenWidth - left - 8),
        maxHeight: Math.max(140, Math.min(320, screenHeight - y - height - 20)),
      });
      setOpen(true);
    });
  };

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        style={[styles.filterDropdown, style]}
        onPress={showMenu}
        activeOpacity={0.75}
      >
        <Text style={styles.filterDropdownText} numberOfLines={1}>
          {selected?.label || placeholder}
        </Text>
        <ChevronDown size={15} color="#64748B" />
      </TouchableOpacity>
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.filterDropdownOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />
          <View style={[styles.filterDropdownMenu, menuPosition]}>
            <ScrollView
              style={{ maxHeight: menuPosition.maxHeight }}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={options.length > 6}
            >
            {options.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterDropdownOption,
                  option.value === value && styles.filterDropdownOptionSelected,
                ]}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.value === value ? <Check size={15} color={COLORS.teal} /> : <View style={styles.filterDropdownCheckSpacer} />}
                <Text style={[styles.filterDropdownOptionText, option.value === value && styles.filterDropdownOptionTextSelected]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function PatientFilterPanel({
  status,
  gender,
  bloodGroup,
  dateFrom,
  onStatusChange,
  onGenderChange,
  onBloodGroupChange,
  onDateFromChange,
  onDateToChange,
  onClearFilters,
  onOpenColumns,
}: {
  status: 'all' | 'active' | 'inactive';
  gender: string;
  bloodGroup: string;
  dateFrom: string;
  dateTo: string;
  onStatusChange: (value: 'all' | 'active' | 'inactive') => void;
  onGenderChange: (value: string) => void;
  onBloodGroupChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClearFilters: () => void;
  onOpenColumns: () => void;
}) {
  const { focusedCard, focusCard } = usePatientCardFocus();
  const { width: screenWidth } = useWindowDimensions();
  const compactFilters = screenWidth < 355;
  return (
    <View style={[styles.filterCard, focusedCard === 'filters' && focusedCardOutline]}>
      <View
        style={[
          styles.filterSelectRow,
          compactFilters && styles.filterSelectRowStacked,
        ]}
      >
        <FilterDropdown
          style={[
            styles.genderDropdown,
            compactFilters && styles.fullWidthDropdown,
          ]}
          value={gender === 'All' ? 'all' : gender}
          placeholder="All Genders"
          options={[
            { label: 'All Genders', value: 'all' },
            { label: 'Male', value: 'Male' },
            { label: 'Female', value: 'Female' },
            { label: 'Other', value: 'Other' },
          ]}
          onChange={value => onGenderChange(value === 'all' ? 'All' : value)}
        />
        <FilterDropdown
          style={[
            styles.bloodDropdown,
            compactFilters && styles.fullWidthDropdown,
          ]}
          value={bloodGroup === 'All' ? 'all' : bloodGroup}
          placeholder="All Blood Groups"
          options={[
            { label: 'All Blood Groups', value: 'all' },
            ...['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(
              value => ({
                label: value,
                value,
              }),
            ),
          ]}
          onChange={value =>
            onBloodGroupChange(value === 'all' ? 'All' : value)
          }
        />
      </View>
      <View
        style={[
          styles.filterSelectRow,
          compactFilters && styles.filterSelectRowStacked,
        ]}
      >
        <FilterDropdown
          style={[
            styles.statusDropdown,
            compactFilters && styles.fullWidthDropdown,
          ]}
          value={status}
          placeholder="All Status"
          options={[
            { label: 'All Status', value: 'all' },
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ]}
          onChange={value =>
            onStatusChange(value as 'all' | 'active' | 'inactive')
          }
        />
        <View
          style={[
            styles.registrationDateField,
            compactFilters && styles.fullWidthDropdown,
          ]}
        >
          <CustomCalendarPicker
            selectedDate={
              dateFrom ? new Date(`${dateFrom}T00:00:00`) : undefined
            }
            placeholder="Registration Date"
            triggerStyle={styles.registrationDateTrigger}
            triggerTextStyle={styles.registrationDateText}
            iconColor="#64748B"
            onOpen={() => focusCard('filters')}
            onDateChange={date => {
              const selected = [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, '0'),
                String(date.getDate()).padStart(2, '0'),
              ].join('-');
              onDateFromChange(selected);
              onDateToChange(selected);
            }}
          />
        </View>
      </View>
      <View style={styles.filterToolsRow}>
        <TouchableOpacity
          style={styles.clearFiltersIconButton}
          onPress={() => { focusCard('filters'); onClearFilters(); }}
          accessibilityLabel="Clear patient filters"
        >
          <FilterX size={16} color="#94A3B8" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.columnsButton} onPress={() => { focusCard('filters'); onOpenColumns(); }}>
          <Columns3 size={15} color="#334155" />
          <Text style={styles.columnsButtonText}>Columns</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function PatientFormModal({
  visible,
  patient,
  saving,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  patient?: PatientModel | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: PatientFormValues) => void;
}) {
  const [form, setForm] = useState<PatientFormValues>(emptyPatientForm);
  const [formError, setFormError] = useState('');
  const [states, setStates] = useState<PatientLocationState[]>([]);
  const [cities, setCities] = useState<PatientLocationCity[]>([]);
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [picker, setPicker] = useState<'blood' | 'state' | 'city' | null>(null);
  const [dobInput, setDobInput] = useState('');
  const initialCityName = React.useRef('');
  const { focusedCard, focusCard } = usePatientCardFocus();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  useEffect(() => {
    if (visible) {
      setForm(patientToForm(patient));
      initialCityName.current = patient?.city || '';
      setFormError('');
      setSelectedStateId('');
      setSelectedCityId('');
      setCities([]);
      setDobInput(formatPatientDate(patient?.date_of_birth || ''));
    }
  }, [visible, patient]);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    setLocationsLoading(true);
    apiFetch<PatientLocationState[]>('/location/states', { signal: controller.signal }).then(result => {
      if (!result.success || !Array.isArray(result.data)) {
        setFormError(result.message || 'Could not load states. Please reopen the form.');
        return;
      }
      setStates(result.data);
    }).catch(() => setFormError('Could not load states. Please reopen the form.'))
      .finally(() => { if (!controller.signal.aborted) setLocationsLoading(false); });
    return () => controller.abort();
  }, [visible]);

  useEffect(() => {
    if (!visible || !states.length) return;
    const normalized = form.state.trim().toLowerCase();
    const currentState = states.find(item => item.state_name.trim().toLowerCase() === normalized || item.state_code?.trim().toLowerCase() === normalized);
    if (currentState) setSelectedStateId(String(currentState.id));
  }, [form.state, states, visible]);

  useEffect(() => {
    if (!visible || !selectedStateId) {
      setCities([]);
      setSelectedCityId('');
      return;
    }
    const controller = new AbortController();
    setCitiesLoading(true);
    apiFetch<PatientLocationCity[]>(`/location/cities/${encodeURIComponent(selectedStateId)}`, { signal: controller.signal }).then(result => {
      if (!result.success || !Array.isArray(result.data)) {
        setFormError(result.message || 'Could not load cities for this state.');
        return;
      }
      setCities(result.data);
      const currentCity = result.data.find(item => item.city_name.trim().toLowerCase() === initialCityName.current.trim().toLowerCase());
      setSelectedCityId(currentCity ? String(currentCity.id) : '');
    }).catch(() => setFormError('Could not load cities for this state.'))
      .finally(() => { if (!controller.signal.aborted) setCitiesLoading(false); });
    return () => controller.abort();
  }, [selectedStateId, visible]);

  const update = (key: keyof PatientFormValues, value: string) => {
    setForm(previous => ({ ...previous, [key]: value }));
    if (formError) setFormError('');
  };

  const submit = () => {
    const name = form.full_name.trim();
    const phone = form.phone.trim();
    if (!name) return setFormError('Patient name is required.');
    if (!form.date_of_birth) return setFormError('Date of birth is required.');
    if (new Date(`${form.date_of_birth}T00:00:00`) < new Date('1900-01-01T00:00:00'))
      return setFormError('Date of birth must be on or after 01/01/1900.');
    if (new Date(`${form.date_of_birth}T00:00:00`) > new Date())
      return setFormError('Date of birth cannot be in the future.');
    if (!form.gender) return setFormError('Select gender.');
    if (!/^[6-9]\d{9}$/.test(phone))
      return setFormError('Enter a valid 10 digit mobile number.');
    if (!form.state) return setFormError('Select a state.');
    if (!form.city) return setFormError('Select a city.');
    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      return setFormError('Enter a valid email address.');
    }
    if (
      form.emergency_contact.trim() &&
      !/^[6-9]\d{9}$/.test(form.emergency_contact.trim())
    ) {
      return setFormError(
        'Emergency number must be a valid 10 digit mobile number.',
      );
    }
    onSubmit({ ...form, full_name: name, phone, email: form.email.trim() });
  };

  const field = (
    label: string,
    key: keyof PatientFormValues,
    placeholder: string,
    options: {
      keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'numeric';
      multiline?: boolean;
      maxLength?: number;
      required?: boolean;
      numericOnly?: boolean;
    } = {},
  ) => {
    const focusId = `patient-form-${key}`;
    const dateOfBirthField = key === 'date_of_birth';
    return (
      <View style={styles.formField} key={key}>
        <Text style={styles.fieldLabel}>{label}{options.required ? <Text style={styles.requiredMark}> *</Text> : null}</Text>
        {dateOfBirthField ? (
          <View style={[styles.dateInputRow, focusedCard === focusId && focusedCardOutline]}>
            <TextInput
              value={dobInput}
              onFocus={() => focusCard(focusId)}
              onChangeText={value => {
                const digits = value.replace(/\D/g, '').slice(0, 8);
                const formatted = digits.length > 4 ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}` : digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
                setDobInput(formatted);
                const match = formatted.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                if (!match) update('date_of_birth', '');
                else {
                  const [, day, month, year] = match;
                  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
                  update('date_of_birth', parsed.getFullYear() === Number(year) && parsed.getMonth() === Number(month) - 1 && parsed.getDate() === Number(day) ? `${year}-${month}-${day}` : '');
                }
              }}
              placeholder={placeholder}
              placeholderTextColor="#718096"
              keyboardType="number-pad"
              maxLength={10}
              style={styles.dateTextInput}
            />
            <CustomCalendarPicker
              selectedDate={form.date_of_birth ? new Date(`${form.date_of_birth}T00:00:00`) : undefined}
              placeholder=""
              triggerStyle={[styles.datePickerButton, styles.datePickerCalendarTrigger]}
              triggerTextStyle={styles.datePickerHiddenText}
              fromYear={1900}
              toYear={new Date().getFullYear()}
              minimumDate={new Date('1900-01-01T00:00:00')}
              maximumDate={new Date()}
              onOpen={() => focusCard(focusId)}
              onDateChange={date => {
                const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                update('date_of_birth', iso);
                setDobInput(formatPatientDate(iso));
              }}
            />
          </View>
        ) : (
          <TextInput
            value={String(form[key] ?? '')}
            onFocus={() => focusCard(focusId)}
            onChangeText={value => update(key, options.numericOnly ? value.replace(/\D/g, '').slice(0, options.maxLength || 10) : value)}
            placeholder={placeholder}
            placeholderTextColor="#718096"
            keyboardType={options.keyboardType || 'default'}
            autoCapitalize={options.keyboardType === 'email-address' ? 'none' : 'sentences'}
            multiline={options.multiline}
            maxLength={options.maxLength}
            style={[
              styles.formInput,
              options.multiline && styles.formInputMultiline,
              focusedCard === focusId && focusedCardOutline,
            ]}
          />
        )}
      </View>
    );
  };

  const selectLocation = (kind: 'state' | 'city', item: PatientLocationState | PatientLocationCity) => {
    setFormError('');
    if (kind === 'state' && 'state_name' in item) {
      initialCityName.current = '';
      setSelectedStateId(String(item.id));
      setSelectedCityId('');
      setCities([]);
      setForm(previous => ({ ...previous, state: item.state_name || '', city: '' }));
    } else if ('city_name' in item) {
      setSelectedCityId(String(item.id));
      update('city', item.city_name || '');
    }
    setPicker(null);
  };

  const age = getPatientAge(form.date_of_birth);
  const selectedState = states.find(item => String(item.id) === selectedStateId)?.state_name || form.state;
  const selectedCity = cities.find(item => String(item.id) === selectedCityId)?.city_name || form.city;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.modalBackdrop, styles.patientFormBackdrop]}>
        <View
          style={[
            styles.formModal,
            screenWidth >= 700 && styles.formModalDesktop,
            {
              width: Math.max(300, screenWidth - (screenWidth >= 700 ? 48 : 24)),
              height: Math.min(screenHeight * (screenWidth >= 700 ? 0.84 : 0.91), 760),
            },
          ]}
        >
          <View style={[styles.modalHeader, styles.patientFormHeader]}>
            <View style={[styles.headerIcon, styles.patientFormHeaderIcon]}>
              <UserRound size={18} color={COLORS.teal} />
            </View>
            <View style={styles.modalHeaderText}>
              <Text style={[styles.modalTitle, styles.patientFormTitle]}>
                {patient ? 'Edit Patient' : 'Add New Patient'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formSection}>
              <View style={styles.patientFormSectionHeadingRow}>
                <UserRound size={14} color={COLORS.muted} />
                <Text style={styles.patientFormSectionHeading}>Personal Information</Text>
              </View>
              {field('Name', 'full_name', 'Enter patient name', { required: true, maxLength: 100 })}
              {field('Date of Birth', 'date_of_birth', 'DD/MM/YYYY', { required: true })}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Age</Text>
                <TextInput value={age === null ? '-' : `${age} years`} editable={false} style={[styles.formInput, styles.disabledInput]} />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Gender<Text style={styles.requiredMark}> *</Text></Text>
                <View style={[styles.genderChoices, focusedCard === 'patient-form-gender' && styles.genderChoicesFocused]}>
                  {(['male', 'female', 'other'] as const).map(choice => (
                    <TouchableOpacity key={choice} onPress={() => { focusCard('patient-form-gender'); update('gender', choice); }} style={styles.genderRadioOption}>
                      <View style={[styles.radioOuter, form.gender === choice && styles.radioOuterSelected]}>{form.gender === choice ? <View style={styles.radioInner} /> : null}</View>
                      <Text style={styles.genderRadioText}>{choice[0].toUpperCase() + choice.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Blood Group</Text>
                <TouchableOpacity style={[styles.formSelect, focusedCard === 'patient-form-blood_group' && focusedCardOutline]} onPress={() => { focusCard('patient-form-blood_group'); setPicker('blood'); }}>
                  <Text style={[styles.formSelectText, !form.blood_group && styles.formPlaceholder]}>{form.blood_group || 'Select blood group'}</Text>
                  <ChevronDown size={16} color={COLORS.muted} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.formSection}>
              <View style={styles.patientFormSectionHeadingRow}><Text style={styles.patientFormSectionHeading}>Contact Information</Text></View>
              {field('Phone', 'phone', '9876543210', { required: true, keyboardType: 'phone-pad', maxLength: 10, numericOnly: true })}
              {field('Email', 'email', 'email@example.com', { keyboardType: 'email-address', maxLength: 254 })}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>State<Text style={styles.requiredMark}> *</Text></Text>
                <TouchableOpacity style={[styles.formSelect, focusedCard === 'patient-form-state' && focusedCardOutline]} onPress={() => { focusCard('patient-form-state'); setPicker('state'); }} disabled={locationsLoading}>
                  <Text style={[styles.formSelectText, !selectedState && styles.formPlaceholder]}>{locationsLoading ? 'Loading states...' : selectedState || 'Select state'}</Text>
                  <ChevronDown size={16} color={COLORS.muted} />
                </TouchableOpacity>
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>City<Text style={styles.requiredMark}> *</Text></Text>
                <TouchableOpacity style={[styles.formSelect, focusedCard === 'patient-form-city' && focusedCardOutline, (!selectedStateId || citiesLoading) && styles.disabledInput]} onPress={() => { focusCard('patient-form-city'); setPicker('city'); }} disabled={!selectedStateId || citiesLoading}>
                  <Text style={[styles.formSelectText, !selectedCity && styles.formPlaceholder]}>{citiesLoading ? 'Loading cities...' : selectedCity || (selectedStateId ? 'Select city' : 'Select state first')}</Text>
                  <ChevronDown size={16} color={COLORS.muted} />
                </TouchableOpacity>
              </View>
              {field('Address', 'address', 'Enter address', { multiline: true, maxLength: 200 })}
            </View>
            <View style={styles.formSection}>
              <View style={styles.patientFormSectionHeadingRow}><Text style={styles.patientFormSectionHeading}>Emergency Contact</Text></View>
              {field('Contact Name', 'emergency_contact_name', 'Enter emergency contact name', { maxLength: 100 })}
              {field('Relation', 'emergency_relation', 'Enter relation', { maxLength: 50 })}
              {field('Phone', 'emergency_contact', '9876543210', { keyboardType: 'phone-pad', maxLength: 10, numericOnly: true })}
            </View>
            {formError ? (
              <Text style={styles.errorText}>{formError}</Text>
            ) : null}
          </ScrollView>
          <View style={[styles.modalFooter, styles.patientFormFooter]}>
            <TouchableOpacity
              style={[styles.cancelButton, styles.patientFormActionButton]}
              disabled={saving}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, styles.patientFormActionButton, saving && styles.disabledButton]}
              disabled={saving}
              onPress={submit}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {patient ? 'Update Patient' : 'Add Patient'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <PatientOptionsModal
        visible={picker !== null}
        title={picker === 'state' ? 'Select state' : picker === 'city' ? 'Select city' : 'Select blood group'}
        options={picker === 'state' ? states.map(item => ({ id: String(item.id), label: item.state_name })) : picker === 'city' ? cities.map(item => ({ id: String(item.id), label: item.city_name })) : ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(value => ({ id: value, label: value }))}
        selectedId={picker === 'state' ? selectedStateId : picker === 'city' ? selectedCityId : form.blood_group}
        loading={picker === 'state' ? locationsLoading : picker === 'city' ? citiesLoading : false}
        onClose={() => {
          focusCard(`patient-form-${picker === 'blood' ? 'blood_group' : picker}`);
          setPicker(null);
        }}
        onSelect={id => {
          if (picker === 'state') {
            focusCard('patient-form-state');
            const item = states.find(row => String(row.id) === id);
            if (item) selectLocation('state', item);
          } else if (picker === 'city') {
            focusCard('patient-form-city');
            const item = cities.find(row => String(row.id) === id);
            if (item) selectLocation('city', item);
          } else {
            focusCard('patient-form-blood_group');
            update('blood_group', id);
            setPicker(null);
          }
        }}
      />
    </Modal>
  );
}

function PatientOptionsModal({
  visible,
  title,
  options,
  selectedId,
  loading,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  options: { id: string; label: string }[];
  selectedId: string;
  loading: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const { focusedCard, focusCard } = usePatientCardFocus();
  useEffect(() => { if (visible) setQuery(''); }, [visible]);
  const filtered = options.filter(option => option.label.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.pickerBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.pickerModal}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => focusCard('patient-form-picker-search')}
            placeholder={`Search ${title.toLowerCase()}...`}
            placeholderTextColor="#718096"
            style={[styles.pickerSearch, focusedCard === 'patient-form-picker-search' && focusedCardOutline]}
          />
          {loading ? <ActivityIndicator color={COLORS.teal} style={styles.pickerLoading} /> : (
            <ScrollView style={styles.pickerOptions} keyboardShouldPersistTaps="handled">
              {filtered.map(option => (
                <TouchableOpacity key={option.id} style={[styles.pickerOption, selectedId === option.id && styles.pickerOptionSelected]} onPress={() => onSelect(option.id)}>
                  {selectedId === option.id ? <Check size={16} color={COLORS.teal} /> : <View style={styles.pickerCheckSpacer} />}
                  <Text style={[styles.pickerOptionText, selectedId === option.id && styles.pickerOptionTextSelected]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
              {!filtered.length ? <Text style={styles.pickerEmpty}>No options found.</Text> : null}
            </ScrollView>
          )}
          <TouchableOpacity style={styles.pickerCancel} onPress={onClose}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function formatPatientDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

function getPatientAge(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  if (today.getMonth() < date.getMonth() || (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())) age--;
  return age >= 0 ? age : null;
}

export function PatientDetailsModal({
  visible,
  patient,
  summary,
  consultations,
  loading,
  onClose,
  canEdit = true,
  canDelete = false,
  canChangeStatus = true,
  canBookAppointment = true,
  canOpenAppointments = true,
  canOpenPrescriptions = true,
  canOpenLabs = true,
  canOpenBilling = true,
  onDelete,
  onEdit,
  onToggleStatus,
  onBookAppointment,
  onOpenAppointments,
  onOpenPrescriptions,
  onOpenLabs,
  onOpenBilling,
}: {
  visible: boolean;
  patient: PatientModel | null;
  summary: PatientBillingSummary | null;
  consultations: PatientConsultation[];
  loading: boolean;
  onClose: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canChangeStatus?: boolean;
  canBookAppointment?: boolean;
  canOpenAppointments?: boolean;
  canOpenPrescriptions?: boolean;
  canOpenLabs?: boolean;
  canOpenBilling?: boolean;
  onDelete?: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onBookAppointment: () => void;
  onOpenAppointments: () => void;
  onOpenPrescriptions: () => void;
  onOpenLabs: () => void;
  onOpenBilling: () => void;
}) {
  const active = Number(patient?.is_active ?? 1) === 1;
  const birthDate = formatLongPatientDate(patient?.date_of_birth);
  const registrationDate = formatShortPatientDate(patient?.registered_at || patient?.created_at);
  const lastVisit = formatShortPatientDate(summary?.last_visit || patient?.last_visit);
  const address = patient?.address || [patient?.city, patient?.state].filter(Boolean).join(', ');
  const row = (label: string, value?: string | number | null, Icon?: React.ComponentType<{ size?: number; color?: string }>) =>
    hasPatientDetail(value) ? (
      <View key={label} style={styles.detailRow}>
        <View style={styles.detailLabelGroup}>
          {Icon ? <Icon size={14} color="#32B8AE" /> : null}
          <Text style={styles.detailLabel}>{label}</Text>
        </View>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    ) : null;
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.detailsModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerIcon}>
              <Text style={styles.patientDetailsAvatarText}>{patient?.full_name?.trim().charAt(0).toUpperCase() || 'P'}</Text>
            </View>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {patient?.full_name || 'Patient Profile'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {patient?.patient_code || `Patient ID: ${patient?.id ?? '—'}`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.patientDetailsClose}>
              <X size={20} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
          {!loading && patient ? <View style={styles.patientDetailsHeaderActions}>
            <View style={[styles.detailsStatusPill, active ? styles.activePill : styles.inactivePill]}>
              <Text style={[styles.statusPillText, active ? styles.activeText : styles.inactiveText]}>{active ? 'Active' : 'Inactive'}</Text>
            </View>
            {canEdit ? <TouchableOpacity style={styles.editInformationButton} onPress={onEdit}>
              <Edit3 size={15} color="#1F2937" />
              <Text style={styles.editInformationText}>Edit Information</Text>
            </TouchableOpacity> : null}
          </View> : null}
          {loading || !patient ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={COLORS.teal} />
              <Text style={styles.loadingText}>Loading patient profile…</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.detailsContent}>
              <View style={{ display: 'none' }}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>
                    {patient.full_name?.trim().charAt(0).toUpperCase() || 'P'}
                  </Text>
                </View>
                <View style={styles.profileHeroCopy}>
                  <Text style={styles.profileName}>{patient.full_name}</Text>
                  <Text style={styles.profileCode}>
                    {patient.patient_code || `ID: ${patient.id}`}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      active ? styles.activePill : styles.inactivePill,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        active ? styles.activeText : styles.inactiveText,
                      ]}
                    >
                      {active ? 'ACTIVE' : 'INACTIVE'}
                    </Text>
                  </View>
                </View>
                {canEdit ? <TouchableOpacity
                  style={styles.editIconButton}
                  onPress={onEdit}
                >
                  <Text style={styles.editIconText}>Edit</Text>
                </TouchableOpacity> : null}
              </View>

              <DetailSection title="Personal Details" icon={User}>
                {row('Full Name', patient.full_name)}
                {row('Date of Birth', birthDate)}
                {row('Blood Group', patient.blood_group)}
              </DetailSection>
              <DetailSection title="Contact Information" icon={Phone}>
                {row('Phone', patient.phone, Phone)}
                {row('Email', patient.email, Mail)}
                {row('Address', address, MapPin)}
                {row('City', patient.city, MapPin)}
                {row('State', patient.state, MapPin)}
              </DetailSection>
              <DetailSection title="Visit Information" icon={Calendar}>
                {row('Registration Date', registrationDate)}
                {row('Last Visit', lastVisit)}
                {row('Total Visits', summary?.total_visits ?? patient.total_visits ?? 0)}
              </DetailSection>
              <DetailSection title="Emergency Contact" icon={ShieldAlert}>
                {row('Contact', patient.emergency_contact, Phone)}
              </DetailSection>
              <View style={[styles.detailSection, { display: 'none' }]}>
                <Text style={styles.sectionHeading}>CONSULTATION HISTORY</Text>
                {consultations.length ? (
                  consultations.slice(0, 5).map(item => (
                    <View
                      key={`${item.appointment_id}-${
                        item.prescription_id ?? 'visit'
                      }`}
                      style={styles.consultationCard}
                    >
                      <View style={styles.consultationTopRow}>
                        <Text style={styles.consultationDoctor}>
                          {item.doctor_name || 'Doctor visit'}
                        </Text>
                        <Text style={styles.consultationStatus}>
                          {String(item.status || '—').replace(/_/g, ' ')}
                        </Text>
                      </View>
                      <Text style={styles.consultationMeta}>
                        {item.appointment_date || 'Date unavailable'}
                        {item.appointment_time
                          ? ` • ${String(item.appointment_time).slice(0, 5)}`
                          : ''}
                        {item.specialization ? ` • ${item.specialization}` : ''}
                      </Text>
                      {item.reason ? (
                        <Text style={styles.consultationText}>
                          Reason: {item.reason}
                        </Text>
                      ) : null}
                      {item.diagnosis ? (
                        <Text style={styles.consultationText}>
                          Diagnosis: {item.diagnosis}
                        </Text>
                      ) : null}
                      {item.prescription_id ? (
                        <Text style={styles.consultationMeta}>
                          Prescription #{item.prescription_id}
                        </Text>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyConsultations}>
                    No consultation history found.
                  </Text>
                )}
              </View>
              <View style={[styles.actionSection, { display: 'none' }]}>
                <Text style={styles.sectionHeading}>PATIENT ACTIONS</Text>
                <View style={styles.actionGrid}>
                  {canBookAppointment ? <ActionButton
                    icon={CalendarDays}
                    title="Book Appointment"
                    onPress={onBookAppointment}
                  /> : null}
                  {canOpenAppointments ? <ActionButton
                    icon={CalendarDays}
                    title="Appointments"
                    onPress={onOpenAppointments}
                  /> : null}
                  {canOpenPrescriptions ? <ActionButton
                    icon={FileText}
                    title="Prescriptions"
                    onPress={onOpenPrescriptions}
                  /> : null}
                  {canOpenLabs ? <ActionButton
                    icon={FlaskConical}
                    title="Lab Reports"
                    onPress={onOpenLabs}
                  /> : null}
                  {canOpenBilling ? <ActionButton
                    icon={Wallet}
                    title="Billing"
                    onPress={onOpenBilling}
                  /> : null}
                  {patient.phone ? (
                    <ActionButton
                      icon={Phone}
                      title="Call Patient"
                      onPress={() => Linking.openURL(`tel:${patient.phone}`)}
                    />
                  ) : null}
                </View>
              </View>
              {false && canChangeStatus ? <TouchableOpacity
                style={[
                  styles.statusAction,
                  active ? styles.deactivateAction : styles.activateAction,
                ]}
                onPress={onToggleStatus}
              >
                <Text style={styles.statusActionText}>
                  {active ? 'Deactivate Patient' : 'Activate Patient'}
                </Text>
              </TouchableOpacity> : null}
              {false && canDelete ? <TouchableOpacity style={[styles.statusAction, { backgroundColor: '#FEE2E2', marginTop: 8 }]} onPress={onDelete}>
                <Text style={[styles.statusActionText, { color: '#B91C1C' }]}>Delete Patient</Text>
              </TouchableOpacity> : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function hasPatientDetail(value?: string | number | null) {
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized !== '' && normalized !== '-' && normalized !== 'null' && normalized !== 'undefined';
}

function formatShortPatientDate(value?: string | null) {
  if (!hasPatientDetail(value)) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US');
}

function formatLongPatientDate(value?: string | null) {
  if (!hasPatientDetail(value)) return null;
  const parts = String(value).slice(0, 10).split('-').map(Number);
  const date = parts.length === 3 && parts.every(Number.isFinite)
    ? new Date(parts[0], parts[1] - 1, parts[2])
    : new Date(value as string);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.getDate();
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] || 'th';
  return `${date.toLocaleDateString('en-US', { month: 'long' })} ${day}${suffix}, ${date.getFullYear()}`;
}

function DetailSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  children: React.ReactNode;
}) {
  const visibleChildren = React.Children.toArray(children).filter(Boolean);
  if (!visibleChildren.length) return null;
  return (
    <View style={styles.detailSection}>
      <View style={styles.detailSectionHeader}>
        <View style={styles.detailSectionIcon}><Icon size={16} color="#0D9488" /></View>
        <Text style={styles.detailSectionTitle}>{title}</Text>
      </View>
      <View style={styles.detailSectionContent}>{visibleChildren}</View>
    </View>
  );
}

function ActionButton({
  icon: Icon,
  title,
  onPress,
  disabled = false,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
    >
      <Icon size={17} color={COLORS.teal} />
      <Text style={styles.actionButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: {
    width: '48.5%',
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.line,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  statCardSelected: { borderColor: '#2DD4BF', borderWidth: 2 },
  statCardWide: { width: '23%' },
  statCardNarrow: { width: '48.5%' },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCopy: { flex: 1, minWidth: 0 },
  statValue: { fontSize: 16, fontWeight: '800', color: COLORS.ink },
  activeStats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  activeStatColumn: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: '#E2E8F0' },
  activeStatValue: { color: '#16A36A' },
  inactiveStatValue: { color: '#75839A' },
  statLabel: {
    fontSize: 8,
    fontWeight: '500',
    color: COLORS.muted,
    marginTop: 1,
  },
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 13,
    padding: 12,
    gap: 9,
  },
  filterSelectRow: { flexDirection: 'row', gap: 8 },
  filterSelectRowStacked: { flexDirection: 'column' },
  genderDropdown: { flex: 0.85 },
  bloodDropdown: { flex: 1.35 },
  statusDropdown: { flex: 0.72 },
  fullWidthDropdown: { flex: undefined, width: '100%' },
  filterDropdown: {
    minWidth: 0,
    height: 37,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 7,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  filterDropdownText: { flex: 1, color: '#263445', fontSize: 11 },
  filterDropdownOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  filterDropdownMenu: {
    position: 'absolute',
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: '#FFFFFF',
    elevation: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  filterDropdownOption: {
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 7,
  },
  filterDropdownCheckSpacer: { width: 15, height: 15 },
  filterDropdownOptionText: { flex: 1, color: '#334155', fontSize: 12 },
  filterDropdownOptionSelected: { backgroundColor: '#E6F4F1' },
  filterDropdownOptionTextSelected: { color: COLORS.teal, fontWeight: '700' },
  registrationDateField: { flex: 1.35, minWidth: 0 },
  registrationDateTrigger: {
    height: 37,
    paddingVertical: 0,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
  },
  registrationDateText: {
    flex: 1,
    color: '#718096',
    fontSize: 11,
    fontWeight: '400',
  },
  clearFiltersIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EDF1F5',
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
  },
  filterToolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  columnsButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 9,
    backgroundColor: '#F8FAFC',
  },
  columnsButtonText: { color: '#334155', fontSize: 11, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.60)',
    justifyContent: 'center',
    padding: 12,
  },
  patientFormBackdrop: { backgroundColor: 'rgba(15, 23, 42, 0.45)', alignItems: 'center', padding: 10 },
  formModal: {
    maxWidth: 760,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formModalDesktop: { borderRadius: 12 },
  detailsModal: {
    maxHeight: '94%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderTopWidth: 4,
    borderTopColor: '#14B8A6',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.line,
    gap: 11,
    backgroundColor: '#EEF4F4',
  },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: '#D8EEEC',
    borderWidth: 1,
    borderColor: '#C3E3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderText: { flex: 1, minWidth: 0 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.ink },
  modalSubtitle: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  closeButton: { padding: 7 },
  patientFormHeader: { minHeight: 58, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  patientFormHeaderIcon: { width: 20, height: 22, borderRadius: 0, backgroundColor: 'transparent' },
  patientFormTitle: { fontWeight: '600' },
  formContent: { padding: 14, gap: 18, paddingBottom: 20 },
  formSection: { gap: 15 },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: COLORS.teal,
    marginTop: 5,
  },
  patientFormSectionHeading: { fontSize: 12, fontWeight: '500', color: '#718096' },
  patientFormSectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingBottom: 8, borderBottomWidth: 1, borderColor: COLORS.line },
  formField: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '500', color: '#334155' },
  requiredMark: { color: '#EF4444', fontWeight: '600' },
  formInput: {
    minHeight: 39,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    color: COLORS.ink,
    fontSize: 13,
    backgroundColor: '#F8FAFC',
  },
  formInputMultiline: { minHeight: 76, textAlignVertical: 'top' },
  disabledInput: { color: '#718096', backgroundColor: '#F1F5F9' },
  dateInputRow: {
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  dateTextInput: { flex: 1, minWidth: 0, height: 37, paddingHorizontal: 11, color: COLORS.ink, fontSize: 13 },
  datePickerButton: { width: 38, height: 37, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 0, paddingVertical: 0 },
  datePickerCalendarTrigger: { borderWidth: 0, backgroundColor: 'transparent' },
  datePickerHiddenText: { display: 'none' },
  genderChoices: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 2, borderWidth: 1, borderColor: 'transparent', borderRadius: 9 },
  genderChoicesFocused: { borderColor: '#2DD4BF', borderWidth: 2 },
  genderRadioOption: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38 },
  radioOuter: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#2DD4BF', alignItems: 'center', justifyContent: 'center' },
  radioOuterSelected: { borderWidth: 2 },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.teal },
  genderRadioText: { color: '#334155', fontSize: 12 },
  formSelect: { minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC' },
  formSelectText: { flex: 1, color: '#334155', fontSize: 13 },
  formPlaceholder: { color: '#718096' },
  pickerBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(15,23,42,0.35)' },
  pickerModal: { width: '100%', maxWidth: 380, maxHeight: '75%', padding: 14, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.line, elevation: 10 },
  pickerTitle: { marginBottom: 12, color: COLORS.ink, fontSize: 16, fontWeight: '700' },
  pickerSearch: { minHeight: 40, marginBottom: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: COLORS.line, borderRadius: 9, backgroundColor: '#F8FAFC', color: COLORS.ink, fontSize: 13 },
  pickerOptions: { flexGrow: 0, maxHeight: 330 },
  pickerOption: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 9, borderRadius: 8 },
  pickerOptionSelected: { backgroundColor: '#E6F4F1' },
  pickerCheckSpacer: { width: 16, height: 16 },
  pickerOptionText: { flex: 1, color: '#334155', fontSize: 13 },
  pickerOptionTextSelected: { color: COLORS.teal, fontWeight: '700' },
  pickerLoading: { paddingVertical: 20 },
  pickerEmpty: { padding: 14, color: COLORS.muted, fontSize: 12, textAlign: 'center' },
  pickerCancel: { minHeight: 39, marginTop: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.line, borderRadius: 8 },
  genderOption: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 9,
    alignItems: 'center',
  },
  genderOptionSelected: {
    borderColor: COLORS.teal,
    backgroundColor: '#E6F4F1',
  },
  genderOptionText: { fontSize: 10, fontWeight: '800', color: COLORS.muted },
  genderOptionTextSelected: { color: COLORS.teal },
  errorText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 13,
    borderTopWidth: 1,
    borderColor: COLORS.line,
  },
  patientFormFooter: { paddingHorizontal: 14, paddingVertical: 10 },
  cancelButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 9,
  },
  patientFormActionButton: { minHeight: 42, flex: 1 },
  cancelButtonText: { color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  primaryButton: {
    minHeight: 44,
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: COLORS.teal,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  closePrimaryButton: { flex: 1 },
  disabledButton: { opacity: 0.65 },
  loadingBox: {
    minHeight: 230,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: COLORS.muted, fontSize: 13 },
  detailsContent: { padding: 14, gap: 12, backgroundColor: '#F0F2F3' },
  patientDetailsAvatarText: { color: '#159E96', fontSize: 22, fontWeight: '800' },
  patientDetailsHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 13, backgroundColor: '#EEF4F4' },
  patientDetailsClose: { width: 25, height: 25, borderRadius: 13, borderWidth: 1, borderColor: '#32B8AE', alignItems: 'center', justifyContent: 'center' },
  detailsStatusPill: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 18 },
  editInformationButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E1E7EA', borderRadius: 10, backgroundColor: '#F8FAFC' },
  editInformationText: { color: '#1F2937', fontSize: 12, fontWeight: '600' },
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' },
  profileHeroCopy: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 16, fontWeight: '900', color: COLORS.ink },
  profileCode: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 5,
  },
  activePill: { backgroundColor: '#DCFCE7' },
  inactivePill: { backgroundColor: '#E2E8F0' },
  statusPillText: { fontSize: 9, fontWeight: '900' },
  activeText: { color: '#15803D' },
  inactiveText: { color: '#475569' },
  editIconButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#99F6E4',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  editIconText: { fontSize: 11, fontWeight: '800', color: COLORS.teal },
  detailSection: {
    borderRadius: 13,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  detailSectionHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, backgroundColor: '#EFF8F7', borderBottomWidth: 1, borderColor: '#E6EEEE' },
  detailSectionIcon: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#DDF0EE' },
  detailSectionTitle: { color: '#1F2937', fontSize: 12, fontWeight: '800' },
  detailSectionContent: { gap: 7, padding: 12 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 39,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  detailLabelGroup: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailLabel: { flex: 1, fontSize: 11, color: COLORS.muted },
  detailValue: {
    flex: 1.2,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  consultationCard: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    gap: 3,
  },
  consultationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  consultationDoctor: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 11,
    fontWeight: '800',
  },
  consultationStatus: {
    color: COLORS.teal,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  consultationMeta: { color: COLORS.muted, fontSize: 10 },
  consultationText: { color: '#334155', fontSize: 10, marginTop: 2 },
  emptyConsultations: { padding: 12, color: COLORS.muted, fontSize: 11 },
  actionSection: { gap: 8 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: {
    width: '48%',
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    backgroundColor: '#F0FDFA',
    borderRadius: 9,
  },
  actionButtonDisabled: { opacity: 0.5 },
  actionButtonText: { color: COLORS.teal, fontSize: 10, fontWeight: '800' },
  statusAction: {
    minHeight: 43,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deactivateAction: { backgroundColor: '#FEF2F2' },
  activateAction: { backgroundColor: '#DCFCE7' },
  statusActionText: { fontSize: 12, fontWeight: '800', color: '#334155' },
});
