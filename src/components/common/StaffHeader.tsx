import React from 'react';
import {
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthContext } from '../../context/AuthContext';
import { BellNotificationIcon } from './CustomIcons';

interface StaffHeaderProps {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  title?: string;
}

export const StaffHeader: React.FC<StaffHeaderProps> = ({
  onOpenDrawer,
  onOpenNotifications,
  title,
}) => {
  const { user, logout } = useAuthContext();
  const statusBarHeight = StatusBar.currentHeight || 36;
  const staffName = user?.fullName || (user as any)?.full_name || 'Staff User';
  const roleName = (user?.roleName || (user as any)?.role_name || (user as any)?.role || 'staff').toUpperCase();
  const initial = staffName.charAt(0).toUpperCase();

  // Helper color for role badge
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

        {/* Right Section: Role Pill, Bell, Staff Avatar */}
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
            <View style={styles.badge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>

          {/* Profile Avatar (Logout) */}
          <TouchableOpacity
            style={styles.profileAvatar}
            onPress={logout}
            activeOpacity={0.8}>
            <Text style={styles.avatarText}>{initial}</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  menuIconButton: {
    width: 36,
    height: 36,
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
  titleCol: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  notificationBell: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
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
    fontWeight: 'bold',
  },
});

export default StaffHeader;
