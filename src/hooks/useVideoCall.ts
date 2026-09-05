import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { startVideoCallApi, endVideoCallApi, joinVideoCallApi } from '../api/videoCallApi';
import { Alert } from 'react-native';

export interface VideoCallAppointment {
  id: number;
  patient_id?: number;
  patient_name?: string;
  patient_phone?: string;
  patient_code?: string;
  doctor_id?: number;
  doctor_name?: string;
  specialization?: string;
  clinic_name?: string;
  appointment_date?: string;
  appointment_time?: string;
  status?: string;
  video_room_id?: string;
}

export const useVideoCall = () => {
  const { token, user } = useAuthContext();
  const [activeAppointment, setActiveAppointment] = useState<VideoCallAppointment | null>(null);
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [videoRoomId, setVideoRoomId] = useState<string>('');
  const [meetingUrl, setMeetingUrl] = useState<string>('');
  
  const [callSeconds, setCallSeconds] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);
  const [doctorNotes, setDoctorNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isDoc =
    String((user as any)?.roleName || (user as any)?.role_name || (user as any)?.role || '')
      .toLowerCase()
      .includes('doctor') ||
    Number((user as any)?.roleId || (user as any)?.role_id) === 3 ||
    Number((user as any)?.is_doctor) === 1;

  // Format call duration MM:SS
  const formatDuration = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Start Timer when call is active
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setCallSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isCallActive]);

  // Connect & Join or Start Video Call
  const connectVideoCall = useCallback(
    async (appt: VideoCallAppointment) => {
      if (!token) {
        Alert.alert('Authentication Required', 'Please log in to join video consultations.');
        return;
      }

      setActiveAppointment(appt);
      setIsConnecting(true);
      setError(null);
      setCallSeconds(0);
      setIsMuted(false);
      setIsCameraOff(false);

      try {
        let roomId = appt.video_room_id || `video-${appt.id}-${Date.now()}`;

        if (isDoc) {
          // Doctor starts the video call
          const startRes = await startVideoCallApi(token, appt.id, true);
          if (startRes.success && startRes.data?.videoRoomId) {
            roomId = startRes.data.videoRoomId;
          }
        } else {
          // Patient joins the call
          try {
            const joinRes = await joinVideoCallApi(token, appt.id);
            if (joinRes.success && joinRes.data?.video_room_id) {
              roomId = joinRes.data.video_room_id;
            }
          } catch (e) {}
        }

        setVideoRoomId(roomId);
        const displayName = encodeURIComponent(
          (user as any)?.full_name || (user as any)?.name || (isDoc ? 'Doctor' : 'Patient')
        );
        const jitsiUrl = `https://meet.jit.si/${roomId}#config.prejoinPageEnabled=false&userInfo.displayName="${displayName}"`;
        setMeetingUrl(jitsiUrl);

        setIsConnecting(false);
        setIsCallActive(true);
      } catch (err: any) {
        setIsConnecting(false);
        setError(err.message || 'Failed to connect to video call server');
        Alert.alert('Video Call Error', err.message || 'Unable to join video call session.');
      }
    },
    [token, user, isDoc]
  );

  // End Video Call Session
  const endVideoCall = useCallback(
    async (onSuccess?: () => void) => {
      if (!activeAppointment || !token) {
        setIsCallActive(false);
        setActiveAppointment(null);
        if (onSuccess) onSuccess();
        return;
      }

      try {
        if (isDoc) {
          await endVideoCallApi(token, activeAppointment.id);
        }
      } catch (e) {
      } finally {
        setIsCallActive(false);
        setActiveAppointment(null);
        setCallSeconds(0);
        if (onSuccess) onSuccess();
      }
    },
    [activeAppointment, token, isDoc]
  );

  const toggleMute = () => setIsMuted((prev) => !prev);
  const toggleCamera = () => setIsCameraOff((prev) => !prev);
  const toggleSpeaker = () => setIsSpeakerOn((prev) => !prev);

  return {
    activeAppointment,
    isCallActive,
    isConnecting,
    videoRoomId,
    meetingUrl,
    callSeconds,
    callDurationStr: formatDuration(callSeconds),
    isMuted,
    isCameraOff,
    isSpeakerOn,
    doctorNotes,
    error,
    setDoctorNotes,
    connectVideoCall,
    endVideoCall,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
  };
};

export default useVideoCall;
