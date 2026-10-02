import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react-native';
import {
  sendStaffOtpApi,
  verifyStaffOtpApi,
  resetAuthPasswordApi,
  forgotPasswordApi,
} from '../../api/authApi';
import { UserRoleType } from '../../types/auth';

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  initialRole: UserRoleType;
  initialEmail?: string;
  initialPhone?: string;
  onSuccessReset?: (identifier: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  visible,
  onClose,
  initialRole,
  initialEmail = '',
  initialPhone = '',
  onSuccessReset,
}) => {
  // Wizard Step: 1 (Identifier), 2 (OTP Verification), 3 (New Password), 4 (Success)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Inputs
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Resend Timer
  const [resendTimer, setResendTimer] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset or Sync when modal opens
  useEffect(() => {
    if (visible) {
      setStep(1);
      setEmail(initialEmail);
      setPhone(initialPhone);
      setOtp('');
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setError(null);
      setSuccessMsg(null);
      setResendTimer(0);
    }
  }, [visible, initialEmail, initialPhone]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setTimeout(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resendTimer]);

  const startResendCountdown = () => setResendTimer(30);

  // ── Step 1: Send OTP / Reset Code ──────────────────────────────────────────
  const handleSendOtp = async () => {
    setError(null);
    setSuccessMsg(null);

    if (initialRole === 'staff') {
      const cleanEmail = email.trim();
      if (!cleanEmail) {
        setError('Please enter your registered email address.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setError('Please enter a valid email address.');
        return;
      }

      setLoading(true);
      try {
        const res = await sendStaffOtpApi(cleanEmail);
        if (res.success) {
          setSuccessMsg(res.message || 'Verification code sent to your email.');
          setStep(2);
          startResendCountdown();
        } else {
          setError(res.message || 'Unable to send OTP. Please check your email.');
        }
      } catch (err: any) {
        setError(err.message || 'Network error while sending OTP.');
      } finally {
        setLoading(false);
      }
    } else {
      // Patient Flow
      const cleanPhone = phone.trim();
      if (!cleanPhone || cleanPhone.length !== 10) {
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }

      setLoading(true);
      try {
        const res = await forgotPasswordApi({ userType: 'patient', phone: cleanPhone });
        if (res.success) {
          const token = (res.data as any)?.resetToken || (res as any)?.resetToken;
          if (token) {
            setResetToken(token);
            setSuccessMsg('Identity verified. Please set your new password.');
            setStep(3);
          } else {
            setSuccessMsg(res.message || 'Reset code sent to your mobile number.');
            setStep(2);
            startResendCountdown();
          }
        } else {
          setError(res.message || 'Mobile number not found.');
        }
      } catch (err: any) {
        setError(err.message || 'Network error while requesting reset code.');
      } finally {
        setLoading(false);
      }
    }
  };

  // ── Step 2: Verify OTP ─────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    setError(null);
    setSuccessMsg(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (cleanOtp.length < 4) {
      setError('Code must be at least 4 to 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim();
      const res = await verifyStaffOtpApi(cleanEmail, cleanOtp);

      const receivedToken =
        (res as any)?.resetToken ||
        (res.data as any)?.resetToken ||
        res.data?.token ||
        (res as any)?.token;

      if (res.success && receivedToken) {
        setResetToken(receivedToken);
        setSuccessMsg('Code verified successfully! Now create a new password.');
        setStep(3);
      } else {
        setError(res.message || 'Invalid or expired verification code.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Reset Password ─────────────────────────────────────────────────
  const handleResetPassword = async () => {
    setError(null);
    setSuccessMsg(null);

    if (!newPassword) {
      setError('Please enter your new password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }
    if (!resetToken) {
      setError('Session expired. Please request a new verification code.');
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      const res = await resetAuthPasswordApi({
        token: resetToken,
        email: initialRole === 'staff' ? email.trim() : undefined,
        newPassword,
      });

      if (res.success) {
        setStep(4);
        if (onSuccessReset) {
          onSuccessReset(initialRole === 'staff' ? email.trim() : phone.trim());
        }
      } else {
        setError(res.message || 'Failed to update password. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating password.');
    } finally {
      setLoading(false);
    }
  };

  // Live Password Match Check
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}>
          <View style={styles.cardContainer}>
            {/* Header Accent Bar */}
            <View style={styles.accentBar} />

            {/* Header Close & Step Header */}
            <View style={styles.headerRow}>
              <View style={styles.headerIconBadge}>
                {step === 4 ? (
                  <CheckCircle2 color="#0D9488" size={22} />
                ) : (
                  <KeyRound color="#0D9488" size={22} />
                )}
              </View>
              <View style={styles.headerTitles}>
                <Text style={styles.headerTitle}>
                  {step === 4
                    ? 'Password Updated'
                    : step === 3
                    ? 'New Password'
                    : step === 2
                    ? 'Verify Code'
                    : 'Forgot Password'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {step === 4
                    ? 'Account security restored'
                    : `Step ${step} of 3 • ${initialRole === 'staff' ? 'Staff' : 'Patient'} Account`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X color="#64748B" size={20} />
              </TouchableOpacity>
            </View>

            {/* Progress Stepper Bar */}
            {step < 4 ? (
              <View style={styles.stepperContainer}>
                <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
                <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
                <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
                <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
                <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]} />
              </View>
            ) : null}

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollBody}>
              {/* Feedback Banners */}
              {error ? (
                <View style={styles.errorBox}>
                  <AlertCircle size={16} color="#DC2626" style={{ marginRight: 8, marginTop: 2 }} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {successMsg && step < 4 ? (
                <View style={styles.successBox}>
                  <CheckCircle2 size={16} color="#059669" style={{ marginRight: 8, marginTop: 2 }} />
                  <Text style={styles.successText}>{successMsg}</Text>
                </View>
              ) : null}

              {/* ── STEP 1: Enter Email / Phone ────────────────────────────── */}
              {step === 1 ? (
                <View style={styles.stepContent}>
                  <Text style={styles.instructionText}>
                    {initialRole === 'staff'
                      ? 'Enter your registered staff email address to receive a password reset verification code.'
                      : 'Enter your 10-digit registered mobile number to proceed with password reset.'}
                  </Text>

                  {initialRole === 'staff' ? (
                    <View style={styles.inputGroup}>
                      <Text style={styles.fieldLabel}>Email Address</Text>
                      <View style={styles.inputWrapper}>
                        <Mail color="#94A3B8" size={18} style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="doctor@example.clinic"
                          placeholderTextColor="#94A3B8"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          value={email}
                          onChangeText={text => {
                            setEmail(text);
                            if (error) setError(null);
                          }}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.inputGroup}>
                      <Text style={styles.fieldLabel}>Mobile Number</Text>
                      <View style={styles.inputWrapper}>
                        <Phone color="#94A3B8" size={18} style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="10-digit mobile number"
                          placeholderTextColor="#94A3B8"
                          keyboardType="phone-pad"
                          maxLength={10}
                          value={phone}
                          onChangeText={text => {
                            setPhone(text);
                            if (error) setError(null);
                          }}
                        />
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.primaryButton, loading && styles.buttonDisabled]}
                    onPress={handleSendOtp}
                    disabled={loading}
                    activeOpacity={0.85}>
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Send Verification Code</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* ── STEP 2: Enter Verification Code ────────────────────────── */}
              {step === 2 ? (
                <View style={styles.stepContent}>
                  <Text style={styles.instructionText}>
                    Please enter the verification code sent to{' '}
                    <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                      {initialRole === 'staff' ? email : phone}
                    </Text>
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>6-Digit Verification Code</Text>
                    <View style={styles.inputWrapper}>
                      <ShieldCheck color="#0D9488" size={18} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.textInput, styles.otpInput]}
                        placeholder="• • • • • •"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        maxLength={6}
                        autoFocus={true}
                        value={otp}
                        onChangeText={text => {
                          setOtp(text);
                          if (error) setError(null);
                        }}
                      />
                    </View>
                  </View>

                  {/* Resend Link */}
                  <View style={styles.resendRow}>
                    {resendTimer > 0 ? (
                      <Text style={styles.resendTimerText}>
                        Resend code in {resendTimer}s
                      </Text>
                    ) : (
                      <TouchableOpacity
                        onPress={handleSendOtp}
                        disabled={loading}
                        activeOpacity={0.7}>
                        <Text style={styles.resendActionText}>Resend verification code</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => {
                        setError(null);
                        setStep(1);
                      }}
                      activeOpacity={0.8}>
                      <ArrowLeft color="#475569" size={16} style={{ marginRight: 6 }} />
                      <Text style={styles.secondaryButtonText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.primaryButton, { flex: 1 }, loading && styles.buttonDisabled]}
                      onPress={handleVerifyOtp}
                      disabled={loading}
                      activeOpacity={0.85}>
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Verify Code</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {/* ── STEP 3: Create New Password ────────────────────────────── */}
              {step === 3 ? (
                <View style={styles.stepContent}>
                  <Text style={styles.instructionText}>
                    Enter your new password below. Make sure it contains at least 8 characters.
                  </Text>

                  {/* New Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>New Password</Text>
                    <View style={styles.inputWrapper}>
                      <Lock color="#94A3B8" size={18} style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="At least 8 characters"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showNewPassword}
                        value={newPassword}
                        onChangeText={text => {
                          setNewPassword(text);
                          if (error) setError(null);
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => setShowNewPassword(!showNewPassword)}
                        style={styles.eyeToggle}>
                        {showNewPassword ? (
                          <EyeOff size={18} color="#64748B" />
                        ) : (
                          <Eye size={18} color="#64748B" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Confirm New Password</Text>
                    <View style={styles.inputWrapper}>
                      <Lock color="#94A3B8" size={18} style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Re-enter password"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showConfirmPassword}
                        value={confirmPassword}
                        onChangeText={text => {
                          setConfirmPassword(text);
                          if (error) setError(null);
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={styles.eyeToggle}>
                        {showConfirmPassword ? (
                          <EyeOff size={18} color="#64748B" />
                        ) : (
                          <Eye size={18} color="#64748B" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Match Indicator */}
                  {confirmPassword.length > 0 ? (
                    <View style={styles.matchIndicatorRow}>
                      {passwordsMatch ? (
                        <Text style={styles.matchSuccessText}>
                          ✓ Passwords match
                        </Text>
                      ) : (
                        <Text style={styles.matchErrorText}>
                          ✗ Passwords do not match
                        </Text>
                      )}
                    </View>
                  ) : null}

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => {
                        setError(null);
                        setStep(2);
                      }}
                      activeOpacity={0.8}>
                      <ArrowLeft color="#475569" size={16} style={{ marginRight: 6 }} />
                      <Text style={styles.secondaryButtonText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.primaryButton, { flex: 1 }, loading && styles.buttonDisabled]}
                      onPress={handleResetPassword}
                      disabled={loading}
                      activeOpacity={0.85}>
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Reset Password</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {/* ── STEP 4: Success Screen ─────────────────────────────────── */}
              {step === 4 ? (
                <View style={styles.successScreenContent}>
                  <View style={styles.successIconCircle}>
                    <CheckCircle2 color="#059669" size={48} />
                  </View>

                  <Text style={styles.successTitle}>Password Reset Complete!</Text>
                  <Text style={styles.successDescription}>
                    Your account password has been updated successfully. You can now log in using your new credentials.
                  </Text>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={onClose}
                    activeOpacity={0.85}>
                    <Text style={styles.primaryButtonText}>Return to Login</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 440,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 16,
  },
  accentBar: {
    height: 4,
    backgroundColor: '#0D9488',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CBD5E1',
  },
  stepDotActive: {
    backgroundColor: '#0D9488',
    transform: [{ scale: 1.2 }],
  },
  stepLine: {
    width: 44,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 6,
  },
  stepLineActive: {
    backgroundColor: '#0D9488',
  },
  scrollBody: {
    padding: 20,
  },
  instructionText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 8,
  },
  otpInput: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
  },
  eyeToggle: {
    padding: 6,
  },
  matchIndicatorRow: {
    marginTop: -4,
    marginBottom: 14,
  },
  matchSuccessText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  matchErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resendTimerText: {
    fontSize: 12,
    color: '#64748B',
  },
  resendActionText: {
    fontSize: 13,
    color: '#0D9488',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#B91C1C',
    lineHeight: 18,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  successText: {
    flex: 1,
    fontSize: 12,
    color: '#047857',
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: '#0D9488',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  stepContent: {
    width: '100%',
  },
  successScreenContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
});
