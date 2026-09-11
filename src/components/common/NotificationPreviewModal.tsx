import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowRight, BellOff, X } from 'lucide-react-native';
import { useNotifications } from '../../hooks/useNotifications';

interface NotificationPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  onViewAll?: () => void;
}

/** Header-bell preview: uses the same live notification data as the full page. */
export const NotificationPreviewModal: React.FC<NotificationPreviewModalProps> = ({ visible, onClose, onViewAll }) => {
  const { notifications, markRead } = useNotifications();
  const recentNotifications = notifications.slice(0, 3);

  const openAll = () => {
    onClose();
    onViewAll?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Notifications</Text>
              <Text style={styles.subtitle}>{recentNotifications.length ? 'Your latest updates' : 'You are all caught up'}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={8}>
              <X size={17} color="#64748b" />
            </TouchableOpacity>
          </View>

          {recentNotifications.length === 0 ? (
            <View style={styles.emptyContent}>
              <View style={styles.emptyIcon}><BellOff size={24} color="#94a3b8" /></View>
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySub}>New updates will appear here.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {recentNotifications.map((notification, index) => (
                <TouchableOpacity
                  key={notification.id || index}
                  style={[styles.notificationRow, !notification.is_read && styles.notificationRowUnread]}
                  onPress={() => !notification.is_read && markRead(notification.id)}>
                  <View style={styles.notificationCopy}>
                    <Text style={styles.notificationTitle} numberOfLines={1}>{notification.title || 'Notification'}</Text>
                    <Text style={styles.notificationMessage} numberOfLines={2}>{notification.message}</Text>
                  </View>
                  {!notification.is_read ? <View style={styles.unreadDot} /> : null}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.viewAllButton} onPress={openAll}>
            <Text style={styles.viewAllText}>View all notifications</Text>
            <ArrowRight size={16} color="#0d817d" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(15, 23, 42, 0.24)' },
  card: { position: 'absolute', top: 60, left: 10, right: 10, borderRadius: 10, overflow: 'hidden', backgroundColor: '#ffffff', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.2, shadowRadius: 18, elevation: 20 },
  header: { minHeight: 67, paddingHorizontal: 15, paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#edf2f7' },
  title: { color: '#0f172a', fontSize: 14, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 11, marginTop: 5 },
  closeButton: { padding: 3 },
  emptyContent: { minHeight: 182, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  emptyIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', marginBottom: 13 },
  emptyTitle: { color: '#334155', fontSize: 13, fontWeight: '800' },
  emptySub: { color: '#64748b', fontSize: 11, marginTop: 4 },
  list: { paddingHorizontal: 10, paddingTop: 9, gap: 7 },
  notificationRow: { minHeight: 59, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#f8fafc' },
  notificationRowUnread: { backgroundColor: '#effcfc', borderWidth: 1, borderColor: '#bdeeee' },
  notificationCopy: { flex: 1 },
  notificationTitle: { color: '#0f172a', fontSize: 12, fontWeight: '800' },
  notificationMessage: { color: '#64748b', fontSize: 11, lineHeight: 16, marginTop: 2 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#14b8a6' },
  viewAllButton: { minHeight: 51, marginTop: 10, borderTopWidth: 1, borderTopColor: '#edf2f7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  viewAllText: { color: '#0d817d', fontSize: 12, fontWeight: '800' },
});

export default NotificationPreviewModal;
