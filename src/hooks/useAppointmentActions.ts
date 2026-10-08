import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
import {
  cancelAppointmentApi,
  deleteAppointmentApi,
  rescheduleAppointmentApi,
  sendAppointmentReminderApi,
  startAppointmentVideoCallApi,
  updateAppointmentStatusApi,
} from '../api/appointmentApi';
import { fetchPatientsApi } from '../api/patientApi';
import { Appointment, PatientModel } from '../types/clinicTypes';
import { showErrorToast, showSuccessToast } from '../utils/toast';
import {
  extractRows,
  statusLabel,
} from '../screens/staff/appointments/appointmentUtils';

type VideoCallSession = { appointment: Appointment; roomId: string };
type Params = {
  token: string | null;
  clinicId: number | string | null;
  canAdd: boolean;
  canViewPatients: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExecute: boolean;
  canExecuteVideo: boolean;
  loadAppointments: () => Promise<unknown>;
  closeActionMenu: () => void;
  rescheduleTarget: Appointment | null;
  rescheduleDate: string;
  rescheduleTime: string;
  clearRescheduleTarget: () => void;
};

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

export function useAppointmentActions({
  token,
  clinicId,
  canAdd,
  canViewPatients,
  canEdit,
  canDelete,
  canExecute,
  canExecuteVideo,
  loadAppointments,
  closeActionMenu,
  rescheduleTarget,
  rescheduleDate,
  rescheduleTime,
  clearRescheduleTarget,
}: Params) {
  const [patients, setPatients] = useState<PatientModel[]>([]);
  const [patientPickerVisible, setPatientPickerVisible] = useState(false);
  const [activeVideoCall, setActiveVideoCall] =
    useState<VideoCallSession | null>(null);
  const [startingCallId, setStartingCallId] = useState<number | null>(null);

  const openBooking = useCallback(async () => {
    if (!canAdd) return;
    if (!canViewPatients) {
      showErrorToast(
        'Permission denied',
        'Patient read permission is required to choose a patient.',
      );
      return;
    }
    if (!token) return;
    try {
      const response = await fetchPatientsApi(
        { clinic_id: clinicId || undefined, page: 1, limit: 100 },
        token,
      );
      if (!response.success)
        throw new Error(response.message || 'Unable to load patients.');
      setPatients(extractRows<PatientModel>(response.data, 'patients'));
      setPatientPickerVisible(true);
    } catch (cause) {
      showErrorToast(
        'Patients',
        errorMessage(cause, 'Unable to load patients.'),
      );
    }
  }, [canAdd, canViewPatients, clinicId, token]);

  const updateStatus = useCallback(
    async (appointment: Appointment, status: Appointment['status']) => {
      if (!canEdit || !token) return;
      try {
        const response = await updateAppointmentStatusApi(
          token,
          appointment.id,
          status,
        );
        if (!response.success)
          throw new Error(response.message || 'Unable to update appointment.');
        showSuccessToast(
          'Appointment updated',
          `Status changed to ${statusLabel(status)}.`,
        );
        closeActionMenu();
        await loadAppointments();
      } catch (cause) {
        showErrorToast(
          'Update failed',
          errorMessage(cause, 'Unable to update appointment.'),
        );
      }
    },
    [canEdit, closeActionMenu, loadAppointments, token],
  );

  const cancelAppointment = useCallback(
    (appointment: Appointment) => {
      if (!canDelete || !token) return;
      closeActionMenu();
      Alert.alert(
        'Cancel Appointment',
        `Cancel the appointment for ${appointment.patient_name}?`,
        [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Cancel Appointment',
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await cancelAppointmentApi(
                  token,
                  appointment.id,
                );
                if (!response.success)
                  throw new Error(
                    response.message || 'Unable to cancel appointment.',
                  );
                showSuccessToast(
                  'Appointment cancelled',
                  `${appointment.patient_name}'s appointment was cancelled.`,
                );
                await loadAppointments();
              } catch (cause) {
                showErrorToast(
                  'Cancel failed',
                  errorMessage(cause, 'Unable to cancel appointment.'),
                );
              }
            },
          },
        ],
      );
    },
    [canDelete, closeActionMenu, loadAppointments, token],
  );

  const deleteAppointment = useCallback(
    (appointment: Appointment) => {
      if (!canDelete || !token) return;
      closeActionMenu();
      Alert.alert(
        'Delete Appointment',
        'Permanently delete this appointment?',
        [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await deleteAppointmentApi(
                  token,
                  appointment.id,
                );
                if (!response.success)
                  throw new Error(
                    response.message || 'Unable to delete appointment.',
                  );
                showSuccessToast(
                  'Appointment deleted',
                  'The appointment was removed.',
                );
                await loadAppointments();
              } catch (cause) {
                showErrorToast(
                  'Delete failed',
                  errorMessage(cause, 'Unable to delete appointment.'),
                );
              }
            },
          },
        ],
      );
    },
    [canDelete, closeActionMenu, loadAppointments, token],
  );

  const saveReschedule = useCallback(async () => {
    if (
      !token ||
      !canEdit ||
      !rescheduleTarget ||
      !rescheduleDate ||
      !rescheduleTime
    ) {
      showErrorToast(
        'Reschedule',
        'Choose a date and enter an appointment time.',
      );
      return;
    }
    try {
      const response = await rescheduleAppointmentApi(
        token,
        rescheduleTarget.id,
        { appointment_date: rescheduleDate, appointment_time: rescheduleTime },
      );
      if (!response.success)
        throw new Error(
          response.message || 'Unable to reschedule appointment.',
        );
      clearRescheduleTarget();
      showSuccessToast(
        'Appointment rescheduled',
        'New appointment date and time have been saved.',
      );
      await loadAppointments();
    } catch (cause) {
      showErrorToast(
        'Reschedule failed',
        errorMessage(cause, 'Unable to reschedule appointment.'),
      );
    }
  }, [
    canEdit,
    clearRescheduleTarget,
    loadAppointments,
    rescheduleDate,
    rescheduleTarget,
    rescheduleTime,
    token,
  ]);

  const sendReminder = useCallback(
    async (appointment: Appointment) => {
      if (!canExecute || !token) return;
      try {
        const response = await sendAppointmentReminderApi(
          token,
          appointment.id,
        );
        if (!response.success)
          throw new Error(response.message || 'Unable to send reminder.');
        showSuccessToast(
          'Reminder sent',
          `Reminder sent for ${appointment.patient_name}.`,
        );
        closeActionMenu();
      } catch (cause) {
        showErrorToast(
          'Reminder failed',
          errorMessage(cause, 'Unable to send reminder.'),
        );
      }
    },
    [canExecute, closeActionMenu, token],
  );

  const startVideoCall = useCallback(
    async (appointment: Appointment, allowInsufficientBalance = false) => {
      if (!canExecuteVideo || !token || startingCallId !== null) return;
      setStartingCallId(appointment.id);
      try {
        const response = await startAppointmentVideoCallApi(
          token,
          appointment.id,
          allowInsufficientBalance,
        );
        if (!response.success && response.error === 'HTTP_402') {
          Alert.alert(
            'Wallet balance is low',
            'Start this call with payment marked pending?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Continue',
                onPress: () => startVideoCall(appointment, true),
              },
            ],
          );
          return;
        }
        if (!response.success)
          throw new Error(
            response.message || 'Unable to start video consultation.',
          );
        const roomId = String(
          response.data?.videoRoomId || appointment.video_room_id || '',
        ).trim();
        if (!roomId)
          throw new Error(
            'The server did not return a video room. Please refresh and try again.',
          );
        closeActionMenu();
        setActiveVideoCall({ appointment, roomId });
        loadAppointments();
      } catch (cause) {
        showErrorToast(
          'Video call',
          errorMessage(cause, 'Unable to start video consultation.'),
        );
      } finally {
        setStartingCallId(null);
      }
    },
    [canExecuteVideo, closeActionMenu, loadAppointments, startingCallId, token],
  );

  const callPatient = useCallback(
    async (appointment: Appointment) => {
      if (!appointment.patient_phone) {
        showErrorToast('Call patient', 'No phone number is available.');
        return;
      }
      try {
        await Linking.openURL(
          `tel:${appointment.patient_phone.replace(/[^\d+]/g, '')}`,
        );
        closeActionMenu();
      } catch {
        showErrorToast('Call patient', 'Unable to open the phone dialer.');
      }
    },
    [closeActionMenu],
  );

  return {
    activeVideoCall,
    callPatient,
    cancelAppointment,
    deleteAppointment,
    openBooking,
    patientPickerVisible,
    patients,
    saveReschedule,
    sendReminder,
    setActiveVideoCall,
    setPatientPickerVisible,
    startingCallId,
    startVideoCall,
    updateStatus,
  };
}
