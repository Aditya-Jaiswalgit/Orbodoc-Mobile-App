import { colors, radii, spacing, typography } from '../../../theme/tokens';
import React, { useEffect, useRef, useState } from 'react';
import { AppModal } from '../../../components/common/AppModal';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { LiquidBorderScrollView } from '../../../components/common/LiquidBorderScrollView';
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
import { AnimatedLiquidBorder } from '../../../components/common/AnimatedLiquidBorder';
import { createTapGestureHandlers } from '../../../utils/tapGestureHandlers';
import {
  focusedCardOutline,
  usePatientCardFocus,
} from '../../../components/common/PatientCardFocusContext';
import { apiFetch } from '../../../api/apiConfig';
import {
  PatientBillingSummary,
  PatientConsultation,
} from '../../../api/patientApi';

const COLORS = {
  teal: colors.primary,
  ink: colors.text,
  muted: colors.muted,
  line: colors.border,
  pale: colors.background,
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
  const tabletLayout = screenWidth >= 640;
  const wideLayout = screenWidth >= 1024;
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
      color: colors.warning,
      icon: UserPlus,
    },
  ];

  return (
    <View style={styles.statsGrid}>
      {cards.map(({ key, label, value, tint, color, icon: Icon }) => {
        const selected =
          focusedCard === `stat-${key}` ||
          (key === 'active' && focusedCard === 'stat-inactive');
        const cardStyle = [
          styles.statCard,
          wideLayout ? styles.statCardWide : styles.statCardNarrow,
          selected && styles.statCardSelected,
        ];
        const cardContent = (
          <>
            <View style={[styles.statIcon, { backgroundColor: tint }]}>
              <Icon size={20} color={color} />
            </View>
            {key === 'active' ? (
              <View style={styles.activeStats}>
                <TouchableOpacity
                  style={styles.activeStatColumn}
                  onPress={() => selectStat('active')}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${active} active patients`}
                >
                  <Text style={[styles.statValue, tabletLayout && styles.statValueTablet, styles.activeStatValue]}>
                    {active}
                  </Text>
                  <Text style={[styles.statLabel, tabletLayout && styles.statLabelTablet]}>Active</Text>
                </TouchableOpacity>
                <View style={styles.statDivider} />
                <TouchableOpacity
                  style={styles.activeStatColumn}
                  onPress={() => selectStat('inactive')}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${inactive} inactive patients`}
                >
                  <Text style={[styles.statValue, tabletLayout && styles.statValueTablet, styles.inactiveStatValue]}>
                    {inactive}
                  </Text>
                  <Text style={[styles.statLabel, tabletLayout && styles.statLabelTablet]}>Inactive</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.statCopy}>
                <Text style={[styles.statValue, tabletLayout && styles.statValueTablet]} numberOfLines={1}>
                  {value}
                </Text>
                <Text style={[styles.statLabel, tabletLayout && styles.statLabelTablet]} numberOfLines={1}>
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
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 300,
  });
  const triggerRef = useRef<any>(null);
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const { focusCard } = usePatientCardFocus();
  const selected = options.find(option => option.value === value);

  const showMenu = () => {
    focusCard('filters');
    triggerRef.current?.measureInWindow(
      (x: number, y: number, width: number, height: number) => {
        const left = Math.max(8, Math.min(x, screenWidth - width - 8));
        setMenuPosition({
          top: y + height + 3,
          left,
          width: Math.min(width, screenWidth - left - 8),
          maxHeight: Math.max(
            140,
            Math.min(320, screenHeight - y - height - 20),
          ),
        });
        setOpen(true);
      },
    );
  };

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        style={[styles.filterDropdown, screenWidth >= 640 && styles.filterDropdownTablet, style]}
        onPress={showMenu}
        activeOpacity={0.75}
      >
        <Text style={[styles.filterDropdownText, screenWidth >= 640 && styles.filterDropdownTextTablet]} numberOfLines={1}>
          {selected?.label || placeholder}
        </Text>
        <ChevronDown size={15} color={colors.muted} />
      </TouchableOpacity>
      <AppModal
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
            <LiquidBorderScrollView
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
                    option.value === value &&
                      styles.filterDropdownOptionSelected,
                  ]}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.value === value ? (
                    <Check size={15} color={COLORS.teal} />
                  ) : (
                    <View style={styles.filterDropdownCheckSpacer} />
                  )}
                  <Text
                    style={[
                      styles.filterDropdownOptionText,
                      screenWidth >= 640 && styles.filterDropdownOptionTextTablet,
                      option.value === value &&
                        styles.filterDropdownOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </LiquidBorderScrollView>
          </View>
        </View>
      </AppModal>
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
  const compactFilters = screenWidth < 380;
  const tabletFilters = screenWidth >= 640;
  return (
    <View
      style={[
        styles.filterCard,
      ]}
      {...createTapGestureHandlers(() => focusCard('filters'))}
    >
      <AnimatedLiquidBorder active={focusedCard === 'filters'} radius={13} />
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
            triggerStyle={[styles.registrationDateTrigger, tabletFilters && styles.registrationDateTriggerTablet]}
            triggerTextStyle={[styles.registrationDateText, tabletFilters && styles.registrationDateTextTablet]}
            iconColor={colors.muted}
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
          style={[styles.clearFiltersIconButton, tabletFilters && styles.clearFiltersIconButtonTablet]}
          onPress={() => {
            focusCard('filters');
            onClearFilters();
          }}
          accessibilityLabel="Clear patient filters"
        >
          <FilterX size={16} color={colors.subtle} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.columnsButton, tabletFilters && styles.columnsButtonTablet]}
          onPress={() => {
            focusCard('filters');
            onOpenColumns();
          }}
        >
          <Columns3 size={15} color={colors.foreground} />
          <Text style={[styles.columnsButtonText, tabletFilters && styles.columnsButtonTextTablet]}>Columns</Text>
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
    apiFetch<PatientLocationState[]>('/location/states', {
      signal: controller.signal,
    })
      .then(result => {
        if (!result.success || !Array.isArray(result.data)) {
          setFormError(
            result.message || 'Could not load states. Please reopen the form.',
          );
          return;
        }
        setStates(result.data);
      })
      .catch(() =>
        setFormError('Could not load states. Please reopen the form.'),
      )
      .finally(() => {
        if (!controller.signal.aborted) setLocationsLoading(false);
      });
    return () => controller.abort();
  }, [visible]);

  useEffect(() => {
    if (!visible || !states.length) return;
    const normalized = form.state.trim().toLowerCase();
    const currentState = states.find(
      item =>
        item.state_name.trim().toLowerCase() === normalized ||
        item.state_code?.trim().toLowerCase() === normalized,
    );
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
    apiFetch<PatientLocationCity[]>(
      `/location/cities/${encodeURIComponent(selectedStateId)}`,
      { signal: controller.signal },
    )
      .then(result => {
        if (!result.success || !Array.isArray(result.data)) {
          setFormError(
            result.message || 'Could not load cities for this state.',
          );
          return;
        }
        setCities(result.data);
        const currentCity = result.data.find(
          item =>
            item.city_name.trim().toLowerCase() ===
            initialCityName.current.trim().toLowerCase(),
        );
        setSelectedCityId(currentCity ? String(currentCity.id) : '');
      })
      .catch(() => setFormError('Could not load cities for this state.'))
      .finally(() => {
        if (!controller.signal.aborted) setCitiesLoading(false);
      });
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
    if (
      new Date(`${form.date_of_birth}T00:00:00`) <
      new Date('1900-01-01T00:00:00')
    )
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
        <Text style={styles.fieldLabel}>
          {label}
          {options.required ? (
            <Text style={styles.requiredMark}> *</Text>
          ) : null}
        </Text>
        {dateOfBirthField ? (
          <View
            style={[
              styles.dateInputRow,
              focusedCard === focusId && focusedCardOutline,
            ]}
          >
            <TextInput
              value={dobInput}
              onFocus={() => focusCard(focusId)}
              onChangeText={value => {
                const digits = value.replace(/\D/g, '').slice(0, 8);
                const formatted =
                  digits.length > 4
                    ? `${digits.slice(0, 2)}/${digits.slice(
                        2,
                        4,
                      )}/${digits.slice(4)}`
                    : digits.length > 2
                    ? `${digits.slice(0, 2)}/${digits.slice(2)}`
                    : digits;
                setDobInput(formatted);
                const match = formatted.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                if (!match) update('date_of_birth', '');
                else {
                  const [, day, month, year] = match;
                  const parsed = new Date(
                    Number(year),
                    Number(month) - 1,
                    Number(day),
                  );
                  update(
                    'date_of_birth',
                    parsed.getFullYear() === Number(year) &&
                      parsed.getMonth() === Number(month) - 1 &&
                      parsed.getDate() === Number(day)
                      ? `${year}-${month}-${day}`
                      : '',
                  );
                }
              }}
              placeholder={placeholder}
              placeholderTextColor="#718096"
              keyboardType="number-pad"
              maxLength={10}
              style={styles.dateTextInput}
            />
            <CustomCalendarPicker
              selectedDate={
                form.date_of_birth
                  ? new Date(`${form.date_of_birth}T00:00:00`)
                  : undefined
              }
              placeholder=""
              triggerStyle={[
                styles.datePickerButton,
                styles.datePickerCalendarTrigger,
              ]}
              triggerTextStyle={styles.datePickerHiddenText}
              fromYear={1900}
              toYear={new Date().getFullYear()}
              minimumDate={new Date('1900-01-01T00:00:00')}
              maximumDate={new Date()}
              onOpen={() => focusCard(focusId)}
              onDateChange={date => {
                const iso = `${date.getFullYear()}-${String(
                  date.getMonth() + 1,
                ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                update('date_of_birth', iso);
                setDobInput(formatPatientDate(iso));
              }}
            />
          </View>
        ) : (
          <TextInput
            value={String(form[key] ?? '')}
            onFocus={() => focusCard(focusId)}
            onChangeText={value =>
              update(
                key,
                options.numericOnly
                  ? value.replace(/\D/g, '').slice(0, options.maxLength || 10)
                  : value,
              )
            }
            placeholder={placeholder}
            placeholderTextColor="#718096"
            keyboardType={options.keyboardType || 'default'}
            autoCapitalize={
              options.keyboardType === 'email-address' ? 'none' : 'sentences'
            }
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

  const selectLocation = (
    kind: 'state' | 'city',
    item: PatientLocationState | PatientLocationCity,
  ) => {
    setFormError('');
    if (kind === 'state' && 'state_name' in item) {
      initialCityName.current = '';
      setSelectedStateId(String(item.id));
      setSelectedCityId('');
      setCities([]);
      setForm(previous => ({
        ...previous,
        state: item.state_name || '',
        city: '',
      }));
    } else if ('city_name' in item) {
      setSelectedCityId(String(item.id));
      update('city', item.city_name || '');
    }
    setPicker(null);
  };

  const age = getPatientAge(form.date_of_birth);
  const selectedState =
    states.find(item => String(item.id) === selectedStateId)?.state_name ||
    form.state;
  const selectedCity =
    cities.find(item => String(item.id) === selectedCityId)?.city_name ||
    form.city;

  return (
    <AppModal
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
              width: Math.max(
                300,
                screenWidth - (screenWidth >= 700 ? 48 : 24),
              ),
              height: Math.min(
                screenHeight * (screenWidth >= 700 ? 0.84 : 0.91),
                760,
              ),
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
          <LiquidBorderScrollView
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formSection}>
              <View style={styles.patientFormSectionHeadingRow}>
                <UserRound size={14} color={COLORS.muted} />
                <Text style={styles.patientFormSectionHeading}>
                  Personal Information
                </Text>
              </View>
              {field('Name', 'full_name', 'Enter patient name', {
                required: true,
                maxLength: 100,
              })}
              {field('Date of Birth', 'date_of_birth', 'DD/MM/YYYY', {
                required: true,
              })}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Age</Text>
                <TextInput
                  value={age === null ? '-' : `${age} years`}
                  editable={false}
                  style={[styles.formInput, styles.disabledInput]}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>
                  Gender<Text style={styles.requiredMark}> *</Text>
                </Text>
                <View
                  style={[
                    styles.genderChoices,
                    focusedCard === 'patient-form-gender' &&
                      styles.genderChoicesFocused,
                  ]}
                >
                  {(['male', 'female', 'other'] as const).map(choice => (
                    <TouchableOpacity
                      key={choice}
                      onPress={() => {
                        focusCard('patient-form-gender');
                        update('gender', choice);
                      }}
                      style={styles.genderRadioOption}
                    >
                      <View
                        style={[
                          styles.radioOuter,
                          form.gender === choice && styles.radioOuterSelected,
                        ]}
                      >
                        {form.gender === choice ? (
                          <View style={styles.radioInner} />
                        ) : null}
                      </View>
                      <Text style={styles.genderRadioText}>
                        {choice[0].toUpperCase() + choice.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Blood Group</Text>
                <TouchableOpacity
                  style={[
                    styles.formSelect,
                    focusedCard === 'patient-form-blood_group' &&
                      focusedCardOutline,
                  ]}
                  onPress={() => {
                    focusCard('patient-form-blood_group');
                    setPicker('blood');
                  }}
                >
                  <Text
                    style={[
                      styles.formSelectText,
                      !form.blood_group && styles.formPlaceholder,
                    ]}
                  >
                    {form.blood_group || 'Select blood group'}
                  </Text>
                  <ChevronDown size={16} color={COLORS.muted} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.formSection}>
              <View style={styles.patientFormSectionHeadingRow}>
                <Text style={styles.patientFormSectionHeading}>
                  Contact Information
                </Text>
              </View>
              {field('Phone', 'phone', '9876543210', {
                required: true,
                keyboardType: 'phone-pad',
                maxLength: 10,
                numericOnly: true,
              })}
              {field('Email', 'email', 'email@example.com', {
                keyboardType: 'email-address',
                maxLength: 254,
              })}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>
                  State<Text style={styles.requiredMark}> *</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.formSelect,
                    focusedCard === 'patient-form-state' && focusedCardOutline,
                  ]}
                  onPress={() => {
                    focusCard('patient-form-state');
                    setPicker('state');
                  }}
                  disabled={locationsLoading}
                >
                  <Text
                    style={[
                      styles.formSelectText,
                      !selectedState && styles.formPlaceholder,
                    ]}
                  >
                    {locationsLoading
                      ? 'Loading states...'
                      : selectedState || 'Select state'}
                  </Text>
                  <ChevronDown size={16} color={COLORS.muted} />
                </TouchableOpacity>
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>
                  City<Text style={styles.requiredMark}> *</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.formSelect,
                    focusedCard === 'patient-form-city' && focusedCardOutline,
                    (!selectedStateId || citiesLoading) && styles.disabledInput,
                  ]}
                  onPress={() => {
                    focusCard('patient-form-city');
                    setPicker('city');
                  }}
                  disabled={!selectedStateId || citiesLoading}
                >
                  <Text
                    style={[
                      styles.formSelectText,
                      !selectedCity && styles.formPlaceholder,
                    ]}
                  >
                    {citiesLoading
                      ? 'Loading cities...'
                      : selectedCity ||
                        (selectedStateId
                          ? 'Select city'
                          : 'Select state first')}
                  </Text>
                  <ChevronDown size={16} color={COLORS.muted} />
                </TouchableOpacity>
              </View>
              {field('Address', 'address', 'Enter address', {
                multiline: true,
                maxLength: 200,
              })}
            </View>
            <View style={styles.formSection}>
              <View style={styles.patientFormSectionHeadingRow}>
                <Text style={styles.patientFormSectionHeading}>
                  Emergency Contact
                </Text>
              </View>
              {field(
                'Contact Name',
                'emergency_contact_name',
                'Enter emergency contact name',
                { maxLength: 100 },
              )}
              {field('Relation', 'emergency_relation', 'Enter relation', {
                maxLength: 50,
              })}
              {field('Phone', 'emergency_contact', '9876543210', {
                keyboardType: 'phone-pad',
                maxLength: 10,
                numericOnly: true,
              })}
            </View>
            {formError ? (
              <Text style={styles.errorText}>{formError}</Text>
            ) : null}
          </LiquidBorderScrollView>
          <View style={[styles.modalFooter, styles.patientFormFooter]}>
            <TouchableOpacity
              style={[styles.cancelButton, styles.patientFormActionButton]}
              disabled={saving}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                styles.patientFormActionButton,
                saving && styles.disabledButton,
              ]}
              disabled={saving}
              onPress={submit}
            >
              {saving ? (
                <ActivityIndicator color={colors.surface} size="small" />
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
        title={
          picker === 'state'
            ? 'Select state'
            : picker === 'city'
            ? 'Select city'
            : 'Select blood group'
        }
        options={
          picker === 'state'
            ? states.map(item => ({
                id: String(item.id),
                label: item.state_name,
              }))
            : picker === 'city'
            ? cities.map(item => ({
                id: String(item.id),
                label: item.city_name,
              }))
            : ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(value => ({
                id: value,
                label: value,
              }))
        }
        selectedId={
          picker === 'state'
            ? selectedStateId
            : picker === 'city'
            ? selectedCityId
            : form.blood_group
        }
        loading={
          picker === 'state'
            ? locationsLoading
            : picker === 'city'
            ? citiesLoading
            : false
        }
        onClose={() => {
          focusCard(
            `patient-form-${picker === 'blood' ? 'blood_group' : picker}`,
          );
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
    </AppModal>
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
  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);
  const filtered = options.filter(option =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <AppModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
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
            style={[
              styles.pickerSearch,
              focusedCard === 'patient-form-picker-search' &&
                focusedCardOutline,
            ]}
          />
          {loading ? (
            <ActivityIndicator
              color={COLORS.teal}
              style={styles.pickerLoading}
            />
          ) : (
            <LiquidBorderScrollView
              style={styles.pickerOptions}
              keyboardShouldPersistTaps="handled"
            >
              {filtered.map(option => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.pickerOption,
                    selectedId === option.id && styles.pickerOptionSelected,
                  ]}
                  onPress={() => onSelect(option.id)}
                >
                  {selectedId === option.id ? (
                    <Check size={16} color={COLORS.teal} />
                  ) : (
                    <View style={styles.pickerCheckSpacer} />
                  )}
                  <Text
                    style={[
                      styles.pickerOptionText,
                      selectedId === option.id &&
                        styles.pickerOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
              {!filtered.length ? (
                <Text style={styles.pickerEmpty}>No options found.</Text>
              ) : null}
            </LiquidBorderScrollView>
          )}
          <TouchableOpacity style={styles.pickerCancel} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppModal>
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
  if (
    today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())
  )
    age--;
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
  const registrationDate = formatShortPatientDate(
    patient?.registered_at || patient?.created_at,
  );
  const lastVisit = formatShortPatientDate(
    summary?.last_visit || patient?.last_visit,
  );
  const address =
    patient?.address ||
    [patient?.city, patient?.state].filter(Boolean).join(', ');
  const formatMoney = (value?: number | null) =>
    value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) === 0
      ? null
      : `₹${Number(value).toFixed(2)}`;
  const row = (
    label: string,
    value?: string | number | null,
    Icon?: React.ComponentType<{ size?: number; color?: string }>,
    emphasize = false,
  ) =>
    hasPatientDetail(value) ? (
      <View key={label} style={styles.detailRow}>
        <View style={styles.detailLabelGroup}>
          {Icon ? <Icon size={14} color="#32B8AE" /> : null}
          <Text style={styles.detailLabel}>{label}</Text>
        </View>
        <Text style={[styles.detailValue, emphasize && styles.detailValueEmphasis]}>{value}</Text>
      </View>
    ) : null;
  return (
    <AppModal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.detailsModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerIcon}>
              <Text style={styles.patientDetailsAvatarText}>
                {patient?.full_name?.trim().charAt(0).toUpperCase() || 'P'}
              </Text>
            </View>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {patient?.full_name || 'Patient Profile'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {patient?.patient_code || `Patient ID: ${patient?.id ?? '—'}`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.patientDetailsClose}
            >
              <X size={20} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
          {!loading && patient ? (
            <View style={styles.patientDetailsHeaderActions}>
              <View
                style={[
                  styles.detailsStatusPill,
                  active ? styles.activePill : styles.inactivePill,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    active ? styles.activeText : styles.inactiveText,
                  ]}
                >
                  {active ? 'Active' : 'Inactive'}
                </Text>
              </View>
              {canEdit ? (
                <TouchableOpacity
                  style={styles.editInformationButton}
                  onPress={onEdit}
                >
                  <Edit3 size={15} color="#1F2937" />
                  <Text style={styles.editInformationText}>
                    Edit Information
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
          {loading || !patient ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={COLORS.teal} />
              <Text style={styles.loadingText}>Loading patient profile…</Text>
            </View>
          ) : (
            <LiquidBorderScrollView contentContainerStyle={styles.detailsContent}>
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
                {canEdit ? (
                  <TouchableOpacity
                    style={styles.editIconButton}
                    onPress={onEdit}
                  >
                    <Text style={styles.editIconText}>Edit</Text>
                  </TouchableOpacity>
                ) : null}
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
                {row(
                  'Total Visits',
                  summary?.total_visits ?? patient.total_visits ?? 0,
                )}
              </DetailSection>
              <DetailSection title="Emergency Contact" icon={ShieldAlert}>
                {row('Contact', patient.emergency_contact, Phone)}
              </DetailSection>
              <DetailSection title="Billing Summary" icon={Wallet}>
                {row(
                  'Treatment Bill',
                  formatMoney(summary?.treatment_total_amount),
                )}
                {row(
                  'Medicine Bill',
                  formatMoney(summary?.medicine_total_amount),
                )}
                {row('Grand Total', formatMoney(summary?.grand_total_amount), undefined, true)}
                {row('Treatment Due', formatMoney(summary?.treatment_due))}
                {row('Medicine Due', formatMoney(summary?.medicine_due))}
                {row('Total Due', formatMoney(summary?.total_due), undefined, true)}
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
                  {canBookAppointment ? (
                    <ActionButton
                      icon={CalendarDays}
                      title="Book Appointment"
                      onPress={onBookAppointment}
                    />
                  ) : null}
                  {canOpenAppointments ? (
                    <ActionButton
                      icon={CalendarDays}
                      title="Appointments"
                      onPress={onOpenAppointments}
                    />
                  ) : null}
                  {canOpenPrescriptions ? (
                    <ActionButton
                      icon={FileText}
                      title="Prescriptions"
                      onPress={onOpenPrescriptions}
                    />
                  ) : null}
                  {canOpenLabs ? (
                    <ActionButton
                      icon={FlaskConical}
                      title="Lab Reports"
                      onPress={onOpenLabs}
                    />
                  ) : null}
                  {canOpenBilling ? (
                    <ActionButton
                      icon={Wallet}
                      title="Billing"
                      onPress={onOpenBilling}
                    />
                  ) : null}
                  {patient.phone ? (
                    <ActionButton
                      icon={Phone}
                      title="Call Patient"
                      onPress={() => Linking.openURL(`tel:${patient.phone}`)}
                    />
                  ) : null}
                </View>
              </View>
              {false && canChangeStatus ? (
                <TouchableOpacity
                  style={[
                    styles.statusAction,
                    active ? styles.deactivateAction : styles.activateAction,
                  ]}
                  onPress={onToggleStatus}
                >
                  <Text style={styles.statusActionText}>
                    {active ? 'Deactivate Patient' : 'Activate Patient'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {false && canDelete ? (
                <TouchableOpacity
                  style={[
                    styles.statusAction,
                    { backgroundColor: '#FEE2E2', marginTop: spacing.sm },
                  ]}
                  onPress={onDelete}
                >
                  <Text style={[styles.statusActionText, { color: colors.destructiveDark }]}>
                    Delete Patient
                  </Text>
                </TouchableOpacity>
              ) : null}
            </LiquidBorderScrollView>
          )}
        </View>
      </View>
    </AppModal>
  );
}

function hasPatientDetail(value?: string | number | null) {
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim().toLowerCase();
  return (
    normalized !== '' &&
    normalized !== '-' &&
    normalized !== 'null' &&
    normalized !== 'undefined'
  );
}

function formatShortPatientDate(value?: string | null) {
  if (!hasPatientDetail(value)) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-US');
}

function formatLongPatientDate(value?: string | null) {
  if (!hasPatientDetail(value)) return null;
  const parts = String(value).slice(0, 10).split('-').map(Number);
  const date =
    parts.length === 3 && parts.every(Number.isFinite)
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date(value as string);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.getDate();
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? 'th'
      : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ||
        'th';
  return `${date.toLocaleDateString('en-US', {
    month: 'long',
  })} ${day}${suffix}, ${date.getFullYear()}`;
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
        <View style={styles.detailSectionIcon}>
          <Icon size={16} color={colors.primary} />
        </View>
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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    width: '48.5%',
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: 9,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.line,
    shadowColor: colors.text,
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  statCardSelected: { borderColor: '#2DD4BF', borderWidth: 2 },
  statCardWide: { width: '23%' },
  statCardNarrow: { width: '48.5%' },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCopy: { flex: 1, minWidth: 0 },
  statValue: { fontFamily: typography.family, fontSize: typography.size.title, fontWeight: typography.weight.bold, color: colors.foreground },
  statValueTablet: { fontSize: typography.size.display },
  activeStats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  activeStatColumn: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },
  activeStatValue: { color: '#2EB87F' },
  inactiveStatValue: { color: colors.muted },
  statLabel: {
    fontFamily: typography.family, fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.muted,
    marginTop: 1,
  },
  statLabelTablet: { fontSize: typography.size.sm },
  filterCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 13,
    padding: spacing.md,
    gap: 9,
  },
  filterSelectRow: { flexDirection: 'row', gap: spacing.sm },
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
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  filterDropdownTablet: { height: 40 },
  filterDropdownText: { fontFamily: typography.family, flex: 1, color: colors.foreground, fontSize: typography.size.body },
  filterDropdownTextTablet: { fontSize: typography.size.subtitle },
  filterDropdownOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  filterDropdownMenu: {
    position: 'absolute',
    padding: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: colors.surface,
    elevation: 10,
    shadowColor: colors.text,
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  filterDropdownOption: {
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: 7,
  },
  filterDropdownCheckSpacer: { width: 15, height: 15 },
  filterDropdownOptionText: { fontFamily: typography.family, flex: 1, color: colors.foreground, fontSize: typography.size.body },
  filterDropdownOptionTextTablet: { fontSize: typography.size.subtitle },
  filterDropdownOptionSelected: { backgroundColor: '#E6F4F1' },
  filterDropdownOptionTextSelected: { color: COLORS.teal, fontWeight: typography.weight.bold },
  registrationDateField: { flex: 1.35, minWidth: 0 },
  registrationDateTrigger: {
    height: 37,
    paddingVertical: 0,
    paddingHorizontal: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: radii.md,
  },
  registrationDateTriggerTablet: { height: 40 },
  registrationDateText: {
    fontFamily: typography.family, flex: 1,
    color: colors.muted,
    fontSize: typography.size.body,
    fontWeight: typography.weight.regular,
  },
  registrationDateTextTablet: { fontSize: typography.size.subtitle },
  clearFiltersIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EDF1F5',
    borderRadius: 18,
    backgroundColor: colors.background,
  },
  clearFiltersIconButtonTablet: { width: 40, height: 40 },
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
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 9,
    backgroundColor: colors.background,
  },
  columnsButtonTablet: { minHeight: 40, paddingHorizontal: spacing.lg },
  columnsButtonText: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.body, fontWeight: typography.weight.medium },
  columnsButtonTextTablet: { fontSize: typography.size.subtitle },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.60)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  patientFormBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    padding: 10,
  },
  formModal: {
    maxWidth: 760,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  formModalDesktop: { borderRadius: radii.lg },
  detailsModal: {
    maxHeight: '94%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
    borderTopWidth: 4,
    borderTopColor: colors.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
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
  modalTitle: { fontFamily: typography.family, fontSize: typography.size.title, fontWeight: typography.weight.extrabold, color: COLORS.ink },
  modalSubtitle: { fontFamily: typography.family, fontSize: typography.size.xs, color: COLORS.muted, marginTop: 2 },
  closeButton: { padding: 7 },
  patientFormHeader: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  patientFormHeaderIcon: {
    width: 20,
    height: 22,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  patientFormTitle: { fontWeight: typography.weight.semibold },
  formContent: { padding: 14, gap: 18, paddingBottom: spacing.xl },
  formSection: { gap: 15 },
  sectionHeading: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    fontWeight: typography.weight.black,
    letterSpacing: 0.8,
    color: COLORS.teal,
    marginTop: 5,
  },
  patientFormSectionHeading: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: '#718096',
  },
  patientFormSectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderColor: COLORS.line,
  },
  formField: { gap: spacing.tiny },
  fieldLabel: { fontFamily: typography.family, fontSize: typography.size.body, fontWeight: typography.weight.medium, color: colors.foreground },
  requiredMark: { color: colors.destructive, fontWeight: typography.weight.semibold },
  formInput: {
    fontFamily: typography.family, minHeight: 39,
    paddingHorizontal: 11,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    color: COLORS.ink,
    fontSize: typography.size.caption,
    backgroundColor: colors.background,
  },
  formInputMultiline: { minHeight: 76, textAlignVertical: 'top' },
  disabledInput: { color: '#718096', backgroundColor: colors.secondary },
  dateInputRow: {
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  dateTextInput: {
    fontFamily: typography.family, flex: 1,
    minWidth: 0,
    height: 37,
    paddingHorizontal: 11,
    color: COLORS.ink,
    fontSize: typography.size.caption,
  },
  datePickerButton: {
    width: 38,
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  datePickerCalendarTrigger: { borderWidth: 0, backgroundColor: 'transparent' },
  datePickerHiddenText: { display: 'none' },
  genderChoices: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 9,
  },
  genderChoicesFocused: { borderColor: '#2DD4BF', borderWidth: 2 },
  genderRadioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.tiny,
    minHeight: 38,
  },
  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#2DD4BF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderWidth: 2 },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.teal,
  },
  genderRadioText: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.sm },
  formSelect: {
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  formSelectText: { fontFamily: typography.family, flex: 1, color: colors.foreground, fontSize: typography.size.caption },
  formPlaceholder: { color: '#718096' },
  pickerBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  pickerModal: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '75%',
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    elevation: 10,
  },
  pickerTitle: {
    fontFamily: typography.family, marginBottom: spacing.md,
    color: COLORS.ink,
    fontSize: typography.size.subtitle,
    fontWeight: typography.weight.bold,
  },
  pickerSearch: {
    fontFamily: typography.family, minHeight: 40,
    marginBottom: spacing.sm,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 9,
    backgroundColor: colors.background,
    color: COLORS.ink,
    fontSize: typography.size.caption,
  },
  pickerOptions: { flexGrow: 0, maxHeight: 330 },
  pickerOption: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 9,
    borderRadius: radii.md,
  },
  pickerOptionSelected: { backgroundColor: '#E6F4F1' },
  pickerCheckSpacer: { width: 16, height: 16 },
  pickerOptionText: { fontFamily: typography.family, flex: 1, color: colors.foreground, fontSize: typography.size.caption },
  pickerOptionTextSelected: { color: COLORS.teal, fontWeight: typography.weight.bold },
  pickerLoading: { paddingVertical: spacing.xl },
  pickerEmpty: {
    fontFamily: typography.family, padding: 14,
    color: COLORS.muted,
    fontSize: typography.size.sm,
    textAlign: 'center',
  },
  pickerCancel: {
    minHeight: 39,
    marginTop: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: radii.md,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: 9,
    alignItems: 'center',
  },
  genderOptionSelected: {
    borderColor: COLORS.teal,
    backgroundColor: '#E6F4F1',
  },
  genderOptionText: { fontFamily: typography.family, fontSize: typography.size.micro, fontWeight: typography.weight.extrabold, color: COLORS.muted },
  genderOptionTextSelected: { color: COLORS.teal },
  errorText: { fontFamily: typography.family, color: colors.destructive, fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
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
    borderColor: colors.input,
    borderRadius: 9,
  },
  patientFormActionButton: { minHeight: 42, flex: 1 },
  cancelButtonText: { fontFamily: typography.family, color: COLORS.ink, fontSize: typography.size.body, fontWeight: typography.weight.bold },
  primaryButton: {
    minHeight: 44,
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: COLORS.teal,
  },
  primaryButtonText: { fontFamily: typography.family, color: colors.surface, fontSize: typography.size.body, fontWeight: typography.weight.extrabold },
  closePrimaryButton: { flex: 1 },
  disabledButton: { opacity: 0.65 },
  loadingBox: {
    minHeight: 230,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: { fontFamily: typography.family, color: COLORS.muted, fontSize: typography.size.caption },
  detailsContent: { padding: 14, gap: spacing.md, backgroundColor: '#F0F2F3' },
  patientDetailsAvatarText: {
    fontFamily: typography.family, color: '#159E96',
    fontSize: typography.size.heading,
    fontWeight: typography.weight.extrabold,
  },
  patientDetailsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: 13,
    backgroundColor: '#EEF4F4',
  },
  patientDetailsClose: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#32B8AE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsStatusPill: {
    paddingHorizontal: 11,
    paddingVertical: spacing.tiny,
    borderRadius: 18,
  },
  editInformationButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#E1E7EA',
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  editInformationText: { fontFamily: typography.family, color: '#1F2937', fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 13,
    borderRadius: radii.lg,
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: colors.mintBorder,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: radii.xl,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: { fontFamily: typography.family, color: colors.surface, fontSize: 21, fontWeight: typography.weight.black },
  profileHeroCopy: { flex: 1, minWidth: 0 },
  profileName: { fontFamily: typography.family, fontSize: typography.size.subtitle, fontWeight: typography.weight.black, color: COLORS.ink },
  profileCode: { fontFamily: typography.family, fontSize: typography.size.xs, color: COLORS.muted, marginTop: 2 },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.lg,
    marginTop: 5,
  },
  activePill: { backgroundColor: colors.successSoft },
  inactivePill: { backgroundColor: colors.border },
  statusPillText: { fontFamily: typography.family, fontSize: 9, fontWeight: typography.weight.black },
  activeText: { color: '#15803D' },
  inactiveText: { color: colors.muted },
  editIconButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
  },
  editIconText: { fontFamily: typography.family, fontSize: typography.size.xs, fontWeight: typography.weight.extrabold, color: COLORS.teal },
  detailSection: {
    borderRadius: 13,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: colors.surface,
    shadowColor: colors.text,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  detailSectionHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    backgroundColor: '#EFF8F7',
    borderBottomWidth: 1,
    borderColor: '#E6EEEE',
  },
  detailSectionIcon: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: '#DDF0EE',
  },
  detailSectionTitle: { fontFamily: typography.family, color: '#1F2937', fontSize: typography.size.sm, fontWeight: typography.weight.extrabold },
  detailSectionContent: { gap: 7, padding: spacing.md },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 39,
    paddingHorizontal: 11,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  detailLabelGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.tiny,
  },
  detailLabel: { fontFamily: typography.family, flex: 1, fontSize: typography.size.xs, color: COLORS.muted },
  detailValue: {
    fontFamily: typography.family, flex: 1.2,
    textAlign: 'right',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.foreground,
  },
  detailValueEmphasis: { color: colors.primary },
  consultationCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: colors.secondary,
    gap: 3,
  },
  consultationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  consultationDoctor: {
    fontFamily: typography.family, flex: 1,
    color: COLORS.ink,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.extrabold,
  },
  consultationStatus: {
    fontFamily: typography.family, color: COLORS.teal,
    fontSize: 9,
    fontWeight: typography.weight.extrabold,
    textTransform: 'capitalize',
  },
  consultationMeta: { fontFamily: typography.family, color: COLORS.muted, fontSize: typography.size.micro },
  consultationText: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.micro, marginTop: 2 },
  emptyConsultations: { fontFamily: typography.family, padding: spacing.md, color: COLORS.muted, fontSize: typography.size.xs },
  actionSection: { gap: spacing.sm },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionButton: {
    width: '48%',
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    backgroundColor: colors.mint,
    borderRadius: 9,
  },
  actionButtonDisabled: { opacity: 0.5 },
  actionButtonText: { fontFamily: typography.family, color: COLORS.teal, fontSize: typography.size.body, fontWeight: typography.weight.extrabold },
  statusAction: {
    minHeight: 43,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deactivateAction: { backgroundColor: colors.destructiveSoft },
  activateAction: { backgroundColor: colors.successSoft },
  statusActionText: { fontFamily: typography.family, fontSize: typography.size.sm, fontWeight: typography.weight.extrabold, color: colors.foreground },
});
