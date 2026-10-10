import React, { useEffect, useState } from 'react';
import { AppModal } from '../../components/common/AppModal';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { Pagination } from '../../components/common/Pagination';
import { RequestState } from '../../components/common/RequestState';
import { useAuthContext } from '../../context/AuthContext';
import { useNotificationInbox } from '../../hooks/useNotificationInbox';
import { useRemoteData } from '../../hooks/useRemoteData';
import { broadcastNotificationApi, getNotificationCategoriesApi } from '../../api/notificationApi';
import { displayDate } from '../../utils/dashboardValues';
import { showSuccessToast } from '../../utils/toast';

interface Props { onOpenDrawer: () => void }
export const NotificationsCenterScreen: React.FC<Props> = ({ onOpenDrawer }) => {
  const { activeClinicId, token, role } = useAuthContext();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const inbox = useNotificationInbox(currentPage, pageSize);
  const [broadcastModalVisible, setBroadcastModalVisible] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [category, setCategory] = useState<number | null>(null);
  const [target, setTarget] = useState<'all' | 'staff' | 'patients'>('all');
  const canBroadcast = role === 'clinic_admin' || role === 'super_admin';
  const categories = useRemoteData(String(token) + ':' + activeClinicId + ':notification-categories', async () => {
    const response = await getNotificationCategoriesApi();
    if (!response.success || !Array.isArray(response.data?.categories)) throw new Error('Categories unavailable');
    return response.data.categories;
  }, broadcastModalVisible && canBroadcast);
  useEffect(() => {
    setCurrentPage(1);
    setBroadcastModalVisible(false);
    setCategory(null);
    setBroadcastTitle('');
    setBroadcastMessage('');
  }, [activeClinicId]);
  useEffect(() => {
    if (inbox.data && currentPage > Math.max(1, Math.ceil(inbox.total / pageSize))) setCurrentPage(1);
  }, [inbox.data, inbox.total, currentPage, pageSize]);

  const markRead = async (id?: number) => {
    const ok = id === undefined ? await inbox.markAllRead() : await inbox.markRead(id);
    if (!ok) Alert.alert('Unable to mark as read', 'Please try again.');
    else if (id === undefined) showSuccessToast('Notifications updated', 'All notifications are marked as read.');
  };
  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim() || !category || !activeClinicId) {
      Alert.alert('Missing details', 'Select a category and enter a title and message.');
      return;
    }
    const ok = await inbox.mutate(() => broadcastNotificationApi({
      title: broadcastTitle.trim(), message: broadcastMessage.trim(), not_cat_id: category,
      clinic_id: activeClinicId, target,
    }));
    if (!ok) { Alert.alert('Broadcast failed', 'The server did not confirm sending. Please retry.'); return; }
    setBroadcastModalVisible(false);
    setBroadcastTitle(''); setBroadcastMessage(''); setCategory(null);
    showSuccessToast('Broadcast sent', 'The server confirmed your announcement.');
  };
  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Notifications Center" />
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={inbox.loading} onRefresh={inbox.refresh} />}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.readAllBtn} disabled={inbox.busy || inbox.loading || !inbox.unreadCount} onPress={() => markRead()}>
            <Text style={styles.readAllText}>Mark All Read</Text>
          </TouchableOpacity>
          {canBroadcast && <TouchableOpacity style={styles.broadcastBtn} onPress={() => setBroadcastModalVisible(true)}>
            <Text style={styles.broadcastText}>Broadcast Message</Text>
          </TouchableOpacity>}
        </View>
        <RequestState loading={inbox.loading && !inbox.data} error={inbox.error} onRetry={inbox.refresh}
          empty={!inbox.loading && !inbox.error && inbox.total === 0 ? 'No notifications.' : undefined} />
        <View style={styles.list}>
          {inbox.notifications.map(item => (
            <TouchableOpacity key={item.not_rec_id} disabled={inbox.busy || inbox.loading || Number(item.is_read) === 1}
              style={[styles.card, Number(item.is_read) !== 1 && styles.unreadCard]} onPress={() => markRead(item.not_rec_id)}>
              <View style={styles.cardHeader}>
                <Text style={styles.typeText}>{item.not_cat_name || 'Notification'}</Text>
                <Text style={styles.timeText}>{displayDate(item.sent_at || item.created_at)}</Text>
              </View>
              <Text style={styles.titleText}>{item.title || item.not_cat_name || 'Notification'}</Text>
              <Text style={styles.msgText}>{item.message}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Pagination currentPage={currentPage} totalPages={Math.max(1, Math.ceil(inbox.total / pageSize))}
          totalItems={inbox.total} pageSize={pageSize} onPageChange={setCurrentPage}
          onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
      </ScrollView>
      <AppModal visible={broadcastModalVisible} animationType="slide" transparent
        onRequestClose={() => { if (!inbox.busy) setBroadcastModalVisible(false); }}>
        <View style={styles.modalBg}><ScrollView contentContainerStyle={styles.modalCard} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>Broadcast Announcement</Text>
          <RequestState loading={categories.loading} error={categories.error} onRetry={categories.refresh}
            empty={categories.data?.length === 0 ? 'No notification categories available.' : undefined} />
          <Text style={styles.label}>Category *</Text>
          {categories.data?.map(item => <TouchableOpacity key={item.not_cat_id} disabled={inbox.busy}
            onPress={() => setCategory(item.not_cat_id)} style={[styles.card, category === item.not_cat_id && styles.unreadCard]}>
            <Text>{item.not_cat_name}</Text>
          </TouchableOpacity>)}
          <Text style={styles.label}>Recipients</Text>
          <View style={styles.modalBtnRow}>{(['all', 'staff', 'patients'] as const).map(value => (
            <TouchableOpacity key={value} disabled={inbox.busy} onPress={() => setTarget(value)} style={[styles.card, target === value && styles.unreadCard]}>
              <Text>{value}</Text>
            </TouchableOpacity>
          ))}</View>
          <Text style={styles.label}>Broadcast Title *</Text>
          <TextInput style={styles.input} editable={!inbox.busy} value={broadcastTitle} onChangeText={setBroadcastTitle} />
          <Text style={styles.label}>Message *</Text>
          <TextInput style={styles.input} multiline editable={!inbox.busy} value={broadcastMessage} onChangeText={setBroadcastMessage} />
          <View style={styles.modalBtnRow}>
            <TouchableOpacity style={styles.cancelBtn} disabled={inbox.busy} onPress={() => setBroadcastModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} disabled={inbox.busy || categories.loading || !category} onPress={handleBroadcast}>
              <Text style={styles.saveText}>{inbox.busy ? 'Sending...' : 'Send Broadcast'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView></View>
      </AppModal>
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
