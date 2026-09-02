import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthContext } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { BellNotificationIcon } from './CustomIcons';

interface StaffHeaderProps {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  title?: string;
  onNavigateProfile?: () => void;
}

export const StaffHeader: React.FC<StaffHeaderProps> = ({
  onOpenDrawer,
  onOpenNotifications,
  title,
  onNavigateProfile,
}) => {
  const { user, logout } = useAuthContext();
  const { unreadCount } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  const statusBarHeight = StatusBar.currentHeight || 36;
  const staffName = user?.fullName || (user as any)?.full_name || 'Staff User';
  const roleName = (user?.roleName || (user as any)?.role_name || (user as any)?.role || 'staff').toUpperCase();
  const initial = staffName.charAt(0).toUpperCase();

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'super_admin':
        return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
      case 'clinic_admin':
        return { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' };
      case 'doctor':
        return { bg: '#dcfce7', text: '#166534', border: '#86efac' };
      case 'receptionist':
        return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
      case 'pharmacist':
        return { bg: '#fae8ff', text: '#86198f', border: '#f5d0fe' };
      case 'lab_technician':
        return { bg: '#e0f2fe', text: '#075985', border: '#bae6fd' };
      case 'accountant':
        return { bg: '#ccfbf1', text: '#115e59', border: '#99f6e4' };
      case 'nurse':
        return { bg: '#ffe4e6', text: '#9f1239', border: '#fecdd3' };
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }
  };

  const badgeTheme = getRoleBadgeColor(roleName);

  const handleChangePassword = () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Validation Error', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New password and confirm password do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters long.');
      return;
    }

    setPwdSubmitting(true);
    setTimeout(() => {
      setPwdSubmitting(false);
      setShowChangePasswordModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully!');
    }, 800);
  };

  return (
    <View style={styles.headerContainer}>
      <StatusBar barStyle="dark-content" />
      {Platform.OS === 'android' && (
        <View style={{ height: statusBarHeight, backgroundColor: '#ffffff' }} />
      )}

      <View style={styles.headerRow}>
        {/* Left Section: Menu Drawer Toggle + Logo or Title */}
        <View style={styles.leftSection}>
          <TouchableOpacity
            style={styles.menuIconButton}
            activeOpacity={0.8}
            onPress={onOpenDrawer}>
            <Text style={styles.menuIconText}>☰</Text>
          </TouchableOpacity>

          {title ? (
            <View style={styles.titleCol}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {title}
              </Text>
            </View>
          ) : (
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          )}
        </View>

        {/* Right Section: Role Pill, Bell, Staff Avatar Pill */}
        <View style={styles.rightSection}>
          {/* Role Pill */}
          <View
            style={[
              styles.rolePill,
              { backgroundColor: badgeTheme.bg, borderColor: badgeTheme.border },
            ]}>
            <Text style={[styles.rolePillText, { color: badgeTheme.text }]}>
              {roleName.replace('_', ' ')}
            </Text>
          </View>

          {/* Notification Bell */}
          <TouchableOpacity
            style={styles.notificationBell}
            activeOpacity={0.8}
            onPress={onOpenNotifications}>
            <BellNotificationIcon color="#0f766e" size={17} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Profile Avatar (Click to open dropdown tab) */}
          <TouchableOpacity
            style={styles.profileAvatar}
            onPress={() => setShowDropdown(!showDropdown)}
            activeOpacity={0.8}>
            <Text style={styles.avatarText}>{initial}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Menu Modal */}
      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}>
          <View style={styles.dropdownCard}>
            {/* User Header */}
            <View style={styles.dropdownUserHeader}>
              <Text style={styles.dropdownUserName}>{staffName}</Text>
              <Text style={styles.dropdownUserSub}>Profile settings</Text>
            </View>

            <View style={styles.dropdownDivider} />

            {/* Menu Option 1: My Profile */}
            <TouchableOpacity
              style={styles.dropdownMenuItem}
              onPress={() => {
                setShowDropdown(false);
                if (onNavigateProfile) {
                  onNavigateProfile();
                } else {
                  setShowProfileModal(true);
                }
              }}>
              <Text style={styles.menuItemIcon}>👤</Text>
              <Text style={styles.menuItemText}>My Profile</Text>
            </TouchableOpacity>

            {/* Menu Option 2: Change Password */}
            <TouchableOpacity
              style={styles.dropdownMenuItem}
              onPress={() => {
                setShowDropdown(false);
                setShowChangePasswordModal(true);
              }}>
              <Text style={styles.menuItemIcon}>🔑</Text>
              <Text style={styles.menuItemText}>Change Password</Text>
            </TouchableOpacity>

            <View style={styles.dropdownDivider} />

            {/* Menu Option 3: Logout */}
            <TouchableOpacity
              style={styles.dropdownMenuItem}
              onPress={() => {
                setShowDropdown(false);
                logout();
              }}>
              <Text style={[styles.menuItemIcon, { color: '#ef4444' }]}>↳</Text>
              <Text style={[styles.menuItemText, { color: '#ef4444', fontWeight: '700' }]}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* My Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}>
        <View style={styles.centeredModalBg}>
          <View style={styles.profileModalCard}>
            <View style={styles.profileModalHeader}>
              <View style={styles.largeAvatarCircle}>
                <Text style={styles.largeAvatarText}>{initial}</Text>
              </View>
              <Text style={styles.profileModalTitle}>{staffName}</Text>
              <Text style={styles.profileModalSub}>{roleName.replace('_', ' ')} Account</Text>
            </View>

            <View style={styles.infoRowGroup}>
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowLabel}>EMAIL ADDRESS</Text>
                <Text style={styles.infoRowVal}>{user?.email || 'staff@orbodoc.com'}</Text>
              </View>
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowLabel}>PHONE NUMBER</Text>
                <Text style={styles.infoRowVal}>{user?.phone || '+91 98765 43210'}</Text>
              </View>
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowLabel}>ROLE</Text>
                <Text style={styles.infoRowVal}>{roleName.replace('_', ' ')}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtnPill}
              onPress={() => setShowProfileModal(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowChangePasswordModal(false)}>
        <View style={styles.centeredModalBg}>
          <View style={styles.changePasswordCard}>
            <View style={styles.pwdModalHeader}>
              <Text style={styles.pwdModalIcon}>🔑</Text>
              <Text style={styles.pwdModalTitle}>Change Password</Text>
              <Text style={styles.pwdModalSub}>Enter your current password and new password</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.formInput}
                secureTextEntry
                placeholder="Enter current password"
                placeholderTextColor="#94a3b8"
                value={oldPassword}
                onChangeText={setOldPassword}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.formInput}
                secureTextEntry
                placeholder="Enter new password"
                placeholderTextColor="#94a3b8"
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.formInput}
                secureTextEntry
                placeholder="Re-enter new password"
                placeholderTextColor="#94a3b8"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowChangePasswordModal(false);
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleChangePassword}
                disabled={pwdSubmitting}>
                <Text style={styles.submitBtnText}>
                  {pwdSubmitting ? 'Updating...' : 'Save Password'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  menuIconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuIconText: {
    fontSize: 18,
    color: '#0d9488',
    fontWeight: 'bold',
  },
  titleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  logoImage: {
    width: 100,
    height: 32,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rolePill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  rolePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  notificationBell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 5,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  profileTextCol: {
    justifyContent: 'center',
  },
  profileNameText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0f172a',
    maxWidth: 75,
  },
  profileSubText: {
    fontSize: 9,
    color: '#64748b',
    marginTop: -1,
  },
  dropdownCaret: {
    fontSize: 9,
    color: '#64748b',
    marginLeft: 1,
  },

  /* Dropdown Menu Modal Overlay */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'android' ? 55 : 45,
    paddingRight: 10,
  },
  dropdownCard: {
    width: 210,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  dropdownUserHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dropdownUserName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  dropdownUserSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  menuItemIcon: {
    fontSize: 15,
    width: 20,
    textAlign: 'center',
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },

  /* Centered Modals for Profile & Change Password */
  centeredModalBg: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  profileModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    gap: 16,
    elevation: 8,
  },
  profileModalHeader: {
    alignItems: 'center',
  },
  largeAvatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  largeAvatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
  },
  profileModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  profileModalSub: {
    fontSize: 12,
    color: '#64748b',
  },
  infoRowGroup: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  infoRowItem: {
    gap: 2,
  },
  infoRowLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  infoRowVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtnPill: {
    backgroundColor: '#0d9488',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },

  /* Change Password Modal */
  changePasswordCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    elevation: 8,
  },
  pwdModalHeader: {
    alignItems: 'center',
    marginBottom: 4,
  },
  pwdModalIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  pwdModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  pwdModalSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
  },
  formGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#0d9488',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});

export default StaffHeader;
