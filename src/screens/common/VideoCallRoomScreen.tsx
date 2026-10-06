import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Video } from 'lucide-react-native';
import { io, Socket } from 'socket.io-client';
import {
  mediaDevices,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
  MediaStream,
} from 'react-native-webrtc';
import { BASE_URL, apiFetch } from '../../api/apiConfig';
import { Appointment } from '../../types/clinicTypes';

type CallerRole = 'doctor' | 'patient';
interface Props {
  appointment: Appointment;
  roomId: string;
  callerRole: CallerRole;
  userId: number | string;
  token: string;
  onClose: () => void;
}
type SignalPayload = { socketId: string; offer?: any; answer?: any; candidate?: any };

const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const socketUrl = BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');

async function requestMediaPermissions() {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ]);
  return Object.values(result).every(value => value === PermissionsAndroid.RESULTS.GRANTED);
}

export function VideoCallRoomScreen({ appointment, roomId, callerRole, userId, token, onClose }: Props) {
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef(new Map<string, RTCPeerConnection>());
  const pendingCandidates = useRef(new Map<string, any[]>());
  const mountedRef = useRef(true);
  const endingRef = useRef(false);
  const incomingCallSentRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [status, setStatus] = useState('Connecting to video consultation…');

  const closePeerConnections = useCallback(() => {
    peerConnections.current.forEach(connection => connection.close());
    peerConnections.current.clear();
    pendingCandidates.current.clear();
  }, []);

  const endCall = useCallback(async (notifyServer = true) => {
    if (endingRef.current) return;
    endingRef.current = true;
    const socket = socketRef.current;
    if (notifyServer) socket?.emit('call-ended', {
      appointment_id: appointment.id,
      video_room_id: roomId,
      doctor_id: appointment.doctor_id,
      patient_id: appointment.patient_id,
      ended_by: callerRole,
    });
    socket?.emit('leave-room', { video_room_id: roomId });
    closePeerConnections();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    remoteStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    socket?.disconnect();
    socketRef.current = null;
    if (notifyServer) {
      const response = await apiFetch(`/appointments/${appointment.id}/end-call`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.success) Alert.alert('Call ended', response.message || 'Billing could not be finalized.');
    }
    onCloseRef.current();
  }, [appointment.doctor_id, appointment.id, appointment.patient_id, callerRole, closePeerConnections, roomId, token]);

  useEffect(() => {
    mountedRef.current = true;
    let socket: Socket | null = null;
    let disposed = false;

    const createPeer = async (peerId: string) => {
      const existing = peerConnections.current.get(peerId);
      if (existing) return existing;
      const connection = new RTCPeerConnection(rtcConfig);
      localStreamRef.current?.getTracks().forEach(track => connection.addTrack(track, localStreamRef.current!));
      connection.onicecandidate = (event: { candidate: any }) => {
        if (event.candidate) socket?.emit('ice-candidate', { video_room_id: roomId, candidate: event.candidate, targetSocketId: peerId });
      };
      connection.ontrack = (event: { streams?: MediaStream[] }) => {
        const stream = event.streams?.[0];
        if (stream) {
          remoteStreamRef.current = stream;
          if (mountedRef.current) {
            setRemoteStream(stream);
            setConnecting(false);
            setStatus('Video call connected');
          }
        }
      };
      connection.onconnectionstatechange = () => {
        if (!mountedRef.current) return;
        if (connection.connectionState === 'connected') {
          setConnecting(false);
          setStatus('Video call connected');
        } else if (connection.connectionState === 'failed') {
          setStatus('Connection failed. Check your internet and try again.');
        }
      };
      peerConnections.current.set(peerId, connection);
      return connection;
    };

    const flushCandidates = async (peerId: string, connection: RTCPeerConnection) => {
      const candidates = pendingCandidates.current.get(peerId) || [];
      for (const candidate of candidates) await connection.addIceCandidate(new RTCIceCandidate(candidate));
      pendingCandidates.current.delete(peerId);
    };

    const connect = async () => {
      try {
        if (!(await requestMediaPermissions())) throw new Error('Camera and microphone permission are required for a video consultation.');
        const stream = await mediaDevices.getUserMedia({ audio: true, video: { facingMode: 'user' } });
        if (disposed) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);

        socket = io(socketUrl, { transports: ['websocket', 'polling'], reconnection: true });
        socketRef.current = socket;
        socket.on('connect', () => {
          socket?.emit('register-user', { userType: callerRole === 'patient' ? 'patient' : 'staff', userId: String(userId) });
          socket?.emit('join-room', { video_room_id: roomId });
          if (callerRole === 'doctor' && !incomingCallSentRef.current) {
            incomingCallSentRef.current = true;
            socket?.emit('incoming-call', {
              appointment_id: appointment.id,
              video_room_id: roomId,
              doctor_id: appointment.doctor_id,
              patient_id: appointment.patient_id,
              caller_name: appointment.doctor_name,
              caller_role: 'doctor',
              appointment_date: appointment.appointment_date,
              appointment_time: appointment.appointment_time || appointment.time_slot,
            });
          }
        });
        socket.on('room-joined', async ({ peers = [] }: { peers?: string[] }) => {
          setStatus(peers.length ? 'Connecting to the other participant…' : 'Waiting for the other participant…');
          for (const peerId of peers) {
            const connection = await createPeer(peerId);
            const offer = await connection.createOffer();
            await connection.setLocalDescription(offer);
            socket?.emit('offer', { video_room_id: roomId, offer, targetSocketId: peerId });
          }
        });
        socket.on('peer-joined', ({ socketId }: { socketId: string }) => {
          void createPeer(socketId);
          setStatus('Participant joined. Connecting…');
        });
        socket.on('offer', async ({ socketId, offer }: SignalPayload) => {
          if (!socketId || !offer) return;
          const connection = await createPeer(socketId);
          await connection.setRemoteDescription(new RTCSessionDescription(offer));
          await flushCandidates(socketId, connection);
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          socket?.emit('answer', { video_room_id: roomId, answer, targetSocketId: socketId });
        });
        socket.on('answer', async ({ socketId, answer }: SignalPayload) => {
          const connection = socketId ? peerConnections.current.get(socketId) : null;
          if (!connection || !answer) return;
          await connection.setRemoteDescription(new RTCSessionDescription(answer));
          await flushCandidates(socketId!, connection);
        });
        socket.on('ice-candidate', async ({ socketId, candidate }: SignalPayload) => {
          if (!socketId || !candidate) return;
          const connection = await createPeer(socketId);
          if (!connection.remoteDescription) {
            pendingCandidates.current.set(socketId, [...(pendingCandidates.current.get(socketId) || []), candidate]);
          } else {
            await connection.addIceCandidate(new RTCIceCandidate(candidate));
          }
        });
        socket.on('peer-left', () => {
          setRemoteStream(null);
          setStatus('The other participant left the call.');
        });
        socket.on('call-ended', payload => {
          if (String(payload?.appointment_id) === String(appointment.id)) {
            void endCall(false);
            Alert.alert('Consultation ended', 'The other participant ended the call.');
          }
        });
        socket.on('connect_error', () => setStatus('Reconnecting to call…'));
      } catch (error) {
        if (mountedRef.current) {
          setConnecting(false);
          setStatus(error instanceof Error ? error.message : 'Unable to start video call.');
        }
      }
    };

    void connect();
    return () => {
      disposed = true;
      mountedRef.current = false;
      socket?.disconnect();
      closePeerConnections();
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      remoteStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [appointment.id, callerRole, closePeerConnections, endCall, roomId, userId]);

  const toggleMute = () => {
    const next = !muted;
    localStream?.getAudioTracks().forEach(track => { track.enabled = !next; });
    setMuted(next);
  };
  const toggleCamera = () => {
    const next = !cameraOff;
    localStream?.getVideoTracks().forEach(track => { track.enabled = !next; });
    setCameraOff(next);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      {remoteStream ? <RTCView streamURL={remoteStream.toURL()} objectFit="cover" style={styles.remoteVideo} /> : (
        <View style={styles.waiting}><Video size={48} color="#5EEAD4" /><Text style={styles.waitingTitle}>Video Consultation</Text>{connecting ? <ActivityIndicator color="#5EEAD4" /> : null}<Text style={styles.status}>{status}</Text></View>
      )}
      {localStream ? <RTCView streamURL={localStream.toURL()} objectFit="cover" mirror style={styles.localVideo} /> : null}
      <View style={styles.topBar}><Text style={styles.name}>{callerRole === 'patient' ? appointment.doctor_name : appointment.patient_name}</Text><Text style={styles.status}>{status}</Text></View>
      <View style={styles.controls}>
        <TouchableOpacity accessibilityLabel={muted ? 'Unmute microphone' : 'Mute microphone'} style={styles.control} onPress={toggleMute}>{muted ? <MicOff color="#FFF" /> : <Mic color="#FFF" />}</TouchableOpacity>
        <TouchableOpacity accessibilityLabel={cameraOff ? 'Turn camera on' : 'Turn camera off'} style={styles.control} onPress={toggleCamera}>{cameraOff ? <CameraOff color="#FFF" /> : <Camera color="#FFF" />}</TouchableOpacity>
        <TouchableOpacity accessibilityLabel="End call" style={[styles.control, styles.endControl]} onPress={() => void endCall()}><PhoneOff color="#FFF" /></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFill, zIndex: 100, backgroundColor: '#07111F' },
  remoteVideo: { ...StyleSheet.absoluteFill },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 28 },
  waitingTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  status: { color: '#CBD5E1', fontSize: 13, textAlign: 'center' },
  topBar: { position: 'absolute', top: 42, left: 20, right: 20, gap: 4 },
  name: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  localVideo: { position: 'absolute', right: 18, top: 105, width: 112, height: 156, borderRadius: 14, backgroundColor: '#1E293B' },
  controls: { position: 'absolute', bottom: 34, alignSelf: 'center', flexDirection: 'row', gap: 18, padding: 12, borderRadius: 32, backgroundColor: 'rgba(15,23,42,0.85)' },
  control: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: '#334155' },
  endControl: { backgroundColor: '#DC2626' },
});
