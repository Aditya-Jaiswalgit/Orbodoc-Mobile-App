// src/features/admin/users/components/UsersTableCard.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  FlatList,
} from 'react-native';
import {
  Edit,
  Mail,
  MoreVertical,
  Phone,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react-native';
import { roleConfig } from '../constants';

export interface UserItem {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  status: 'Active' | 'Inactive';
  created_at: string;
}

type UsersTableCardProps = {
  loading: boolean;
  users: UserItem[];
  onEdit?: (user: UserItem) => void;
  onDelete?: (id: string) => void;
  onChangeRole?: (user: UserItem) => void;
};

export function UsersTableCard({
  loading,
  users,
  onEdit,
  onDelete,
  onChangeRole,
}: UsersTableCardProps) {
  const [selectedUserForMenu, setSelectedUserForMenu] = useState<UserItem | null>(null);

  const handleAction = (type: 'edit' | 'role' | 'delete', user: UserItem) => {
    setSelectedUserForMenu(null);
    if (type === 'edit') {
      onEdit?.(user);
    } else if (type === 'role') {
      onChangeRole?.(user);
    } else if (type === 'delete') {
      Alert.alert(
        'Delete User',
        `Are you sure you want to delete ${user.full_name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => onDelete?.(user.id),
          },
        ]
      );
    }
  };

  return (
    <View style={styles.cardContainer}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <View style={styles.titleIconBg}>
            <Users size={20} color="#0D9488" />
          </View>
          <Text style={styles.cardTitle}>All Users ({users.length})</Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0D9488" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No users found</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {users.map((user) => {
            const roleInfo = roleConfig[user.role] || roleConfig.patient;
            const RoleIcon = roleInfo.icon;
            const initial = (user.full_name || 'U').charAt(0).toUpperCase();

            return (
              <View key={user.id} style={styles.userRow}>
                {/* Top Section: Avatar, Name, Email, Status */}
                <View style={styles.rowTop}>
                  <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>{initial}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.full_name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      user.status === 'Active'
                        ? styles.activeStatusBadge
                        : styles.inactiveStatusBadge,
                    ]}>
                    <Text
                      style={[
                        styles.statusBadgeText,
                        user.status === 'Active'
                          ? styles.activeStatusText
                          : styles.inactiveStatusText,
                      ]}>
                      {user.status}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedUserForMenu(user)}
                    style={styles.moreButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <MoreVertical size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Bottom Section: Role Badge & Contact Info */}
                <View style={styles.rowBottom}>
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: roleInfo.badgeBg || '#F1F5F9' },
                    ]}>
                    {RoleIcon ? (
                      <RoleIcon size={14} color={roleInfo.badgeText || '#334155'} />
                    ) : null}
                    <Text
                      style={[
                        styles.roleBadgeText,
                        { color: roleInfo.badgeText || '#334155' },
                      ]}>
                      {roleInfo.label}
                    </Text>
                  </View>

                  <View style={styles.contactContainer}>
                    {user.phone ? (
                      <View style={styles.contactItem}>
                        <Phone size={12} color="#94A3B8" />
                        <Text style={styles.contactText}>{user.phone}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.dateText}>{user.created_at}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Action Menu Modal */}
      <Modal
        visible={!!selectedUserForMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedUserForMenu(null)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedUserForMenu(null)}>
          <View style={styles.menuContainer}>
            <Text style={styles.menuHeaderTitle}>
              {selectedUserForMenu?.full_name}
            </Text>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                selectedUserForMenu && handleAction('edit', selectedUserForMenu)
              }>
              <Edit size={18} color="#0D9488" style={styles.menuIcon} />
              <Text style={styles.menuItemText}>Edit User</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                selectedUserForMenu && handleAction('role', selectedUserForMenu)
              }>
              <UserCog size={18} color="#3B82F6" style={styles.menuIcon} />
              <Text style={styles.menuItemText}>Change Role</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.deleteMenuItem]}
              onPress={() =>
                selectedUserForMenu && handleAction('delete', selectedUserForMenu)
              }>
              <Trash2 size={18} color="#EF4444" style={styles.menuIcon} />
              <Text style={[styles.menuItemText, styles.deleteMenuText]}>
                Delete User
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 13,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  userRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#0F766E',
    fontSize: 16,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  activeStatusBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  inactiveStatusBadge: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeStatusText: {
    color: '#047857',
  },
  inactiveStatusText: {
    color: '#64748B',
  },
  moreButton: {
    padding: 6,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 52,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 2,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },

  /* Modal Menu */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuContainer: {
    width: '85%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  menuHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  deleteMenuItem: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#FEF2F2',
  },
  deleteMenuText: {
    color: '#EF4444',
  },
});

export default UsersTableCard;
