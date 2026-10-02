// src/screens/staff/MyProfileScreen.tsx
import React from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  User,
  Edit2,
  Save,
  X,
  Building,
  Briefcase,
  Calendar,
  Mail,
  Phone,
  Video,
  ShieldCheck,
  CheckCircle,
  Clock,
  Upload,
  Camera,
  Stethoscope,
  Award,
  IndianRupee,
  MapPin,
  HeartPulse,
  AlertTriangle,
  Droplet,
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { useStaffProfile } from '../../hooks/useStaffProfile';

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const MyProfileScreen: React.FC<Props> = ({ onOpenDrawer, onNavigateScreen }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const {
    isEditing, setIsEditing, loading, saving, uploading, videoBusy, error, ready, loadProfile,
    fullName, setFullName, email, phone, setPhone, address, setAddress, department,
    clinicName, userRole, joinedDate, joinedDateFormatted, lastLoginTime, verificationStatus,
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
    chronicConditions, setChronicConditions,
    medicalHistory, setMedicalHistory,
    currentMedications, setCurrentMedications,
    emergencyContactName, setEmergencyContactName,
    emergencyContactPhone, setEmergencyContactPhone,
    emergencyRelation, setEmergencyRelation,
  } = useStaffProfile();

  const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        title="My Profile"
        onNavigate={(path) => {
          if (onNavigateScreen) {
            const screen = path.replace('/', '');
            onNavigateScreen(screen);
          }
        }}
      />

      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadProfile} colors={['#0D9488']} tintColor="#0D9488" />}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HEADER TITLE BAR & ACTION BUTTONS ──────────────────────────────── */}
        <View style={[styles.headerBannerRow, isMobile && styles.headerBannerRowMobile]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <User size={22} color="#0F172A" style={{ marginRight: 8 }} />
              <Text style={styles.headerTitleText}>My Profile</Text>
            </View>
            <Text style={styles.headerSubtitleText}>View and manage your personal information</Text>
          </View>

          {/* Action Buttons */}
          {!isEditing ? (
            <TouchableOpacity
              style={styles.editProfileBtn}
              disabled={loading || !ready || Boolean(error)}
              onPress={() => setIsEditing(true)}
              activeOpacity={0.8}
            >
              <Edit2 size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
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
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Save size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
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
                <X size={16} color="#334155" style={{ marginRight: 4 }} />
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
          <View style={styles.viewProfileSection}>
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
                <View style={[styles.userMainInfoCol, isMobile && { marginTop: 12, alignItems: 'center' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <Text style={styles.userFullNameText}>{fullName}</Text>
                    <View style={styles.roleBadgePill}>
                      <Text style={styles.roleBadgePillText}>{userRole}</Text>
                    </View>
                  </View>

                  <View style={[styles.metaBadgesRow, isMobile && { justifyContent: 'center', marginTop: 8 }]}>
                    {clinicName ? (
                      <View style={styles.metaBadgeItem}>
                        <Building size={14} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.metaBadgeText}>{clinicName}</Text>
                      </View>
                    ) : null}

                    {department && department !== '—' ? (
                      <View style={styles.metaBadgeItem}>
                        <Briefcase size={14} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.metaBadgeText}>{department}</Text>
                      </View>
                    ) : null}

                    {!isPatientRole ? (
                      <View style={styles.metaBadgeItem}>
                        <Calendar size={14} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.metaBadgeText}>Joined {joinedDate}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Right: Video Calling Card Box (Only for Doctor) */}
                {canManageVideoCalling ? (
                  <View style={[styles.videoCallingCardBox, isMobile && { width: '100%', marginTop: 14, justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={styles.videoIconCircle}>
                        <Video size={16} color="#0D9488" />
                      </View>
                      <View style={{ marginLeft: 8 }}>
                        <Text style={styles.videoCallingTitle}>Video Calling</Text>
                        <Text style={styles.videoCallingSub}>{videoCallingEnabled ? 'Enabled' : 'Disabled'}</Text>
                      </View>
                    </View>
                    <Switch
                      value={videoCallingEnabled}
                      disabled={videoBusy || saving || uploading}
                      onValueChange={handleToggleVideo}
                      trackColor={{ false: '#E2E8F0', true: '#99F6E4' }}
                      thumbColor={videoCallingEnabled ? '#0D9488' : '#CBD5E1'}
                    />
                  </View>
                ) : null}
              </View>

              {/* Card Divider Line */}
              <View style={styles.cardDividerLine} />

              {/* Bottom Row: Contact Info Boxes */}
              <View style={[styles.contactBoxesGridRow, isMobile && { flexDirection: 'column', gap: 10 }]}>
                {email ? (
                  <View style={styles.contactInfoBox}>
                    <Mail size={16} color="#0D9488" style={{ marginRight: 10 }} />
                    <Text style={styles.contactInfoText}>{email}</Text>
                  </View>
                ) : null}

                {phone ? (
                  <View style={styles.contactInfoBox}>
                    <Phone size={16} color="#0D9488" style={{ marginRight: 10 }} />
                    <Text style={styles.contactInfoText}>{phone}</Text>
                  </View>
                ) : null}

                {address ? (
                  <View style={styles.contactInfoBox}>
                    <MapPin size={16} color="#0D9488" style={{ marginRight: 10 }} />
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
                    <Stethoscope size={18} color="#0D9488" />
                  </View>
                  <Text style={styles.sectionHeaderTitle}>Professional Information</Text>
                </View>

                <View style={styles.infoCardsGrid}>
                  {/* Department */}
                  <View style={styles.infoCardItem}>
                    <View style={styles.infoCardLabelRow}>
                      <Briefcase size={14} color="#0D9488" style={{ marginRight: 6 }} />
                      <Text style={styles.infoCardLabel}>Department</Text>
                    </View>
                    <Text style={styles.infoCardValue}>{department || 'Not provided'}</Text>
                  </View>

                  {/* Specialization */}
                  <View style={styles.infoCardItem}>
                    <View style={styles.infoCardLabelRow}>
                      <Stethoscope size={14} color="#0D9488" style={{ marginRight: 6 }} />
                      <Text style={styles.infoCardLabel}>Specialization</Text>
                    </View>
                    <Text style={styles.infoCardValue}>{specialization || 'Not provided'}</Text>
                  </View>

                  {/* Qualification */}
                  <View style={styles.infoCardItem}>
                    <View style={styles.infoCardLabelRow}>
                      <Award size={14} color="#0D9488" style={{ marginRight: 6 }} />
                      <Text style={styles.infoCardLabel}>Qualification</Text>
                    </View>
                    <Text style={styles.infoCardValue}>{qualification || 'Not provided'}</Text>
                  </View>

                  {/* Registration No */}
                  <View style={styles.infoCardItem}>
                    <View style={styles.infoCardLabelRow}>
                      <ShieldCheck size={14} color="#0D9488" style={{ marginRight: 6 }} />
                      <Text style={styles.infoCardLabel}>Registration No.</Text>
                    </View>
                    <Text style={styles.infoCardValue}>{registrationNumber || 'Not provided'}</Text>
                  </View>

                  {/* Experience */}
                  <View style={styles.infoCardItem}>
                    <View style={styles.infoCardLabelRow}>
                      <Clock size={14} color="#0D9488" style={{ marginRight: 6 }} />
                      <Text style={styles.infoCardLabel}>Experience</Text>
                    </View>
                    <Text style={styles.infoCardValue}>
                      {experienceYears ? `${experienceYears} years` : 'Not provided'}
                    </Text>
                  </View>

                  {/* Consultation Fee (Doctor Only) */}
                  {isDoctorRole ? (
                    <View style={styles.infoCardItem}>
                      <View style={styles.infoCardLabelRow}>
                        <IndianRupee size={14} color="#0D9488" style={{ marginRight: 6 }} />
                        <Text style={styles.infoCardLabel}>Consultation Fee</Text>
                      </View>
                      <Text style={styles.infoCardValue}>
                        {consultationFee ? `Rs ${parseFloat(consultationFee).toFixed(2)}` : 'Not provided'}
                      </Text>
                    </View>
                  ) : null}

                  {/* Practice Location */}
                  <View style={styles.infoCardItem}>
                    <View style={styles.infoCardLabelRow}>
                      <MapPin size={14} color="#0D9488" style={{ marginRight: 6 }} />
                      <Text style={styles.infoCardLabel}>Practice Location</Text>
                    </View>
                    <Text style={styles.infoCardValue} numberOfLines={2}>
                      {practiceLocation}
                    </Text>
                  </View>

                  {/* Available Days */}
                  <View style={styles.infoCardItem}>
                    <View style={styles.infoCardLabelRow}>
                      <Calendar size={14} color="#0D9488" style={{ marginRight: 6 }} />
                      <Text style={styles.infoCardLabel}>Available Days</Text>
                    </View>
                    <Text style={styles.infoCardValue}>{availableDays || 'Not provided'}</Text>
                  </View>

                  {/* Available Time */}
                  <View style={styles.infoCardItem}>
                    <View style={styles.infoCardLabelRow}>
                      <Clock size={14} color="#0D9488" style={{ marginRight: 6 }} />
                      <Text style={styles.infoCardLabel}>Available Time</Text>
                    </View>
                    <Text style={styles.infoCardValue}>{availableTime}</Text>
                  </View>

                  {/* Doctor Type (Doctor Only) */}
                  {isDoctorRole ? (
                    <View style={styles.infoCardItem}>
                      <View style={styles.infoCardLabelRow}>
                        <User size={14} color="#0D9488" style={{ marginRight: 6 }} />
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
                  <View style={[styles.sectionHeaderIconBox, { backgroundColor: '#FEE2E2' }]}>
                    <HeartPulse size={18} color="#E11D48" />
                  </View>
                  <Text style={styles.sectionHeaderTitle}>Patient & Medical Information</Text>
                </View>

                <View style={styles.infoCardsGrid}>
                  <View style={styles.infoCardItem}>
                    <Text style={styles.infoCardLabel}>Gender</Text>
                    <Text style={styles.infoCardValue}>{gender ? gender.toUpperCase() : 'Not provided'}</Text>
                  </View>

                  <View style={styles.infoCardItem}>
                    <Text style={styles.infoCardLabel}>Date of Birth</Text>
                    <Text style={styles.infoCardValue}>{dateOfBirth || 'Not provided'}</Text>
                  </View>

                  <View style={styles.infoCardItem}>
                    <Text style={styles.infoCardLabel}>Age</Text>
                    <Text style={styles.infoCardValue}>{age}</Text>
                  </View>

                  <View style={styles.infoCardItem}>
                    <Text style={styles.infoCardLabel}>Blood Group</Text>
                    <Text style={[styles.infoCardValue, { color: '#E11D48', fontWeight: '800' }]}>
                      {bloodGroup || 'Not provided'}
                    </Text>
                  </View>

                  <View style={styles.infoCardItem}>
                    <Text style={styles.infoCardLabel}>Emergency Contact</Text>
                    <Text style={styles.infoCardValue}>{emergencyContactName || 'Not provided'}</Text>
                  </View>

                  <View style={styles.infoCardItem}>
                    <Text style={styles.infoCardLabel}>Emergency Phone</Text>
                    <Text style={styles.infoCardValue}>{emergencyContactPhone || 'Not provided'}</Text>
                  </View>

                  <View style={styles.infoCardItem}>
                    <Text style={styles.infoCardLabel}>Relation</Text>
                    <Text style={styles.infoCardValue}>{emergencyRelation || 'Not provided'}</Text>
                  </View>

                  {allergies ? (
                    <View style={[styles.infoCardItem, { width: '100%' }]}>
                      <Text style={styles.infoCardLabel}>Allergies</Text>
                      <Text style={[styles.infoCardValue, { color: '#DC2626' }]}>{allergies}</Text>
                    </View>
                  ) : null}

                  {chronicConditions ? (
                    <View style={[styles.infoCardItem, { width: '100%' }]}>
                      <Text style={styles.infoCardLabel}>Chronic Conditions</Text>
                      <Text style={styles.infoCardValue}>{chronicConditions}</Text>
                    </View>
                  ) : null}

                  {medicalHistory ? (
                    <View style={[styles.infoCardItem, { width: '100%' }]}>
                      <Text style={styles.infoCardLabel}>Medical History</Text>
                      <Text style={styles.infoCardValue}>{medicalHistory}</Text>
                    </View>
                  ) : null}

                  {currentMedications ? (
                    <View style={[styles.infoCardItem, { width: '100%' }]}>
                      <Text style={styles.infoCardLabel}>Current Medications</Text>
                      <Text style={styles.infoCardValue}>{currentMedications}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* 🛡️ SECTION 3: ACCOUNT INFORMATION (FOR ALL ROLES)                  */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <View style={styles.accountInfoSectionCard}>
              <View style={styles.accountInfoHeaderRow}>
                <ShieldCheck size={20} color="#0D9488" style={{ marginRight: 8 }} />
                <Text style={styles.accountInfoTitleText}>Account Information</Text>
              </View>

              <View style={[styles.kpiGrid4Cols, isMobile && styles.kpiGrid4ColsMobile]}>
                {/* 1. Clinic */}
                <View style={styles.kpiInfoCard}>
                  <View style={styles.kpiIconBoxTeal}>
                    <Building size={16} color="#0D9488" />
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.kpiLabelText}>Clinic</Text>
                    <Text style={styles.kpiValueText} numberOfLines={1}>{clinicName || 'Not assigned'}</Text>
                  </View>
                </View>

                {/* 2. Verification */}
                <View style={styles.kpiInfoCard}>
                  <View style={styles.kpiIconBoxTeal}>
                    <CheckCircle size={16} color="#0D9488" />
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.kpiLabelText}>Verification</Text>
                    <Text style={styles.kpiValueText}>{verificationStatus}</Text>
                  </View>
                </View>

                {/* 3. Joined On */}
                <View style={styles.kpiInfoCard}>
                  <View style={styles.kpiIconBoxTeal}>
                    <Calendar size={16} color="#0D9488" />
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.kpiLabelText}>Joined On</Text>
                    <Text style={styles.kpiValueText}>{joinedDateFormatted}</Text>
                  </View>
                </View>

                {/* 4. Last Login */}
                <View style={styles.kpiInfoCard}>
                  <View style={styles.kpiIconBoxTeal}>
                    <Clock size={16} color="#0D9488" />
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.kpiLabelText}>Last Login</Text>
                    <Text style={styles.kpiValueText} numberOfLines={1}>{lastLoginTime}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : (
          /* ══════════════════════════════════════════════════════════════════════ */
          /* 2️⃣ EDIT PROFILE DESIGN (DYNAMIC FOR ALL ROLES)                        */
          /* ══════════════════════════════════════════════════════════════════════ */
          <View style={styles.editProfileCard}>
            <Text style={styles.editCardTitleText}>Personal Information</Text>
            <Text style={styles.editCardSubtitleText}>Your personal and contact details</Text>

            {/* Profile Photo Upload Box */}
            <View style={[styles.photoUploadRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
              <View>
                <Text style={styles.photoUploadTitle}>Profile Photo</Text>
                <Text style={styles.photoUploadSub}>Upload JPG/PNG/WEBP (max 2MB)</Text>
              </View>

              <TouchableOpacity style={styles.choosePhotoBtn} activeOpacity={0.7} disabled={uploading || saving} onPress={handleChoosePhoto}>
                <Upload size={14} color="#334155" style={{ marginRight: 6 }} />
                <Text style={styles.choosePhotoBtnText}>Choose Photo</Text>
              </TouchableOpacity>
            </View>

            {/* 3-Column Inputs Row */}
            <View style={[styles.form3ColGrid, isMobile && { flexDirection: 'column', gap: 0 }]}>
              {/* Full Name * */}
              <View style={{ flex: 1 }}>
                <Text style={styles.formInputLabel}>
                  Full Name <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.formTextInput}
                  value={fullName}
                  onChangeText={(v) => setFullName(v)}
                  placeholder="Enter full name"
                  placeholderTextColor="#94A3B8"
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
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.disabledHelperText}>Email address cannot be changed.</Text>
              </View>

              {/* Phone Number * */}
              <View style={{ flex: 1 }}>
                <Text style={styles.formInputLabel}>
                  Phone Number <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.formTextInput}
                  value={phone}
                  onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
                  keyboardType="phone-pad"
                  placeholder="Enter phone number"
                  placeholderTextColor="#94A3B8"
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
                placeholderTextColor="#94A3B8"
                textAlignVertical="top"
              />
            </View>

            {/* ── EDIT PROFESSIONAL INFORMATION (DOCTOR / NURSE) ── */}
            {isProfessionalRole ? (
              <View style={{ marginTop: 22, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 18 }}>
                <Text style={styles.editCardTitleText}>Professional Information</Text>
                <Text style={styles.editCardSubtitleText}>Your clinical practice and specialization details</Text>

                <View style={[styles.form3ColGrid, { marginTop: 12 }, isMobile && { flexDirection: 'column', gap: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Specialization</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={specialization}
                      onChangeText={setSpecialization}
                      placeholder="e.g. Cardiology"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Qualification</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={qualification}
                      onChangeText={setQualification}
                      placeholder="e.g. MBBS, MD"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Registration Number</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={registrationNumber}
                      onChangeText={setRegistrationNumber}
                      placeholder="Medical registration no."
                      placeholderTextColor="#94A3B8"
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
                      placeholderTextColor="#94A3B8"
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
                        placeholderTextColor="#94A3B8"
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
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </View>
            ) : null}

            {/* ── EDIT MEDICAL & EMERGENCY INFORMATION (PATIENT) ── */}
            {isPatientRole ? (
              <View style={{ marginTop: 22, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 18 }}>
                <Text style={styles.editCardTitleText}>Medical & Emergency Information</Text>
                <Text style={styles.editCardSubtitleText}>Essential details for your care team</Text>

                <View style={[styles.form3ColGrid, { marginTop: 12 }, isMobile && { flexDirection: 'column', gap: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Gender</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
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
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Blood Group</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={bloodGroup}
                      onChangeText={setBloodGroup}
                      placeholder="e.g. O+, B+"
                      placeholderTextColor="#94A3B8"
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
                      placeholderTextColor="#94A3B8"
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
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Relationship</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={emergencyRelation}
                      onChangeText={setEmergencyRelation}
                      placeholder="e.g. Parent, Spouse"
                      placeholderTextColor="#94A3B8"
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
                    placeholderTextColor="#94A3B8"
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
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  contentContainer: { padding: 18, paddingBottom: 60 },
  headerBannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerBannerRowMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 12 },
  headerTitleText: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  headerSubtitleText: { fontSize: 13, color: '#64748B', marginTop: 2 },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D9488', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, elevation: 2 },
  editProfileBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  editActionsGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveChangesBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D9488', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, elevation: 2 },
  saveChangesBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  cancelBtnText: { color: '#334155', fontWeight: '600', fontSize: 13 },
  viewProfileSection: { gap: 18 },
  profileMintCard: { backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#CCFBF1', borderRadius: 16, padding: 20, elevation: 1 },
  profileTopRow: { flexDirection: 'row', alignItems: 'center' },
  profileTopRowMobile: { flexDirection: 'column', alignItems: 'flex-start' },
  avatarCircleOuterRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#0D9488', alignItems: 'center', justifyContent: 'center' },
  avatarCircleInner: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#0D9488', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarInitialsText: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  userMainInfoCol: { flex: 1, marginLeft: 16 },
  userFullNameText: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  roleBadgePill: { backgroundColor: '#CCFBF1', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  roleBadgePillText: { fontSize: 11, fontWeight: '700', color: '#0D9488' },
  metaBadgesRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  metaBadgeItem: { flexDirection: 'row', alignItems: 'center' },
  metaBadgeText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  videoCallingCardBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  videoIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#CCFBF1', alignItems: 'center', justifyContent: 'center' },
  videoCallingTitle: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  videoCallingSub: { fontSize: 11, color: '#64748B' },
  cardDividerLine: { height: 1, backgroundColor: '#CCFBF1', marginVertical: 16 },
  contactBoxesGridRow: { flexDirection: 'row', gap: 12 },
  contactInfoBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#CCFBF1' },
  contactInfoText: { fontSize: 13, color: '#334155', fontWeight: '600' },
  professionalSectionCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionHeaderIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#CCFBF1', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  sectionHeaderTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  infoCardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoCardItem: { width: '48%', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  infoCardLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  infoCardLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  infoCardValue: { fontSize: 13, color: '#0F172A', fontWeight: '700' },
  accountInfoSectionCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  accountInfoHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  accountInfoTitleText: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  kpiGrid4Cols: { flexDirection: 'row', gap: 10 },
  kpiGrid4ColsMobile: { flexDirection: 'column', gap: 10 },
  kpiInfoCard: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  kpiIconBoxTeal: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#CCFBF1', alignItems: 'center', justifyContent: 'center' },
  kpiLabelText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  kpiValueText: { fontSize: 12, color: '#0F172A', fontWeight: '700', marginTop: 1 },
  editProfileCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  editCardTitleText: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  editCardSubtitleText: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 14 },
  photoUploadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  photoUploadTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  photoUploadSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  choosePhotoBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  choosePhotoBtnText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  form3ColGrid: { flexDirection: 'row', gap: 10 },
  formInputLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4, marginTop: 8 },
  formTextInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#0F172A' },
  formTextInputDisabled: { backgroundColor: '#F1F5F9', color: '#94A3B8' },
  disabledHelperText: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  formAddressTextarea: { minHeight: 60 },
  genderChip: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', backgroundColor: '#FFFFFF' },
  genderChipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  genderChipText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  genderChipTextActive: { color: '#FFFFFF' },
});

export default MyProfileScreen;
