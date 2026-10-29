import { colors, radii, spacing, typography } from '../../theme/tokens';
// src/screens/staff/ChangePasswordScreen.tsx
import React, { useState, useMemo } from 'react';
import { useLiquidBorderScrollHandlers } from '../../components/common/LiquidBorderFocusContext';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { LiquidBorderScrollView } from '../../components/common/LiquidBorderScrollView';
import {
  Key,
  Lock,
  Shield,
  Eye,
  EyeOff,
  Check,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { PatientHeader } from '../../components/common/PatientHeader';
import { LiquidBorderSurface } from '../../components/common/LiquidBorderSurface';
import { useAuthContext } from '../../context/AuthContext';
import { changePasswordApi } from '../../api/authApi';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
  patientMode?: boolean;
}

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

export const ChangePasswordScreen: React.FC<Props> = ({ onOpenDrawer, onNavigateScreen, patientMode = false }) => {
  const borderScrollHandlers = useLiquidBorderScrollHandlers();
  const { logout } = useAuthContext();
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

  // Submitting & validation state
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touched, setTouched] = useState<Record<PasswordField, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [currentPasswordApiError, setCurrentPasswordApiError] = useState('');
  const [generalApiError, setGeneralApiError] = useState('');

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

  // Password strength meter matching Web
  const passwordStrength = useMemo(() => {
    if (metCount === 0 || !newPassword) return { score: 0, label: 'Very Weak', color: colors.destructive };
    if (metCount <= 2) return { score: 25, label: 'Weak', color: colors.destructive };
    if (metCount <= 3) return { score: 50, label: 'Fair', color: colors.warning };
    if (metCount <= 4) return { score: 75, label: 'Good', color: colors.primary };
    return { score: 100, label: 'Strong', color: colors.success };
  }, [metCount, newPassword]);

  const passwordsMatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  // Web-matching field errors
  const fieldErrors = useMemo<Record<PasswordField, string>>(() => {
    return {
      currentPassword: !currentPassword
        ? 'Current password is required.'
        : currentPasswordApiError,
      newPassword: !newPassword
        ? 'New password is required.'
        : newPassword.length < 8 || metCount < 4
          ? 'Use at least 8 characters and meet four requirements.'
          : newPassword === currentPassword
            ? 'New password must be different from current password.'
            : '',
      confirmPassword: !confirmPassword
        ? 'Please confirm your new password.'
        : confirmPassword !== newPassword
          ? 'Passwords do not match.'
          : '',
    };
  }, [currentPassword, currentPasswordApiError, newPassword, confirmPassword, metCount]);

  const isFieldInvalid = (field: PasswordField) => {
    return (touched[field] || submitAttempted) && Boolean(fieldErrors[field]);
  };

  const handleChangePasswordSubmit = async () => {
    setSubmitAttempted(true);
    setTouched({
      currentPassword: true,
      newPassword: true,
      confirmPassword: true,
    });
    setGeneralApiError('');
    setCurrentPasswordApiError('');

    // Check errors
    if (!currentPassword.trim()) {
      showErrorToast('Validation Error', 'Please enter your current password.');
      return;
    }
    if (!newPassword.trim()) {
      showErrorToast('Validation Error', 'Please enter a new password.');
      return;
    }
    if (newPassword.length < 8 || metCount < 4) {
      showErrorToast('Weak Password', 'Your new password must satisfy at least 4 checklist requirements.');
      return;
    }
    if (newPassword === currentPassword) {
      showErrorToast('Validation Error', 'New password must be different from current password.');
      return;
    }
    if (confirmPassword !== newPassword) {
      showErrorToast('Validation Error', 'New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await changePasswordApi({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });

      if (!res.success) {
        const errorMsg = res.message || 'Failed to change password. Please check your credentials.';
        if (
          errorMsg.toLowerCase().includes('current password') ||
          errorMsg.toLowerCase().includes('incorrect')
        ) {
          setCurrentPasswordApiError('Current password is incorrect.');
        }
        setGeneralApiError(errorMsg);
        showErrorToast('Unable to change password', errorMsg);
        Alert.alert('Change Password Failed', errorMsg);
        return;
      }

      showSuccessToast(
        'Password Changed 🎉',
        'Your password has been changed. Please login again.'
      );

      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSubmitAttempted(false);
      logout();
    } catch (err: any) {
      const message = err?.message || 'Failed to change password. Please check your network and retry.';
      if (
        message.toLowerCase().includes('current password') ||
        message.toLowerCase().includes('incorrect')
      ) {
        setCurrentPasswordApiError('Current password is incorrect.');
      }
      setGeneralApiError(message);
      showErrorToast('Unable to change password', message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {patientMode ? <PatientHeader onOpenDrawer={onOpenDrawer} /> : <StaffHeader
        onOpenDrawer={onOpenDrawer}
        title="Change Password"
        onNavigate={(path) => {
          if (onNavigateScreen) {
            const screen = path.replace('/', '').replace('-', '_');
            onNavigateScreen(screen);
          }
        }}
      />}

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LiquidBorderScrollView
          {...borderScrollHandlers}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled">

          {/* ── TOP BANNER: ACCOUNT SECURITY ────────────────────────────────────── */}
          <View style={styles.topBannerCard}>
            <View style={styles.bannerIconSquare}>
              <Key size={22} color={colors.surface} />
            </View>

            <View style={styles.bannerTextCol}>
              <View style={styles.securityBadgeRow}>
                <Sparkles size={12} color={colors.primary} style={{ marginRight: spacing.xs }} />
                <Text style={styles.securityBadgeText}>ACCOUNT SECURITY</Text>
              </View>
              <Text style={styles.bannerTitleText}>Change Password</Text>
              <Text style={styles.bannerSubtitleText}>
                Create a strong, unique password to protect your account.
              </Text>
            </View>
          </View>

          {/* General API Error Banner */}
          {generalApiError ? (
            <View style={styles.generalErrorBanner}>
              <AlertCircle size={18} color={colors.destructive} style={{ marginRight: spacing.sm, marginTop: 1 }} />
              <Text style={styles.generalErrorText}>{generalApiError}</Text>
            </View>
          ) : null}

          {/* ── MAIN 2-COLUMN GRID (UPDATE PASSWORD FORM & CHECKLIST) ───────────── */}
          <View style={[styles.mainGridRow, isMobile && styles.mainGridRowMobile]}>
            {/* ── LEFT CARD: UPDATE PASSWORD FORM ─────────────────────────────── */}
            <LiquidBorderSurface style={[styles.formCard, isMobile ? { width: '100%' } : { flex: 1.4 }]} radius={20}>
              {/* Top accent teal bar */}
              <View style={styles.formCardTopBar} />

              <View style={styles.formCardHeader}>
                <Lock size={20} color={colors.primary} style={{ marginRight: spacing.sm }} />
                <Text style={styles.formCardTitleText}>Update password</Text>
              </View>
              <Text style={styles.formCardSubtitleText}>
                Enter your current password before choosing a new one.
              </Text>

              {/* Field 1: Current Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabelText}>
                  Current password <Text style={{ color: colors.destructive }}>*</Text>
                </Text>
                <View
                  style={[
                    styles.passwordInputContainer,
                    isFieldInvalid('currentPassword') && styles.inputErrorBorder,
                  ]}>
                  <TextInput
                    style={styles.passwordInputBare}
                    value={currentPassword}
                    onChangeText={(v) => {
                      setCurrentPassword(v);
                      setCurrentPasswordApiError('');
                      setGeneralApiError('');
                    }}
                    onBlur={() => setTouched((p) => ({ ...p, currentPassword: true }))}
                    secureTextEntry={!showCurrentPassword}
                    placeholder="Enter your current password"
                    placeholderTextColor={colors.subtle}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeToggleBtn}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    {showCurrentPassword ? (
                      <EyeOff size={16} color={colors.muted} />
                    ) : (
                      <Eye size={16} color={colors.muted} />
                    )}
                  </TouchableOpacity>
                </View>
                {isFieldInvalid('currentPassword') ? (
                  <View style={styles.inlineErrorRow}>
                    <AlertCircle size={13} color={colors.destructive} style={{ marginRight: spacing.xs }} />
                    <Text style={styles.inlineErrorText}>{fieldErrors.currentPassword}</Text>
                  </View>
                ) : null}
              </View>

              {/* Field 2: New Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabelText}>
                  New password <Text style={{ color: colors.destructive }}>*</Text>
                </Text>
                <View
                  style={[
                    styles.passwordInputContainer,
                    isFieldInvalid('newPassword') && styles.inputErrorBorder,
                  ]}>
                  <TextInput
                    style={styles.passwordInputBare}
                    value={newPassword}
                    onChangeText={(v) => setNewPassword(v)}
                    onBlur={() => setTouched((p) => ({ ...p, newPassword: true }))}
                    secureTextEntry={!showNewPassword}
                    placeholder="Create a strong new password"
                    placeholderTextColor={colors.subtle}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeToggleBtn}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    {showNewPassword ? (
                      <EyeOff size={16} color={colors.muted} />
                    ) : (
                      <Eye size={16} color={colors.muted} />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Password Strength Meter */}
                {newPassword.length > 0 ? (
                  <View style={styles.strengthBox}>
                    <View style={styles.strengthHeader}>
                      <Text style={styles.strengthLabelText}>Password strength</Text>
                      <Text style={[styles.strengthValueText, { color: passwordStrength.color }]}>
                        {passwordStrength.label}
                      </Text>
                    </View>
                    <View style={styles.strengthBarTrack}>
                      <View
                        style={[
                          styles.strengthBarFill,
                          {
                            width: `${passwordStrength.score}%`,
                            backgroundColor: passwordStrength.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ) : null}

                {isFieldInvalid('newPassword') ? (
                  <View style={styles.inlineErrorRow}>
                    <AlertCircle size={13} color={colors.destructive} style={{ marginRight: spacing.xs }} />
                    <Text style={styles.inlineErrorText}>{fieldErrors.newPassword}</Text>
                  </View>
                ) : null}
              </View>

              {/* Field 3: Confirm New Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabelText}>
                  Confirm new password <Text style={{ color: colors.destructive }}>*</Text>
                </Text>
                <View
                  style={[
                    styles.passwordInputContainer,
                    isFieldInvalid('confirmPassword') && styles.inputErrorBorder,
                  ]}>
                  <TextInput
                    style={styles.passwordInputBare}
                    value={confirmPassword}
                    onChangeText={(v) => setConfirmPassword(v)}
                    onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
                    secureTextEntry={!showConfirmPassword}
                    placeholder="Re-enter your new password"
                    placeholderTextColor={colors.subtle}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeToggleBtn}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    {showConfirmPassword ? (
                      <EyeOff size={16} color={colors.muted} />
                    ) : (
                      <Eye size={16} color={colors.muted} />
                    )}
                  </TouchableOpacity>
                </View>
                {isFieldInvalid('confirmPassword') ? (
                  <View style={styles.inlineErrorRow}>
                    <AlertCircle size={13} color={colors.destructive} style={{ marginRight: spacing.xs }} />
                    <Text style={styles.inlineErrorText}>{fieldErrors.confirmPassword}</Text>
                  </View>
                ) : passwordsMatch ? (
                  <View style={styles.inlineSuccessRow}>
                    <CheckCircle2 size={13} color={colors.success} style={{ marginRight: spacing.xs }} />
                    <Text style={styles.inlineSuccessText}>Passwords match</Text>
                  </View>
                ) : null}
              </View>

              {/* Change Password Submit Button */}
              <TouchableOpacity
                style={[styles.changePasswordSubmitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleChangePasswordSubmit}
                disabled={loading}
                activeOpacity={0.85}>
                {loading ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <>
                    <Key size={16} color={colors.surface} style={{ marginRight: spacing.sm }} />
                    <Text style={styles.changePasswordSubmitText}>Change Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </LiquidBorderSurface>

            {/* ── RIGHT CARD: PASSWORD CHECKLIST ──────────────────────────────── */}
            <LiquidBorderSurface style={[styles.checklistCard, isMobile ? { width: '100%' } : { flex: 1 }]} radius={20}>
              <View style={styles.checklistHeaderRow}>
                <Shield size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
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
                        <Check size={12} color={colors.primary} />
                      ) : (
                        <X size={12} color={colors.subtle} />
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
            </LiquidBorderSurface>
          </View>
        </LiquidBorderScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 40,
  },

  // ── TOP BANNER ─────────────────────────────────────────────────────────
  topBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  bannerIconSquare: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
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
    fontFamily: typography.family, fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primary,
    letterSpacing: 0.8,
  },
  bannerTitleText: {
    fontFamily: typography.family, fontSize: typography.size.heading,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  bannerSubtitleText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    color: colors.muted,
    marginTop: 2,
  },

  generalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.destructiveSoft,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  generalErrorText: {
    fontFamily: typography.family, flex: 1,
    fontSize: typography.size.caption,
    color: colors.destructiveDark,
    lineHeight: 18,
  },

  // ── MAIN GRID ─────────────────────────────────────────────────────────
  mainGridRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    alignItems: 'flex-start',
  },
  mainGridRowMobile: {
    flexDirection: 'column',
    gap: spacing.lg,
  },

  // ── FORM CARD ──────────────────────────────────────────────────────────
  formCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.xxl,
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
    backgroundColor: colors.primary,
  },
  formCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  formCardTitleText: {
    fontFamily: typography.family, fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  formCardSubtitleText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    color: colors.muted,
    marginBottom: spacing.lg,
  },

  fieldGroup: {
    marginBottom: spacing.lg,
  },
  fieldLabelText: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.foreground,
    marginBottom: spacing.tiny,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  inputErrorBorder: {
    borderColor: colors.destructive,
    backgroundColor: colors.destructiveSoft,
  },
  passwordInputBare: {
    fontFamily: typography.family, flex: 1,
    paddingVertical: 11,
    fontSize: typography.size.caption,
    color: colors.text,
  },
  eyeToggleBtn: {
    padding: spacing.tiny,
  },

  inlineErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  inlineErrorText: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    color: colors.destructive,
    fontWeight: typography.weight.medium,
  },
  inlineSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  inlineSuccessText: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    color: colors.success,
    fontWeight: typography.weight.medium,
  },

  // Strength Meter
  strengthBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  strengthLabelText: {
    fontFamily: typography.family, fontSize: typography.size.xs,
    color: colors.muted,
  },
  strengthValueText: {
    fontFamily: typography.family, fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  strengthBarTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  changePasswordSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 13,
    marginTop: 10,
    elevation: 2,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  changePasswordSubmitText: {
    fontFamily: typography.family, color: colors.surface,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.body,
  },

  // ── CHECKLIST CARD ─────────────────────────────────────────────────────
  checklistCard: {
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    borderRadius: radii.xl,
    padding: spacing.xl,
  },
  checklistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  checklistTitleText: {
    fontFamily: typography.family, fontSize: typography.size.subtitle,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  checklistSubtitleText: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    color: colors.muted,
    marginBottom: spacing.lg,
  },

  requirementsList: {
    gap: spacing.md,
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
    borderColor: colors.mintBorder,
  },
  reqIconBadgeUnmet: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reqLabelText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
  },
  reqLabelTextMet: {
    color: colors.text,
    fontWeight: typography.weight.medium,
  },
  reqLabelTextUnmet: {
    color: colors.subtle,
  },

  checklistDivider: {
    height: 1,
    backgroundColor: colors.mintBorder,
    marginVertical: 18,
  },
  checklistFooterNoteText: {
    fontFamily: typography.family, fontSize: typography.size.xs,
    color: colors.muted,
    lineHeight: 16,
  },
});

export default ChangePasswordScreen;
