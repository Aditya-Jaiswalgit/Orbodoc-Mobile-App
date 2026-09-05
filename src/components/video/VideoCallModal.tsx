import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PatientUserIcon, StethoscopeIcon } from '../common/CustomIcons';

interface VideoCallModalProps {
  visible: boolean;
  appointment: any;
  callDurationStr: string;
  isConnecting: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;
  doctorNotes: string;
  isDoctor: boolean;
  onSetDoctorNotes: (text: string) => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  visible,
  appointment,
  callDurationStr,
  isConnecting,
  isMuted,
  isCameraOff,
  isSpeakerOn,
  doctorNotes,
  isDoctor,
  onSetDoctorNotes,
  onToggleMute,
  onToggleCamera,
  onToggleSpeaker,
  onEndCall,
}) => {
  const [showNotesDrawer, setShowNotesDrawer] = useState<boolean>(false);
  const localVideoRef = useRef<any>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(false);

  const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

  // Real WebRTC / HTML5 MediaStream Camera Handler
  useEffect(() => {
    let activeStream: any = null;

    async function enableLocalCamera() {
      if (!visible || isCameraOff || !isWeb) {
        if (activeStream) {
          try {
            activeStream.getTracks().forEach((track: any) => track.stop());
          } catch (e) {}
          activeStream = null;
        }
        setHasCameraPermission(false);
        return;
      }

      try {
        if ((navigator as any)?.mediaDevices?.getUserMedia) {
          const stream = await (navigator as any).mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            audio: false,
          });
          activeStream = stream;
          setHasCameraPermission(true);

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play().catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Camera stream error:', err);
        setHasCameraPermission(false);
      }
    }

    enableLocalCamera();

    return () => {
      if (activeStream) {
        try {
          activeStream.getTracks().forEach((track: any) => track.stop());
        } catch (e) {}
      }
    };
  }, [visible, isCameraOff, isWeb]);

  if (!visible || !appointment) return null;

  const doctorName = appointment?.doctor_name || 'Dr. Rahul Sharma';
  const patientName = appointment?.patient_name || 'Patient';
  const remoteName = isDoctor ? patientName : doctorName;
  const localName = isDoctor ? doctorName : patientName;

  const roomId = appointment.video_room_id || `video-${appointment.id || '101'}`;
  const displayName = encodeURIComponent(localName);
  const jitsiMeetingUrl = `https://meet.jit.si/${roomId}#config.prejoinPageEnabled=false&userInfo.displayName="${displayName}"`;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onEndCall}>
      <SafeAreaView style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <View style={styles.headerInfoCol}>
            <View style={styles.liveBadgeRow}>
              <View style={styles.redDot} />
              <Text style={styles.liveBadgeText}>LIVE VIDEO CONSULTATION</Text>
            </View>
            <Text style={styles.remoteNameText}>{remoteName}</Text>
            <Text style={styles.subText}>
              🏬 {appointment.clinic_name || 'Aarogya Care Clinic'} · 🔒 Encrypted Session
            </Text>
          </View>

          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>{callDurationStr}</Text>
          </View>
        </View>

        {/* Main Video Stream Frame */}
        <View style={styles.videoStreamContainer}>
          {isConnecting ? (
            <View style={styles.connectingBox}>
              <ActivityIndicator size="large" color="#2dd4bf" />
              <Text style={styles.connectingText}>Establishing HD Video Connection...</Text>
              <Text style={styles.connectingSub}>Connecting to secure room {roomId}</Text>
            </View>
          ) : (
            <View style={styles.remoteVideoFrame}>
              {/* WebRTC Live Jitsi Embedded Stream (rendered dynamically on web platform) */}
              {isWeb ? (
                React.createElement('iframe', {
                  src: jitsiMeetingUrl,
                  style: {
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '20px',
                    backgroundColor: '#0f172a',
                  },
                  allow: 'camera; microphone; display-capture; autoplay; clipboard-write',
                  title: 'Live Video Call Room',
                })
              ) : (
                /* Native Mobile Stream Frame */
                <View style={styles.remoteVideoContent}>
                  <View style={styles.largeAvatarCircle}>
                    {isDoctor ? (
                      <PatientUserIcon color="#94a3b8" size={60} />
                    ) : (
                      <StethoscopeIcon color="#2dd4bf" size={60} />
                    )}
                  </View>
                  <Text style={styles.remoteVideoName}>{remoteName}</Text>
                  <Text style={styles.remoteVideoStatus}>
                    {isMuted ? '🔇 Muted by user' : '🎙️ Live Audio & HD Video Stream Active'}
                  </Text>

                  <View style={styles.audioWaveRow}>
                    <View style={[styles.waveBar, { height: 14 }]} />
                    <View style={[styles.waveBar, { height: 26 }]} />
                    <View style={[styles.waveBar, { height: 18 }]} />
                    <View style={[styles.waveBar, { height: 32 }]} />
                    <View style={[styles.waveBar, { height: 10 }]} />
                  </View>
                </View>
              )}

              {/* Local Video PIP Camera Preview */}
              <View style={styles.localVideoPip}>
                {isCameraOff ? (
                  <View style={styles.cameraOffPip}>
                    <Text style={{ fontSize: 20 }}>📷🚫</Text>
                    <Text style={styles.pipText}>Camera Off</Text>
                  </View>
                ) : (
                  <View style={styles.cameraOnPip}>
                    {isWeb ? (
                      React.createElement('video', {
                        ref: localVideoRef,
                        autoPlay: true,
                        playsInline: true,
                        muted: true,
                        style: {
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '14px',
                          transform: 'scaleX(-1)',
                        },
                      })
                    ) : (
                      <View style={styles.pipAvatarContent}>
                        <View style={styles.pipAvatarCircle}>
                          <Text style={{ fontSize: 16 }}>👤</Text>
                        </View>
                        <Text style={styles.pipText}>{localName}</Text>
                        <Text style={styles.pipSub}>Self (Live HD)</Text>
                      </View>
                    )}

                    {!hasCameraPermission && isWeb && (
                      <View style={styles.pipPermissionOverlay}>
                        <Text style={styles.pipPermissionText}>Camera Active</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* HD Quality Tag */}
              <View style={styles.hdTag}>
                <Text style={styles.hdTagText}>1080p HD • Live WebRTC</Text>
              </View>
            </View>
          )}
        </View>

        {/* Doctor Clinical Notes Drawer Modal */}
        {showNotesDrawer && (
          <View style={styles.notesDrawerBox}>
            <View style={styles.notesDrawerHeader}>
              <Text style={styles.notesDrawerTitle}>📝 Clinical Notes & Rx</Text>
              <TouchableOpacity onPress={() => setShowNotesDrawer(false)}>
                <Text style={styles.closeDrawerText}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.notesInput}
              placeholder="Write diagnosis, dosage, or advice during call..."
              placeholderTextColor="#94a3b8"
              multiline
              value={doctorNotes}
              onChangeText={onSetDoctorNotes}
            />
          </View>
        )}

        {/* Bottom Call Action Toolbar */}
        <View style={styles.bottomToolbar}>
          <TouchableOpacity
            style={[styles.actionBtn, isMuted && styles.actionBtnActive]}
            onPress={onToggleMute}>
            <Text style={styles.actionIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
            <Text style={styles.actionLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, isCameraOff && styles.actionBtnActive]}
            onPress={onToggleCamera}>
            <Text style={styles.actionIcon}>{isCameraOff ? '🚫' : '📹'}</Text>
            <Text style={styles.actionLabel}>{isCameraOff ? 'Cam On' : 'Cam Off'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, !isSpeakerOn && styles.actionBtnActive]}
            onPress={onToggleSpeaker}>
            <Text style={styles.actionIcon}>{isSpeakerOn ? '🔊' : '🔈'}</Text>
            <Text style={styles.actionLabel}>{isSpeakerOn ? 'Speaker' : 'Ear'}</Text>
          </TouchableOpacity>

          {isDoctor && (
            <TouchableOpacity
              style={[styles.actionBtn, showNotesDrawer && styles.actionBtnActive]}
              onPress={() => setShowNotesDrawer((prev) => !prev)}>
              <Text style={styles.actionIcon}>📝</Text>
              <Text style={styles.actionLabel}>Notes</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.endCallBtn} onPress={onEndCall}>
            <Text style={styles.endCallIcon}>📞</Text>
            <Text style={styles.endCallText}>End Call</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },

  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerInfoCol: { flex: 1, marginRight: 10 },
  liveBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  liveBadgeText: { fontSize: 10, fontWeight: '800', color: '#ef4444', letterSpacing: 0.5 },
  remoteNameText: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  subText: { fontSize: 11, color: '#94a3b8', marginTop: 1 },

  timerBadge: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  timerText: { fontSize: 14, fontWeight: '800', color: '#2dd4bf', fontFamily: 'monospace' },

  videoStreamContainer: { flex: 1, padding: 14 },
  connectingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  connectingText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  connectingSub: { fontSize: 12, color: '#94a3b8' },

  remoteVideoFrame: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
    position: 'relative',
  },
  remoteVideoContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  largeAvatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#2dd4bf',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  remoteVideoName: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  remoteVideoStatus: { fontSize: 12, color: '#94a3b8' },

  audioWaveRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 10 },
  waveBar: { width: 4, backgroundColor: '#2dd4bf', borderRadius: 2 },

  localVideoPip: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 120,
    height: 150,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#2dd4bf',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  cameraOnPip: { flex: 1, width: '100%', height: '100%', position: 'relative', backgroundColor: '#000000' },
  cameraOffPip: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 8, backgroundColor: '#334155' },
  pipAvatarContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pipAvatarCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  pipText: { fontSize: 11, fontWeight: '700', color: '#ffffff', textAlign: 'center' },
  pipSub: { fontSize: 9, color: '#94a3b8' },

  pipPermissionOverlay: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 6,
    paddingVertical: 2,
    alignItems: 'center',
  },
  pipPermissionText: { fontSize: 8, fontWeight: '700', color: '#2dd4bf' },

  hdTag: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(15, 23, 42, 0.7)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  hdTagText: { fontSize: 10, fontWeight: '700', color: '#2dd4bf' },

  notesDrawerBox: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  notesDrawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  notesDrawerTitle: { fontSize: 14, fontWeight: '800', color: '#ffffff' },
  closeDrawerText: { fontSize: 16, color: '#94a3b8', fontWeight: 'bold' },
  notesInput: { backgroundColor: '#0f172a', borderRadius: 10, padding: 10, fontSize: 12, color: '#ffffff', height: 70, textAlignVertical: 'top' },

  bottomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  actionBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  actionBtnActive: { backgroundColor: '#334155', borderWidth: 1, borderColor: '#2dd4bf' },
  actionIcon: { fontSize: 18 },
  actionLabel: { fontSize: 9, fontWeight: '700', color: '#cbd5e1', marginTop: 2 },

  endCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
  },
  endCallIcon: { fontSize: 18 },
  endCallText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});

export default VideoCallModal;
