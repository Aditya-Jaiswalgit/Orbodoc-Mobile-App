import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { NotificationItem } from '../../types/clinicTypes';

interface Props {
  onOpenDrawer: () => void;
}

export const NotificationsCenterScreen: React.FC<Props> = ({ onOpenDrawer }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: 1, user_id: 1, title: 'New Appointment Booked', message: 'Patient Vikram Singh booked slot for 11:30 AM today.', type: 'appointment', is_read: false, created_at: '10 mins ago' },
    { id: 2, user_id: 1, title: 'Low Stock Alert', message: 'Paracetamol 650mg is below reorder threshold (15 left).', type: 'system', is_read: false, created_at: '1 hour ago' },
    { id: 3, user_id: 1, title: 'Lab Report Verified', message: 'Thyroid panel report for Pooja Gupta is ready.', type: 'lab', is_read: true, created_at: '2 hours ago' },
  ]);

  const [broadcastModalVisible, setBroadcastModalVisible] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    Alert.alert('Notifications', 'All notifications marked as read.');
  };

  const toggleRead = (id: number) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: !n.is_read } : n))
    );
  };

  const handleBroadcast = () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      Alert.alert('Validation Error', 'Title and Message are required.');
      return;
    }

    const newNotif: NotificationItem = {
      id: Date.now(),
      user_id: 1,
      title: broadcastTitle,
      message: broadcastMessage,
      type: 'broadcast',
      is_read: false,
      created_at: 'Just now',
    };

    setNotifications([newNotif, ...notifications]);
    setBroadcastModalVisible(false);
    setBroadcastTitle('');
    setBroadcastMessage('');
    Alert.alert('Broadcast Sent', 'Notification broadcasted to all clinic users!');
  };

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Notifications Center" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Actions Row */}
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.readAllBtn} onPress={markAllRead}>
            <Text style={styles.readAllText}>✓ Mark All Read</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.broadcastBtn} onPress={() => setBroadcastModalVisible(true)}>
            <Text style={styles.broadcastText}>📢 Broadcast Message</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications List */}
        <View style={styles.list}>
          {notifications.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={[styles.card, !n.is_read && styles.unreadCard]}
              onPress={() => toggleRead(n.id)}>
              <View style={styles.cardHeader}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{n.type.toUpperCase()}</Text>
                </View>
                <Text style={styles.timeText}>{n.created_at}</Text>
              </View>

              <Text style={styles.titleText}>{n.title}</Text>
              <Text style={styles.msgText}>{n.message}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Broadcast Modal */}
      <Modal visible={broadcastModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Broadcast Announcement</Text>

            <Text style={styles.label}>Broadcast Title *</Text>
            <TextInput style={styles.input} placeholder="e.g. OPD Timings Update" value={broadcastTitle} onChangeText={setBroadcastTitle} />

            <Text style={styles.label}>Message Content *</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              multiline={true}
              placeholder="Announcement details to broadcast..."
              value={broadcastMessage}
              onChangeText={setBroadcastMessage}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setBroadcastModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleBroadcast}>
                <Text style={styles.saveText}>Send Broadcast</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 80 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  readAllBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  readAllText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  broadcastBtn: { backgroundColor: '#0d9488', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  broadcastText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  list: { gap: 10 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  unreadCard: { borderWidth: 1.5, borderColor: '#0d9488', backgroundColor: '#f0fdf4' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  typeBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 10, fontWeight: '800', color: '#0f172a' },
  timeText: { fontSize: 11, color: '#94a3b8' },
  titleText: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  msgText: { fontSize: 13, color: '#475569', marginTop: 4, lineHeight: 18 },
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#475569', fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: '#0d9488', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#ffffff', fontWeight: '800' },
});

export default NotificationsCenterScreen;
