import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CalendarDays,
  CheckCircle2,
  Download,
  FlaskConical,
  MapPin,
  Search,
  TestTube2,
} from 'lucide-react-native';
import { AppModal } from '../../components/common/AppModal';
import { PatientHeader } from '../../components/common/PatientHeader';
import { BASE_URL } from '../../api/apiConfig';
import { getPatientMedicalHistoryApi } from '../../api/patientApi';
import {
  bookPublicLabTest,
  fetchPublicLabSlots,
  lookupPublicLabPatient,
  PublicLabClinic,
  PublicLabTest,
  searchPublicLabTests,
} from '../../api/publicLabApi';
import { useAuthContext } from '../../context/AuthContext';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

interface LabTestsScreenProps {
  onOpenDrawer?: () => void;
}
type PatientLabReport = {
  lab_test_id: number | string;
  test_name?: string | null;
  test_type?: string | null;
  sample_type?: string | null;
  price?: number | string | null;
  status?: string | null;
  created_at?: string | null;
  report_id?: number | string | null;
  report_file_url?: string | null;
  report_data?: Record<string, unknown> | string | null;
  remarks?: string | null;
  uploaded_at?: string | null;
  technician_name?: string | null;
};
type BookingForm = {
  fullName: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  sampleType: 'center_visit' | 'home_collection';
  address: string;
  city: string;
  state: string;
  notes: string;
};
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
};
const normalizePhone = (phone: string) => phone.replace(/\D/g, '').slice(-10);
const money = (amount?: number) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;

export const LabTestsScreen: React.FC<LabTestsScreenProps> = ({
  onOpenDrawer = () => {},
}) => {
  const { user, token } = useAuthContext();
  const [query, setQuery] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [tests, setTests] = useState<PublicLabTest[]>([]);
  const [clinics, setClinics] = useState<PublicLabClinic[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [bookingClinic, setBookingClinic] = useState<PublicLabClinic | null>(
    null,
  );
  const [bookingTest, setBookingTest] = useState<PublicLabTest | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<BookingForm>({
    fullName: user?.fullName || user?.full_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    date: today(),
    time: '',
    sampleType: 'center_visit',
    address: '',
    city: '',
    state: '',
    notes: '',
  });
  const [successInfo, setSuccessInfo] = useState<{
    clinic: string;
    test: string;
    patient: string;
  } | null>(null);
  const [myReports, setMyReports] = useState<PatientLabReport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const selectedTest = useMemo(
    () => tests.find(test => test.id === selectedTestId) || null,
    [selectedTestId, tests],
  );
  const clinicsForSelectedTest = useMemo(() => {
    if (!selectedTestId) return [];
    return clinics.filter(clinic =>
      clinic.tests.some(
        test =>
          Number(test.lab_test_id) === selectedTestId &&
          Number(test.is_available ?? 1) === 1,
      ),
    );
  }, [clinics, selectedTestId]);
  const selectedMapping = bookingClinic?.tests.find(
    test => Number(test.lab_test_id) === Number(bookingTest?.id),
  );
  const homeCollectionAllowed = Boolean(
    selectedMapping?.home_collection_available &&
      form.city.trim().toLowerCase() ===
        String(bookingClinic?.city || '')
          .trim()
          .toLowerCase() &&
      form.state.trim().toLowerCase() ===
        String(bookingClinic?.state || '')
          .trim()
          .toLowerCase(),
  );

  const loadMyReports = useCallback(async () => {
    if (!token || !user?.id) return;
    setHistoryLoading(true);
    try {
      const response = await getPatientMedicalHistoryApi(user.id, token);
      if (response.success) setMyReports(response.data?.labReports || []);
    } catch {
      setMyReports([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    loadMyReports();
  }, [loadMyReports]);

  const search = async () => {
    if (query.trim().length < 2) {
      showErrorToast(
        'Search needs more detail',
        'Enter at least two characters for a test, symptom or disease.',
      );
      return;
    }
    setLoading(true);
    setSearched(true);
    setSelectedTestId(null);
    try {
      const result = await searchPublicLabTests(
        query.trim(),
        state.trim(),
        city.trim(),
      );
      setTests(result.recommendedTests || []);
      setClinics(result.clinics || []);
    } catch (cause) {
      setTests([]);
      setClinics([]);
      showErrorToast(
        'Search failed',
        cause instanceof Error ? cause.message : 'Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const openBooking = (clinic: PublicLabClinic) => {
    const mapping = clinic.tests.find(
      test => Number(test.lab_test_id) === selectedTestId,
    );
    const name = user?.fullName || user?.full_name || '';
    setBookingClinic(clinic);
    setBookingTest(selectedTest);
    setLookupDone(false);
    setSlots([]);
    setForm(current => ({
      ...current,
      fullName: name || current.fullName,
      phone: user?.phone || current.phone,
      email: user?.email || current.email,
      date: today(),
      time: '',
      sampleType: 'center_visit',
      city: clinic.city || '',
      state: clinic.state || '',
    }));
    if (!mapping)
      showErrorToast(
        'Test unavailable',
        'This test is not available at the selected clinic.',
      );
  };

  useEffect(() => {
    if (!bookingClinic || !form.date) {
      setSlots([]);
      return;
    }
    let active = true;
    setSlotsLoading(true);
    fetchPublicLabSlots(bookingClinic.clinic_id, form.date)
      .then(result => {
        if (!active) return;
        setSlots(result);
        setForm(current => ({
          ...current,
          time: result.includes(current.time) ? current.time : result[0] || '',
        }));
      })
      .catch(cause => {
        if (active) {
          setSlots([]);
          setForm(current => ({ ...current, time: '' }));
          showErrorToast(
            'Slots unavailable',
            cause instanceof Error
              ? cause.message
              : 'Could not load appointment times.',
          );
        }
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookingClinic, form.date]);

  const lookupPatient = async () => {
    const phone = normalizePhone(form.phone);
    if (phone.length !== 10) {
      showErrorToast(
        'Phone number required',
        'Enter a valid 10-digit mobile number.',
      );
      return;
    }
    setLookupLoading(true);
    try {
      const result = await lookupPublicLabPatient(phone);
      if (result?.found && result.data) {
        setForm(current => ({
          ...current,
          fullName: result.data?.full_name || current.fullName,
          phone: result.data?.phone || phone,
          email: result.data?.email || current.email,
        }));
        showSuccessToast(
          'Patient found',
          'We filled in the details from the existing patient record.',
        );
      } else {
        showErrorToast(
          'New patient',
          'No patient record found. Enter the patient name and continue.',
        );
      }
      setLookupDone(true);
    } catch (cause) {
      showErrorToast(
        'Lookup failed',
        cause instanceof Error ? cause.message : 'Please try again.',
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const submitBooking = async () => {
    const phone = normalizePhone(form.phone);
    if (!bookingClinic || !bookingTest || !selectedMapping) return;
    if (!form.fullName.trim() || phone.length !== 10) {
      showErrorToast(
        'Patient details required',
        'Enter the patient name and a valid 10-digit phone number.',
      );
      return;
    }
    if (!form.date || !form.time) {
      showErrorToast(
        'Choose a slot',
        'Select an available test date and time.',
      );
      return;
    }
    if (
      form.sampleType === 'home_collection' &&
      (!form.address.trim() || !homeCollectionAllowed)
    ) {
      showErrorToast(
        'Home collection unavailable',
        `Home collection is only available in ${
          bookingClinic.city || 'the clinic city'
        }, ${bookingClinic.state || ''}. Enter an address within that area.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      await bookPublicLabTest({
        clinic_id: bookingClinic.clinic_id,
        lab_test_id: selectedMapping.lab_test_id,
        full_name: form.fullName.trim(),
        phone,
        email: form.email.trim(),
        preferred_date:
          form.sampleType === 'center_visit' ? form.date : undefined,
        preferred_time:
          form.sampleType === 'center_visit' ? form.time : undefined,
        sample_type: form.sampleType,
        collection_type: form.sampleType,
        collection_address:
          form.sampleType === 'home_collection'
            ? form.address.trim()
            : undefined,
        collection_city:
          form.sampleType === 'home_collection' ? form.city.trim() : undefined,
        collection_state:
          form.sampleType === 'home_collection' ? form.state.trim() : undefined,
        collection_date:
          form.sampleType === 'home_collection' ? form.date : undefined,
        collection_time:
          form.sampleType === 'home_collection' ? form.time : undefined,
        home_collection: Number(form.sampleType === 'home_collection'),
        notes: form.notes.trim(),
        city: bookingClinic.city || '',
        state: bookingClinic.state || '',
      });
      setSuccessInfo({
        clinic: bookingClinic.clinic_name,
        test: bookingTest.test_name,
        patient: form.fullName,
      });
      setBookingClinic(null);
      setBookingTest(null);
      await loadMyReports();
      showSuccessToast(
        'Lab test booked',
        'Your lab test request has been submitted successfully.',
      );
    } catch (cause) {
      showErrorToast(
        'Booking failed',
        cause instanceof Error ? cause.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <PatientHeader onOpenDrawer={onOpenDrawer} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={search} />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <FlaskConical size={23} color="#0D9488" />
          </View>
          <View style={styles.flex}>
            <Text style={styles.title}>Find Lab Tests</Text>
            <Text style={styles.subtitle}>
              Search tests by name, symptom or disease, compare nearby clinics
              and book a slot.
            </Text>
          </View>
        </View>

        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Lab Tests & Reports</Text>
            <TouchableOpacity
              onPress={() => loadMyReports()}
              disabled={historyLoading}
            >
              {historyLoading ? (
                <ActivityIndicator size="small" color="#0f766e" />
              ) : (
                <Text style={styles.historyRefresh}>Refresh</Text>
              )}
            </TouchableOpacity>
          </View>
          {historyLoading ? (
            <ActivityIndicator style={styles.historyLoader} color="#0f766e" />
          ) : myReports.length ? (
            myReports.map(item => (
              <View
                key={String(item.report_id || item.lab_test_id)}
                style={styles.historyCard}
              >
                <View style={styles.flex}>
                  <Text style={styles.clinicTitle}>
                    {item.test_name ||
                      item.test_type ||
                      `Lab Test #${item.lab_test_id}`}
                  </Text>
                  <Text style={styles.clinicAddress}>
                    Ordered{' '}
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString('en-IN')
                      : '—'}{' '}
                    · Status:{' '}
                    {String(item.status || 'pending').replace(/_/g, ' ')}
                  </Text>
                  {!!item.remarks && (
                    <Text style={styles.historyRemarks}>{item.remarks}</Text>
                  )}
                </View>
                {item.report_file_url ? (
                  <TouchableOpacity
                    style={styles.historyDownload}
                    onPress={() => {
                      const url = /^(https?:\/\/|file:)/i.test(
                        item.report_file_url || '',
                      )
                        ? item.report_file_url || ''
                        : `${BASE_URL.replace(/\/api\/?$/, '')}/${String(
                            item.report_file_url,
                          ).replace(/^\/+/, '')}`;
                      Linking.openURL(url).catch(() =>
                        showErrorToast(
                          'Could not open report',
                          'Try again later.',
                        ),
                      );
                    }}
                  >
                    <Download size={16} color="#0f766e" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={styles.historyEmpty}>
              Your lab bookings and reports will appear here.
            </Text>
          )}
        </View>

        <View style={styles.searchCard}>
          <View style={styles.inputWrap}>
            <Search size={17} color="#64748B" />
            <TextInput
              style={[styles.input, styles.inputNoMargin]}
              value={query}
              onChangeText={setQuery}
              placeholder="Search test, symptom, disease or code"
              placeholderTextColor="#71839D"
              returnKeyType="search"
              onSubmitEditing={search}
            />
          </View>
          <View style={styles.locationRow}>
            <TextInput
              style={[styles.input, styles.locationInput]}
              value={state}
              onChangeText={setState}
              placeholder="State (optional)"
              placeholderTextColor="#71839D"
            />
            <TextInput
              style={[styles.input, styles.locationInput]}
              value={city}
              onChangeText={setCity}
              placeholder="City (optional)"
              placeholderTextColor="#71839D"
            />
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            disabled={loading}
            onPress={() => search()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Search size={16} color="#fff" />
            )}
            <Text style={styles.searchButtonText}>
              {loading ? 'Searching...' : 'Search Tests'}
            </Text>
          </TouchableOpacity>
        </View>

        {searched && !loading ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Suggested Tests</Text>
              <Text style={styles.count}>{tests.length}</Text>
            </View>
            {tests.length ? (
              <View style={styles.testChips}>
                {tests.map(test => (
                  <TouchableOpacity
                    key={test.id}
                    style={[
                      styles.testChip,
                      selectedTestId === test.id && styles.testChipActive,
                    ]}
                    onPress={() => setSelectedTestId(test.id)}
                  >
                    <Text
                      style={[
                        styles.testChipText,
                        selectedTestId === test.id && styles.testChipTextActive,
                      ]}
                    >
                      {test.test_name}
                    </Text>
                    {test.min_price ? (
                      <Text
                        style={[
                          styles.testPrice,
                          selectedTestId === test.id &&
                            styles.testChipTextActive,
                        ]}
                      >
                        From {money(test.min_discount_price || test.min_price)}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Empty text="No matching lab tests. Try another test name or symptom." />
            )}

            {selectedTest ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Clinics for {selectedTest.test_name}
                  </Text>
                  <Text style={styles.count}>
                    {clinicsForSelectedTest.length}
                  </Text>
                </View>
                {clinicsForSelectedTest.length ? (
                  clinicsForSelectedTest.map(clinic => {
                    const mapping = clinic.tests.find(
                      test => Number(test.lab_test_id) === selectedTest.id,
                    );
                    if (!mapping) return null;
                    return (
                      <View key={clinic.clinic_id} style={styles.clinicCard}>
                        <View style={styles.clinicHeading}>
                          <View style={styles.locationIcon}>
                            <MapPin size={17} color="#0D9488" />
                          </View>
                          <View style={styles.flex}>
                            <Text style={styles.clinicTitle}>
                              {clinic.clinic_name}
                            </Text>
                            <Text style={styles.clinicAddress}>
                              {[clinic.address, clinic.city, clinic.state]
                                .filter(Boolean)
                                .join(', ') || 'Clinic location not provided'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.priceRow}>
                          <View>
                            <Text style={styles.priceLabel}>Test price</Text>
                            <Text style={styles.priceValue}>
                              {money(mapping.discount_price || mapping.price)}
                            </Text>
                            {Number(mapping.discount_price || 0) > 0 &&
                            Number(mapping.discount_price || 0) <
                              mapping.price ? (
                              <Text style={styles.oldPrice}>
                                {money(mapping.price)}
                              </Text>
                            ) : null}
                          </View>
                          <Text style={styles.collectionText}>
                            {mapping.home_collection_available
                              ? 'Home collection available'
                              : 'Clinic visit'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.bookButton}
                          onPress={() => openBooking(clinic)}
                        >
                          <CalendarDays size={16} color="#fff" />
                          <Text style={styles.bookButtonText}>
                            Book Lab Test
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                ) : (
                  <Empty text="No clinics currently offer this test in the selected location." />
                )}
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <AppModal
        visible={Boolean(bookingClinic)}
        transparent
        animationType="slide"
        onRequestClose={() => setBookingClinic(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.bookingModal}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Book Lab Test</Text>
              <Text style={styles.modalSubtitle}>
                {bookingTest?.test_name} · {bookingClinic?.clinic_name}
              </Text>
              <View style={styles.lookupRow}>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  value={form.phone}
                  onChangeText={value => {
                    setForm(current => ({ ...current, phone: value }));
                    setLookupDone(false);
                  }}
                  placeholder="10-digit mobile number"
                  keyboardType="phone-pad"
                />
                <TouchableOpacity
                  style={styles.lookupButton}
                  onPress={() => lookupPatient()}
                  disabled={lookupLoading}
                >
                  {lookupLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.lookupText}>Find</Text>
                  )}
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={form.fullName}
                onChangeText={value =>
                  setForm(current => ({ ...current, fullName: value }))
                }
                placeholder="Patient full name"
              />
              <TextInput
                style={styles.input}
                value={form.email}
                onChangeText={value =>
                  setForm(current => ({ ...current, email: value }))
                }
                placeholder="Email (optional)"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {lookupDone ? (
                <Text style={styles.lookupHint}>
                  Patient lookup completed. Confirm the details before booking.
                </Text>
              ) : null}
              <Text style={styles.fieldLabel}>Collection type</Text>
              <View style={styles.choiceRow}>
                <Choice
                  label="Visit clinic"
                  active={form.sampleType === 'center_visit'}
                  onPress={() =>
                    setForm(current => ({
                      ...current,
                      sampleType: 'center_visit',
                    }))
                  }
                />
                {selectedMapping?.home_collection_available ? (
                  <Choice
                    label="Home collection"
                    active={form.sampleType === 'home_collection'}
                    onPress={() =>
                      setForm(current => ({
                        ...current,
                        sampleType: 'home_collection',
                      }))
                    }
                  />
                ) : null}
              </View>
              <Text style={styles.fieldLabel}>Date</Text>
              <TextInput
                style={styles.input}
                value={form.date}
                onChangeText={value =>
                  setForm(current => ({ ...current, date: value, time: '' }))
                }
                placeholder="YYYY-MM-DD"
              />
              <Text style={styles.fieldLabel}>Available time slots</Text>
              {slotsLoading ? (
                <ActivityIndicator color="#0f766e" />
              ) : slots.length ? (
                <View style={styles.slotGrid}>
                  {slots.map(slot => (
                    <Choice
                      key={slot}
                      label={slot}
                      active={form.time === slot}
                      onPress={() =>
                        setForm(current => ({ ...current, time: slot }))
                      }
                    />
                  ))}
                </View>
              ) : (
                <Text style={styles.lookupHint}>
                  No available slots for this date.
                </Text>
              )}
              {form.sampleType === 'home_collection' ? (
                <>
                  <TextInput
                    style={[styles.input, styles.multiline]}
                    value={form.address}
                    onChangeText={value =>
                      setForm(current => ({ ...current, address: value }))
                    }
                    placeholder="Collection address"
                    multiline
                  />
                  <View style={styles.locationRow}>
                    <TextInput
                      style={[styles.input, styles.locationInput]}
                      value={form.city}
                      onChangeText={value =>
                        setForm(current => ({ ...current, city: value }))
                      }
                      placeholder="City"
                    />
                    <TextInput
                      style={[styles.input, styles.locationInput]}
                      value={form.state}
                      onChangeText={value =>
                        setForm(current => ({ ...current, state: value }))
                      }
                      placeholder="State"
                    />
                  </View>
                  <Text
                    style={[
                      styles.coverageHint,
                      homeCollectionAllowed
                        ? styles.coverageGood
                        : styles.coverageBad,
                    ]}
                  >
                    {homeCollectionAllowed
                      ? 'Home collection is available in this location.'
                      : `Home collection is limited to ${
                          bookingClinic?.city || 'the clinic city'
                        }, ${bookingClinic?.state || ''}.`}
                  </Text>
                </>
              ) : null}
              <TextInput
                style={[styles.input, styles.multiline]}
                value={form.notes}
                onChangeText={value =>
                  setForm(current => ({ ...current, notes: value }))
                }
                placeholder="Notes (optional)"
                multiline
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setBookingClinic(null)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bookButton}
                  disabled={submitting || slotsLoading}
                  onPress={() => submitBooking()}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.bookButtonText}>Confirm Booking</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </AppModal>

      <AppModal
        visible={Boolean(successInfo)}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessInfo(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.successCard}>
            <CheckCircle2 size={42} color="#059669" />
            <Text style={styles.modalTitle}>Booking submitted</Text>
            <Text style={styles.modalSubtitle}>
              {successInfo?.test} for {successInfo?.patient} at{' '}
              {successInfo?.clinic}.
            </Text>
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => setSuccessInfo(null)}
            >
              <Text style={styles.bookButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppModal>
    </View>
  );
};

const Choice = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.choice, active && styles.choiceActive]}
    onPress={onPress}
  >
    <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);
const Empty = ({ text }: { text: string }) => (
  <View style={styles.empty}>
    <TestTube2 size={24} color="#94A3B8" />
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 14, paddingBottom: 40, gap: 13 },
  flex: { flex: 1, minWidth: 0 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 17,
    borderWidth: 1,
    borderColor: '#DCE5E9',
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  heroIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#CCFBF1',
  },
  historySection: {
    padding: 13,
    gap: 8,
    borderWidth: 1,
    borderColor: '#DCE5E9',
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
  },
  historyRefresh: { color: '#0F766E', fontSize: 11, fontWeight: '700' },
  historyLoader: { marginVertical: 12 },
  historyRemarks: { color: '#475569', fontSize: 11, marginTop: 4 },
  historyDownload: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFE3DB',
    borderRadius: 9,
  },
  historyEmpty: { color: '#64748B', fontSize: 12, paddingVertical: 5 },
  title: { color: '#0F172A', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 3 },
  searchCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCE5E9',
    borderRadius: 15,
    backgroundColor: '#fff',
    gap: 9,
  },
  inputWrap: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#DCE5E9',
    borderRadius: 11,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#DCE5E9',
    borderRadius: 10,
    color: '#0F172A',
    backgroundColor: '#fff',
    fontSize: 13,
  },
  inputNoMargin: { marginTop: 0 },
  locationRow: { flexDirection: 'row', gap: 8 },
  locationInput: { flex: 1, minWidth: 0 },
  searchButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 10,
    backgroundColor: '#0D9488',
  },
  searchButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: { flex: 1, color: '#0F172A', fontSize: 16, fontWeight: '800' },
  count: { color: '#0F766E', fontSize: 11, fontWeight: '700' },
  testChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  testChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#CFE6E1',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  testChipActive: { borderColor: '#0F766E', backgroundColor: '#0F766E' },
  testChipText: { color: '#17313A', fontSize: 12, fontWeight: '700' },
  testChipTextActive: { color: '#fff' },
  testPrice: { color: '#64748B', fontSize: 10, marginTop: 4 },
  clinicCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCE5E9',
    borderRadius: 15,
    backgroundColor: '#fff',
  },
  clinicHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  locationIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F0FDFA',
  },
  clinicTitle: { color: '#0F172A', fontSize: 14, fontWeight: '800' },
  clinicAddress: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 12,
    marginTop: 11,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
  },
  priceLabel: { color: '#64748B', fontSize: 10 },
  priceValue: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 3,
  },
  oldPrice: {
    color: '#94A3B8',
    fontSize: 10,
    textDecorationLine: 'line-through',
  },
  collectionText: {
    color: '#0F766E',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
  },
  bookButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#0D9488',
  },
  bookButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  empty: {
    minHeight: 105,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  emptyText: { color: '#64748B', fontSize: 12, textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 14,
    backgroundColor: 'rgba(15,23,42,0.48)',
  },
  bookingModal: {
    maxHeight: '94%',
    padding: 17,
    borderRadius: 18,
    backgroundColor: '#fff',
  },
  successCard: {
    alignItems: 'center',
    gap: 10,
    padding: 22,
    borderRadius: 18,
    backgroundColor: '#fff',
  },
  modalTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  modalSubtitle: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 8,
  },
  lookupRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phoneInput: { flex: 1 },
  lookupButton: {
    minHeight: 42,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderRadius: 9,
    backgroundColor: '#0F766E',
  },
  lookupText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  lookupHint: { color: '#64748B', fontSize: 11, marginTop: 7 },
  fieldLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
  },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  choice: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#DCE5E9',
    borderRadius: 9,
    backgroundColor: '#fff',
  },
  choiceActive: { borderColor: '#0D9488', backgroundColor: '#F0FDFA' },
  choiceText: { color: '#475569', fontSize: 11, fontWeight: '600' },
  choiceTextActive: { color: '#0F766E' },
  multiline: { minHeight: 65, textAlignVertical: 'top' },
  coverageHint: { fontSize: 11, lineHeight: 16, marginTop: 7 },
  coverageGood: { color: '#047857' },
  coverageBad: { color: '#B91C1C' },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 15,
  },
  cancelButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 9,
  },
  cancelText: { color: '#475569', fontSize: 12, fontWeight: '700' },
});

export default LabTestsScreen;
