import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import {
  BuildingClinicIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  ClinicVerifiedIcon,
  ColumnsIcon,
  FilterResetIcon,
  InPersonClinicIcon,
  MapPinIcon,
  PatientUserIcon,
  RefreshCwIcon,
  SearchInputIcon,
  ShareLinkIcon,
  SparklesIcon,
  StethoscopeIcon,
  VideoCallIcon,
} from '../../components/common/CustomIcons';
import { useAppointments } from '../../hooks/useAppointments';
import { Appointment } from '../../types/clinicTypes';
import { ColumnsModal, ColumnItem } from '../../components/common/ColumnsModal';

interface AppointmentsScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
  onToggleTabBar?: (hide: boolean) => void;
}

export const APPOINTMENT_COLUMNS: ColumnItem[] = [
  { id: 'patient_name', label: 'Patient Name' },
  { id: 'phone', label: 'Phone No' },
  { id: 'patient_code', label: 'Patient Code' },
  { id: 'date', label: 'Date' },
  { id: 'time', label: 'Time' },
  { id: 'mode', label: 'Consultation Mode' },
  { id: 'doctor', label: 'Doctor Name' },
  { id: 'clinic', label: 'Clinic' },
  { id: 'specialization', label: 'Specialization' },
  { id: 'status', label: 'Status' },
  { id: 'reason', label: 'Reason' },
  { id: 'notes', label: 'Notes' },
  { id: 'duration', label: 'Duration' },
  { id: 'share', label: 'Share' },
];

export const DEFAULT_APPOINTMENT_COLUMNS: string[] = [
  'patient_name',
  'phone',
  'date',
  'time',
  'mode',
  'doctor',
  'status',
  'reason',
];

const formatTableDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
};

const formatLastRefreshed = (d: Date) => {
  const day = d.getDate();
  const months = ['Sept', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const monthStr = months[d.getMonth()] || 'Sept';
  const year = d.getFullYear();
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day} ${monthStr} ${year}, ${hours}:${mins}:${secs} ${ampm}`;
};

export const AppointmentsScreen: React.FC<AppointmentsScreenProps> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
  onToggleTabBar,
}) => {
  const { appointments, loading, refreshAppointments } = useAppointments();

  // Filters state
  const [selectedClinic, setSelectedClinic] = useState<string>('All Clinics');
  const [selectedStatus, setSelectedStatus] = useState<string>('All Status');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('All Doctors');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [lastRefreshedDate, setLastRefreshedDate] = useState<Date>(new Date());
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'scheduled' | 'completed'>('all');

  // Counts for hero segment buttons
  const scheduledCount = useMemo(() => {
    return (appointments || []).filter((a) => {
      const s = String(a.status || '').toLowerCase();
      return s === 'scheduled' || s === 'approved' || s === 'confirmed';
    }).length;
  }, [appointments]);

  const completedCount = useMemo(() => {
    return (appointments || []).filter((a) => {
      const s = String(a.status || '').toLowerCase();
      return s === 'complete' || s === 'completed';
    }).length;
  }, [appointments]);

  const handleResetFilters = () => {
    setSelectedClinic('All Clinics');
    setSelectedStatus('All Status');
    setSelectedDoctor('All Doctors');
    setSearchQuery('');
    setDateFilter('');
    setActiveTabFilter('all');
    setVisibleCount(5);
  };

  // Card active state (green/teal border on click)
  const [isCardActive, setIsCardActive] = useState<boolean>(false);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

  // Pagination / Load More (5 at a time)
  const [visibleCount, setVisibleCount] = useState<number>(5);

  // Column management modal
  const [showColumnsModal, setShowColumnsModal] = useState<boolean>(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_APPOINTMENT_COLUMNS);

  // Picker modals
  const [showClinicPicker, setShowClinicPicker] = useState<boolean>(false);
  const [showStatusPicker, setShowStatusPicker] = useState<boolean>(false);
  const [showDoctorPicker, setShowDoctorPicker] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  // Hide footer bottom bar whenever any bottom sheet or modal is open
  useEffect(() => {
    if (onToggleTabBar) {
      const isAnyModalOpen =
        showClinicPicker ||
        showStatusPicker ||
        showDoctorPicker ||
        showDatePicker ||
        showColumnsModal;
      onToggleTabBar(isAnyModalOpen);
    }
  }, [
    showClinicPicker,
    showStatusPicker,
    showDoctorPicker,
    showDatePicker,
    showColumnsModal,
    onToggleTabBar,
  ]);

  useEffect(() => {
    return () => {
      onToggleTabBar?.(false);
    };
  }, [onToggleTabBar]);

  const handleToggleColumn = (colId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const handleManualRefresh = async () => {
    await refreshAppointments();
    setLastRefreshedDate(new Date());
  };

  const handleShareAppointment = async (appt: Appointment) => {
    try {
      const doc = appt.doctor_name || 'Doctor';
      const date = formatTableDate(appt.appointment_date);
      const time = appt.appointment_time || appt.time_slot || '10:00 AM';
      await Share.share({
        message: `Appointment with ${doc} on ${date} at ${time}. Clinic: ${appt.clinic_name || 'Aarogya Care Clinic'}`,
        title: 'Appointment Details',
      });
    } catch (e) {
      // ignore
    }
  };

  // Distinct doctors & clinics from backend appointments
  const doctorOptions = useMemo(() => {
    const docs = new Set<string>();
    appointments.forEach((a) => {
      const d = a.doctor_name || (a as any).doctor?.full_name;
      if (d) docs.add(d);
    });
    return ['All Doctors', ...Array.from(docs)];
  }, [appointments]);

  const clinicOptions = useMemo(() => {
    const cls = new Set<string>();
    appointments.forEach((a) => {
      const c = a.clinic_name || (a as any).clinic?.name;
      if (c) cls.add(c);
    });
    return ['All Clinics', ...Array.from(cls)];
  }, [appointments]);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return (appointments || []).filter((a) => {
      // Clinic filter
      if (selectedClinic !== 'All Clinics') {
        const cName = a.clinic_name || (a as any).clinic?.name || '';
        if (cName.toLowerCase() !== selectedClinic.toLowerCase()) return false;
      }

      // Status filter
      if (selectedStatus !== 'All Status') {
        const s = String(a.status || '').toLowerCase();
        const target = selectedStatus.toLowerCase();
        if (target === 'complete' || target === 'completed') {
          if (s !== 'complete' && s !== 'completed') return false;
        } else if (target === 'cancel' || target === 'cancelled') {
          if (s !== 'cancel' && s !== 'cancelled') return false;
        } else if (target === 'scheduled' || target === 'approved') {
          if (s !== 'scheduled' && s !== 'approved' && s !== 'confirmed') return false;
        } else if (target === 'in progress' || target === 'in_progress') {
          if (s !== 'in_progress' && s !== 'in progress') return false;
        } else if (s !== target) {
          return false;
        }
      }

      // Doctor filter
      if (selectedDoctor !== 'All Doctors') {
        const dName = a.doctor_name || (a as any).doctor?.full_name || '';
        if (!dName.toLowerCase().includes(selectedDoctor.toLowerCase())) return false;
      }

      // Date filter
      if (dateFilter.trim()) {
        const apptDate = a.appointment_date || '';
        if (!apptDate.includes(dateFilter.trim())) return false;
      }

      // Search query (patient name, patient phone, doctor name, patient code, etc.)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pName = String(a.patient_name || (a as any).patient || '').toLowerCase();
        const pPhone = String(a.patient_phone || '').toLowerCase();
        const pCode = String((a as any).patient_code || (a as any).patient?.patient_code || '').toLowerCase();
        const docName = String(a.doctor_name || (a as any).doctor?.full_name || '').toLowerCase();
        const r = String(a.reason || '').toLowerCase();
        if (!pName.includes(q) && !pPhone.includes(q) && !docName.includes(q) && !r.includes(q) && !pCode.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, selectedClinic, selectedStatus, selectedDoctor, dateFilter, searchQuery]);

  // Slice visible appointments (5 at a time)
  const visibleAppointments = filteredAppointments.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 5);
  };

  const renderStatusBadge = (status?: string) => {
    const s = String(status || '').toLowerCase();
    if (s === 'complete' || s === 'completed') {
      return (
        <View style={styles.statusPillComplete}>
          <Text style={styles.statusTextComplete}>Complete</Text>
        </View>
      );
    }
    if (s === 'cancel' || s === 'cancelled') {
      return (
        <View style={styles.statusPillCancel}>
          <Text style={styles.statusTextCancel}>Cancel</Text>
        </View>
      );
    }
    if (s === 'in_progress' || s === 'in progress') {
      return (
        <View style={styles.statusPillInProgress}>
          <Text style={styles.statusTextInProgress}>In Progress</Text>
        </View>
      );
    }
    return (
      <View style={styles.statusPillScheduled}>
        <Text style={styles.statusTextScheduled}>
          {s === 'approved' ? 'Approved' : 'Scheduled'}
        </Text>
      </View>
    );
  };

  const renderModeBadge = (mode?: string, type?: string) => {
    const m = String(mode || type || '').toLowerCase();
    const isVideo = m.includes('video') || m.includes('tele');
    if (isVideo) {
      return (
        <View style={styles.modePillVideo}>
          <VideoCallIcon size={14} color="#7c3aed" />
          <Text style={styles.modeTextVideo}>Video Call</Text>
        </View>
      );
    }
    return (
      <View style={styles.modePillInPerson}>
        <InPersonClinicIcon size={14} color="#0f766e" />
        <Text style={styles.modeTextInPerson}>In Person</Text>
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={() => setIsCardActive(false)}>
      <View style={styles.container}>
        {/* ─── HEADER: HAMBURGER ON LEFT (NO LOGO), NOTIFICATION & AVATAR ON RIGHT ─── */}
        <PatientHeader
          showLogo={false}
          showRolePill={false}
          onOpenDrawer={onOpenDrawer}
          onOpenNotifications={onOpenNotifications}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleManualRefresh} colors={['#0d9488']} />
          }>
          {/* ─── TOP DARK PINE / TEAL HERO BANNER (MATCHING REFERENCE) ─── */}
          <View style={styles.heroBanner}>
            {/* Top Pill Badge */}
            <View style={styles.heroBadgePill}>
              <SparklesIcon size={12} color="#ffffff" />
              <Text style={styles.heroBadgeText}>APPOINTMENTS DESK</Text>
            </View>

            {/* Title Row with Stethoscope Icon Badge */}
            <View style={styles.heroTitleRow}>
              <View style={styles.heroIconBadge}>
                <StethoscopeIcon size={22} color="#ffffff" strokeWidth={2.2} />
              </View>
              <Text style={styles.heroTitle}>Appointments</Text>
            </View>

            {/* Subtitle */}
            <Text style={styles.heroSubtitle}>
              Search, track and manage all your clinic appointments in one place.
            </Text>

            {/* Quick Status Segment Capsule */}
            <View style={styles.wizardCapsule}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.wizardStepBtn, activeTabFilter === 'all' && styles.wizardStepBtnActive]}
                onPress={() => {
                  setActiveTabFilter('all');
                  setSelectedStatus('All Status');
                }}>
                <Text style={[styles.wizardStepText, activeTabFilter === 'all' && styles.wizardStepTextActive]}>
                  All ({appointments.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.wizardStepBtn, activeTabFilter === 'scheduled' && styles.wizardStepBtnActive]}
                onPress={() => {
                  setActiveTabFilter('scheduled');
                  setSelectedStatus('Scheduled');
                }}>
                <Text style={[styles.wizardStepText, activeTabFilter === 'scheduled' && styles.wizardStepTextActive]}>
                  Scheduled ({scheduledCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.wizardStepBtn, activeTabFilter === 'completed' && styles.wizardStepBtnActive]}
                onPress={() => {
                  setActiveTabFilter('completed');
                  setSelectedStatus('Complete');
                }}>
                <Text style={[styles.wizardStepText, activeTabFilter === 'completed' && styles.wizardStepTextActive]}>
                  Completed ({completedCount})
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── MAIN WHITE CARD: FILTERS & APPOINTMENTS ─── */}
          <View style={styles.mainCard}>
            {/* Header: Teal Circle + Title + Subtitle */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderIconCircle}>
                <CalendarIcon size={20} color="#ffffff" strokeWidth={2.2} />
              </View>
              <View style={styles.cardHeaderTextCol}>
                <Text style={styles.cardHeaderTitle}>Find care & appointments</Text>
                <Text style={styles.cardHeaderSubtitle}>Filter by clinic, doctor, status or date</Text>
              </View>
            </View>

            {/* Badges Row: Count Pill + Reset Filter Button */}
            <View style={styles.badgeAndActionRow}>
              <View style={styles.clinicsFoundBadge}>
                <Text style={styles.clinicsFoundText}>{filteredAppointments.length} appointments found</Text>
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
              {/* CLINIC */}
              <View style={styles.filterFieldGroup}>
                <Text style={styles.filterFieldLabel}>CLINIC</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.filterSelectBox}
                  onPress={() => setShowClinicPicker(true)}>
                  <Text style={styles.filterSelectBoxText} numberOfLines={1}>
                    {selectedClinic}
                  </Text>
                  <ChevronsUpDownIcon size={14} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* STATUS */}
              <View style={styles.filterFieldGroup}>
                <Text style={styles.filterFieldLabel}>STATUS</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.filterSelectBox}
                  onPress={() => setShowStatusPicker(true)}>
                  <Text style={styles.filterSelectBoxText} numberOfLines={1}>
                    {selectedStatus}
                  </Text>
                  <ChevronsUpDownIcon size={14} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* DOCTOR */}
              <View style={styles.filterFieldGroup}>
                <Text style={styles.filterFieldLabel}>DOCTOR</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.filterSelectBox}
                  onPress={() => setShowDoctorPicker(true)}>
                  <Text style={styles.filterSelectBoxText} numberOfLines={1}>
                    {selectedDoctor}
                  </Text>
                  <ChevronsUpDownIcon size={14} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* APPOINTMENT SEARCH */}
              <View style={styles.filterFieldGroup}>
                <Text style={styles.filterFieldLabel}>SEARCH</Text>
                <View style={styles.searchInputBox}>
                  <SearchInputIcon size={15} color="#94a3b8" />
                  <TextInput
                    style={styles.searchTextInput}
                    placeholder="Search by patient, doctor, reason.."
                    placeholderTextColor="#94a3b8"
                    value={searchQuery}
                    onChangeText={(t) => {
                      setSearchQuery(t);
                      setVisibleCount(5);
                    }}
                  />
                </View>
              </View>

              {/* DATE FILTER */}
              <View style={styles.filterFieldGroup}>
                <Text style={styles.filterFieldLabel}>DATE FILTER</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.filterSelectBox}
                  onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.filterSelectBoxText} numberOfLines={1}>
                    {dateFilter ? `Date: ${dateFilter}` : 'All Dates'}
                  </Text>
                  <CalendarIcon size={15} color="#0d9488" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Actions Row: Refresh + Columns */}
            <View style={styles.actionBtnsRow}>
              <TouchableOpacity
                style={styles.refreshMintBtn}
                activeOpacity={0.8}
                onPress={handleManualRefresh}>
                <RefreshCwIcon size={15} color="#0d9488" />
                <Text style={styles.refreshMintBtnText}>Refresh</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.columnsBtn}
                activeOpacity={0.8}
                onPress={() => setShowColumnsModal(true)}>
                <ColumnsIcon size={15} color="#0f172a" />
                <Text style={styles.columnsBtnText}>Columns</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.lastRefreshedLabel}>
              Last refreshed: {formatLastRefreshed(lastRefreshedDate)}
            </Text>

            {/* Divider */}
            <View style={styles.cardDivider} />

            {/* Section Header: Step Circle "1" + "Appointments List" + Count Badge */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionStepBadge}>
                <Text style={styles.sectionStepBadgeText}>1</Text>
              </View>
              <Text style={styles.sectionHeadingText}>Appointments list</Text>
              <View style={styles.countBadgePill}>
                <Text style={styles.countBadgePillText}>{filteredAppointments.length}</Text>
              </View>
            </View>

            {/* ─── APPOINTMENT CARDS LIST (MATCHING EXACT REFERENCE) ─── */}
            {loading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 36 }} />
            ) : filteredAppointments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <CalendarIcon size={30} color="#94a3b8" />
                </View>
                <Text style={styles.emptyTitle}>No Appointments Found</Text>
                <Text style={styles.emptySub}>Try adjusting your filters or search query.</Text>
              </View>
            ) : (
              <View style={styles.apptsListContainer}>
                {visibleAppointments.map((item, idx) => {
                  const rawDocName = item.doctor_name || (item as any).doctor?.full_name || (item as any).doctor?.name || '';
                  const docName = rawDocName ? (rawDocName.toLowerCase().startsWith('dr') ? rawDocName : `Dr ${rawDocName}`) : 'Doctor';
                  const clinicName = item.clinic_name || (item as any).clinic?.name || (item as any).clinic || 'Clinic';
                  const pName = item.patient_name || (item as any).patient?.full_name || (item as any).patient?.name || 'Patient';
                  const pPhone = item.patient_phone || (item as any).patient?.phone || '-';
                  const pCode = (item as any).patient_code || (item as any).patient?.patient_code || (item.patient_id ? `PT-${String(item.patient_id).padStart(5, '0')}` : '-');
                  const formattedDate = formatTableDate(item.appointment_date);
                  const formattedTime = item.appointment_time || item.time_slot || '10:00 AM';
                  const isRowSelected = selectedRowId === item.id;
                  const isVideo = String(item.consultation_mode || item.type || '').toLowerCase().includes('video');

                  return (
                    <TouchableOpacity
                      key={item.id ? `appt-${item.id}` : `appt-idx-${idx}`}
                      activeOpacity={0.88}
                      onPress={() => setSelectedRowId(item.id)}
                      style={[styles.apptItemCard, isRowSelected && styles.apptItemCardSelected]}>
                      {/* Left Building/Stethoscope Icon Box */}
                      <View style={styles.buildingIconBox}>
                        {isVideo ? (
                          <VideoCallIcon size={22} color="#7c3aed" />
                        ) : (
                          <BuildingClinicIcon size={22} color="#64748b" />
                        )}
                      </View>

                      {/* Right Info Column */}
                      <View style={styles.apptInfoCol}>
                        {/* Doctor Name + Verified Badge + Status */}
                        <View style={styles.docTitleRow}>
                          <Text style={styles.docTitleText} numberOfLines={1}>
                            {docName}
                          </Text>
                          <ClinicVerifiedIcon size={14} color="#0d9488" />
                          <View style={{ marginLeft: 'auto' }}>
                            {renderStatusBadge(item.status)}
                          </View>
                        </View>

                        {/* Location / Clinic Row */}
                        <View style={styles.clinicLocationRow}>
                          <MapPinIcon size={12} color="#64748b" />
                          <Text style={styles.clinicLocationText} numberOfLines={1}>
                            {clinicName}
                          </Text>
                        </View>

                        {/* Mode & Date/Time Row */}
                        <View style={styles.modeAndDateRow}>
                          {renderModeBadge(item.consultation_mode, item.type)}
                          <Text style={styles.dateTimeText}>
                            📅 {formattedDate} • {formattedTime}
                          </Text>
                        </View>

                        {/* Patient & Code */}
                        <View style={styles.patientInfoRow}>
                          <Text style={styles.patientCodeText} numberOfLines={1}>
                            👤 {pName} ({pCode}) • 📞 {pPhone}
                          </Text>
                        </View>

                        {/* Share Action Button */}
                        <View style={styles.cardActionsRow}>
                          <TouchableOpacity
                            style={styles.shareActionBtn}
                            activeOpacity={0.8}
                            onPress={() => handleShareAppointment(item)}>
                            <ShareLinkIcon size={12} color="#0d9488" />
                            <Text style={styles.shareActionBtnText}>Share Details</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ─── PAGINATION: LOAD MORE (5 AT A TIME) ─── */}
            {filteredAppointments.length > 0 && (
              <View style={styles.paginationBox}>
                <Text style={styles.showingCountText}>
                  Showing {Math.min(visibleCount, filteredAppointments.length)} of {filteredAppointments.length} appointments
                </Text>

                {filteredAppointments.length > visibleCount && (
                  <TouchableOpacity
                    style={styles.loadMoreBtn}
                    activeOpacity={0.8}
                    onPress={handleLoadMore}>
                    <ChevronDownIcon size={14} color="#ffffff" strokeWidth={2} />
                    <Text style={styles.loadMoreBtnText}>Load More</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* ─── REUSABLE COLUMNS MODAL (EXACT 14 COLUMNS FROM REFERENCE) ─── */}
        <ColumnsModal
          visible={showColumnsModal}
          onClose={() => setShowColumnsModal(false)}
          columns={APPOINTMENT_COLUMNS}
          selectedIds={selectedColumns}
          onToggle={handleToggleColumn}
        />

        {/* ─── CLINIC PICKER BOTTOM SHEET ─── */}
        <Modal visible={showClinicPicker} transparent animationType="slide" onRequestClose={() => setShowClinicPicker(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => setShowClinicPicker(false)}>
              <View style={StyleSheet.absoluteFillObject} />
            </TouchableWithoutFeedback>
            <View style={styles.pickerSheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Select Clinic</Text>
                <TouchableOpacity onPress={() => setShowClinicPicker(false)}>
                  <Text style={styles.sheetClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 300 }}>
                {clinicOptions.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.pickerItem, selectedClinic === c && styles.pickerItemActive]}
                    onPress={() => {
                      setSelectedClinic(c);
                      setShowClinicPicker(false);
                      setVisibleCount(5);
                    }}>
                    <Text style={[styles.pickerItemText, selectedClinic === c && styles.pickerItemTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ─── STATUS PICKER BOTTOM SHEET ─── */}
        <Modal visible={showStatusPicker} transparent animationType="slide" onRequestClose={() => setShowStatusPicker(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => setShowStatusPicker(false)}>
              <View style={StyleSheet.absoluteFillObject} />
            </TouchableWithoutFeedback>
            <View style={styles.pickerSheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Select Status</Text>
                <TouchableOpacity onPress={() => setShowStatusPicker(false)}>
                  <Text style={styles.sheetClose}>✕</Text>
                </TouchableOpacity>
              </View>
              {['All Status', 'Scheduled', 'In Progress', 'Complete', 'Cancel'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pickerItem, selectedStatus === s && styles.pickerItemActive]}
                  onPress={() => {
                    setSelectedStatus(s);
                    setShowStatusPicker(false);
                    setVisibleCount(5);
                  }}>
                  <Text style={[styles.pickerItemText, selectedStatus === s && styles.pickerItemTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* ─── DOCTOR PICKER BOTTOM SHEET ─── */}
        <Modal visible={showDoctorPicker} transparent animationType="slide" onRequestClose={() => setShowDoctorPicker(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => setShowDoctorPicker(false)}>
              <View style={StyleSheet.absoluteFillObject} />
            </TouchableWithoutFeedback>
            <View style={styles.pickerSheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Select Doctor</Text>
                <TouchableOpacity onPress={() => setShowDoctorPicker(false)}>
                  <Text style={styles.sheetClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 300 }}>
                {doctorOptions.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.pickerItem, selectedDoctor === d && styles.pickerItemActive]}
                    onPress={() => {
                      setSelectedDoctor(d);
                      setShowDoctorPicker(false);
                      setVisibleCount(5);
                    }}>
                    <Text style={[styles.pickerItemText, selectedDoctor === d && styles.pickerItemTextActive]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ─── DATE FILTER MODAL ─── */}
        <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
              <View style={StyleSheet.absoluteFillObject} />
            </TouchableWithoutFeedback>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>Filter by Date</Text>
              <Text style={styles.dialogSub}>Enter appointment date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.dialogInput}
                placeholder="e.g. 2026-09-08"
                placeholderTextColor="#94a3b8"
                value={dateFilter}
                onChangeText={setDateFilter}
              />
              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={styles.dialogClearBtn}
                  onPress={() => {
                    setDateFilter('');
                    setShowDatePicker(false);
                    setVisibleCount(5);
                  }}>
                  <Text style={styles.dialogClearBtnText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dialogApplyBtn}
                  onPress={() => {
                    setShowDatePicker(false);
                    setVisibleCount(5);
                  }}>
                  <Text style={styles.dialogApplyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
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

  /* ─── Hero Banner ─── */
  heroBanner: {
    backgroundColor: '#074c50',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#074c50',
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

  /* Quick Status Segment Capsule */
  wizardCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
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
  wizardStepText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  wizardStepTextActive: {
    color: '#074c50',
    fontWeight: '800',
  },

  /* ─── Main White Card ─── */
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
    marginBottom: 20,
  },
  mainCardActive: {
    borderColor: '#0d9488',
    borderWidth: 1.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cardHeaderIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0d766e',
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

  /* Badges Row */
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

  /* Filters Section */
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

  /* Action Buttons */
  actionBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  refreshMintBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ccfbf1',
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  refreshMintBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0d9488',
  },
  columnsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  columnsBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  lastRefreshedLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'left',
  },

  /* Divider */
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },

  /* Section Title */
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

  /* Appointments Cards List */
  apptsListContainer: {
    gap: 10,
  },
  apptItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 13,
    gap: 12,
  },
  apptItemCardSelected: {
    borderColor: '#0d9488',
    backgroundColor: '#f0fdfa',
    borderWidth: 1.6,
  },
  buildingIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  apptInfoCol: {
    flex: 1,
    gap: 4,
  },
  docTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  docTitleText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
    maxWidth: '55%',
  },
  clinicLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clinicLocationText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  modeAndDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 3,
  },
  dateTimeText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  patientCodeText: {
    fontSize: 11.5,
    color: '#64748b',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  shareActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  shareActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0d9488',
  },

  /* Mode Pills */
  modePillInPerson: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  modeTextInPerson: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f766e',
  },
  modePillVideo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  modeTextVideo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },

  /* Status Pills */
  statusPillComplete: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusTextComplete: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  statusPillCancel: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusTextCancel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
  statusPillScheduled: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusTextScheduled: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  statusPillInProgress: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fef08a',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusTextInProgress: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ca8a04',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },

  /* Pagination */
  paginationBox: {
    alignItems: 'center',
    paddingTop: 18,
    gap: 10,
  },
  showingCountText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d9488',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 22,
    gap: 8,
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  loadMoreBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
  },

  /* Bottom Sheets & Dialogs */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
    zIndex: 99999,
    elevation: 99999,
  },
  pickerSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 38 : 28,
    maxHeight: '60%',
    width: '100%',
    zIndex: 100000,
    elevation: 100000,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  sheetClose: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold',
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  pickerItemActive: {
    backgroundColor: '#f0fdf4',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  pickerItemTextActive: {
    color: '#0d9488',
    fontWeight: '800',
  },
  dialogCard: {
    margin: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 380,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  dialogSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 14,
  },
  dialogInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  dialogClearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dialogClearBtnText: {
    color: '#64748b',
    fontWeight: '700',
  },
  dialogApplyBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dialogApplyBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

export default AppointmentsScreen;
