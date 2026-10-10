import { useEffect, useRef, useState, useMemo } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { fetchProfileApi, updateProfileApi } from '../api/authApi';
import { updateVideoAvailability } from '../api/staffHeaderApi';
import {
  chooseAndUploadProfilePhoto,
  profilePhotoUrl,
} from '../api/profilePhotoApi';
import { useRemoteData } from './useRemoteData';
import {
  notifyProfileUpdated,
  subscribeProfileUpdated,
} from '../utils/profileEvents';
import { permissionEnabled } from '../utils/rolePermissions';
import { showErrorToast, showSuccessToast } from '../utils/toast';

type Profile = Record<string, any>;

const dateLabel = (value: unknown, options?: Intl.DateTimeFormatOptions) => {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-GB', options);
};

export function useStaffProfile() {
  const {
    user,
    token,
    activeClinicId,
    activeClinicName,
    role,
    updateUserProfile,
  } = useAuthContext();
  const scope = [token, user?.id, activeClinicId].join(':');
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const busy = useRef(false);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);

  // Common Profile Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState('');
  const [photoFailed, setPhotoFailed] = useState(false);

  // Professional / Doctor Fields
  const [specialization, setSpecialization] = useState('');
  const [qualification, setQualification] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [availableDays, setAvailableDays] = useState('');

  // Patient Medical & Emergency Fields
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [chronicConditions, setChronicConditions] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');

  const resource = useRemoteData<Profile>(
    scope + ':profile',
    async () => {
      const response = await fetchProfileApi();
      if (!response.success || !response.data)
        throw new Error(response.message);
      return response.data.user || response.data;
    },
    Boolean(token && user),
  );

  const profile = resource.data;

  // Role Checks
  const normalizedRole = String(profile?.role_name || role || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const isDoctorRole =
    normalizedRole === 'doctor' || permissionEnabled(profile?.is_doctor);
  const isProfessionalRole = [
    'doctor',
    'nurse',
    'pharmacist',
    'lab_technician',
    'receptionist',
    'accountant',
  ].includes(normalizedRole);
  const isPatientRole = normalizedRole === 'patient';
  const canManageVideoCalling =
    isDoctorRole || Number(profile?.is_doctor ?? 0) === 1;

  const populate = (value: Profile) => {
    setFullName(value.full_name || value.fullName || '');
    setPhone(value.phone || '');
    setAddress(value.address || '');
    setPhoto(value.profile_photo_url || value.profilePhoto || '');

    // Professional fields
    setSpecialization(value.specialization || '');
    setQualification(value.qualification || '');
    setRegistrationNumber(value.registration_number || '');
    setExperienceYears(
      value.experience_years !== undefined && value.experience_years !== null
        ? String(value.experience_years)
        : '',
    );
    setConsultationFee(
      value.consultation_fee !== undefined && value.consultation_fee !== null
        ? String(value.consultation_fee)
        : '',
    );
    setAvailableDays(value.available_days || '');

    // Patient fields
    setGender(value.gender || '');
    setDateOfBirth(
      value.date_of_birth ? String(value.date_of_birth).slice(0, 10) : '',
    );
    setBloodGroup(value.blood_group || '');
    setAllergies(value.allergies || '');
    setChronicConditions(value.chronic_conditions || '');
    setMedicalHistory(value.medical_history || '');
    setCurrentMedications(value.current_medications || '');
    setEmergencyContactName(value.emergency_contact_name || '');
    setEmergencyContactPhone(value.emergency_contact || '');
    setEmergencyRelation(value.emergency_relation || '');
  };

  useEffect(() => {
    scopeRef.current = scope;
    setIsEditing(false);
    setSaving(false);
    setUploading(false);
    setVideoBusy(false);
    populate({});
    return () => {
      scopeRef.current = '';
    };
  }, [scope]);

  useEffect(() => {
    if (profile && !isEditing) populate(profile);
  }, [profile, isEditing]);

  useEffect(() => {
    setPhotoFailed(false);
  }, [photo]);
  useEffect(
    () =>
      subscribeProfileUpdated(() => {
        void resource.refresh();
      }),
    [resource.refresh],
  );

  useEffect(() => {
    if (resource.error)
      showErrorToast('Profile unavailable', 'Please refresh to retry.');
  }, [resource.error]);

  const handleSaveChanges = async () => {
    if (busy.current || !profile || resource.error) return;
    if (!fullName.trim() || !/^\d{10}$/.test(phone)) {
      showErrorToast(
        'Validation Error',
        'Enter your name and a valid 10-digit phone number.',
      );
      return;
    }

    busy.current = true;
    setSaving(true);

    try {
      const payload: Record<string, any> = {
        fullName: fullName.trim(),
        phone,
        address: address.trim(),
        profile_photo_url: photo,
      };

      if (isProfessionalRole) {
        payload.specialization = specialization.trim() || null;
        payload.qualification = qualification.trim() || null;
        payload.registration_number = registrationNumber.trim() || null;
        payload.experience_years = experienceYears.trim()
          ? parseInt(experienceYears, 10)
          : null;
        payload.available_days = availableDays.trim() || null;
        if (isDoctorRole) {
          payload.consultation_fee = consultationFee.trim()
            ? parseFloat(consultationFee)
            : null;
        }
      } else if (isPatientRole) {
        payload.gender = gender || null;
        payload.date_of_birth = dateOfBirth.trim() || null;
        payload.blood_group = bloodGroup.trim() || null;
        payload.allergies = allergies.trim() || null;
        payload.chronic_conditions = chronicConditions.trim() || null;
        payload.medical_history = medicalHistory.trim() || null;
        payload.current_medications = currentMedications.trim() || null;
        payload.emergency_contact_name = emergencyContactName.trim() || null;
        payload.emergency_contact = emergencyContactPhone.trim() || null;
        payload.emergency_relation = emergencyRelation.trim() || null;
      }

      const result = await updateProfileApi(payload);
      if (scopeRef.current !== scope) return;
      if (!result.success) throw new Error(result.message);

      const updated = result.data?.user || {
        ...profile,
        ...payload,
        full_name: fullName.trim(),
      };
      updateUserProfile?.(updated);
      await resource.refresh();

      if (scopeRef.current !== scope) return;
      setIsEditing(false);
      notifyProfileUpdated();
      showSuccessToast(
        'Profile Updated',
        'Your profile details have been saved successfully.',
      );
    } catch (error) {
      if (scopeRef.current === scope) {
        showErrorToast(
          'Unable to save profile',
          error instanceof Error ? error.message : 'Please retry.',
        );
      }
    } finally {
      busy.current = false;
      if (scopeRef.current === scope) setSaving(false);
    }
  };

  const handleToggleVideo = async (enabled: boolean) => {
    if (busy.current || !canManageVideoCalling) return;
    busy.current = true;
    setVideoBusy(true);
    try {
      const result = await updateVideoAvailability(enabled);
      if (scopeRef.current !== scope) return;
      if (!result.success) throw new Error(result.message);
      updateUserProfile?.({ is_video_enabled: enabled ? 1 : 0 });
      await resource.refresh();
      if (scopeRef.current === scope) notifyProfileUpdated();
    } catch (error) {
      if (scopeRef.current === scope) {
        showErrorToast(
          'Unable to update video calling',
          error instanceof Error ? error.message : 'Please retry.',
        );
      }
    } finally {
      busy.current = false;
      if (scopeRef.current === scope) setVideoBusy(false);
    }
  };

  const handleChoosePhoto = async () => {
    if (busy.current || !profile) return;
    busy.current = true;
    setUploading(true);
    try {
      const path = await chooseAndUploadProfilePhoto(
        () => scopeRef.current === scope,
      );
      if (path && scopeRef.current === scope) setPhoto(path);
    } catch (error) {
      if (scopeRef.current === scope) {
        showErrorToast(
          'Unable to upload photo',
          error instanceof Error ? error.message : 'Please retry.',
        );
      }
    } finally {
      busy.current = false;
      if (scopeRef.current === scope) setUploading(false);
    }
  };

  const practiceLocation = useMemo(() => {
    const loc = [profile?.city, profile?.state, profile?.country]
      .filter(Boolean)
      .join(', ');
    return loc || profile?.address || '—';
  }, [profile]);

  return {
    isEditing,
    setIsEditing,
    loading: resource.loading,
    saving,
    uploading,
    videoBusy,
    error: resource.error,
    ready: Boolean(profile),
    loadProfile: resource.refresh,
    fullName,
    setFullName,
    phone,
    setPhone,
    address,
    setAddress,
    email: profile?.email || '',
    department: profile?.department || '—',
    clinicName: activeClinicName || profile?.clinic_name || '—',
    userRole: String(profile?.role_name || role || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase()),
    joinedDate: dateLabel(profile?.created_at, {
      month: 'long',
      year: 'numeric',
    }),
    joinedDateFormatted: dateLabel(profile?.created_at, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    lastLoginTime:
      profile?.last_login_at &&
      !Number.isNaN(new Date(profile.last_login_at).getTime())
        ? new Date(profile.last_login_at).toLocaleString('en-IN')
        : '—',
    videoRatePerMinute: profile?.video_rate_per_minute ?? null,
    marketplaceStatus: profile?.marketplace_status
      ? String(profile.marketplace_status).replace(/_/g, ' ')
      : '',
    verificationStatus: !profile
      ? '—'
      : permissionEnabled(profile.is_verified)
      ? 'Verified'
      : 'Not verified',
    videoCallingEnabled: permissionEnabled(profile?.is_video_enabled),
    canManageVideoCalling,
    handleToggleVideo,
    handleChoosePhoto,
    photoUrl: photoFailed ? '' : profilePhotoUrl(photo),
    onPhotoError: () => setPhotoFailed(true),
    handleSaveChanges,
    handleCancelEdit: () => {
      if (!busy.current) {
        if (profile) populate(profile);
        setIsEditing(false);
      }
    },
    // Role flags
    isDoctorRole,
    isProfessionalRole,
    isPatientRole,
    // Professional states & setters
    specialization,
    setSpecialization,
    qualification,
    setQualification,
    registrationNumber,
    setRegistrationNumber,
    experienceYears,
    setExperienceYears,
    consultationFee,
    setConsultationFee,
    availableDays,
    setAvailableDays,
    doctorType: profile?.doctor_type
      ? String(profile.doctor_type).replace(/_/g, ' ')
      : 'clinic doctor',
    availableTime:
      profile?.available_from && profile?.available_to
        ? `${profile.available_from} - ${profile.available_to}`
        : 'Not provided',
    practiceLocation,
    // Patient states & setters
    gender,
    setGender,
    dateOfBirth,
    setDateOfBirth,
    age: profile?.age ? `${profile.age} years` : '—',
    bloodGroup,
    setBloodGroup,
    allergies,
    setAllergies,
    chronicConditions,
    setChronicConditions,
    medicalHistory,
    setMedicalHistory,
    currentMedications,
    setCurrentMedications,
    emergencyContactName,
    setEmergencyContactName,
    emergencyContactPhone,
    setEmergencyContactPhone,
    emergencyRelation,
    setEmergencyRelation,
  };
}
