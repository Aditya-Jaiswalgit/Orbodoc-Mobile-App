import { colors, radii, spacing, typography } from '../../theme/tokens';
// src/screens/staff/MyProfileScreen.tsx
import React from 'react';
import { useLiquidBorderScrollHandlers } from '../../components/common/LiquidBorderFocusContext';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { LiquidBorderScrollView } from '../../components/common/LiquidBorderScrollView';

import {
  User,
  Edit2,
  Save,
  X,
  Building2,
  Briefcase,
  BadgeCheck,
  Calendar,
  Mail,
  Phone,
  Video,
  ShieldCheck,
  Clock,
  Upload,
  Stethoscope,
  Award,
  IndianRupee,
  MapPin,
  HeartPulse,
  AlertTriangle,
  Hash,
  Activity,
  Droplets,
  UserRound,
} from 'lucide-react-native';
import { LiquidBorderSurface } from '../../components/common/LiquidBorderSurface';
import { StaffHeader } from '../../components/common/StaffHeader';
import { PatientHeader } from '../../components/common/PatientHeader';
import { useStaffProfile } from '../../hooks/useStaffProfile';

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
  patientMode?: boolean;
}

interface PatientInfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}

const PatientInfoCard: React.FC<PatientInfoCardProps> = ({ icon, label, value, valueColor }) => (
  <View style={[styles.infoCardItem, styles.patientInfoCard]}>
    <View style={styles.infoCardLabelRow}>
      <View style={styles.patientInfoIcon}>{icon}</View>
      <Text style={styles.infoCardLabel}>{label}</Text>
    </View>
    <Text style={[styles.infoCardValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
  </View>
);

const formatPatientDateOfBirth = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value || 'Not provided';
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

export const MyProfileScreen: React.FC<Props> = ({ onOpenDrawer, onNavigateScreen, patientMode = false }) => {
  const borderScrollHandlers = useLiquidBorderScrollHandlers();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const {
    isEditing, setIsEditing, loading, saving, uploading, videoBusy, error, ready, loadProfile,
    fullName, setFullName, email, phone, setPhone, address, setAddress, department,
    clinicName, userRole, joinedDate, joinedDateFormatted, lastLoginTime, verificationStatus,
    videoRatePerMinute, marketplaceStatus,
    videoCallingEnabled, canManageVideoCalling, handleToggleVideo, handleSaveChanges,
    handleCancelEdit, handleChoosePhoto, photoUrl, onPhotoError,
    // Role flags
    isDoctorRole, isProfessionalRole, isPatientRole,
    // Professional states & setters
    specialization, setSpecialization,
    qualification, setQualification,
    registrationNumber, setRegistrationNumber,
    experienceYears, setExperienceYears,
    consultationFee, setConsultationFee,
    availableDays, setAvailableDays,
    doctorType, availableTime, practiceLocation,
    // Patient states & setters
    gender, setGender,
    dateOfBirth, setDateOfBirth,
    age, bloodGroup, setBloodGroup,
    allergies, setAllergies,
    chronicConditions,
    medicalHistory, setMedicalHistory,
    currentMedications,
    emergencyContactName, setEmergencyContactName,
    emergencyContactPhone, setEmergencyContactPhone,
    emergencyRelation, setEmergencyRelation,
  } = useStaffProfile();

  const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';

  return (
    <View style={styles.container}>
      {patientMode ? <PatientHeader onOpenDrawer={onOpenDrawer} /> : <StaffHeader
        onOpenDrawer={onOpenDrawer}
        title="My Profile"
        onNavigate={(path) => {
          if (onNavigateScreen) {
            const screen = path.replace('/', '');
            onNavigateScreen(screen);
          }
        }}
      />}

      <LiquidBorderScrollView
        {...borderScrollHandlers}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadProfile} colors={[colors.primary]} tintColor={colors.primary} />}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HEADER TITLE BAR & ACTION BUTTONS ──────────────────────────────── */}
        <View style={[styles.headerBannerRow, isMobile && styles.headerBannerRowMobile]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <User size={22} color={colors.text} style={{ marginRight: spacing.sm }} />
              <Text style={styles.headerTitleText}>My Profile</Text>
            </View>
            <Text style={styles.headerSubtitleText}>View and manage your personal information</Text>
          </View>

          {/* Action Buttons */}
          {!isEditing ? (
            <TouchableOpacity
              style={[styles.editProfileBtn, isMobile && styles.editProfileBtnMobile]}
              disabled={loading || !ready || Boolean(error)}
              onPress={() => setIsEditing(true)}
              activeOpacity={0.8}
            >
              <Edit2 size={16} color={colors.surface} style={{ marginRight: spacing.tiny }} />
              <Text style={styles.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActionsGroup}>
              <TouchableOpacity
                style={styles.saveChangesBtn}
                onPress={handleSaveChanges}
                disabled={saving || uploading}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <>
                    <Save size={16} color={colors.surface} style={{ marginRight: spacing.tiny }} />
                    <Text style={styles.saveChangesBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                disabled={saving || uploading}
                onPress={handleCancelEdit}
                activeOpacity={0.8}
              >
                <X size={16} color={colors.foreground} style={{ marginRight: spacing.xs }} />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── CONDITIONAL SCREEN VIEW: VIEW PROFILE VS EDIT PROFILE ──────────── */}
        {!isEditing ? (
          /* ══════════════════════════════════════════════════════════════════════ */
          /* 1️⃣ VIEW PROFILE DESIGN                                                */
          /* ══════════════════════════════════════════════════════════════════════ */
          <LiquidBorderSurface style={styles.viewProfileSection} radius={radii.lg}>
            {/* Top Mint Container Card */}
            <View style={styles.profileMintCard}>
              <View style={[styles.profileTopRow, isMobile && styles.profileTopRowMobile]}>
                {/* Left: Circular Avatar Badge */}
                <View style={styles.avatarCircleOuterRing}>
                  <View style={styles.avatarCircleInner}>
                    {photoUrl ? (
                      <Image source={{ uri: photoUrl }} onError={onPhotoError} style={{ width: '100%', height: '100%', borderRadius: 100 }} />
                    ) : (
                      <Text style={styles.avatarInitialsText}>{initials}</Text>
                    )}
                  </View>
                </View>

                {/* Middle: User Main Info */}
                <View style={[styles.userMainInfoCol, isMobile && { width: '100%', marginLeft: 0, marginTop: spacing.md, alignItems: 'center' }]}>
                  <View style={[styles.profileNameRoleRow, isMobile && styles.profileNameRoleRowMobile]}>
                    <Text style={styles.userFullNameText}>{fullName}</Text>
                    <View style={styles.roleBadgePill}>
                      <Text style={styles.roleBadgePillText}>{userRole}</Text>
                    </View>
                  </View>

                  <View style={[styles.metaBadgesRow, isMobile && styles.metaBadgesRowMobile]}>
                    {clinicName && clinicName !== '—' && clinicName !== 'â€”' ? (
                      <View style={[styles.metaBadgeItem, isMobile && styles.metaBadgeItemMobile]}>
                        <Building2 size={14} color={colors.muted} style={{ marginRight: spacing.xs }} />
                        <Text style={[styles.metaBadgeText, isMobile && styles.metaBadgeTextMobile]} numberOfLines={1}>{clinicName}</Text>
                      </View>
                    ) : null}

                    {department && department !== '—' ? (
                      <View style={[styles.metaBadgeItem, isMobile && styles.metaBadgeItemMobile]}>
                        <Briefcase size={14} color={colors.muted} style={{ marginRight: spacing.xs }} />
                        <Text style={[styles.metaBadgeText, isMobile && styles.metaBadgeTextMobile]} numberOfLines={1}>{department}</Text>
                      </View>
                    ) : null}

                    {!isPatientRole ? (
                      <View style={[styles.metaBadgeItem, isMobile && styles.metaBadgeItemMobile]}>
                        <Calendar size={14} color={colors.muted} style={{ marginRight: spacing.xs }} />
                        <Text style={[styles.metaBadgeText, isMobile && styles.metaBadgeTextMobile]} numberOfLines={1}>Joined {joinedDate}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Right: Video Calling Card Box (Only for Doctor) */}
                {canManageVideoCalling ? (
                  <View style={[styles.videoCallingCardBox, isMobile && { marginTop: 14, alignSelf: 'center' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={styles.videoIconCircle}>
                        <Video size={16} color={colors.primary} />
                      </View>
                      <View style={{ marginLeft: spacing.sm }}>
                        <Text style={styles.videoCallingTitle}>Video Calling</Text>
                        <Text style={styles.videoCallingSub}>{videoCallingEnabled ? 'Enabled' : 'Disabled'}</Text>
                      </View>
                    </View>
                    <Switch
                      value={videoCallingEnabled}
                      disabled={videoBusy || saving || uploading}
                      onValueChange={handleToggleVideo}
                      trackColor={{ false: colors.border, true: colors.mintBorder }}
                      thumbColor={videoCallingEnabled ? colors.primary : colors.input}
                    />
                  </View>
                ) : null}
              </View>

              {/* Card Divider Line */}
              <View style={styles.cardDividerLine} />

              {/* Bottom Row: Contact Info Boxes */}
              <View style={[styles.contactBoxesGridRow, isMobile && styles.contactBoxesGridRowMobile]}>
                {email ? (
                  <View style={[styles.contactInfoBox, isMobile && styles.contactInfoBoxMobile]}>
                    <Mail size={16} color={colors.primary} style={{ marginRight: 10 }} />
                    <Text style={styles.contactInfoText} numberOfLines={1}>{email}</Text>
                  </View>
                ) : null}

                {phone ? (
                  <View style={[styles.contactInfoBox, isMobile && styles.contactInfoBoxMobile]}>
                    <Phone size={16} color={colors.primary} style={{ marginRight: 10 }} />
                    <Text style={styles.contactInfoText} numberOfLines={1}>{phone}</Text>
                  </View>
                ) : null}

                {address ? (
                  <View style={[styles.contactInfoBox, isMobile && styles.contactInfoBoxMobile, isMobile && styles.contactInfoBoxFullWidth]}>
                    <MapPin size={16} color={colors.primary} style={{ marginRight: 10 }} />
                    <Text style={styles.contactInfoText} numberOfLines={1}>{address}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* 🩺 DYNAMIC SECTION 1: PROFESSIONAL INFORMATION (DOCTOR / NURSE)    */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {isProfessionalRole ? (
              <View style={styles.professionalSectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderIconBox}>
                    <Stethoscope size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.sectionHeaderTitle}>Professional Information</Text>
                </View>

                <View style={styles.infoCardsGrid}>
                  {/* Department */}
                  <View style={styles.infoCardItem}>
                    <View style={styles.infoCardLabelRow}>
                      <Briefcase size={14} color={colors.primary} style={{ marginRight: spacing.tiny }} />
                      <Text style={styles.infoCardLabel}>Department</Text>
                    </View>
                    <Text style={styles.infoCardValue}>{department || 'Not provided'}</Text>
                  </View>

                  {/* Specialization */}
                  <View style={styles.infoCardItem}>
                    <View style={styles.infoCardLabelRow}>
                      <Stethoscope size={14} color={colors.primary} style={{ marginRight: spacing.tiny }} />
                      <Text style={styles.infoCardLabel}>Specialization</Text>
                    </View>
                    <Text style={styles.infoCardValue}>{specialization || 'Not provided'}</Text>
                  </View>

                  {/* Qualification */}
                  <View style={styles.infoCardItem}>
                    <View style={styles.infoCardLabelRow}>
                      <Award size={14} color={colors.primary} style={{ marginRight: spacing.tiny }} />
                      <Text style={styles.infoCardLabel}>Qualification</Text>
                    </View>
                    <Text style={styles.infoCardValue}>{qualification || 'Not provided'}</Text>
                  </View>

                  {/* Registration No */}
                  <View style={styles.infoCardItem}>
                    <View style={styles.infoCardLabelRow}>
                      <ShieldCheck size={14} color={colors.primary} style={{ marginRight: spacing.tiny }} />
                      <Text style={styles.infoCardLabel}>Registration No.</Text>
                    </View>
                    <Text style={styles.infoCardValue}>{registrationNumber || 'Not provided'}</Text>
                  </View>

                  {/* Experience */}
                  <View style={styles.infoCardItem}>
                    <View style={styles.infoCardLabelRow}>
                      <Clock size={14} color={colors.primary} style={{ marginRight: spacing.tiny }} />
                      <Text style={styles.infoCardLabel}>Experience</Text>
                    </View>
                    <Text style={styles.infoCardValue}>
                      {experienceYears !== '' ? `${experienceYears} years` : 'Not provided'}
                    </Text>
                  </View>

                  {/* Consultation Fee (Doctor Only) */}
                  {isDoctorRole ? (
                    <View style={styles.infoCardItem}>
                      <View style={styles.infoCardLabelRow}>
                        <IndianRupee size={14} color={colors.primary} style={{ marginRight: spacing.tiny }} />
                        <Text style={styles.infoCardLabel}>Consultation Fee</Text>
                      </View>
                      <Text style={styles.infoCardValue}>
                      {consultationFee !== '' ? `Rs ${parseFloat(consultationFee || '0').toFixed(2)}` : 'Not provided'}
                    </Text>
                  </View>
                ) : null}

                  {videoRatePerMinute !== null && videoRatePerMinute !== undefined ? (
                    <View style={styles.infoCardItem}>
                      <View style={styles.infoCardLabelRow}>
                        <Video size={14} color={colors.primary} style={{ marginRight: spacing.tiny }} />
                        <Text style={styles.infoCardLabel}>Video Rate / Minute</Text>
                      </View>
                      <Text style={styles.infoCardValue}>Rs {Number(videoRatePerMinute).toFixed(2)}</Text>
                    </View>
                  ) : null}

                  {/* Practice Location */}
                  <View style={styles.infoCardItem}>
                    <View style={styles.infoCardLabelRow}>
                      <MapPin size={14} color={colors.primary} style={{ marginRight: spacing.tiny }} />
                      <Text style={styles.infoCardLabel}>Practice Location</Text>
                    </View>
                    <Text style={styles.infoCardValue} numberOfLines={2}>
                      {practiceLocation}
                    </Text>
                  </View>

                  {/* Available Days */}
                  <View style={styles.infoCardItem}>
                    <View style={styles.infoCardLabelRow}>
                      <Calendar size={14} color={colors.primary} style={{ marginRight: spacing.tiny }} />
                      <Text style={styles.infoCardLabel}>Available Days</Text>
                    </View>
                    <Text style={styles.infoCardValue}>{availableDays || 'Not provided'}</Text>
                  </View>

                  {/* Available Time */}
                  <View style={styles.infoCardItem}>
                    <View style={styles.infoCardLabelRow}>
                      <Clock size={14} color={colors.primary} style={{ marginRight: spacing.tiny }} />
                      <Text style={styles.infoCardLabel}>Available Time</Text>
                    </View>
                    <Text style={styles.infoCardValue}>{availableTime}</Text>
                  </View>

                  {marketplaceStatus ? (
                    <View style={styles.infoCardItem}>
                      <View style={styles.infoCardLabelRow}>
                        <ShieldCheck size={14} color={colors.primary} style={{ marginRight: spacing.tiny }} />
                        <Text style={styles.infoCardLabel}>Marketplace Status</Text>
                      </View>
                      <Text style={styles.infoCardValue}>{marketplaceStatus}</Text>
                    </View>
                  ) : null}

                  {/* Doctor Type (Doctor Only) */}
                  {isDoctorRole ? (
                    <View style={styles.infoCardItem}>
                      <View style={styles.infoCardLabelRow}>
                        <User size={14} color={colors.primary} style={{ marginRight: spacing.tiny }} />
                        <Text style={styles.infoCardLabel}>Doctor Type</Text>
                      </View>
                      <Text style={styles.infoCardValue}>{doctorType}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* 💓 DYNAMIC SECTION 2: PATIENT & MEDICAL INFORMATION (PATIENT)      */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {isPatientRole ? (
              <View style={styles.professionalSectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <View style={[styles.sectionHeaderIconBox, { backgroundColor: colors.mintBorder }]}>
                    <HeartPulse size={16} color={colors.primaryDark} />
                  </View>
                  <Text style={styles.sectionHeaderTitle}>Patient & Medical Information</Text>
                </View>

                <View style={styles.infoCardsGrid}>
                  <PatientInfoCard icon={<UserRound size={16} color={colors.primary} />} label="Gender" value={gender || 'Not provided'} />
                  <PatientInfoCard icon={<Calendar size={16} color={colors.primary} />} label="Date of Birth" value={formatPatientDateOfBirth(dateOfBirth)} />
                  <PatientInfoCard icon={<Hash size={16} color={colors.primary} />} label="Age" value={age || 'Not provided'} />
                  <PatientInfoCard icon={<Droplets size={16} color={colors.primary} />} label="Blood Group" value={bloodGroup || 'Not provided'} />
                  <PatientInfoCard icon={<AlertTriangle size={16} color={colors.primary} />} label="Allergies" value={allergies || 'None reported'} />
                  <PatientInfoCard icon={<Activity size={16} color={colors.primary} />} label="Chronic Conditions" value={chronicConditions || 'None reported'} />
                  <PatientInfoCard icon={<HeartPulse size={16} color={colors.primary} />} label="Medical History" value={medicalHistory || 'None reported'} />
                  <PatientInfoCard icon={<Stethoscope size={16} color={colors.primary} />} label="Current Medications" value={currentMedications || 'None reported'} />
                  <PatientInfoCard icon={<UserRound size={16} color={colors.primary} />} label="Emergency Contact" value={emergencyContactName || 'Not provided'} />
                  <PatientInfoCard icon={<Phone size={16} color={colors.primary} />} label="Emergency Phone" value={emergencyContactPhone || 'Not provided'} />
                  <PatientInfoCard icon={<ShieldCheck size={16} color={colors.primary} />} label="Relation" value={emergencyRelation || 'Not provided'} />
                </View>
              </View>
            ) : null}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* 🛡️ SECTION 3: ACCOUNT INFORMATION (FOR ALL ROLES)                  */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <View style={styles.accountInfoSectionCard}>
              <View style={styles.accountInfoHeaderRow}>
                <View style={styles.accountHeaderIconBox}>
                  <ShieldCheck size={16} color={colors.primary} />
                </View>
                <Text style={styles.accountInfoTitleText}>Account Information</Text>
              </View>

              <View style={styles.accountDetailsGrid}>
                <View style={styles.accountDetailCard}>
                  <View style={styles.accountDetailLabelRow}>
                    <View style={styles.accountDetailIcon}><Building2 size={14} color={colors.primary} strokeWidth={1.8} /></View>
                    <Text style={styles.accountDetailLabel}>Clinic</Text>
                  </View>
                  <Text style={styles.accountDetailValue}>{clinicName && clinicName !== '—' && clinicName !== 'â€”' ? clinicName : 'Not assigned'}</Text>
                </View>
                {!isPatientRole ? (
                  <>
                    <View style={styles.accountDetailCard}>
                      <View style={styles.accountDetailLabelRow}>
                        <View style={styles.accountDetailIcon}><BadgeCheck size={14} color={colors.primary} strokeWidth={1.8} /></View>
                        <Text style={styles.accountDetailLabel}>Verification</Text>
                      </View>
                      <Text style={styles.accountDetailValue}>{verificationStatus}</Text>
                    </View>
                    <View style={styles.accountDetailCard}>
                      <View style={styles.accountDetailLabelRow}>
                        <View style={styles.accountDetailIcon}><Calendar size={14} color={colors.primary} /></View>
                        <Text style={styles.accountDetailLabel}>Joined On</Text>
                      </View>
                      <Text style={styles.accountDetailValue}>{joinedDateFormatted}</Text>
                    </View>
                    <View style={styles.accountDetailCard}>
                      <View style={styles.accountDetailLabelRow}>
                        <View style={styles.accountDetailIcon}><Clock size={14} color={colors.primary} /></View>
                        <Text style={styles.accountDetailLabel}>Last Login</Text>
                      </View>
                      <Text style={styles.accountDetailValue}>{lastLoginTime}</Text>
                    </View>
                  </>
                ) : null}
              </View>
            </View>
          </LiquidBorderSurface>
        ) : (
          /* ══════════════════════════════════════════════════════════════════════ */
          /* 2️⃣ EDIT PROFILE DESIGN (DYNAMIC FOR ALL ROLES)                        */
          /* ══════════════════════════════════════════════════════════════════════ */
          <LiquidBorderSurface style={styles.editProfileCard} radius={radii.xl}>
            <Text style={styles.editCardTitleText}>Personal Information</Text>
            <Text style={styles.editCardSubtitleText}>Your personal and contact details</Text>

            {/* Profile Photo Upload Box */}
            <View style={[styles.photoUploadRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: spacing.md }]}>
              <View>
                <Text style={styles.photoUploadTitle}>Profile Photo</Text>
                <Text style={styles.photoUploadSub}>Upload JPG/PNG/WEBP (max 2MB)</Text>
              </View>

              <TouchableOpacity style={styles.choosePhotoBtn} activeOpacity={0.7} disabled={uploading || saving} onPress={handleChoosePhoto}>
                <Upload size={14} color={colors.foreground} style={{ marginRight: spacing.tiny }} />
                <Text style={styles.choosePhotoBtnText}>Choose Photo</Text>
              </TouchableOpacity>
            </View>

            {/* 3-Column Inputs Row */}
            <View style={[styles.form3ColGrid, isMobile && { flexDirection: 'column', gap: 0 }]}>
              {/* Full Name * */}
              <View style={{ flex: 1 }}>
                <Text style={styles.formInputLabel}>
                  Full Name <Text style={{ color: colors.destructive }}>*</Text>
                </Text>
                <TextInput
                  style={styles.formTextInput}
                  value={fullName}
                  onChangeText={(v) => setFullName(v)}
                  placeholder="Enter full name"
                  placeholderTextColor={colors.subtle}
                />
              </View>

              {/* Email Address (Disabled) */}
              <View style={{ flex: 1 }}>
                <Text style={styles.formInputLabel}>Email Address</Text>
                <TextInput
                  style={[styles.formTextInput, styles.formTextInputDisabled]}
                  value={email}
                  editable={false}
                  placeholder="email@example.com"
                  placeholderTextColor={colors.subtle}
                />
                <Text style={styles.disabledHelperText}>Email address cannot be changed.</Text>
              </View>

              {/* Phone Number * */}
              <View style={{ flex: 1 }}>
                <Text style={styles.formInputLabel}>
                  Phone Number <Text style={{ color: colors.destructive }}>*</Text>
                </Text>
                <TextInput
                  style={styles.formTextInput}
                  value={phone}
                  onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
                  keyboardType="phone-pad"
                  placeholder="Enter phone number"
                  placeholderTextColor={colors.subtle}
                />
              </View>
            </View>

            {/* Address Multiline Textarea */}
            <View style={{ marginTop: 14 }}>
              <Text style={styles.formInputLabel}>Address</Text>
              <TextInput
                style={[styles.formTextInput, styles.formAddressTextarea]}
                value={address}
                onChangeText={(v) => setAddress(v)}
                multiline
                numberOfLines={3}
                placeholder="Enter your address"
                placeholderTextColor={colors.subtle}
                textAlignVertical="top"
              />
            </View>

            {/* ── EDIT PROFESSIONAL INFORMATION (DOCTOR / NURSE) ── */}
            {isProfessionalRole ? (
              <View style={{ marginTop: 22, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 18 }}>
                <Text style={styles.editCardTitleText}>Professional Information</Text>
                <Text style={styles.editCardSubtitleText}>Your clinical practice and specialization details</Text>

                <View style={[styles.form3ColGrid, { marginTop: spacing.md }, isMobile && { flexDirection: 'column', gap: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Specialization</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={specialization}
                      onChangeText={setSpecialization}
                      placeholder="e.g. Cardiology"
                      placeholderTextColor={colors.subtle}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Qualification</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={qualification}
                      onChangeText={setQualification}
                      placeholder="e.g. MBBS, MD"
                      placeholderTextColor={colors.subtle}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Registration Number</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={registrationNumber}
                      onChangeText={setRegistrationNumber}
                      placeholder="Medical registration no."
                      placeholderTextColor={colors.subtle}
                    />
                  </View>
                </View>

                <View style={[styles.form3ColGrid, { marginTop: 10 }, isMobile && { flexDirection: 'column', gap: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Experience (Years)</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={experienceYears}
                      onChangeText={(v) => setExperienceYears(v.replace(/\D/g, ''))}
                      keyboardType="numeric"
                      placeholder="e.g. 5"
                      placeholderTextColor={colors.subtle}
                    />
                  </View>

                  {isDoctorRole ? (
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formInputLabel}>Consultation Fee (Rs)</Text>
                      <TextInput
                        style={styles.formTextInput}
                        value={consultationFee}
                        onChangeText={setConsultationFee}
                        keyboardType="numeric"
                        placeholder="e.g. 300"
                        placeholderTextColor={colors.subtle}
                      />
                    </View>
                  ) : null}

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Available Days</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={availableDays}
                      onChangeText={setAvailableDays}
                      placeholder="Mon,Tue,Wed,Thu,Fri"
                      placeholderTextColor={colors.subtle}
                    />
                  </View>
                </View>
              </View>
            ) : null}

            {/* ── EDIT MEDICAL & EMERGENCY INFORMATION (PATIENT) ── */}
            {isPatientRole ? (
              <View style={{ marginTop: 22, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 18 }}>
                <Text style={styles.editCardTitleText}>Medical & Emergency Information</Text>
                <Text style={styles.editCardSubtitleText}>Essential details for your care team</Text>

                <View style={[styles.form3ColGrid, { marginTop: spacing.md }, isMobile && { flexDirection: 'column', gap: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Gender</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.tiny, marginTop: spacing.xs }}>
                      {(['male', 'female', 'other'] as const).map((g) => (
                        <TouchableOpacity
                          key={g}
                          style={[styles.genderChip, gender === g && styles.genderChipActive]}
                          onPress={() => setGender(g)}
                        >
                          <Text style={[styles.genderChipText, gender === g && styles.genderChipTextActive]}>
                            {g.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Date of Birth (YYYY-MM-DD)</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={dateOfBirth}
                      onChangeText={setDateOfBirth}
                      placeholder="1990-05-15"
                      placeholderTextColor={colors.subtle}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Blood Group</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={bloodGroup}
                      onChangeText={setBloodGroup}
                      placeholder="e.g. O+, B+"
                      placeholderTextColor={colors.subtle}
                    />
                  </View>
                </View>

                <View style={[styles.form3ColGrid, { marginTop: 10 }, isMobile && { flexDirection: 'column', gap: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Emergency Contact Name</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={emergencyContactName}
                      onChangeText={setEmergencyContactName}
                      placeholder="Contact name"
                      placeholderTextColor={colors.subtle}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Emergency Phone</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={emergencyContactPhone}
                      onChangeText={(v) => setEmergencyContactPhone(v.replace(/\D/g, '').slice(0, 10))}
                      keyboardType="phone-pad"
                      placeholder="10-digit number"
                      placeholderTextColor={colors.subtle}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Relationship</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={emergencyRelation}
                      onChangeText={setEmergencyRelation}
                      placeholder="e.g. Parent, Spouse"
                      placeholderTextColor={colors.subtle}
                    />
                  </View>
                </View>

                <View style={{ marginTop: 10 }}>
                  <Text style={styles.formInputLabel}>Allergies</Text>
                  <TextInput
                    style={[styles.formTextInput, { minHeight: 60 }]}
                    value={allergies}
                    onChangeText={setAllergies}
                    multiline
                    placeholder="Medicine, food or other allergies"
                    placeholderTextColor={colors.subtle}
                  />
                </View>

                <View style={{ marginTop: 10 }}>
                  <Text style={styles.formInputLabel}>Medical History</Text>
                  <TextInput
                    style={[styles.formTextInput, { minHeight: 60 }]}
                    value={medicalHistory}
                    onChangeText={setMedicalHistory}
                    multiline
                    placeholder="Previous diagnoses or surgeries"
                    placeholderTextColor={colors.subtle}
                  />
                </View>
              </View>
            ) : null}
          </LiquidBorderSurface>
        )}
      </LiquidBorderScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { padding: 18, paddingBottom: 60 },
  headerBannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  headerBannerRowMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: spacing.md },
  headerTitleText: { fontFamily: typography.family, fontSize: typography.size.heading, fontWeight: typography.weight.bold, color: colors.text },
  headerSubtitleText: { fontFamily: typography.family, fontSize: typography.size.caption, color: colors.muted, marginTop: 2 },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radii.md, elevation: 2 },
  editProfileBtnMobile: { width: '100%', minHeight: 38, alignSelf: 'stretch', justifyContent: 'center', borderRadius: 9, elevation: 0 },
  editProfileBtnText: { fontFamily: typography.family, color: colors.surface, fontWeight: typography.weight.bold, fontSize: typography.size.caption },
  editActionsGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveChangesBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radii.md, elevation: 2 },
  saveChangesBtnText: { fontFamily: typography.family, color: colors.surface, fontWeight: typography.weight.bold, fontSize: typography.size.caption },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.input, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radii.md },
  cancelBtnText: { fontFamily: typography.family, color: colors.foreground, fontWeight: typography.weight.semibold, fontSize: typography.size.caption },
  viewProfileSection: { gap: 0, backgroundColor: colors.mint, borderWidth: 1, borderColor: colors.mintBorder, borderRadius: radii.lg, padding: 14, elevation: 2, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18 },
  profileMintCard: { backgroundColor: 'transparent', borderWidth: 0, borderRadius: 0, padding: 0, elevation: 0 },
  profileTopRow: { flexDirection: 'row', alignItems: 'center' },
  profileTopRowMobile: { flexDirection: 'column', alignItems: 'center' },
  profileNameRoleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  profileNameRoleRowMobile: { flexDirection: 'column' },
  avatarCircleOuterRing: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: colors.mintBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  avatarCircleInner: { width: 86, height: 86, borderRadius: 43, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarInitialsText: { fontFamily: typography.family, fontSize: 30, fontWeight: typography.weight.extrabold, color: colors.surface },
  userMainInfoCol: { flex: 1, marginLeft: spacing.lg },
  userFullNameText: { fontFamily: typography.family, fontSize: typography.size.lg, fontWeight: typography.weight.extrabold, color: colors.text },
  roleBadgePill: { backgroundColor: '#20A99B', paddingHorizontal: 10, paddingVertical: spacing.xs, borderRadius: radii.lg },
  roleBadgePillText: { fontFamily: typography.family, fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.surface },
  metaBadgesRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.tiny },
  metaBadgesRowMobile: { width: '100%', flexWrap: 'nowrap', justifyContent: 'space-between', gap: spacing.xs, marginTop: spacing.sm },
  metaBadgeItem: { flexDirection: 'row', alignItems: 'center' },
  metaBadgeItemMobile: { flex: 1, minWidth: 0, justifyContent: 'center' },
  metaBadgeText: { fontFamily: typography.family, fontSize: typography.size.sm, color: colors.muted, fontWeight: typography.weight.medium },
  metaBadgeTextMobile: { fontFamily: typography.family, flexShrink: 1, fontSize: 9 },
  videoCallingCardBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: spacing.sm, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, elevation: 1 },
  videoIconCircle: { width: 32, height: 32, borderRadius: radii.xl, backgroundColor: colors.mintBorder, alignItems: 'center', justifyContent: 'center' },
  videoCallingTitle: { fontFamily: typography.family, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.text },
  videoCallingSub: { fontFamily: typography.family, fontSize: typography.size.xs, color: colors.muted },
  cardDividerLine: { height: 1, backgroundColor: colors.mintBorder, marginVertical: spacing.lg },
  contactBoxesGridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  contactBoxesGridRowMobile: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  contactInfoBox: { flex: 1, minWidth: 0, flexBasis: '45%', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: spacing.md, paddingVertical: 11, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
  contactInfoBoxMobile: { flexGrow: 0, flexBasis: '48%' },
  contactInfoBoxFullWidth: { width: '100%', flexBasis: '100%' },
  contactInfoText: { fontFamily: typography.family, flex: 1, minWidth: 0, fontSize: typography.size.sm, color: colors.foreground, fontWeight: typography.weight.medium },
  professionalSectionCard: { backgroundColor: 'transparent', borderRadius: 0, padding: 0, paddingTop: 17, marginTop: 17, borderTopWidth: 1, borderTopColor: colors.border, elevation: 0 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionHeaderIconBox: { width: 32, height: 32, borderRadius: radii.md, backgroundColor: colors.mintBorder, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  sectionHeaderTitle: { fontFamily: typography.family, fontSize: typography.size.subtitle, fontWeight: typography.weight.extrabold, color: colors.text },
  infoCardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoCardItem: { width: '48%', backgroundColor: colors.background, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  patientInfoCard: { backgroundColor: colors.surface, minHeight: 72, justifyContent: 'center' },
  patientInfoIcon: { width: 28, height: 28, borderRadius: radii.md, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginRight: 7 },
  infoCardLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  infoCardLabel: { fontFamily: typography.family, fontSize: typography.size.xs, color: colors.muted, fontWeight: typography.weight.semibold },
  infoCardValue: { fontFamily: typography.family, fontSize: typography.size.caption, color: colors.text, fontWeight: typography.weight.bold },
  accountInfoSectionCard: { backgroundColor: 'transparent', borderRadius: 0, padding: 0, paddingTop: 17, marginTop: 17, borderTopWidth: 1, borderTopColor: colors.border, elevation: 0 },
  accountInfoHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 14 },
  accountHeaderIconBox: { width: 32, height: 32, borderRadius: 9, backgroundColor: colors.mintBorder, alignItems: 'center', justifyContent: 'center' },
  accountInfoTitleText: { fontFamily: typography.family, fontSize: typography.size.body, fontWeight: typography.weight.bold, color: colors.text },
  kpiGrid4Cols: { flexDirection: 'row', gap: 10 },
  kpiGrid4ColsMobile: { flexDirection: 'column', gap: 10 },
  kpiInfoCard: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
  kpiIconBoxTeal: { width: 32, height: 32, borderRadius: radii.md, backgroundColor: colors.mintBorder, alignItems: 'center', justifyContent: 'center' },
  kpiLabelText: { fontFamily: typography.family, fontSize: typography.size.xs, color: colors.muted, fontWeight: typography.weight.semibold },
  kpiValueText: { fontFamily: typography.family, fontSize: typography.size.sm, color: colors.text, fontWeight: typography.weight.bold, marginTop: 1 },
  accountDetailsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  accountDetailCard: { width: '48%', minHeight: 58, flexDirection: 'column', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, paddingVertical: 9, paddingLeft: 48, paddingRight: 10, borderWidth: 1, borderColor: '#E5EEF1', elevation: 1 },
  accountDetailLabelRow: { position: 'relative', justifyContent: 'center', minHeight: 16, marginBottom: 3 },
  accountDetailIcon: { position: 'absolute', left: -34, top: -4, width: 24, height: 24, borderRadius: radii.md, backgroundColor: '#E8FBF7', alignItems: 'center', justifyContent: 'center' },
  accountDetailLabel: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.micro, fontWeight: typography.weight.medium },
  accountDetailValue: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  editProfileCard: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, elevation: 1 },
  editCardTitleText: { fontFamily: typography.family, fontSize: 17, fontWeight: typography.weight.extrabold, color: colors.text },
  editCardSubtitleText: { fontFamily: typography.family, fontSize: typography.size.sm, color: colors.muted, marginTop: 2, marginBottom: 14 },
  photoUploadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, padding: 14, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  photoUploadTitle: { fontFamily: typography.family, fontSize: typography.size.caption, fontWeight: typography.weight.bold, color: colors.text },
  photoUploadSub: { fontFamily: typography.family, fontSize: typography.size.xs, color: colors.muted, marginTop: 1 },
  choosePhotoBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.input, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md },
  choosePhotoBtnText: { fontFamily: typography.family, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.foreground },
  form3ColGrid: { flexDirection: 'row', gap: 10 },
  formInputLabel: { fontFamily: typography.family, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.foreground, marginBottom: spacing.xs, marginTop: spacing.sm },
  formTextInput: { fontFamily: typography.family, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.input, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.size.caption, color: colors.text },
  formTextInputDisabled: { backgroundColor: colors.secondary, color: colors.subtle },
  disabledHelperText: { fontFamily: typography.family, fontSize: typography.size.micro, color: colors.subtle, marginTop: 2 },
  formAddressTextarea: { minHeight: 60 },
  genderChip: { flex: 1, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: colors.input, alignItems: 'center', backgroundColor: colors.surface },
  genderChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  genderChipText: { fontFamily: typography.family, fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.muted },
  genderChipTextActive: { color: colors.surface },
});

export default MyProfileScreen;
