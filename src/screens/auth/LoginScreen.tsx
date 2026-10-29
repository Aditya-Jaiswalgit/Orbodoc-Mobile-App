import { colors, radii, spacing, typography } from '../../theme/tokens';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, Eye, EyeOff } from 'lucide-react-native';
import { FormInput } from '../../components/ui/FormInput';
import { AnimatedLiquidBorder } from '../../components/common/AnimatedLiquidBorder';
import { useAuth } from '../../hooks/useAuth';
import { UserRoleType } from '../../types/auth';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { UserRound, BriefcaseMedical, ArrowLeft, WalletCards, Stethoscope, FlaskConical } from 'lucide-react-native';
import { PublicRegistrationForm } from './PublicRegistrationForm';
import { usePublicRegistration } from '../../hooks/usePublicRegistration';
import { PublicPlanRegistrationFlow } from './PublicPlanRegistrationFlow';

export const LoginScreen = () => {
  const insets = useSafeAreaInsets();
  const [activeRole, setActiveRole] = useState<UserRoleType>('staff');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [focusedField, setFocusedField] = useState<'email' | 'phone' | 'password' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [registrationKind, setRegistrationKind] = useState<'login' | 'choose' | 'patient' | 'doctor' | 'lab' | 'plans'>('login');
  const screenScroll = useRef<any>(null);
  const pendingRegistrationScroll = useRef(false);
  const planReadyScrollDone = useRef(false);
  const registration = usePublicRegistration();

  const { loading, error, clearError, loginStaff, loginPatient } = useAuth();

  useEffect(() => {
    if (error) {
      showErrorToast('Login Failed', error);
    }
  }, [error]);

  useEffect(() => {
    const initialOffset = registrationKind === 'login' ? 0 : 160;
    pendingRegistrationScroll.current = registrationKind !== 'login';
    planReadyScrollDone.current = false;
    if (registrationKind === 'plans') return;
    const timer = setTimeout(() => {
      screenScroll.current?.scrollTo({ y: initialOffset, animated: false });
      pendingRegistrationScroll.current = false;
    }, 120);
    return () => clearTimeout(timer);
  }, [registrationKind]);

  const applyRegistrationScroll = () => {
    if (!pendingRegistrationScroll.current || registrationKind === 'plans') return;
    screenScroll.current?.scrollTo({ y: 160, animated: false });
    pendingRegistrationScroll.current = false;
  };

  const applyPlanRegistrationScroll = () => {
    if (!pendingRegistrationScroll.current || planReadyScrollDone.current) return;
    planReadyScrollDone.current = true;
    setTimeout(() => {
      screenScroll.current?.scrollTo({ y: 160, animated: false });
      pendingRegistrationScroll.current = false;
    }, 100);
  };

  const handleRoleChange = (role: UserRoleType) => {
    setActiveRole(role);
    setFocusedField(null);
    setValidationError(null);
    clearError();
  };

  const handleLogin = async () => {
    setValidationError(null);
    clearError();

    if (activeRole === 'staff') {
      if (!email.trim()) {
        const errMsg = 'Please enter your email address';
        setValidationError(errMsg);
        showErrorToast('Input Required', errMsg);
        return;
      }
      if (!password) {
        const errMsg = 'Please enter your password';
        setValidationError(errMsg);
        showErrorToast('Input Required', errMsg);
        return;
      }

      const result = await loginStaff({ email, password });
      if (result) {
        const name = result.user?.fullName || (result.user as any)?.full_name || 'Staff User';
        showSuccessToast('Login Successful! 🎉', `Welcome back, ${name}`);
      }
    } else {
      if (!phone.trim()) {
        const errMsg = 'Please enter your 10-digit mobile number';
        setValidationError(errMsg);
        showErrorToast('Input Required', errMsg);
        return;
      }
      if (phone.trim().length !== 10) {
        const errMsg = 'Mobile number must be exactly 10 digits';
        setValidationError(errMsg);
        showErrorToast('Invalid Input', errMsg);
        return;
      }
      if (!password) {
        const errMsg = 'Please enter your password';
        setValidationError(errMsg);
        showErrorToast('Input Required', errMsg);
        return;
      }

      const result = await loginPatient({ phone, password });
      if (result) {
        const name = result.user?.fullName || (result.user as any)?.full_name || 'Patient';
        showSuccessToast('Login Successful! 🎉', `Welcome back, ${name}`);
      }
    }
  };

  const displayError = validationError || error;

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? Math.max(insets.top, 24) : insets.top }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          ref={screenScroll}
          onContentSizeChange={applyRegistrationScroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Logo Header */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {registrationKind === 'login' ? <>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.toggleButton, activeRole === 'staff' && styles.toggleButtonActive]}
              onPress={() => handleRoleChange('staff')}>
              <Text style={[styles.toggleText, activeRole === 'staff' && styles.toggleTextActive]}>Staff Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.toggleButton,
                activeRole === 'patient' && styles.toggleButtonActive,
              ]}
              onPress={() => handleRoleChange('patient')}>
              <Text
                style={[
                  styles.toggleText,
                  activeRole === 'patient' && styles.toggleTextActive,
                ]}>
                Patient Login
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headingContainer}>
            <Text style={styles.title}>
              {activeRole === 'staff' ? 'Staff Login' : 'Patient Login'}
            </Text>
            <Text style={styles.subtitle}>
              {activeRole === 'staff'
                ? 'Admin, doctor, reception, lab and accounts users.'
                : 'Access your consultations, lab reports and treatment records.'}
            </Text>
          </View>
          <View style={styles.formContainer}>

            {/* Error Banner */}
            {displayError ? (
              <View style={styles.errorBanner}>
                <AlertCircle size={18} color={colors.destructive} />
                <Text style={styles.errorBannerText}>{displayError}</Text>
              </View>
            ) : null}

            {activeRole === 'staff' ? (
              /* Staff Email Field */
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Email <Text style={styles.asterisk}>*</Text>
                </Text>
                <View style={styles.inputLiquidFrame}>
                  <FormInput
                    style={styles.input}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(current => current === 'email' ? null : current)}
                    placeholder="Enter your registered email"
                    placeholderTextColor={colors.subtle}
                    value={email}
                    onChangeText={text => {
                      setEmail(text);
                      if (validationError) setValidationError(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <AnimatedLiquidBorder active={focusedField === 'email'} radius={radii.md} />
                </View>
              </View>
            ) : (
              /* Patient Phone Field */
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Mobile Number <Text style={styles.asterisk}>*</Text>
                </Text>
                <View style={styles.inputLiquidFrame}>
                  <FormInput
                    style={styles.input}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(current => current === 'phone' ? null : current)}
                    placeholder="Enter 10-digit mobile number"
                    placeholderTextColor={colors.subtle}
                    numberOfLines={1}
                    value={phone}
                    onChangeText={text => {
                      setPhone(text);
                      if (validationError) setValidationError(null);
                    }}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                  <AnimatedLiquidBorder active={focusedField === 'phone'} radius={radii.md} />
                </View>
              </View>
            )}

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Password <Text style={styles.asterisk}>*</Text>
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(current => current === 'password' ? null : current)}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.subtle}
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    if (validationError) setValidationError(null);
                  }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {showPassword ? (
                    <EyeOff size={20} color={colors.muted} />
                  ) : (
                    <Eye size={20} color={colors.muted} />
                  )}
                </TouchableOpacity>
                <AnimatedLiquidBorder active={focusedField === 'password'} radius={radii.lg} />
              </View>
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              activeOpacity={0.7}
              onPress={() => setForgotModalVisible(true)}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={loading}
              style={[styles.signInButton, loading && styles.signInButtonDisabled]}
              onPress={handleLogin}>
              {loading ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.signupLink} onPress={() => setRegistrationKind('choose')} activeOpacity={0.8}>
            <Text style={styles.signupPrompt}>Want to Join? </Text><Text style={styles.signupLinkText}>Explore options</Text>
          </TouchableOpacity>
          </> : <>
            <TouchableOpacity style={styles.backToLogin} onPress={() => setRegistrationKind('login')} activeOpacity={0.8}>
              <ArrowLeft size={18} color={colors.primary} /><Text style={styles.backToLoginText}>Back to sign in</Text>
            </TouchableOpacity>
            {registrationKind === 'choose' ? <View style={styles.registrationChoices}>
              <Text style={styles.choiceTitle}>Want to Join?</Text>
              <Text style={styles.choiceSubtitle}>Choose how you would like to join OrboDoc.</Text>
              <TouchableOpacity style={styles.choiceCard} onPress={() => { registration.setError(''); setRegistrationKind('plans'); }}>
                <View style={styles.choiceIcon}><WalletCards size={21} color={colors.successDark} /></View><View style={styles.choiceText}><Text style={styles.choiceLabel}>Buy a Plan</Text><Text style={styles.choiceDescription}>Explore clinic plans and pricing</Text></View><Text style={styles.choiceArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.choiceCard} onPress={() => { registration.setError(''); setRegistrationKind('doctor'); }}>
                <View style={styles.choiceIcon}><Stethoscope size={21} color={colors.successDark} /></View><View style={styles.choiceText}><Text style={styles.choiceLabel}>Register as Doctor</Text><Text style={styles.choiceDescription}>Apply for independent teleconsultation</Text></View><Text style={styles.choiceArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.choiceCard} onPress={() => { registration.setError(''); setRegistrationKind('patient'); }}>
                <View style={styles.choiceIcon}><UserRound size={21} color={colors.successDark} /></View><View style={styles.choiceText}><Text style={styles.choiceLabel}>Register as Patient</Text><Text style={styles.choiceDescription}>Create a patient portal account</Text></View><Text style={styles.choiceArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.choiceCard} onPress={() => { registration.setError(''); setRegistrationKind('lab'); }}>
                <View style={styles.choiceIcon}><FlaskConical size={21} color={colors.successDark} /></View><View style={styles.choiceText}><Text style={styles.choiceLabel}>Register as Lab</Text><Text style={styles.choiceDescription}>Create a diagnostic lab profile</Text></View><Text style={styles.choiceArrow}>›</Text>
              </TouchableOpacity>
            </View> : registrationKind === 'plans' ? <PublicPlanRegistrationFlow
              states={registration.states}
              cities={registration.cities}
              selectedStateId={registration.selectedStateId}
              locationsLoading={registration.locationsLoading}
              citiesLoading={registration.citiesLoading}
              onSelectState={registration.selectState}
              onReady={applyPlanRegistrationScroll}
              onBack={() => setRegistrationKind('login')}
            /> : <PublicRegistrationForm
              kind={registrationKind}
              states={registration.states}
              cities={registration.cities}
              selectedStateId={registration.selectedStateId}
              locationsLoading={registration.locationsLoading}
              citiesLoading={registration.citiesLoading}
              submitting={registration.submitting}
              error={registration.error}
              onSelectState={registration.selectState}
              onSubmitPatient={registration.submitPatient}
              onSubmitDoctor={registration.submitDoctor}
              onSubmitLab={registration.submitLab}
              onBackToLogin={() => setRegistrationKind('login')}
            />}
          </>}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        visible={forgotModalVisible}
        onClose={() => setForgotModalVisible(false)}
        initialRole={activeRole}
        initialEmail={email}
        initialPhone={phone}
        onSuccessReset={(identifier) => {
          if (activeRole === 'staff') {
            setEmail(identifier);
          } else {
            setPhone(identifier);
          }
          setPassword('');
          showSuccessToast('Password Reset Successful! 🎉', 'Please enter your new password to sign in.');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 50,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
    paddingTop: 40,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: 10,
    paddingBottom: 40
  },
  logoImage: {
    width: 180,
    height: 70,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 5,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.muted,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontFamily: typography.family, fontSize: 15,
    fontWeight: typography.weight.semibold,
    color: colors.muted,
  },
  toggleTextActive: {
    color: colors.surface,
    fontWeight: typography.weight.bold,
  },
  signupLink: { flexDirection: 'row', justifyContent: 'center', paddingVertical: spacing.xl },
  signupPrompt: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.body },
  signupLinkText: { fontFamily: typography.family, color: colors.primaryDark, fontSize: typography.size.body, fontWeight: typography.weight.extrabold },
  backToLogin: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, paddingVertical: spacing.sm, marginBottom: 14 },
  backToLoginText: { fontFamily: typography.family, color: colors.primary, fontSize: typography.size.body, fontWeight: typography.weight.bold },
  registrationChoices: { backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, marginTop: spacing.sm },
  choiceTitle: { fontFamily: typography.family, color: colors.text, fontSize: 23, fontWeight: typography.weight.extrabold },
  choiceSubtitle: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.body, marginTop: 5, marginBottom: spacing.xl },
  choiceCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 76, padding: 13, borderWidth: 1, borderColor: '#dbe7e5', borderRadius: 15, marginBottom: spacing.md, backgroundColor: '#fbfefd' },
  choiceIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' },
  choiceText: { flex: 1 },
  choiceLabel: { fontFamily: typography.family, color: colors.text, fontSize: 15, fontWeight: typography.weight.extrabold },
  choiceDescription: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.sm, marginTop: 3 },
  choiceArrow: { fontFamily: typography.family, color: colors.primary, fontSize: 26, fontWeight: typography.weight.semibold },
  headingContainer: {
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: typography.family, fontSize: typography.size.title,
    fontWeight: typography.weight.extrabold,
    color: colors.text,
    marginBottom: spacing.tiny,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: typography.family, fontSize: typography.size.body,
    color: colors.muted,
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.destructiveSoft,
    borderWidth: 1,
    borderColor: colors.destructiveSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorBannerText: {
    fontFamily: typography.family, flex: 1,
    color: colors.destructive,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontFamily: typography.family, fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  asterisk: {
    color: colors.destructive,
  },
  input: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
  },
  inputLiquidFrame: { position: 'relative' },
  passwordContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radii.lg,
  },
  passwordInput: {
    fontFamily: typography.family, flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
  },
  eyeIcon: {
    fontFamily: typography.family, fontSize: typography.size.lg,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xxl,
  },
  forgotPasswordText: {
    fontFamily: typography.family, fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.primaryDark,
  },
  signInButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    fontFamily: typography.family, color: colors.surface,
    fontSize: typography.size.subtitle,
    fontWeight: typography.weight.bold,
  },
});

export default LoginScreen;
