import { useEffect, useRef, useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { fetchProfileApi, updateProfileApi } from '../api/authApi';
import { updateVideoAvailability } from '../api/staffHeaderApi';
import { chooseAndUploadProfilePhoto, profilePhotoUrl } from '../api/profilePhotoApi';
import { useRemoteData } from './useRemoteData';
import { notifyProfileUpdated, subscribeProfileUpdated } from '../utils/profileEvents';
import { permissionEnabled } from '../utils/rolePermissions';
import { showErrorToast, showSuccessToast } from '../utils/toast';

type Profile = Record<string, any>;
const dateLabel = (value: unknown, options?: Intl.DateTimeFormatOptions) => {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', options);
};

export function useStaffProfile() {
  const { user, token, activeClinicId, activeClinicName, role, updateUserProfile } = useAuthContext();
  const scope = [token, user?.id, activeClinicId].join(':');
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const busy = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState('');
  const [photoFailed, setPhotoFailed] = useState(false);
  const resource = useRemoteData<Profile>(scope + ':profile', async () => {
    const response = await fetchProfileApi();
    if (!response.success || !response.data) throw new Error(response.message);
    return response.data.user || response.data;
  }, Boolean(token && user));
  const profile = resource.data;
  const populate = (value: Profile) => {
    setFullName(value.full_name || value.fullName || '');
    setPhone(value.phone || '');
    setAddress(value.address || '');
    setPhoto(value.profile_photo_url || value.profilePhoto || '');
  };
  useEffect(() => {
    scopeRef.current = scope;
    setIsEditing(false); setSaving(false); setUploading(false); setVideoBusy(false);
    populate({});
    return () => { scopeRef.current = ''; };
  }, [scope]);
  useEffect(() => {
    if (profile && !isEditing) populate(profile);
  }, [profile, isEditing]);
  useEffect(() => { setPhotoFailed(false); }, [photo]);
  useEffect(() => subscribeProfileUpdated(() => { void resource.refresh(); }), [resource.refresh]);
  useEffect(() => {
    if (resource.error) showErrorToast('Profile unavailable', 'Please refresh to retry.');
  }, [resource.error]);

  const handleSaveChanges = async () => {
    if (busy.current || !profile || resource.error) return;
    if (!fullName.trim() || !/^\d{10}$/.test(phone)) {
      showErrorToast('Validation Error', 'Enter your name and a valid 10-digit phone number.'); return;
    }
    busy.current = true; setSaving(true);
    try {
      const result = await updateProfileApi({ fullName: fullName.trim(), phone, address: address.trim(), profile_photo_url: photo });
      if (scopeRef.current !== scope) return;
      if (!result.success) throw new Error(result.message);
      const updated = result.data?.user || { ...profile, full_name: fullName.trim(), phone, address: address.trim(), profile_photo_url: photo };
      updateUserProfile?.(updated);
      await resource.refresh();
      if (scopeRef.current !== scope) return;
      setIsEditing(false);
      notifyProfileUpdated();
      showSuccessToast('Profile Updated', 'Your profile details have been saved successfully.');
    } catch (error) {
      if (scopeRef.current === scope) showErrorToast('Unable to save profile', error instanceof Error ? error.message : 'Please retry.');
    } finally {
      busy.current = false;
      if (scopeRef.current === scope) setSaving(false);
    }
  };
  const canManageVideoCalling = Boolean(profile && (String(profile.role_name || role).toLowerCase() === 'doctor' || permissionEnabled(profile.is_doctor)));
  const handleToggleVideo = async (enabled: boolean) => {
    if (busy.current || !canManageVideoCalling) return;
    busy.current = true; setVideoBusy(true);
    try {
      const result = await updateVideoAvailability(enabled);
      if (scopeRef.current !== scope) return;
      if (!result.success) throw new Error(result.message);
      updateUserProfile?.({ is_video_enabled: enabled ? 1 : 0 });
      await resource.refresh();
      if (scopeRef.current === scope) notifyProfileUpdated();
    } catch (error) {
      if (scopeRef.current === scope) showErrorToast('Unable to update video calling', error instanceof Error ? error.message : 'Please retry.');
    } finally { busy.current = false; if (scopeRef.current === scope) setVideoBusy(false); }
  };
  const handleChoosePhoto = async () => {
    if (busy.current || !profile) return;
    busy.current = true; setUploading(true);
    try {
      const path = await chooseAndUploadProfilePhoto(() => scopeRef.current === scope);
      if (path && scopeRef.current === scope) setPhoto(path);
    } catch (error) {
      if (scopeRef.current === scope) showErrorToast('Unable to upload photo', error instanceof Error ? error.message : 'Please retry.');
    } finally { busy.current = false; if (scopeRef.current === scope) setUploading(false); }
  };
  return {
    isEditing, setIsEditing, loading: resource.loading, saving, uploading, videoBusy,
    error: resource.error, ready: Boolean(profile), loadProfile: resource.refresh,
    fullName, setFullName, phone, setPhone, address, setAddress,
    email: profile?.email || '', department: profile?.department || '—',
    clinicName: activeClinicName || profile?.clinic_name || '—',
    userRole: String(profile?.role_name || role || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    joinedDate: dateLabel(profile?.created_at, { month: 'long', year: 'numeric' }),
    joinedDateFormatted: dateLabel(profile?.created_at, { day: '2-digit', month: 'short', year: 'numeric' }),
    lastLoginTime: profile?.last_login_at && !Number.isNaN(new Date(profile.last_login_at).getTime()) ? new Date(profile.last_login_at).toLocaleString('en-IN') : '—',
    verificationStatus: !profile ? '—' : permissionEnabled(profile.is_verified) ? 'Verified' : 'Not verified',
    videoCallingEnabled: permissionEnabled(profile?.is_video_enabled), canManageVideoCalling, handleToggleVideo,
    handleChoosePhoto, photoUrl: photoFailed ? '' : profilePhotoUrl(photo), onPhotoError: () => setPhotoFailed(true),
    handleSaveChanges, handleCancelEdit: () => { if (!busy.current) { if (profile) populate(profile); setIsEditing(false); } },
  };
}
