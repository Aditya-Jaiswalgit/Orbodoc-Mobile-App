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

interface PatientHeaderProps {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateProfile?: () => void;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({
  onOpenDrawer,
  onOpenNotifications,
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
  const patientName = user?.fullName || user?.full_name || 'Patient';
  const initial = patientName.charAt(0).toUpperCase();

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
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={true} />
      {Platform.OS === 'android' && (
        <View style={{ height: statusBarHeight, backgroundColor: '#ffffff' }} />
      )}

      <View style={styles.headerRow}>
        {/* Left Section: Menu Toggle + Logo */}
        <View style={styles.leftSection}>
          <TouchableOpacity
            style={styles.menuIconButton}
            activeOpacity={0.8}
            onPress={onOpenDrawer}>
            <Text style={styles.menuIconText}>☰</Text>
          </TouchableOpacity>

          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Right Section: Wallet, Bell, Profile Avatar Pill */}
        <View style={styles.rightSection}>
          {/* Wallet Button */}
          <TouchableOpacity style={styles.walletPill} activeOpacity={0.8}>
            <View style={styles.walletIconCircle}>
              <Text style={styles.walletPlus}>+</Text>
            </View>
            <View style={styles.walletTextCol}>
              <Text style={styles.walletLabel}>WALLET</Text>
              <Text style={styles.walletAmount}>₹0</Text>
            </View>
          </TouchableOpacity>

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
              <Text style={styles.dropdownUserName}>{patientName}</Text>
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
              <Text style={styles.profileModalTitle}>{patientName}</Text>
              <Text style={styles.profileModalSub}>Patient Account</Text>
            </View>

            <View style={styles.infoRowGroup}>
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowLabel}>EMAIL ADDRESS</Text>
                <Text style={styles.infoRowVal}>{user?.email || 'patient@orbodoc.com'}</Text>
              </View>
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowLabel}>PHONE NUMBER</Text>
                <Text style={styles.infoRowVal}>{user?.phone || '+91 98765 43210'}</Text>
              </View>
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowLabel}>ACCOUNT TYPE</Text>
                <Text style={styles.infoRowVal}>Patient Profile</Text>
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
  logoImage: {
    width: 100,
    height: 32,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6fffa',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  walletIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  walletPlus: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  walletTextCol: {
    justifyContent: 'center',
  },
  walletLabel: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#0d9488',
    letterSpacing: 0.3,
  },
  walletAmount: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0f766e',
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
    maxWidth: 80,
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

export default PatientHeader;
