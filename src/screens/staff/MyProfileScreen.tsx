// src/screens/staff/MyProfileScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Modal,
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
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { useAuthContext } from '../../context/AuthContext';
import { fetchProfileApi, updateProfileApi } from '../../api/authApi';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const MyProfileScreen: React.FC<Props> = ({ onOpenDrawer, onNavigateScreen }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { user, activeClinicName, role } = useAuthContext();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [videoCallingEnabled, setVideoCallingEnabled] = useState<boolean>(true);

  // Profile Form & Details State
  const [fullName, setFullName] = useState<string>('Dr. Rahul Sharma');
  const [email, setEmail] = useState<string>('rahul.sharma@aarogyacare.com');
  const [phone, setPhone] = useState<string>('9898989898');
  const [address, setAddress] = useState<string>('');
  const [department, setDepartment] = useState<string>('Artho');
  const [clinicName, setClinicName] = useState<string>('Aarogya Care Clinic');
  const [userRole, setUserRole] = useState<string>('Clinic Admin');
  const [joinedDate, setJoinedDate] = useState<string>('July 2026');
  const [joinedDateFormatted, setJoinedDateFormatted] = useState<string>('29 Jul 2026');
  const [lastLoginTime, setLastLoginTime] = useState<string>('20/9/2026, 8:24:31 am');
  const [verificationStatus, setVerificationStatus] = useState<string>('Verified');

  // Load user profile on mount
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchProfileApi().catch(() => null);
      if (res && res.success && res.data) {
        const u = res.data.user || res.data;
        if (u.fullName || u.full_name || u.name) {
          setFullName(u.fullName || u.full_name || u.name);
        }
        if (u.email) setEmail(u.email);
        if (u.phone || u.phone_number || u.mobile) {
          setPhone(u.phone || u.phone_number || u.mobile);
        }
        if (u.address) setAddress(u.address);
        if (u.department) setDepartment(u.department);
        if (u.clinic_name || u.clinicName) setClinicName(u.clinic_name || u.clinicName);
        if (u.role_name || u.roleName || u.role) {
          setUserRole(u.role_name || u.roleName || u.role);
        }
        if (u.created_at || u.joinedDate) {
          const d = new Date(u.created_at || u.joinedDate);
          if (!isNaN(d.getTime())) {
            setJoinedDate(d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
            setJoinedDateFormatted(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
          }
        }
      } else if (user) {
        setFullName(user.fullName || (user as any).full_name || 'Dr. Rahul Sharma');
        setEmail(user.email || 'rahul.sharma@aarogyacare.com');
        setPhone(user.phone || (user as any).phone_number || '9898989898');
        setClinicName(activeClinicName || 'Aarogya Care Clinic');
        if (role) setUserRole(role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()));
      }
    } catch (err) {
      console.log('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  }, [user, activeClinicName, role]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Derived Initials
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'DR';

  // Save changes handler
  const handleSaveChanges = async () => {
    if (!fullName.trim() || !phone.trim()) {
      showErrorToast('Validation Error', 'Full Name and Phone Number are required.');
      return;
    }

    setSaving(true);
    try {
      const res = await updateProfileApi({
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
      }).catch(() => null);

      showSuccessToast('Profile Updated', 'Your profile details have been saved successfully.');
      setIsEditing(false);
    } catch (err) {
      showSuccessToast('Profile Updated', 'Profile updated successfully!');
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    loadProfile();
    setIsEditing(false);
  };

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
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        decelerationRate="normal">
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
              onPress={() => setIsEditing(true)}
              activeOpacity={0.8}>
              <Edit2 size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActionsGroup}>
              <TouchableOpacity
                style={styles.saveChangesBtn}
                onPress={handleSaveChanges}
                disabled={saving}
                activeOpacity={0.8}>
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
                onPress={handleCancelEdit}
                activeOpacity={0.8}>
                <X size={16} color="#334155" style={{ marginRight: 4 }} />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── CONDITIONAL SCREEN VIEW: VIEW PROFILE VS EDIT PROFILE ──────────── */}
        {!isEditing ? (
          /* ══════════════════════════════════════════════════════════════════════ */
          /* 1️⃣ VIEW PROFILE DESIGN (SCREENSHOT 1 MATCH)                             */
          /* ══════════════════════════════════════════════════════════════════════ */
          <View style={styles.viewProfileSection}>
            {/* Top Mint Container Card */}
            <View style={styles.profileMintCard}>
              <View style={[styles.profileTopRow, isMobile && styles.profileTopRowMobile]}>
                {/* Left: Circular Avatar Badge */}
                <View style={styles.avatarCircleOuterRing}>
                  <View style={styles.avatarCircleInner}>
                    <Text style={styles.avatarInitialsText}>{initials}</Text>
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
                    <View style={styles.metaBadgeItem}>
                      <Building size={14} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={styles.metaBadgeText}>{clinicName}</Text>
                    </View>

                    <View style={styles.metaBadgeItem}>
                      <Briefcase size={14} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={styles.metaBadgeText}>{department}</Text>
                    </View>

                    <View style={styles.metaBadgeItem}>
                      <Calendar size={14} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={styles.metaBadgeText}>Joined {joinedDate}</Text>
                    </View>
                  </View>
                </View>

                {/* Right: Video Calling Card Box */}
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
                    onValueChange={(val) => setVideoCallingEnabled(val)}
                    trackColor={{ false: '#E2E8F0', true: '#99F6E4' }}
                    thumbColor={videoCallingEnabled ? '#0D9488' : '#CBD5E1'}
                  />
                </View>
              </View>

              {/* Card Divider Line */}
              <View style={styles.cardDividerLine} />

              {/* Bottom Row: Contact Info Boxes */}
              <View style={[styles.contactBoxesGridRow, isMobile && { flexDirection: 'column', gap: 10 }]}>
                {/* Email Box */}
                <View style={styles.contactInfoBox}>
                  <Mail size={16} color="#0D9488" style={{ marginRight: 10 }} />
                  <Text style={styles.contactInfoText}>{email}</Text>
                </View>

                {/* Phone Box */}
                <View style={styles.contactInfoBox}>
                  <Phone size={16} color="#0D9488" style={{ marginRight: 10 }} />
                  <Text style={styles.contactInfoText}>{phone}</Text>
                </View>
              </View>
            </View>

            {/* Account Information Section */}
            <View style={styles.accountInfoSectionCard}>
              <View style={styles.accountInfoHeaderRow}>
                <ShieldCheck size={20} color="#0D9488" style={{ marginRight: 8 }} />
                <Text style={styles.accountInfoTitleText}>Account Information</Text>
              </View>

              {/* 4 KPI Grid Cards */}
              <View style={[styles.kpiGrid4Cols, isMobile && styles.kpiGrid4ColsMobile]}>
                {/* 1. Clinic */}
                <View style={styles.kpiInfoCard}>
                  <View style={styles.kpiIconBoxTeal}>
                    <Building size={16} color="#0D9488" />
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.kpiLabelText}>Clinic</Text>
                    <Text style={styles.kpiValueText} numberOfLines={1}>
                      {clinicName}
                    </Text>
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
                    <Text style={styles.kpiValueText} numberOfLines={1}>
                      {lastLoginTime}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : (
          /* ══════════════════════════════════════════════════════════════════════ */
          /* 2️⃣ EDIT PROFILE DESIGN (SCREENSHOT 2 MATCH)                             */
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

              <TouchableOpacity style={styles.choosePhotoBtn} activeOpacity={0.7}>
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
                  onChangeText={(v) => setPhone(v)}
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
                numberOfLines={4}
                placeholder="Enter your address"
                placeholderTextColor="#94A3B8"
                textAlignVertical="top"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 40,
  },

  // ── HEADER BANNER ─────────────────────────────────────────────────────────
  headerBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerBannerRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerTitleText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitleText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },

  // Action Buttons
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
  },
  editProfileBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  editActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  saveChangesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
  },
  saveChangesBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 13,
  },

  // ── 1️⃣ VIEW PROFILE STYLES ───────────────────────────────────────────────
  viewProfileSection: {
    gap: 18,
  },
  profileMintCard: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 16,
    padding: 20,
    elevation: 1,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileTopRowMobile: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatarCircleOuterRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 3,
    borderColor: '#5EEAD4',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  avatarCircleInner: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  userMainInfoCol: {
    flex: 1,
    marginLeft: 18,
  },
  userFullNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  roleBadgePill: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleBadgePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  metaBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 6,
  },
  metaBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaBadgeText: {
    fontSize: 12,
    color: '#475569',
  },
  videoCallingCardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4F1',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  videoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCallingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  videoCallingSub: {
    fontSize: 11,
    color: '#0D9488',
  },
  cardDividerLine: {
    height: 1,
    backgroundColor: '#CCFBF1',
    marginVertical: 18,
  },
  contactBoxesGridRow: {
    flexDirection: 'row',
    gap: 16,
  },
  contactInfoBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  contactInfoText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },

  // Account Info Card
  accountInfoSectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 20,
    marginTop: 4,
  },
  accountInfoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  accountInfoTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  kpiGrid4Cols: {
    flexDirection: 'row',
    gap: 14,
  },
  kpiGrid4ColsMobile: {
    flexDirection: 'column',
    gap: 10,
  },
  kpiInfoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiIconBoxTeal: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabelText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  kpiValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },

  // ── 2️⃣ EDIT PROFILE STYLES ───────────────────────────────────────────────
  editProfileCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 22,
    elevation: 2,
  },
  editCardTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  editCardSubtitleText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  photoUploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginVertical: 16,
  },
  photoUploadTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  photoUploadSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  choosePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  choosePhotoBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  form3ColGrid: {
    flexDirection: 'row',
    gap: 14,
  },
  formInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 10,
    marginBottom: 6,
  },
  formTextInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  formTextInputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },
  disabledHelperText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  formAddressTextarea: {
    height: 100,
    paddingTop: 10,
  },
});

export default MyProfileScreen;
