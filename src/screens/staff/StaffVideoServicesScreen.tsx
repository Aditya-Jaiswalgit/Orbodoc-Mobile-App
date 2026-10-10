import React, { useMemo, useState } from 'react';
import { AppModal } from '../../components/common/AppModal';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from './styles/StaffVideoServices.styles';
import {
  CalendarClock,
  DollarSign,
  Download,
  PhoneCall,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  Video,
  X,
  Stethoscope,
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { useAuthContext } from '../../context/AuthContext';
import { useVideoServices } from '../../hooks/useVideoServices';
import { BASE_URL } from '../../api/apiConfig';
import {
  downloadVideoBillPdfApi,
  refundVideoBillApi,
  startVideoCallApi,
  VideoCallBill,
} from '../../api/videoServicesApi';
import { Appointment } from '../../types/clinicTypes';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { VideoCallRoomScreen } from '../common/VideoCallRoomScreen';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

type Tab = 'calls' | 'consultancy' | 'billing';
const money = (value: unknown) =>
  `\u20B9${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const dateTime = (item: Appointment) => {
  const rawDate = String(item.appointment_date || '').slice(0, 10);
  const [year, month, day] = rawDate.split('-').map(Number);
  const date =
    year && month && day
      ? new Date(year, month - 1, day).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Date not set';
  const rawTime = String(item.appointment_time || item.time_slot || '').trim();
  const time = /^\d{2}:\d{2}$/.test(rawTime)
    ? `${rawTime}:00`
    : rawTime.slice(0, 8);
  return `${date} \u00B7 ${time || 'Time not set'}`;
};
const activeStatus = (status?: string) =>
  [
    'approved',
    'scheduled',
    'confirmed',
    'pending',
    'in-progress',
    'in_progress',
    'ongoing',
  ].includes(String(status || '').toLowerCase());
const safeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const formatBillDate = (value?: string | null) => {
  if (!value) return '-';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match)
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
    ).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
};
const formatDoctorName = (value?: string | null) => {
  const name = String(value || '')
    .replace(/^(?:dr\.?\s*)+/i, '')
    .trim();
  return name ? `Dr. ${name}` : 'Doctor';
};
const tone = (status?: string) => {
  const normalized = String(status || '').toLowerCase();
  if (
    [
      'approved',
      'scheduled',
      'confirmed',
      'completed',
      'complete',
      'settled',
    ].includes(normalized)
  )
    return '#047857';
  if (normalized === 'refunded') return '#7c3aed';
  if (['cancelled', 'canceled', 'failed'].includes(normalized))
    return '#b91c1c';
  return '#b45309';
};

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
}
const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(now.getDate()).padStart(2, '0')}`;
};
const refreshedLabel = (date: Date | null) =>
  date
    ? `Last refreshed: ${date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })}`
    : 'Refresh to load the latest video service records.';

export const StaffVideoServicesScreen: React.FC<Props> = ({
  onOpenDrawer,
  onNavigateScreen,
}) => {
  const {
    token,
    user,
    role,
    activeClinicId,
    permissionsMap = {},
  } = useAuthContext();
  const {
    appointments,
    bills,
    loading,
    refreshing,
    error,
    lastRefreshed,
    refresh,
  } = useVideoServices(token, activeClinicId, false);
  const [tab, setTab] = useState<Tab>('calls');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [busyCallId, setBusyCallId] = useState<number | null>(null);
  const [busyRefundId, setBusyRefundId] = useState<number | null>(null);
  const [selectedBill, setSelectedBill] = useState<VideoCallBill | null>(null);
  const [pdfBusyIds, setPdfBusyIds] = useState<Set<number>>(() => new Set());
  const [call, setCall] = useState<{
    appointment: Appointment;
    roomId: string;
  } | null>(null);
  const roleName = String(role || user?.roleName || user?.role || '')
    .toLowerCase()
    .replace(/[ -]+/g, '_');
  const privileged = ['super_admin', 'clinic_admin', 'doctor'].includes(
    roleName,
  );
  const canStartCall =
    privileged ||
    canUseStaffScreen(role, permissionsMap, 'video_services', 'execute');
  const canRefund =
    privileged ||
    canUseStaffScreen(role, permissionsMap, 'video_services', 'delete');
  const canViewBill =
    privileged ||
    canUseStaffScreen(role, permissionsMap, 'video_services', 'view');
  const canExecuteBillActions =
    privileged ||
    canUseStaffScreen(role, permissionsMap, 'video_services', 'execute');
  const selectedBillStatus = String(
    selectedBill?.payment_status || 'pending',
  ).toLowerCase();
  const selectedBillIsPaid = ['paid', 'settled', 'refunded'].includes(
    selectedBillStatus,
  );
  const selectedBillTotal = safeNumber(selectedBill?.gross_amount);
  const selectedBillPaid = selectedBillIsPaid ? selectedBillTotal : 0;
  const selectedBillDue = Math.max(0, selectedBillTotal - selectedBillPaid);
  const selectedBillLogo = selectedBill?.clinic_logo_url
    ? /^(https?:\/\/|data:image\/)/i.test(selectedBill.clinic_logo_url)
      ? selectedBill.clinic_logo_url
      : `${BASE_URL.replace(
          /\/api\/?$/,
          '',
        )}/${selectedBill.clinic_logo_url.replace(/^\/+/, '')}`
    : '';
  const billMap = useMemo(
    () => new Map(bills.map(item => [String(item.appointment_id), item])),
    [bills],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return appointments.filter(
      item =>
        !needle ||
        [
          item.id,
          item.patient_name,
          item.patient_phone,
          item.patient_code,
          item.doctor_name,
          item.specialization,
          item.reason,
          item.status,
          item.video_room_id,
          item.appointment_date,
          item.appointment_time,
        ].some(value =>
          String(value || '')
            .toLowerCase()
            .includes(needle),
        ),
    );
  }, [appointments, query]);
  const queue = filtered.filter(item => activeStatus(item.status));
  const history = filtered.filter(item =>
    ['completed', 'complete'].includes(String(item.status || '').toLowerCase()),
  );
  const waitingCount = appointments.filter(item =>
    activeStatus(item.status),
  ).length;
  const totalCollected = [...billMap.values()]
    .filter(
      item => String(item.payment_status || '').toLowerCase() === 'settled',
    )
    .reduce((sum, item) => sum + Number(item.gross_amount || 0), 0);
  const pendingCount = [...billMap.values()].filter(
    item => String(item.payment_status || '').toLowerCase() !== 'settled',
  ).length;
  const todayCount = appointments.filter(
    item => item.appointment_date === localDate(),
  ).length;
  const activeRecords =
    tab === 'calls' ? queue : tab === 'consultancy' ? history : filtered;
  const pageCount = Math.ceil(activeRecords.length / pageSize);
  const currentPage = Math.min(page, Math.max(0, pageCount - 1));
  const paginatedRecords = activeRecords.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const canRefundBill = (bill?: VideoCallBill) =>
    String(bill?.payment_status || '').toLowerCase() === 'settled';

  const startCall = async (appointment: Appointment, override = false) => {
    if (!canStartCall) {
      showErrorToast(
        'Permission required',
        'You do not have permission to start video calls.',
      );
      return;
    }
    if (!token) return;
    setBusyCallId(appointment.id);
    try {
      const result = await startVideoCallApi(token, appointment.id, override);
      if (
        !result.success &&
        result.error === 'HTTP_402' &&
        result.code === 'INSUFFICIENT_BALANCE'
      ) {
        const data = result.data as
          | { wallet_balance?: number; required_amount?: number }
          | undefined;
        Alert.alert(
          'Wallet balance is low',
          `Patient balance: ${money(data?.wallet_balance)}\nRequired: ${money(
            data?.required_amount,
          )}`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Start Anyway',
              onPress: () => startCall(appointment, true),
            },
          ],
        );
        return;
      }
      if (!result.success) {
        showErrorToast('Call could not start', result.message);
        return;
      }
      const roomId = String(
        result.data?.videoRoomId || appointment.video_room_id || '',
      ).trim();
      if (!roomId) {
        showErrorToast(
          'Call could not start',
          'The server did not return a video room. Refresh and try again.',
        );
        return;
      }
      if (result.data?.warning)
        showErrorToast('Payment pending', result.data.warning);
      await refresh();
      setCall({ appointment, roomId });
      showSuccessToast(
        'Video call started',
        `Connecting to ${appointment.patient_name || 'patient'}.`,
      );
    } catch (cause) {
      showErrorToast(
        'Call could not start',
        cause instanceof Error ? cause.message : 'Please try again.',
      );
    } finally {
      setBusyCallId(null);
    }
  };

  const refund = async (bill: VideoCallBill) => {
    if (!canRefund || !token) {
      showErrorToast(
        'Permission required',
        'You do not have delete permission for Video Service.',
      );
      return;
    }
    const status = String(bill.payment_status || '').toLowerCase();
    if (!bill.id || !['settled', 'refunded'].includes(status)) {
      showErrorToast(
        'Refund not available',
        'Only settled consultation bills can be refunded.',
      );
      return;
    }

    setBusyRefundId(Number(bill.appointment_id));
    try {
      const result = await refundVideoBillApi(token, bill.id);
      if (!result.success) {
        showErrorToast('Refund failed', result.message || 'Please try again.');
        return;
      }

      showSuccessToast(
        'Refund processed',
        `Wallet has been credited for ${bill.patient_name || 'the patient'}.`,
      );
      setSelectedBill(null);
      await refresh();
    } catch (cause) {
      showErrorToast(
        'Refund failed',
        cause instanceof Error ? cause.message : 'Please try again.',
      );
    } finally {
      setBusyRefundId(null);
    }
  };
  const handleBillPdf = async (bill: VideoCallBill) => {
    if (!canExecuteBillActions) {
      showErrorToast(
        'Permission required',
        'You do not have execute permission for Video Service.',
      );
      return;
    }
    if (!token || pdfBusyIds.has(bill.id)) return;
    setPdfBusyIds(current => new Set(current).add(bill.id));
    try {
      await downloadVideoBillPdfApi(token, bill.id);
      showSuccessToast(
        'PDF downloaded',
        Platform.OS === 'android'
          ? 'The invoice was saved to Downloads.'
          : 'The invoice was saved to the app Documents folder.',
      );
    } catch (cause) {
      showErrorToast(
        'Download failed',
        cause instanceof Error ? cause.message : 'Please try again.',
      );
    } finally {
      setPdfBusyIds(current => {
        const next = new Set(current);
        next.delete(bill.id);
        return next;
      });
    }
  };

  const renderAppointment = (item: Appointment, showCall: boolean) => {
    const status = String(item.status || 'approved').replace(/_/g, ' ');
    const doctorName = item.doctor_name || '-';
    const consultation =
      String(item.consultation_mode || '').toLowerCase() === 'video'
        ? 'Video consultation'
        : 'Consultation';
    return (
      <View key={item.id} style={styles.queueCard}>
        <View style={styles.queueCardHeader}>
          <View style={styles.flex}>
            <Text style={styles.patient}>{item.patient_name || 'Patient'}</Text>
            <Text style={styles.consultation}>
              {item.reason?.trim() || consultation}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: `${tone(item.status)}14`,
                borderColor: `${tone(item.status)}35`,
              },
            ]}
          >
            <Text style={[styles.status, { color: tone(item.status) }]}>
              {status}
            </Text>
          </View>
        </View>
        <View style={styles.queueDetails}>
          <View style={styles.queueDetail}>
            <PhoneCall size={15} color="#0f9f93" />
            <View style={styles.queueDetailText}>
              <Text style={styles.detailLabel}>Mobile</Text>
              <Text style={styles.detailValue}>
                {item.patient_phone || 'Not provided'}
              </Text>
            </View>
          </View>
          <View style={styles.queueDetail}>
            <Stethoscope size={15} color="#0f9f93" />
            <View style={styles.queueDetailText}>
              <Text style={styles.detailLabel}>Doctor</Text>
              <Text style={styles.detailValue}>Dr. {doctorName}</Text>
            </View>
          </View>
          <View style={styles.queueDetail}>
            <CalendarClock size={15} color="#0f9f93" />
            <View style={styles.queueDetailText}>
              <Text style={styles.detailLabel}>Date &amp; Time</Text>
              <Text style={styles.detailValue}>{dateTime(item)}</Text>
            </View>
          </View>
        </View>
        {showCall && (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!canStartCall || busyCallId === item.id) && styles.disabled,
            ]}
            disabled={!canStartCall || busyCallId === item.id}
            onPress={() => startCall(item)}
          >
            {busyCallId === item.id ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <PhoneCall size={17} color="#fff" />
            )}
            <Text style={styles.primaryText}>
              {busyCallId === item.id ? 'Startingâ€¦' : 'Start Call'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderHistoryAppointment = (item: Appointment) => {
    const bill = billMap.get(String(item.id));
    const status = String(item.status || 'completed').replace(/_/g, ' ');
    const doctorName = item.doctor_name || '-';
    const duration = Number(item.duration_minutes || 0);
    const refundAvailable = canRefundBill(bill);

    return (
      <View key={item.id} style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <View style={styles.flex}>
            <View style={styles.historyIdentity}>
              <Text style={styles.patient}>
                {item.patient_name || 'Patient'}
              </Text>
              <View style={[styles.statusBadge, styles.completedBadge]}>
                <Text style={styles.completedText}>{status}</Text>
              </View>
              <View style={styles.appointmentBadge}>
                <Text style={styles.appointmentBadgeText}>#{item.id}</Text>
              </View>
            </View>
            <Text style={styles.consultation}>
              {item.reason?.trim() || 'No consultation note available.'}
            </Text>
          </View>
        </View>
        <View style={styles.historyDetails}>
          <HistoryDetail
            label="Doctor"
            value={`Dr. ${doctorName}\n${
              item.specialization || item.doctor_specialization || '-'
            }`}
          />
          <HistoryDetail label="Date & Time" value={dateTime(item)} />
          <View style={styles.historySummaryRow}>
            <HistoryDetail label="Duration" value={`${duration} min`} />
            <HistoryDetail
              label="Prescription"
              value={
                item.prescription_id ? String(item.prescription_id) : 'â€”'
              }
            />
          </View>
        </View>
        <View style={styles.historyActions}>
          {bill?.id && canExecuteBillActions ? (
            <>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Download bill PDF"
                style={[
                  styles.iconAction,
                  bill && pdfBusyIds.has(bill.id) && styles.disabled,
                ]}
                disabled={Boolean(bill && pdfBusyIds.has(bill.id))}
                onPress={() => handleBillPdf(bill)}
              >
                {bill && pdfBusyIds.has(bill.id) ? (
                  <ActivityIndicator color="#334155" size="small" />
                ) : (
                  <Download size={17} color="#334155" />
                )}
              </TouchableOpacity>
              {bill?.id && privileged && canRefund && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Refund bill"
                  style={[
                    styles.iconAction,
                    (!refundAvailable || busyRefundId === item.id) &&
                      styles.disabled,
                  ]}
                  disabled={!refundAvailable || busyRefundId === item.id}
                  onPress={() => refund(bill)}
                >
                  {busyRefundId === item.id ? (
                    <ActivityIndicator color="#334155" size="small" />
                  ) : (
                    <RotateCcw
                      size={17}
                      color={refundAvailable ? '#334155' : '#94a3b8'}
                    />
                  )}
                </TouchableOpacity>
              )}
            </>
          ) : null}
          <TouchableOpacity
            style={[
              styles.historyCallButton,
              (!canStartCall || busyCallId === item.id) && styles.disabled,
            ]}
            disabled={!canStartCall || busyCallId === item.id}
            onPress={() => startCall(item)}
          >
            {busyCallId === item.id ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <PhoneCall size={16} color="#fff" />
            )}
            <Text style={styles.primaryText}>Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderBillingAppointment = (item: Appointment) => {
    const bill = billMap.get(String(item.id));
    const paymentStatus = String(bill?.payment_status || 'No Bill');
    const total = safeNumber(bill?.gross_amount);
    const due = paymentStatus.toLowerCase() === 'settled' ? 0 : total;
    const doctorName = item.doctor_name || '-';
    return (
      <View key={item.id} style={styles.billingCard}>
        <View style={styles.historyIdentity}>
          <View style={styles.flex}>
            <Text style={styles.patient}>{item.patient_name || 'Patient'}</Text>
            <Text style={styles.muted}>#{item.id}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: bill
                  ? `${tone(bill.payment_status)}14`
                  : '#f8fafc',
                borderColor: bill
                  ? `${tone(bill.payment_status)}35`
                  : '#dbe2ea',
              },
            ]}
          >
            <Text
              style={[
                styles.status,
                { color: bill ? tone(bill.payment_status) : '#64748b' },
              ]}
            >
              {paymentStatus}
            </Text>
          </View>
        </View>
        <View style={styles.billingDetails}>
          <HistoryDetail
            label="Doctor"
            value={`Dr. ${doctorName}${
              item.specialization || item.doctor_specialization
                ? `\n${item.specialization || item.doctor_specialization}`
                : ''
            }`}
          />
          <HistoryDetail
            label="Date & Time Â· Mobile"
            value={`${dateTime(item)}\n${item.patient_phone || 'â€”'}`}
          />
          <View style={styles.historySummaryRow}>
            <HistoryDetail label="Total" value={money(total)} />
            <HistoryDetail label="Due" value={money(due)} />
          </View>
        </View>
        <View style={styles.billingActions}>
          {bill?.id && canViewBill && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setSelectedBill(bill)}
            >
              <Receipt size={15} color="#0f766e" />
              <Text style={styles.secondaryText}>View Bill</Text>
            </TouchableOpacity>
          )}
          {bill?.id && privileged && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Refund bill"
              style={[
                styles.iconAction,
                (paymentStatus.toLowerCase() !== 'settled' ||
                  busyRefundId === item.id) &&
                  styles.disabled,
              ]}
              disabled={
                paymentStatus.toLowerCase() !== 'settled' ||
                busyRefundId === item.id ||
                !canRefund
              }
              onPress={() => refund(bill)}
            >
              {busyRefundId === item.id ? (
                <ActivityIndicator color="#b91c1c" size="small" />
              ) : (
                <RotateCcw
                  size={17}
                  color={
                    paymentStatus.toLowerCase() === 'settled'
                      ? '#b91c1c'
                      : '#94a3b8'
                  }
                />
              )}
            </TouchableOpacity>
          )}
          {canStartCall && (
            <TouchableOpacity
              style={[
                styles.historyCallButton,
                busyCallId === item.id && styles.disabled,
              ]}
              disabled={busyCallId === item.id}
              onPress={() => startCall(item)}
            >
              {busyCallId === item.id ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <PhoneCall size={16} color="#fff" />
              )}
              <Text style={styles.primaryText}>Call</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Video Services" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Video Workflow</Text>
          <View style={styles.heroTitleRow}>
            <View style={styles.videoIconBox}>
              <Receipt size={24} color="#0D9488" strokeWidth={1.7} />
              <DollarSign
                size={11}
                color="#0D9488"
                strokeWidth={2}
                style={styles.videoIconCurrency}
              />
            </View>
            <Text style={styles.title}>Video Services</Text>
          </View>
          <Text style={styles.subtitle}>
            One professional workspace for video calls, consultation history,
            and video billing.
          </Text>
          <TouchableOpacity
            style={[styles.refreshButton, refreshing && styles.disabled]}
            disabled={refreshing}
            onPress={refresh}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#334155" />
            ) : (
              <RefreshCw size={15} color="#334155" />
            )}
            <Text style={styles.refreshButtonText}>
              {refreshing ? 'Refreshingâ€¦' : 'Refresh'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.refreshedText}>
            {refreshedLabel(lastRefreshed)}
          </Text>
          <TouchableOpacity
            style={styles.openAppointments}
            onPress={() => onNavigateScreen?.('appointments')}
          >
            <CalendarClock size={16} color="#fff" />
            <Text style={styles.openAppointmentsText}>Open Appointments</Text>
          </TouchableOpacity>
        </View>
        <Stat
          label="Today's Video Appointments"
          value={todayCount}
          description="All video consultations scheduled for today."
        />
        <Stat
          label="Waiting to Call"
          value={waitingCount}
          description="Appointments still ready for staff or doctor action."
        />
        <Stat
          label="Video Revenue Collected"
          value={money(totalCollected)}
          description={`${pendingCount} bill(s) still have pending payment.`}
        />
        <View style={styles.tabs}>
          {(['calls', 'consultancy', 'billing'] as Tab[]).map(item => {
            const label =
              item === 'calls'
                ? 'Video Calls'
                : item === 'consultancy'
                ? 'Consultancy History'
                : 'Video Billing';
            const Icon =
              item === 'calls'
                ? Video
                : item === 'consultancy'
                ? Stethoscope
                : Receipt;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => {
                  setTab(item);
                  setPage(0);
                }}
                style={[styles.tab, tab === item && styles.activeTab]}
              >
                <Icon size={14} color={tab === item ? '#fff' : '#64748b'} />
                <Text
                  style={[styles.tabText, tab === item && styles.activeTabText]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.search}>
          <Search size={17} color="#64748b" />
          <TextInput
            value={query}
            onChangeText={value => {
              setQuery(value);
              setPage(0);
            }}
            placeholder="Search by patient name, mobile number, patient code, doctor, appointment ID, status..."
            placeholderTextColor="#71839d"
            style={styles.searchInput}
          />
        </View>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={refresh}>
              <Text style={styles.retry}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {loading ? (
          <ActivityIndicator
            style={styles.loadingIndicator}
            color="#0f766e"
            size="large"
          />
        ) : null}
        {!loading && !error && (
          <View style={styles.queueHeading}>
            <Text style={styles.sectionTitle}>
              {tab === 'calls'
                ? 'Video Call Queue'
                : tab === 'consultancy'
                ? 'Consultancy History'
                : 'Video Bill Appointments'}
            </Text>
            <Text style={styles.sectionDescription}>
              {tab === 'calls'
                ? 'Start and monitor live video consultations.'
                : tab === 'consultancy'
                ? 'Review video consultation history and call from each record.'
                : 'Select a consultation and open the bill form below.'}
            </Text>
          </View>
        )}
        {!loading &&
          !error &&
          (tab === 'calls'
            ? paginatedRecords.map(item => renderAppointment(item, true))
            : tab === 'consultancy'
            ? paginatedRecords.map(renderHistoryAppointment)
            : paginatedRecords.map(renderBillingAppointment))}
        {!loading && !error && !activeRecords.length ? (
          <View style={styles.empty}>
            <Video size={30} color="#0f766e" />
            <Text style={styles.emptyTitle}>
              {tab === 'calls'
                ? 'No active video calls in queue.'
                : tab === 'consultancy'
                ? 'No video consultation history found.'
                : 'No video consultations available for billing.'}
            </Text>
          </View>
        ) : null}
        {!loading && !error && activeRecords.length > 5 ? (
          <View style={styles.pagination}>
            <View style={styles.pageSizeOptions}>
              {[5, 10, 20, 50].map(size => (
                <TouchableOpacity
                  key={size}
                  onPress={() => {
                    setPageSize(size);
                    setPage(0);
                  }}
                  style={[
                    styles.pageSizeButton,
                    pageSize === size && styles.pageSizeButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.pageSizeText,
                      pageSize === size && styles.pageSizeTextActive,
                    ]}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.pageLabel}>
              Showing {currentPage * pageSize + 1}â€“
              {Math.min(
                (currentPage + 1) * pageSize,
                activeRecords.length,
              )} of {activeRecords.length}
            </Text>
            {pageCount > 1 && (
              <View style={styles.pageNavigation}>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={currentPage === 0}
                  onPress={() => setPage(value => Math.max(0, value - 1))}
                  style={[
                    styles.pageButton,
                    currentPage === 0 && styles.disabled,
                  ]}
                >
                  <Text style={styles.pageButtonText}>Previous</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={currentPage >= pageCount - 1}
                  onPress={() =>
                    setPage(value => Math.min(pageCount - 1, value + 1))
                  }
                  style={[
                    styles.pageButton,
                    currentPage >= pageCount - 1 && styles.disabled,
                  ]}
                >
                  <Text style={styles.pageButtonText}>Next</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}
        <TouchableOpacity onPress={refresh} style={styles.refresh}>
          <RefreshCw size={15} color="#0f766e" />
          <Text style={styles.refreshText}>Refresh records</Text>
        </TouchableOpacity>
      </ScrollView>
      <AppModal
        visible={Boolean(selectedBill)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedBill(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.invoiceModal}>
            <View style={styles.invoiceModalHeader}>
              <View style={styles.flex}>
                <Text style={styles.invoiceDialogTitle}>
                  Video Consultation Invoice
                </Text>
                {selectedBill && (
                  <Text style={styles.invoiceDialogSubtitle}>
                    VCB-{String(selectedBill.id).padStart(5, '0')} Â·
                    Appointment #{selectedBill.appointment_id || 'â€”'}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close bill"
                onPress={() => setSelectedBill(null)}
                style={styles.closeBillButton}
              >
                <X size={21} color="#475569" />
              </TouchableOpacity>
            </View>
            {selectedBill && (
              <ScrollView
                style={styles.invoiceScroll}
                contentContainerStyle={styles.invoiceScrollContent}
              >
                <View style={styles.invoiceSheet}>
                  <View style={styles.invoiceClinicHeader}>
                    <View style={styles.invoiceClinicInfo}>
                      {selectedBillLogo ? (
                        <Image
                          source={{ uri: selectedBillLogo }}
                          style={styles.clinicLogo}
                          resizeMode="contain"
                        />
                      ) : null}
                      <View style={styles.flex}>
                        <Text style={styles.clinicName}>
                          {selectedBill.clinic_name || 'Clinic'}
                        </Text>
                        <Text style={styles.invoiceServiceLabel}>
                          VIDEO CONSULTATION SERVICES
                        </Text>
                        <Text style={styles.clinicContact}>
                          {[
                            selectedBill.clinic_address,
                            selectedBill.clinic_city,
                            selectedBill.clinic_state,
                            selectedBill.clinic_postal_code,
                          ]
                            .filter(Boolean)
                            .join(', ') || 'Clinic address'}
                        </Text>
                        <Text style={styles.clinicContact}>
                          {[
                            selectedBill.clinic_phone,
                            selectedBill.clinic_email,
                          ]
                            .filter(Boolean)
                            .join(' | ') || 'Clinic contact information'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.invoiceNumberBlock}>
                      <Text style={styles.invoiceNumberLabel}>
                        VIDEO CONSULTATION INVOICE
                      </Text>
                      <Text style={styles.invoiceNumber}>
                        VCB-{String(selectedBill.id).padStart(5, '0')}
                      </Text>
                      <Text style={styles.invoiceMeta}>
                        Issued {formatBillDate(selectedBill.created_at)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.billParties}>
                    <View style={styles.billParty}>
                      <Text style={styles.invoiceSectionLabel}>BILL TO</Text>
                      <Text style={styles.billPartyName}>
                        {selectedBill.patient_name || 'Patient'}
                      </Text>
                      <Text style={styles.invoiceBodyText}>
                        Phone: {selectedBill.patient_phone || 'â€”'}
                      </Text>
                      {selectedBill.patient_code ? (
                        <Text style={styles.invoiceBodyText}>
                          Patient ID: {selectedBill.patient_code}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.billParty}>
                      <Text style={styles.invoiceSectionLabel}>
                        DOCTOR &amp; APPOINTMENT
                      </Text>
                      <Text style={styles.billPartyName}>
                        {formatDoctorName(selectedBill.doctor_name)}
                      </Text>
                      {selectedBill.specialization ? (
                        <Text style={styles.invoiceBodyText}>
                          {selectedBill.specialization}
                        </Text>
                      ) : null}
                      <Text style={styles.invoiceBodyText}>
                        Appointment:{' '}
                        {formatBillDate(selectedBill.appointment_date)}
                        {selectedBill.appointment_time
                          ? `, ${String(selectedBill.appointment_time).slice(
                              0,
                              5,
                            )}`
                          : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.paymentBanner}>
                    <Text style={styles.paymentSource}>
                      Payment Source:{' '}
                      <Text style={styles.paymentSourceValue}>
                        {selectedBill.payment_source || 'Wallet'}
                      </Text>
                    </Text>
                    <Text
                      style={[
                        styles.paymentStatusBadge,
                        { color: tone(selectedBillStatus) },
                      ]}
                    >
                      {selectedBillStatus.replace(/_/g, ' ')}
                    </Text>
                  </View>

                  <Text style={styles.invoiceSectionLabel}>
                    CONSULTATION &amp; SERVICE ITEMS
                  </Text>
                  <View style={styles.invoiceItemsTable}>
                    <View style={styles.invoiceItemsHeader}>
                      <Text
                        style={[
                          styles.invoiceTableHeaderText,
                          styles.invoiceItemName,
                        ]}
                      >
                        Item
                      </Text>
                      <Text style={styles.invoiceTableHeaderText}>
                        Duration
                      </Text>
                      <Text style={styles.invoiceTableHeaderText}>Rate</Text>
                      <Text style={styles.invoiceTableHeaderText}>Total</Text>
                    </View>
                    <View style={styles.invoiceItemsRow}>
                      <Text
                        style={[styles.invoiceItemText, styles.invoiceItemName]}
                      >
                        Video consultation with{' '}
                        {formatDoctorName(selectedBill.doctor_name)}
                      </Text>
                      <Text style={styles.invoiceItemText}>
                        {Number(
                          selectedBill.total_minutes ||
                            selectedBill.duration_minutes ||
                            0,
                        )}{' '}
                        min
                      </Text>
                      <Text style={styles.invoiceItemText}>
                        {money(selectedBill.rate_per_minute)}
                      </Text>
                      <Text
                        style={[
                          styles.invoiceItemText,
                          styles.invoiceItemTotal,
                        ]}
                      >
                        {money(selectedBillTotal)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.invoiceTotalsSection}>
                    <View style={styles.invoiceNote}>
                      <Text style={styles.invoiceSectionLabel}>NOTES</Text>
                      <Text style={styles.invoiceBodyText}>
                        Video consultation charge for appointment #
                        {selectedBill.appointment_id || 'â€”'}.
                      </Text>
                    </View>
                    <View style={styles.invoiceTotals}>
                      <BillLine
                        label="Subtotal"
                        value={money(selectedBillTotal)}
                      />
                      <BillLine label="Discount" value={`-${money(0)}`} />
                      <BillLine label="Tax" value={`+${money(0)}`} />
                      <BillLine
                        label="Total"
                        value={money(selectedBillTotal)}
                        strong
                      />
                      <BillLine
                        label="Amount Paid"
                        value={money(selectedBillPaid)}
                        paid
                      />
                      <BillLine
                        label="Balance Due"
                        value={money(selectedBillDue)}
                        due
                      />
                    </View>
                  </View>
                  <Text style={styles.invoiceFooterNote}>
                    This is a system-generated video consultation invoice. Thank
                    you for using our service.
                  </Text>
                </View>
              </ScrollView>
            )}
            <View style={styles.invoiceFooterActions}>
              <TouchableOpacity
                style={styles.invoiceCloseAction}
                onPress={() => setSelectedBill(null)}
              >
                <Text style={styles.invoiceCloseText}>Close</Text>
              </TouchableOpacity>
              {canExecuteBillActions && (
                <TouchableOpacity
                  style={[
                    styles.invoiceDownloadAction,
                    selectedBill &&
                      pdfBusyIds.has(selectedBill.id) &&
                      styles.disabled,
                  ]}
                  disabled={!selectedBill || pdfBusyIds.has(selectedBill.id)}
                  onPress={() => selectedBill && handleBillPdf(selectedBill)}
                >
                  {selectedBill && pdfBusyIds.has(selectedBill.id) ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Download size={16} color="#fff" />
                  )}
                  <Text style={styles.invoiceDownloadText}>Download PDF</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </AppModal>
      {call && token && user ? (
        <VideoCallRoomScreen
          appointment={call.appointment}
          roomId={call.roomId}
          callerRole="doctor"
          userId={user.id}
          token={token}
          onClose={() => {
            setCall(null);
            refresh();
          }}
        />
      ) : null}
    </View>
  );
};

const Stat = ({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) => (
  <View style={styles.stat}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue} numberOfLines={1}>
      {value}
    </Text>
    <Text style={styles.statDescription}>{description}</Text>
  </View>
);
const BillLine = ({
  label,
  value,
  strong = false,
  paid = false,
  due = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  paid?: boolean;
  due?: boolean;
}) => (
  <View style={[styles.billLine, strong && styles.billStrongLine]}>
    <Text style={styles.invoiceBodyText}>{label}</Text>
    <Text
      style={[
        styles.billValue,
        strong && styles.billStrong,
        paid && styles.billPaid,
        due && styles.billDue,
      ]}
    >
      {value}
    </Text>
  </View>
);
const HistoryDetail = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.historyDetail}>
    <Text style={styles.historyDetailLabel}>{label}</Text>
    <Text style={styles.historyDetailValue}>{value}</Text>
  </View>
);

export default StaffVideoServicesScreen;
