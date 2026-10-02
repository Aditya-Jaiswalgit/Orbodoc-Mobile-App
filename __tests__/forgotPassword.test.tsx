import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { ForgotPasswordModal } from '../src/screens/auth/ForgotPasswordModal';
import {
  sendStaffOtpApi,
  verifyStaffOtpApi,
  resetAuthPasswordApi,
} from '../src/api/authApi';

jest.mock('../src/api/authApi', () => ({
  sendStaffOtpApi: jest.fn(),
  verifyStaffOtpApi: jest.fn(),
  resetAuthPasswordApi: jest.fn(),
  forgotPasswordApi: jest.fn(),
}));

jest.mock('lucide-react-native', () =>
  Object.fromEntries(
    [
      'AlertCircle',
      'ArrowLeft',
      'CheckCircle2',
      'Eye',
      'EyeOff',
      'KeyRound',
      'Lock',
      'Mail',
      'Phone',
      'ShieldCheck',
      'Sparkles',
      'X',
    ].map((k) => [k, k])
  )
);

describe('ForgotPasswordModal Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates email on step 1 and advances to step 2 after OTP is sent', async () => {
    jest.mocked(sendStaffOtpApi).mockResolvedValueOnce({
      success: true,
      message: 'OTP sent successfully',
      data: null,
    });

    let component: Renderer.ReactTestRenderer;
    await act(async () => {
      component = Renderer.create(
        <ForgotPasswordModal
          visible={true}
          onClose={jest.fn()}
          initialRole="staff"
          initialEmail="staff@orbo.clinic"
        />
      );
    });

    // Find "Send Verification Code" button and press it
    const buttons = component!.root.findAllByType(TouchableOpacity);
    const sendButton = buttons.find((btn) =>
      btn.findAllByType(Text).some((t) => t.props.children === 'Send Verification Code')
    );

    expect(sendButton).toBeDefined();

    await act(async () => {
      sendButton!.props.onPress();
    });

    expect(sendStaffOtpApi).toHaveBeenCalledWith('staff@orbo.clinic');

    // Should now show Step 2 with "Verify Code" button
    const verifyButton = component!.root
      .findAllByType(TouchableOpacity)
      .find((btn) =>
        btn.findAllByType(Text).some((t) => t.props.children === 'Verify Code')
      );

    expect(verifyButton).toBeDefined();
  });

  test('verifies OTP and proceeds to new password step', async () => {
    jest.mocked(sendStaffOtpApi).mockResolvedValueOnce({
      success: true,
      message: 'OTP sent',
      data: null,
    });
    jest.mocked(verifyStaffOtpApi).mockResolvedValueOnce({
      success: true,
      message: 'OTP verified',
      resetToken: 'reset-token-xyz',
    } as any);

    let component: Renderer.ReactTestRenderer;
    await act(async () => {
      component = Renderer.create(
        <ForgotPasswordModal
          visible={true}
          onClose={jest.fn()}
          initialRole="staff"
          initialEmail="staff@orbo.clinic"
        />
      );
    });

    // Step 1 -> Send OTP
    const sendBtn = component!.root
      .findAllByType(TouchableOpacity)
      .find((btn) =>
        btn.findAllByType(Text).some((t) => t.props.children === 'Send Verification Code')
      );
    await act(async () => {
      sendBtn!.props.onPress();
    });

    // Enter OTP
    const otpInput = component!.root.findByType(TextInput);
    await act(async () => {
      otpInput.props.onChangeText('123456');
    });

    // Click "Verify Code"
    const verifyBtn = component!.root
      .findAllByType(TouchableOpacity)
      .find((btn) =>
        btn.findAllByType(Text).some((t) => t.props.children === 'Verify Code')
      );
    await act(async () => {
      verifyBtn!.props.onPress();
    });

    expect(verifyStaffOtpApi).toHaveBeenCalledWith('staff@orbo.clinic', '123456');

    // Should now show Step 3 "Reset Password" button
    const resetBtn = component!.root
      .findAllByType(TouchableOpacity)
      .find((btn) =>
        btn.findAllByType(Text).some((t) => t.props.children === 'Reset Password')
      );
    expect(resetBtn).toBeDefined();
  });
});
