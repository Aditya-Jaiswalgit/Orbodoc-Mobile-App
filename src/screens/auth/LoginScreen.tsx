import React, { useState } from 'react';
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
import { useAuth } from '../../hooks/useAuth';
import { UserRoleType } from '../../types/auth';

export const LoginScreen = () => {
  const insets = useSafeAreaInsets();
  const [activeRole, setActiveRole] = useState<UserRoleType>('staff');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { loading, error, clearError, loginStaff, loginPatient } = useAuth();

  const handleRoleChange = (role: UserRoleType) => {
    setActiveRole(role);
    setValidationError(null);
    clearError();
  };

  const handleLogin = async () => {
    setValidationError(null);
    clearError();

    if (activeRole === 'staff') {
      if (!email.trim()) {
        setValidationError('Please enter your email address');
        return;
      }
      if (!password) {
        setValidationError('Please enter your password');
        return;
      }

      const result = await loginStaff({ email, password });
      if (result) {
        Alert.alert('Login Successful', `Welcome back, ${result.user.fullName || result.user.full_name || 'Staff User'}!`);
      }
    } else {
      if (!phone.trim()) {
        setValidationError('Please enter your 10-digit mobile number');
        return;
      }
      if (phone.trim().length !== 10) {
        setValidationError('Mobile number must be exactly 10 digits');
        return;
      }
      if (!password) {
        setValidationError('Please enter your password');
        return;
      }

      const result = await loginPatient({ phone, password });
      if (result) {
        Alert.alert('Login Successful', `Welcome back, ${result.user.fullName || result.user.full_name || 'Patient'}!`);
      }
    }
  };

  const displayError = validationError || error;

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? Math.max(insets.top, 24) : insets.top }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" translucent={true} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
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

          {/* Role Segment Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.toggleButton,
                activeRole === 'staff' && styles.toggleButtonActive,
              ]}
              onPress={() => handleRoleChange('staff')}>
              <Text
                style={[
                  styles.toggleText,
                  activeRole === 'staff' && styles.toggleTextActive,
                ]}>
                Staff Login
              </Text>
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

          {/* Heading Section */}
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

          {/* Form Fields Container */}
          <View style={styles.formContainer}>

            {/* Error Banner */}
            {displayError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠️ {displayError}</Text>
              </View>
            ) : null}

            {activeRole === 'staff' ? (
              /* Staff Email Field */
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Email <Text style={styles.asterisk}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="superadmin@arogya.clinic"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={text => {
                    setEmail(text);
                    if (validationError) setValidationError(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            ) : (
              /* Patient Phone Field */
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Mobile Number <Text style={styles.asterisk}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter 10-digit mobile number"
                  placeholderTextColor="#94a3b8"
                  value={phone}
                  onChangeText={text => {
                    setPhone(text);
                    if (validationError) setValidationError(null);
                  }}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
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
                  placeholder="Password@123"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    if (validationError) setValidationError(null);
                  }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}>
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity style={styles.forgotPasswordContainer}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={loading}
              style={[styles.signInButton, loading && styles.signInButtonDisabled]}
              onPress={handleLogin}>
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: 50,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
    paddingBottom: 40
  },
  logoImage: {
    width: 180,
    height: 70,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 5,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#059669',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  toggleTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  headingContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  asterisk: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#0f172a',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#0f172a',
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eyeIcon: {
    fontSize: 18,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  signInButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default LoginScreen;
