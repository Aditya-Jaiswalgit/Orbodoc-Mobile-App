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

interface PatientHeaderProps {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({
  onOpenDrawer,
  onOpenNotifications,
}) => {
  const { user, logout } = useAuthContext();
  const statusBarHeight = StatusBar.currentHeight || 36;
  const patientName = user?.fullName || user?.full_name || 'bulbul';
  const initial = patientName.charAt(0).toUpperCase();

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

        {/* Right Section: Wallet, Bell, Profile Avatar */}
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
            <View style={styles.badge}>
              <Text style={styles.badgeText}>4</Text>
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
    width: 110,
    height: 34,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6fffa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  walletIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  walletPlus: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  walletTextCol: {
    justifyContent: 'center',
  },
  walletLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0d9488',
    letterSpacing: 0.5,
  },
  walletAmount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f766e',
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

export default PatientHeader;
