import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { useStaffProfile } from '../src/hooks/useStaffProfile';
import { ChangePasswordScreen } from '../src/screens/staff/ChangePasswordScreen';
import { fetchProfileApi, updateProfileApi, changePasswordApi } from '../src/api/authApi';
import { updateVideoAvailability } from '../src/api/staffHeaderApi';
import { chooseAndUploadProfilePhoto } from '../src/api/profilePhotoApi';
import { showErrorToast, showSuccessToast } from '../src/utils/toast';

const mockLogout = jest.fn();
const mockUpdateProfile = jest.fn();
let mockToken = 'token';
jest.mock('../src/context/AuthContext', () => ({ useAuthContext: () => ({
  token: mockToken, user: { id: 102 }, activeClinicId: 71, activeClinicName: 'Real Clinic',
  role: 'clinic_admin', logout: mockLogout, updateUserProfile: mockUpdateProfile,
}) }));
jest.mock('../src/api/authApi', () => ({ fetchProfileApi: jest.fn(), updateProfileApi: jest.fn(), changePasswordApi: jest.fn() }));
jest.mock('../src/api/staffHeaderApi', () => ({ updateVideoAvailability: jest.fn() }));
jest.mock('../src/api/profilePhotoApi', () => ({ chooseAndUploadProfilePhoto: jest.fn(), profilePhotoUrl: (s: string) => s }));
jest.mock('../src/utils/toast', () => ({ showSuccessToast: jest.fn(), showErrorToast: jest.fn() }));
jest.mock('../src/components/common/StaffHeader', () => ({ StaffHeader: () => null }));
jest.mock('lucide-react-native', () => Object.fromEntries(['Key', 'Lock', 'Shield', 'Eye', 'EyeOff', 'Check', 'X', 'Sparkles'].map(k => [k, k])));
let screen: Renderer.ReactTestRenderer;
let state: ReturnType<typeof useStaffProfile>;
let stored: Record<string, any>;
function Harness() { state = useStaffProfile(); return null; }
const ok = (data: any = {}) => ({ success: true, message: 'OK', data });
beforeEach(() => {
  jest.clearAllMocks(); mockToken = 'token';
  stored = { id: 102, full_name: 'Saved User', phone: '9876543210', email: 'user@example.com',
    is_verified: 0, is_doctor: 0, is_video_enabled: 0, department: null, created_at: null, last_login_at: null };
  jest.mocked(fetchProfileApi).mockImplementation(async () => ok({ user: { ...stored } }));
  jest.mocked(updateProfileApi).mockImplementation(async body => {
    stored = { ...stored, ...body, full_name: body.fullName };
    return ok({ user: stored });
  });
  jest.mocked(changePasswordApi).mockResolvedValue(ok());
  jest.mocked(updateVideoAvailability).mockImplementation(async enabled => {
    stored.is_video_enabled = Number(enabled); return ok();
  });
});
afterEach(async () => { await act(async () => screen?.unmount()); });
async function renderProfile() { await act(async () => { screen = Renderer.create(<Harness />); }); }

test('profile uses server values and empty metadata never becomes fabricated identity or verification', async () => {
  await renderProfile();
  expect(state.fullName).toBe('Saved User');
  expect(state.clinicName).toBe('Real Clinic');
  expect(state.verificationStatus).toBe('Not verified');
  expect(state.department).toBe('—');
  expect(state.joinedDate).toBe('—');
  expect(state.lastLoginTime).toBe('—');
  expect(state.canManageVideoCalling).toBe(false);
  await act(async () => state.handleToggleVideo(true));
  expect(updateVideoAvailability).not.toHaveBeenCalled();
});

test('failed profile save keeps draft and shows error; retry persists and updates session', async () => {
  await renderProfile();
  await act(async () => state.setIsEditing(true));
  await act(async () => state.setFullName('Changed Name'));
  jest.mocked(updateProfileApi).mockResolvedValueOnce({ success: false, message: 'Save rejected' });
  await act(async () => state.handleSaveChanges());
  expect(state.isEditing).toBe(true);
  expect(state.fullName).toBe('Changed Name');
  expect(showSuccessToast).not.toHaveBeenCalled();
  expect(showErrorToast).toHaveBeenCalledWith('Unable to save profile', 'Save rejected');
  await act(async () => state.handleSaveChanges());
  expect(state.isEditing).toBe(false);
  expect(state.fullName).toBe('Changed Name');
  expect(mockUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({ full_name: 'Changed Name' }));
});

test('cancel restores persisted profile and discards selected photo', async () => {
  await renderProfile();
  await act(async () => state.setIsEditing(true));
  await act(async () => state.setFullName('Unsaved'));
  jest.mocked(chooseAndUploadProfilePhoto).mockResolvedValue('/uploads/new.png');
  await act(async () => state.handleChoosePhoto());
  expect(state.photoUrl).toBe('/uploads/new.png');
  await act(async () => state.handleCancelEdit());
  expect(state.fullName).toBe('Saved User');
  expect(state.photoUrl).toBe('');
  expect(updateProfileApi).not.toHaveBeenCalled();
});

test('doctor video switch only changes after successful API update', async () => {
  stored.is_doctor = 1; await renderProfile();
  jest.mocked(updateVideoAvailability).mockResolvedValueOnce({ success: false, message: 'Rejected' });
  await act(async () => state.handleToggleVideo(true));
  expect(state.videoCallingEnabled).toBe(false);
  await act(async () => state.handleToggleVideo(true));
  expect(state.videoCallingEnabled).toBe(true);
});

test('profile network failure clears displayed values and supports retry', async () => {
  jest.mocked(fetchProfileApi).mockResolvedValueOnce({ success: false, message: 'Offline' });
  await renderProfile();
  expect(state.ready).toBe(false); expect(state.fullName).toBe('');
  await act(async () => state.loadProfile());
  expect(state.ready).toBe(true); expect(state.fullName).toBe('Saved User');
});

async function passwordForm(newPassword = 'NewPassword1!') {
  await act(async () => { screen = Renderer.create(<ChangePasswordScreen onOpenDrawer={() => {}} />); });
  const inputs = screen.root.findAllByType(TextInput);
  await act(async () => {
    inputs[0].props.onChangeText('OldPassword1!');
    inputs[1].props.onChangeText(newPassword);
    inputs[2].props.onChangeText(newPassword);
  });
}
function submitPassword() {
  const button = screen.root.findAllByType(TouchableOpacity).find(b => b.findAllByType(Text)
    .some(t => /Change Password|Update Password/.test(String(t.props.children))));
  if (!button) throw new Error('Missing password submit');
  return act(async () => button.props.onPress());
}
test('rejected password update preserves input and never logs out or reports success', async () => {
  await passwordForm();
  jest.mocked(changePasswordApi).mockResolvedValueOnce({ success: false, message: 'Current password is incorrect' });
  await submitPassword();
  expect(mockLogout).not.toHaveBeenCalled();
  expect(showSuccessToast).not.toHaveBeenCalled();
  expect(showErrorToast).toHaveBeenCalledWith('Unable to change password', 'Current password is incorrect');
  expect(screen.root.findAllByType(TextInput)[1].props.value).toBe('NewPassword1!');
});
test('successful password change clears input and logs out the revoked session', async () => {
  await passwordForm(); await submitPassword();
  expect(changePasswordApi).toHaveBeenCalledWith({ currentPassword: 'OldPassword1!', newPassword: 'NewPassword1!' });
  expect(mockLogout).toHaveBeenCalledTimes(1);
  expect(screen.root.findAllByType(TextInput)[1].props.value).toBe('');
});
test.each(['Aa1!', 'OldPassword1!'])('invalid new password %s never reaches API', async password => {
  await passwordForm(password); await submitPassword();
  expect(changePasswordApi).not.toHaveBeenCalled();
  expect(showErrorToast).toHaveBeenCalled();
});
