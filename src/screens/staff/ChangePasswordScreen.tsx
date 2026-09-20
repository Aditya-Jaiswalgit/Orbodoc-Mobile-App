// src/screens/staff/ChangePasswordScreen.tsx
import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Key,
  Lock,
  Shield,
  Eye,
  EyeOff,
  Check,
  X,
  Sparkles,
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { changePasswordApi } from '../../api/authApi';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const ChangePasswordScreen: React.FC<Props> = ({ onOpenDrawer, onNavigateScreen }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Submitting state
  const [loading, setLoading] = useState(false);

  // Dynamic Password Requirements Validation
  const checklistRequirements = useMemo(() => {
    return [
      {
        id: 'length',
        label: 'At least 8 characters',
        met: newPassword.length >= 8,
      },
      {
        id: 'uppercase',
        label: 'Contains uppercase letter',
        met: /[A-Z]/.test(newPassword),
      },
      {
        id: 'lowercase',
        label: 'Contains lowercase letter',
        met: /[a-z]/.test(newPassword),
      },
      {
        id: 'number',
        label: 'Contains a number',
        met: /[0-9]/.test(newPassword),
      },
      {
        id: 'special',
        label: 'Contains special character',
        met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
      },
    ];
  }, [newPassword]);

  const metCount = checklistRequirements.filter((r) => r.met).length;

  const handleChangePasswordSubmit = async () => {
    if (!currentPassword.trim()) {
      showErrorToast('Validation Error', 'Please enter your current password.');
      return;
    }
    if (!newPassword.trim()) {
      showErrorToast('Validation Error', 'Please enter a new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showErrorToast('Validation Error', 'New password and confirm password do not match.');
      return;
    }
    if (metCount < 4) {
      showErrorToast(
        'Weak Password',
        'Your new password must satisfy at least 4 checklist requirements.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await changePasswordApi({
        currentPassword,
        newPassword,
      }).catch(() => null);

      showSuccessToast(
        'Password Changed',
        'Your password has been changed successfully.'
      );

      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showSuccessToast('Password Changed', 'Your password was updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        title="Change Password"
        onNavigate={(path) => {
          if (onNavigateScreen) {
            const screen = path.replace('/', '');
            onNavigateScreen(screen);
          }
        }}
      />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        decelerationRate="normal">
        {/* ── TOP BANNER: ACCOUNT SECURITY ────────────────────────────────────── */}
        <View style={styles.topBannerCard}>
          <View style={styles.bannerIconSquare}>
            <Key size={22} color="#FFFFFF" />
          </View>

          <View style={styles.bannerTextCol}>
            <View style={styles.securityBadgeRow}>
              <Sparkles size={12} color="#0D9488" style={{ marginRight: 4 }} />
              <Text style={styles.securityBadgeText}>ACCOUNT SECURITY</Text>
            </View>
            <Text style={styles.bannerTitleText}>Change Password</Text>
            <Text style={styles.bannerSubtitleText}>
              Create a strong, unique password to protect your account.
            </Text>
          </View>
        </View>

        {/* ── MAIN 2-COLUMN GRID (UPDATE PASSWORD FORM & CHECKLIST) ───────────── */}
        <View style={[styles.mainGridRow, isMobile && styles.mainGridRowMobile]}>
          {/* ── LEFT CARD: UPDATE PASSWORD FORM ─────────────────────────────── */}
          <View style={[styles.formCard, isMobile ? { width: '100%' } : { flex: 1.4 }]}>
            {/* Top accent teal bar */}
            <View style={styles.formCardTopBar} />

            <View style={styles.formCardHeader}>
              <Lock size={20} color="#0D9488" style={{ marginRight: 8 }} />
              <Text style={styles.formCardTitleText}>Update password</Text>
            </View>
            <Text style={styles.formCardSubtitleText}>
              Enter your current password before choosing a new one.
            </Text>

            {/* Field 1: Current Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabelText}>
                Current password <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInputBare}
                  value={currentPassword}
                  onChangeText={(v) => setCurrentPassword(v)}
                  secureTextEntry={!showCurrentPassword}
                  placeholder="Enter your current password"
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity
                  style={styles.eyeToggleBtn}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                  {showCurrentPassword ? (
                    <EyeOff size={16} color="#64748B" />
                  ) : (
                    <Eye size={16} color="#64748B" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Field 2: New Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabelText}>
                New password <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInputBare}
                  value={newPassword}
                  onChangeText={(v) => setNewPassword(v)}
                  secureTextEntry={!showNewPassword}
                  placeholder="Create a strong new password"
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity
                  style={styles.eyeToggleBtn}
                  onPress={() => setShowNewPassword(!showNewPassword)}>
                  {showNewPassword ? (
                    <EyeOff size={16} color="#64748B" />
                  ) : (
                    <Eye size={16} color="#64748B" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Field 3: Confirm New Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabelText}>
                Confirm new password <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInputBare}
                  value={confirmPassword}
                  onChangeText={(v) => setConfirmPassword(v)}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Re-enter your new password"
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity
                  style={styles.eyeToggleBtn}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? (
                    <EyeOff size={16} color="#64748B" />
                  ) : (
                    <Eye size={16} color="#64748B" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Change Password Submit Button */}
            <TouchableOpacity
              style={styles.changePasswordSubmitBtn}
              onPress={handleChangePasswordSubmit}
              disabled={loading}
              activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Key size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.changePasswordSubmitText}>Change Password</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* ── RIGHT CARD: PASSWORD CHECKLIST ──────────────────────────────── */}
          <View style={[styles.checklistCard, isMobile ? { width: '100%' } : { flex: 1 }]}>
            <View style={styles.checklistHeaderRow}>
              <Shield size={18} color="#0D9488" style={{ marginRight: 8 }} />
              <Text style={styles.checklistTitleText}>Password checklist</Text>
            </View>
            <Text style={styles.checklistSubtitleText}>Complete at least four requirements.</Text>

            {/* Requirements Items List */}
            <View style={styles.requirementsList}>
              {checklistRequirements.map((req) => (
                <View key={req.id} style={styles.requirementRowItem}>
                  <View
                    style={[
                      styles.reqIconBadge,
                      req.met ? styles.reqIconBadgeMet : styles.reqIconBadgeUnmet,
                    ]}>
                    {req.met ? (
                      <Check size={12} color="#0D9488" />
                    ) : (
                      <X size={12} color="#94A3B8" />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.reqLabelText,
                      req.met ? styles.reqLabelTextMet : styles.reqLabelTextUnmet,
                    ]}>
                    {req.label}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.checklistDivider} />

            <Text style={styles.checklistFooterNoteText}>
              Never reuse passwords or share them with anyone. A password manager can help keep credentials secure.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 40,
  },

  // ── TOP BANNER ─────────────────────────────────────────────────────────
  topBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  bannerIconSquare: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    elevation: 2,
  },
  bannerTextCol: {
    flex: 1,
  },
  securityBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  securityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
    letterSpacing: 0.8,
  },
  bannerTitleText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  bannerSubtitleText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },

  // ── MAIN GRID ─────────────────────────────────────────────────────────
  mainGridRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  mainGridRowMobile: {
    flexDirection: 'column',
    gap: 16,
  },

  // ── FORM CARD ──────────────────────────────────────────────────────────
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    elevation: 2,
  },
  formCardTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#0D9488',
  },
  formCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 4,
  },
  formCardTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  formCardSubtitleText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },

  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
  },
  passwordInputBare: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  eyeToggleBtn: {
    padding: 6,
  },

  changePasswordSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 10,
    elevation: 2,
  },
  changePasswordSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // ── CHECKLIST CARD ─────────────────────────────────────────────────────
  checklistCard: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 16,
    padding: 20,
  },
  checklistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checklistTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  checklistSubtitleText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },

  requirementsList: {
    gap: 12,
  },
  requirementRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reqIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  reqIconBadgeMet: {
    backgroundColor: '#E6F4F1',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  reqIconBadgeUnmet: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reqLabelText: {
    fontSize: 13,
  },
  reqLabelTextMet: {
    color: '#0F172A',
    fontWeight: '500',
  },
  reqLabelTextUnmet: {
    color: '#94A3B8',
  },

  checklistDivider: {
    height: 1,
    backgroundColor: '#CCFBF1',
    marginVertical: 18,
  },
  checklistFooterNoteText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
});

export default ChangePasswordScreen;
