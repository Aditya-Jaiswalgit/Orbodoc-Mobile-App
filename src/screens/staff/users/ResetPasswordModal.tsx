import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Eye, EyeOff, Lock, X } from 'lucide-react-native';
import { AppModal } from '../../../components/common/AppModal';
import { styles } from '../styles/UserManagement.styles';

interface Props {
  visible: boolean;
  userName?: string;
  canEdit: boolean;
  saving: boolean;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
  errors: { password?: string; confirm?: string };
  errorMessage: string;
  onDismiss: () => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onPasswordVisibilityChange: () => void;
  onConfirmVisibilityChange: () => void;
  onSubmit: () => void;
}

export function ResetPasswordModal({
  visible,
  userName,
  canEdit,
  saving,
  password,
  confirmPassword,
  showPassword,
  showConfirmPassword,
  errors,
  errorMessage,
  onDismiss,
  onPasswordChange,
  onConfirmPasswordChange,
  onPasswordVisibilityChange,
  onConfirmVisibilityChange,
  onSubmit,
}: Props) {
  return (
    <AppModal visible={visible} animationType="fade" transparent onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableWithoutFeedback>
            <View style={styles.resetPasswordCard}>
              <View style={styles.resetPasswordHeader}>
                <View style={styles.resetLockIconBox}><Lock size={22} color="#FFFFFF" /></View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.resetTitle}>Reset Password</Text>
                  <Text style={styles.resetSubtitle}>Set a secure temporary password for {userName || 'User'}.</Text>
                </View>
                <TouchableOpacity onPress={onDismiss} style={{ padding: 4 }} accessibilityRole="button" accessibilityLabel="Close password reset">
                  <X size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.resetFormScroll} contentContainerStyle={styles.resetFormBody} keyboardShouldPersistTaps="handled">
                <Text style={styles.resetFieldLabel}>New password <Text style={{ color: '#EF4444' }}>*</Text></Text>
                <View style={[styles.passwordInputContainerActive, !!errors.password && styles.invalidInput]}>
                  <TextInput
                    style={styles.passwordInputText}
                    placeholder="Enter at least 8 characters"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    value={password}
                    accessibilityLabel="New password"
                    aria-invalid={!!errors.password}
                    editable={!saving}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    onChangeText={onPasswordChange}
                  />
                  <TouchableOpacity onPress={onPasswordVisibilityChange} style={{ padding: 6 }} accessibilityLabel={showPassword ? 'Hide new password' : 'Show new password'}>
                    {showPassword ? <EyeOff size={18} color="#64748B" /> : <Eye size={18} color="#64748B" />}
                  </TouchableOpacity>
                </View>
                {!!errors.password && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.fieldError}>{errors.password}</Text>}

                <Text style={[styles.resetFieldLabel, { marginTop: 14 }]}>Confirm password <Text style={{ color: '#EF4444' }}>*</Text></Text>
                <View style={[styles.passwordInputContainer, !!errors.confirm && styles.invalidInput]}>
                  <TextInput
                    style={styles.passwordInputText}
                    placeholder="Re-enter the new password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    accessibilityLabel="Confirm password"
                    aria-invalid={!!errors.confirm}
                    editable={!saving}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    onChangeText={onConfirmPasswordChange}
                  />
                  <TouchableOpacity onPress={onConfirmVisibilityChange} style={{ padding: 6 }} accessibilityLabel={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}>
                    {showConfirmPassword ? <EyeOff size={18} color="#64748B" /> : <Eye size={18} color="#64748B" />}
                  </TouchableOpacity>
                </View>
                {!!errors.confirm && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.fieldError}>{errors.confirm}</Text>}
                {!!errorMessage && <Text accessibilityRole="alert" style={styles.fieldError}>{errorMessage}</Text>}
              </ScrollView>

              <View style={styles.resetFooterRow}>
                <TouchableOpacity style={styles.resetCancelBtn} disabled={saving} onPress={onDismiss}>
                  <Text style={styles.resetCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="submit-password-reset" style={styles.resetSubmitBtn} onPress={onSubmit} disabled={!canEdit || saving}>
                  {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <><Lock size={15} color="#FFFFFF" style={{ marginRight: 6 }} /><Text style={styles.resetSubmitBtnText}>Reset Password</Text></>}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </AppModal>
  );
}
