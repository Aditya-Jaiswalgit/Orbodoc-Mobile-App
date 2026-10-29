.import { colors, spacing } from '../../theme/tokens';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LiquidBorderScrollView } from '../../components/common/LiquidBorderScrollView';
import {
  Building2,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  Clock3,
  Edit3,
  Eye,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Plus,
  Power,
  Save,
  Search,
  ShieldCheck,
  UserCog,
  UsersRound,
  X,
} from 'lucide-react-native';
import { AppModal } from '../../components/common/AppModal';
import { StaffHeader } from '../../components/common/StaffHeader';
import { LiquidBorderSurface, LiquidBorderTouchable } from '../../components/common/LiquidBorderSurface';
import { profilePhotoUrl } from '../../api/profilePhotoApi';
import { useAuthContext } from '../../context/AuthContext';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { normalizeRoleName } from '../../utils/rolePermissions';
import { IndiaLocation, LabAdmin } from '../../api/labProfileApi';
import { useLabProfileManagement } from '../../hooks/useLabProfileManagement';
import { styles } from './styles/LabProfileManagement.styles';

const emptyAdminForm = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  address: '',
};

export default function LabProfileManagementScreen({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const { token, role, permissionsMap = {}, assignedClinics = [], activeClinicId, user } = useAuthContext();
  const currentClinic = assignedClinics.find(c => Number(c.id) === Number(activeClinicId))
    ?? (assignedClinics.length === 1 ? assignedClinics[0] : null);
  const activeEntityType = String(
    (currentClinic as any)?.entity_type ||
    (currentClinic as any)?.clinic_entity_type ||
    (user as any)?.entity_type ||
    (user as any)?.clinic_entity_type ||
    ''
  ).trim().toLowerCase();
  const isLabEntity = activeEntityType === 'lab';
  const normalizedRole = normalizeRoleName(role);
  const isAllowed = normalizedRole === 'super_admin' || isLabEntity;

  const canView = isAllowed && canUseStaffScreen(role, permissionsMap, 'lab_management', 'view');
  const canEdit = isAllowed && canUseStaffScreen(role, permissionsMap, 'lab_management', 'edit');
  const canAdd = isAllowed && canUseStaffScreen(role, permissionsMap, 'lab_management', 'add');

  const {
    lab,
    savedLab,
    admins,
    activeAdmins,
    loading,
    refreshing,
    saving,
    uploadingLogo,
    adminSaving,
    adminUpdating,
    locationStates,
    locationCities,
    statesLoading,
    citiesLoading,
    loadData,
    loadStates,
    loadCities,
    updateLabField,
    handleUploadLogo,
    removeLogo,
    saveLab,
    addAdmin,
    updateAdmin: hookSaveAdmin,
    toggleAdminStatus,
    resetAdminPassword,
  } = useLabProfileManagement(token, canView);

  // Modals state
  const [profileViewOpen, setProfileViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [adminsListOpen, setAdminsListOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<LabAdmin | null>(null);
  const [adminDetailsOpen, setAdminDetailsOpen] = useState(false);
  const [adminDetailsMode, setAdminDetailsMode] = useState<'view' | 'edit'>('view');
  const [editAdminForm, setEditAdminForm] = useState(emptyAdminForm);
  const [adminForm, setAdminForm] = useState(emptyAdminForm);

  // Password reset modal
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPasswordForm, setResetPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [resetPasswordError, setResetPasswordError] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [adminErrors, setAdminErrors] = useState<Record<string, string>>({});

  // Location Picker Modal
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'state' | 'city'>('state');
  const [pickerSearch, setPickerSearch] = useState('');
  const [selectedStateId, setSelectedStateId] = useState('');

  const validateLab = () => {
    const next: Record<string, string> = {};
    if (!lab.name.trim()) next.name = 'Lab name is required.';
    if (!lab.license_number.trim()) next.license_number = 'License number is required.';
    if (!lab.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lab.email.trim())) next.email = 'Valid email is required.';
    if (!/^\d{10}$/.test(lab.phone.trim())) next.phone = 'Valid 10-digit mobile number is required.';
    if (!lab.address.trim()) next.address = 'Address is required.';
    if (!lab.city.trim()) next.city = 'City is required.';
    if (!lab.state.trim()) next.state = 'State is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSaveLab = async () => {
    if (!validateLab()) return;
    const ok = await saveLab(lab);
    if (ok) setEditOpen(false);
  };

  const openEditProfile = async () => {
    setErrors({});
    setEditOpen(true);
    const states = await loadStates();
    const currentState = states.find(
      item =>
        item.name.trim().toLowerCase() === savedLab.state.trim().toLowerCase() ||
        String(item.id) === savedLab.state.trim(),
    );
    if (currentState) {
      setSelectedStateId(String(currentState.id));
      await loadCities(currentState.id);
    }
  };

  const validateAdmin = () => {
    const next: Record<string, string> = {};
    if (!adminForm.full_name.trim()) next.full_name = 'Admin name is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminForm.email.trim())) next.email = 'Valid email is required.';
    if (!/^\d{10}$/.test(adminForm.phone.trim())) next.phone = 'Valid 10-digit mobile number is required.';
    if (adminForm.password.length < 8) next.password = 'Password must be at least 8 characters.';
    setAdminErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleAddAdmin = async () => {
    if (!validateAdmin()) return;
    const ok = await addAdmin(adminForm);
    if (ok) {
      setAdminForm(emptyAdminForm);
      setAdminErrors({});
      setAdminOpen(false);
    }
  };

  const openAdminDetails = (admin: LabAdmin, mode: 'view' | 'edit') => {
    setSelectedAdmin(admin);
    setAdminDetailsMode(mode);
    setEditAdminForm({
      full_name: String(admin.full_name || ''),
      email: String(admin.email || ''),
      phone: String(admin.phone || ''),
      password: '',
      address: String(admin.address || ''),
    });
    setAdminErrors({});
    setAdminDetailsOpen(true);
  };

  const handleSaveAdminChanges = async () => {
    if (!selectedAdmin) return;
    const next: Record<string, string> = {};
    if (!editAdminForm.full_name.trim()) next.full_name = 'Admin name is required.';
    if (!/^\d{10}$/.test(editAdminForm.phone.trim())) next.phone = 'Valid 10-digit mobile number is required.';
    setAdminErrors(next);
    if (Object.keys(next).length) return;

    const ok = await hookSaveAdmin(selectedAdmin.id, {
      full_name: editAdminForm.full_name.trim(),
      phone: editAdminForm.phone.trim(),
      address: editAdminForm.address.trim(),
    });
    if (ok) setAdminDetailsOpen(false);
  };

  const openResetPassword = (admin: LabAdmin) => {
    setSelectedAdmin(admin);
    setResetPasswordForm({ password: '', confirmPassword: '' });
    setResetPasswordError('');
    setResetPasswordOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedAdmin) return;
    if (resetPasswordForm.password.length < 8) {
      setResetPasswordError('Password must be at least 8 characters.');
      return;
    }
    if (resetPasswordForm.password !== resetPasswordForm.confirmPassword) {
      setResetPasswordError('Passwords do not match.');
      return;
    }
    const ok = await resetAdminPassword(selectedAdmin.id, resetPasswordForm.password);
    if (ok) {
      setResetPasswordOpen(false);
      setResetPasswordForm({ password: '', confirmPassword: '' });
    }
  };

  const openLocationPicker = async (type: 'state' | 'city') => {
    setPickerType(type);
    setPickerSearch('');
    if (type === 'state') {
      await loadStates();
    } else {
      if (!selectedStateId) return;
      await loadCities(selectedStateId);
    }
    setPickerVisible(true);
  };

  const selectLocation = (item: IndiaLocation) => {
    if (pickerType === 'state') {
      setSelectedStateId(String(item.id));
      updateLabField('state', item.name);
      updateLabField('city', '');
      loadCities(item.id);
    } else {
      updateLabField('city', item.name);
    }
    setPickerVisible(false);
  };

  const filteredLocations = useMemo(() => {
    const list = pickerType === 'state' ? locationStates : locationCities;
    if (!pickerSearch.trim()) return list;
    return list.filter(item => item.name.toLowerCase().includes(pickerSearch.toLowerCase().trim()));
  }, [pickerType, locationStates, locationCities, pickerSearch]);

  if (!canView) {
    return (
      <View style={styles.root}>
        <StaffHeader title="Lab Management" onOpenDrawer={onOpenDrawer} />
        <View style={styles.centerContainer}>
          <ShieldCheck size={44} color={colors.subtle} />
          <Text style={styles.emptyTitle}>Access Denied</Text>
          <Text style={styles.emptySubtitle}>You do not have permission to view Lab Management.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StaffHeader title="Lab Management" onOpenDrawer={onOpenDrawer} />

      <LiquidBorderScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading Lab Management...</Text>
          </View>
        ) : (
          <>
            {/* 1. Header Banner matching Web */}
            <View style={styles.heroBanner}>
              <View style={styles.heroLogoWrapper}>
                {savedLab.logo_url ? (
                  <Image source={{ uri: profilePhotoUrl(savedLab.logo_url) }} style={styles.heroLogo} />
                ) : (
                  <Building2 size={24} color={colors.surface} />
                )}
              </View>
              <View style={styles.heroInfo}>
                <View style={styles.heroTitleRow}>
                  <Text style={styles.heroTitle} numberOfLines={1}>
                    {savedLab.name || 'Lab Management'}
                  </Text>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>Diagnostic Lab</Text>
                  </View>
                </View>
                <Text style={styles.heroSubtitle}>Manage your lab profile, public availability and administrators.</Text>
              </View>
            </View>

            {/* 2. Top 3 Stat Cards matching Web */}
            <View style={styles.statsRow}>
              <LiquidBorderSurface style={styles.statCard} radius={16}>
                <View style={[styles.statIconBox, { backgroundColor: colors.mintBorder }]}>
                  <Building2 size={20} color={colors.primaryDark} />
                </View>
                <Text style={styles.statLabel}>Registered Lab</Text>
                <Text style={styles.statValue} numberOfLines={1}>
                  {savedLab.name || '—'}
                </Text>
              </LiquidBorderSurface>

              <LiquidBorderTouchable radius={16} style={styles.statCard} onPress={() => setAdminsListOpen(true)}>
                <View style={[styles.statIconBox, { backgroundColor: '#DBEAFE' }]}>
                  <UsersRound size={20} color="#1D4ED8" />
                </View>
                <Text style={styles.statLabel}>Active Admins</Text>
                <Text style={styles.statValue}>{activeAdmins}</Text>
              </LiquidBorderTouchable>

              <LiquidBorderSurface style={styles.statCard} radius={16}>
                <View style={[styles.statIconBox, { backgroundColor: colors.warningSoft }]}>
                  <ShieldCheck size={20} color="#B45309" />
                </View>
                <Text style={styles.statLabel}>Subscription Plan</Text>
                <Text style={styles.statValue} numberOfLines={1}>
                  {savedLab.subscription_plan || 'Free'}
                </Text>
              </LiquidBorderSurface>
            </View>

            {/* 3. Profile Status Card matching Web */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <View style={[styles.titleIconBox, { backgroundColor: '#DBEAFE' }]}>
                    <Clock3 size={18} color="#1D4ED8" />
                  </View>
                  <Text style={styles.cardTitle}>Profile Status</Text>
                </View>
              </View>
              <View style={styles.statusRowItem}>
                <Text style={styles.statusRowLabel}>Entity</Text>
                <View style={styles.tagOutline}>
                  <Text style={styles.tagOutlineText}>Diagnostic Lab</Text>
                </View>
              </View>
              <View style={styles.statusRowItem}>
                <Text style={styles.statusRowLabel}>Subscription</Text>
                <Text style={styles.statusRowValue}>{savedLab.subscription_status || 'Active'}</Text>
              </View>
              <View style={styles.statusRowItem}>
                <Text style={styles.statusRowLabel}>Plan</Text>
                <Text style={styles.statusRowValue}>{savedLab.subscription_plan || 'Free'}</Text>
              </View>
            </View>

            {/* 4. Main Lab Profile Card matching Web */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <View style={[styles.titleIconBox, { backgroundColor: '#DBEAFE' }]}>
                    <Building2 size={18} color="#1D4ED8" />
                  </View>
                  <View>
                    <Text style={styles.cardTitle}>Lab Profile Management</Text>
                    <Text style={styles.cardSubtitle}>View lab profile and manage all administrators.</Text>
                  </View>
                </View>
              </View>

              <View style={styles.profileOverviewBox}>
                <View style={styles.overviewHeaderRow}>
                  <View style={styles.overviewLogoBox}>
                    {savedLab.logo_url ? (
                      <Image source={{ uri: profilePhotoUrl(savedLab.logo_url) }} style={styles.overviewLogo} />
                    ) : (
                      <Building2 size={22} color={colors.primary} />
                    )}
                  </View>
                  <View style={styles.overviewTextWrap}>
                    <TouchableOpacity onPress={() => setProfileViewOpen(true)}>
                      <Text style={styles.overviewName}>{savedLab.name || 'Unnamed Lab'}</Text>
                    </TouchableOpacity>
                    <Text style={styles.overviewLicense}>{savedLab.license_number || 'Diagnostic Lab'}</Text>
                  </View>
                  <View style={[styles.activeBadge, Number(savedLab.is_active) ? styles.badgeActive : styles.badgeInactive]}>
                    <Text style={[styles.activeBadgeText, Number(savedLab.is_active) ? styles.textActive : styles.textInactive]}>
                      {Number(savedLab.is_active) ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>

                <View style={styles.overviewDetailRow}>
                  <Mail size={14} color={colors.muted} />
                  <Text style={styles.overviewDetailText}>{savedLab.email || '—'}</Text>
                </View>
                <View style={styles.overviewDetailRow}>
                  <Phone size={14} color={colors.muted} />
                  <Text style={styles.overviewDetailText}>{savedLab.phone || '—'}</Text>
                </View>
                <View style={styles.overviewDetailRow}>
                  <MapPin size={14} color={colors.muted} />
                  <Text style={styles.overviewDetailText}>
                    {savedLab.city ? `${savedLab.city}, ${savedLab.state}` : savedLab.address || '—'}
                  </Text>
                </View>

                <TouchableOpacity style={styles.adminsPillButton} onPress={() => setAdminsListOpen(true)}>
                  <UsersRound size={15} color="#1D4ED8" />
                  <Text style={styles.adminsPillText}>
                    {admins.length} Admin{admins.length === 1 ? '' : 's'}{' '}
                    <Text style={styles.adminsPillSub}>({activeAdmins} active)</Text>
                  </Text>
                </TouchableOpacity>

                <View style={styles.actionButtonsGrid}>
                  <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => setProfileViewOpen(true)}>
                    <Eye size={15} color={colors.primaryDark} />
                    <Text style={styles.actionBtnSecondaryText}>View Profile</Text>
                  </TouchableOpacity>

                  {canEdit ? (
                    <TouchableOpacity style={styles.actionBtnSecondary} onPress={openEditProfile}>
                      <Edit3 size={15} color={colors.primaryDark} />
                      <Text style={styles.actionBtnSecondaryText}>Edit Profile</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => setAdminsListOpen(true)}>
                    <UsersRound size={15} color={colors.primaryDark} />
                    <Text style={styles.actionBtnSecondaryText}>View Admins</Text>
                  </TouchableOpacity>

                  {canAdd ? (
                    <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => setAdminOpen(true)}>
                      <Plus size={15} color={colors.surface} />
                      <Text style={styles.actionBtnPrimaryText}>Add Admin</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.hoursBox}>
              <Clock3 size={16} color={colors.primary} />
              <Text style={styles.hoursText}>
                {savedLab.available_days || 'Availability not configured'} · {savedLab.available_from || '—'} –{' '}
                {savedLab.available_to || '—'}
              </Text>
            </View>
          </>
        )}
      </LiquidBorderScrollView>

      {/* ── MODAL 1: VIEW LAB PROFILE MODAL ── */}
      <AppModal visible={profileViewOpen} animationType="slide" transparent onRequestClose={() => setProfileViewOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <View style={styles.modalHeaderIconBox}>
                  {savedLab.logo_url ? (
                    <Image source={{ uri: profilePhotoUrl(savedLab.logo_url) }} style={styles.overviewLogo} />
                  ) : (
                    <Building2 size={20} color={colors.surface} />
                  )}
                </View>
                <View style={styles.flex}>
                  <Text style={styles.modalSheetTitle} numberOfLines={1}>
                    {savedLab.name}
                  </Text>
                  <Text style={styles.modalSheetSubtitle}>Diagnostic Lab Profile</Text>
                </View>
                <TouchableOpacity onPress={() => setProfileViewOpen(false)} style={styles.modalCloseBtn}>
                  <X size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
            </View>

            <LiquidBorderScrollView style={styles.modalBody}>
              <Text style={styles.sectionHeading}>Basic Information</Text>
              <View style={styles.infoRow2}>
                <View style={styles.infoCell}>
                  <Text style={styles.infoCellLabel}>LAB NAME</Text>
                  <Text style={styles.infoCellValue}>{savedLab.name || '—'}</Text>
                </View>
                <View style={styles.infoCell}>
                  <Text style={styles.infoCellLabel}>LICENSE NUMBER</Text>
                  <Text style={styles.infoCellValue}>{savedLab.license_number || '—'}</Text>
                </View>
              </View>

              <Text style={styles.sectionHeading}>Contact Details</Text>
              <View style={styles.infoRow2}>
                <View style={styles.infoCell}>
                  <Text style={styles.infoCellLabel}>EMAIL</Text>
                  <Text style={styles.infoCellValue}>{savedLab.email || '—'}</Text>
                </View>
                <View style={styles.infoCell}>
                  <Text style={styles.infoCellLabel}>MOBILE NUMBER</Text>
                  <Text style={styles.infoCellValue}>{savedLab.phone || '—'}</Text>
                </View>
              </View>

              <Text style={styles.sectionHeading}>Location</Text>
              <View style={styles.infoCellFull}>
                <Text style={styles.infoCellLabel}>ADDRESS</Text>
                <Text style={styles.infoCellValue}>{savedLab.address || '—'}</Text>
              </View>
              <View style={[styles.infoRow2, { marginTop: spacing.sm }]}>
                <View style={styles.infoCell}>
                  <Text style={styles.infoCellLabel}>CITY</Text>
                  <Text style={styles.infoCellValue}>{savedLab.city || '—'}</Text>
                </View>
                <View style={styles.infoCell}>
                  <Text style={styles.infoCellLabel}>STATE</Text>
                  <Text style={styles.infoCellValue}>{savedLab.state || '—'}</Text>
                </View>
              </View>

              <Text style={styles.sectionHeading}>Availability</Text>
              <View style={styles.availabilityCard}>
                <View style={styles.availHeader}>
                  <CalendarDays size={16} color={colors.primary} />
                  <Text style={styles.availTitle}>Operating Schedule</Text>
                </View>
                <View style={styles.availGrid}>
                  <View style={styles.availItem}>
                    <Text style={styles.infoCellLabel}>AVAILABLE DAYS</Text>
                    <Text style={styles.availValue}>{savedLab.available_days || 'Not configured'}</Text>
                  </View>
                  <View style={styles.availItem}>
                    <Text style={styles.infoCellLabel}>OPENS AT</Text>
                    <Text style={styles.availValue}>{savedLab.available_from ? String(savedLab.available_from).slice(0, 5) : '—'}</Text>
                  </View>
                  <View style={styles.availItem}>
                    <Text style={styles.infoCellLabel}>CLOSES AT</Text>
                    <Text style={styles.availValue}>{savedLab.available_to ? String(savedLab.available_to).slice(0, 5) : '—'}</Text>
                  </View>
                  <View style={styles.availItem}>
                    <Text style={styles.infoCellLabel}>MARKETPLACE</Text>
                    <View style={styles.mt1}>
                      <View style={[styles.activeBadge, Number(savedLab.is_marketplace_visible) ? styles.badgeActive : styles.badgeInactive]}>
                        <Text style={[styles.activeBadgeText, Number(savedLab.is_marketplace_visible) ? styles.textActive : styles.textInactive]}>
                          {Number(savedLab.is_marketplace_visible) ? 'Visible' : 'Hidden'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              <Text style={styles.sectionHeading}>Subscription & Website</Text>
              <View style={styles.infoRow2}>
                <View style={styles.infoCell}>
                  <Text style={styles.infoCellLabel}>SUBSCRIPTION</Text>
                  <Text style={styles.infoCellValue}>{savedLab.subscription_status || '—'}</Text>
                </View>
                <View style={styles.infoCell}>
                  <Text style={styles.infoCellLabel}>PLAN</Text>
                  <Text style={styles.infoCellValue}>{savedLab.subscription_plan || '—'}</Text>
                </View>
              </View>
              {savedLab.website ? (
                <View style={[styles.infoCellFull, { marginTop: spacing.sm }]}>
                  <Text style={styles.infoCellLabel}>WEBSITE</Text>
                  <Text style={styles.infoCellValue}>{savedLab.website}</Text>
                </View>
              ) : null}
            </LiquidBorderScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setProfileViewOpen(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
              {canEdit ? (
                <TouchableOpacity
                  style={styles.primaryModalBtn}
                  onPress={() => {
                    setProfileViewOpen(false);
                    openEditProfile();
                  }}
                >
                  <Edit3 size={15} color={colors.surface} />
                  <Text style={styles.primaryModalBtnText}>Edit Profile</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </AppModal>

      {/* ── MODAL 2: EDIT LAB PROFILE MODAL ── */}
      <AppModal visible={editOpen} animationType="slide" transparent onRequestClose={() => setEditOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <View style={[styles.modalHeaderIconBox, { backgroundColor: colors.primary }]}>
                  <Edit3 size={18} color={colors.surface} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.modalSheetTitle}>Edit Lab Profile</Text>
                  <Text style={styles.modalSheetSubtitle}>Update registered profile and availability</Text>
                </View>
                <TouchableOpacity onPress={() => setEditOpen(false)} style={styles.modalCloseBtn}>
                  <X size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
            </View>

            <LiquidBorderScrollView style={styles.modalBody}>
              <View style={styles.logoSectionCard}>
                <View style={styles.logoUploadRow}>
                  <TouchableOpacity
                    style={styles.logoPickerSquare}
                    onPress={handleUploadLogo}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : lab.logo_url ? (
                      <Image source={{ uri: profilePhotoUrl(lab.logo_url) }} style={styles.logoSquareImg} />
                    ) : (
                      <Camera size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                  <View style={styles.logoTextWrap}>
                    <Text style={styles.logoTitle}>Lab Logo</Text>
                    <Text style={styles.logoSubtitle}>PNG or JPG, maximum 2MB.</Text>
                    <View style={styles.logoBtnRow}>
                      <TouchableOpacity
                        style={styles.uploadSmallBtn}
                        onPress={handleUploadLogo}
                        disabled={uploadingLogo}
                      >
                        <Camera size={13} color={colors.primaryDark} />
                        <Text style={styles.uploadSmallBtnText}>{lab.logo_url ? 'Change' : 'Upload'}</Text>
                      </TouchableOpacity>
                      {lab.logo_url ? (
                        <TouchableOpacity style={styles.removeLogoBtn} onPress={removeLogo}>
                          <Text style={styles.removeLogoText}>Remove</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>

              <Text style={styles.formSectionTitle}>BASIC INFORMATION</Text>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Lab Name <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  value={lab.name}
                  onChangeText={v => updateLabField('name', v)}
                  style={[styles.input, Boolean(errors.name) && styles.inputError]}
                  placeholder="Enter registered lab name"
                  placeholderTextColor={colors.subtle}
                />
                {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  License Number <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  value={lab.license_number}
                  onChangeText={v => updateLabField('license_number', v)}
                  style={[styles.input, Boolean(errors.license_number) && styles.inputError]}
                  placeholder="Enter medical / lab license"
                  placeholderTextColor={colors.subtle}
                />
                {errors.license_number ? <Text style={styles.errorText}>{errors.license_number}</Text> : null}
              </View>

              <Text style={styles.formSectionTitle}>CONTACT DETAILS</Text>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Email <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  value={lab.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={v => updateLabField('email', v)}
                  style={[styles.input, Boolean(errors.email) && styles.inputError]}
                  placeholder="lab@example.com"
                  placeholderTextColor={colors.subtle}
                />
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Mobile Number (10 digits) <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  value={lab.phone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  onChangeText={v => updateLabField('phone', v.replace(/\D/g, '').slice(0, 10))}
                  style={[styles.input, Boolean(errors.phone) && styles.inputError]}
                  placeholder="9876543210"
                  placeholderTextColor={colors.subtle}
                />
                {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
              </View>

              <Text style={styles.formSectionTitle}>LOCATION</Text>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Address <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  value={lab.address}
                  multiline
                  numberOfLines={3}
                  onChangeText={v => updateLabField('address', v)}
                  style={[styles.input, styles.multilineInput, Boolean(errors.address) && styles.inputError]}
                  placeholder="Street, area, landmark"
                  placeholderTextColor={colors.subtle}
                />
                {errors.address ? <Text style={styles.errorText}>{errors.address}</Text> : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  State <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.dropdownBtn, Boolean(errors.state) && styles.inputError]}
                  onPress={() => openLocationPicker('state')}
                >
                  <Text style={lab.state ? styles.dropdownBtnValue : styles.dropdownBtnPlaceholder}>
                    {statesLoading ? 'Loading states...' : lab.state || 'Select State'}
                  </Text>
                  <ChevronDown size={18} color={colors.muted} />
                </TouchableOpacity>
                {errors.state ? <Text style={styles.errorText}>{errors.state}</Text> : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  City <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.dropdownBtn, Boolean(errors.city) && styles.inputError]}
                  onPress={() => openLocationPicker('city')}
                >
                  <Text style={lab.city ? styles.dropdownBtnValue : styles.dropdownBtnPlaceholder}>
                    {citiesLoading ? 'Loading cities...' : lab.city || (selectedStateId ? 'Select City' : 'Select state first')}
                  </Text>
                  <ChevronDown size={18} color={colors.muted} />
                </TouchableOpacity>
                {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
              </View>

              <Text style={styles.formSectionTitle}>ONLINE PRESENCE</Text>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Website</Text>
                <TextInput
                  value={lab.website}
                  autoCapitalize="none"
                  onChangeText={v => updateLabField('website', v)}
                  style={styles.input}
                  placeholder="https://yourlab.com"
                  placeholderTextColor={colors.subtle}
                />
              </View>

              <Text style={styles.formSectionTitle}>AVAILABILITY & SCHEDULE</Text>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Available Days</Text>
                <TextInput
                  value={lab.available_days}
                  onChangeText={v => updateLabField('available_days', v)}
                  style={styles.input}
                  placeholder="Mon, Tue, Wed, Thu, Fri, Sat"
                  placeholderTextColor={colors.subtle}
                />
              </View>

              <View style={styles.infoRow2}>
                <View style={[styles.formGroup, styles.flex]}>
                  <Text style={styles.inputLabel}>Opens At (HH:mm)</Text>
                  <TextInput
                    value={String(lab.available_from || '').slice(0, 5)}
                    onChangeText={v => updateLabField('available_from', v)}
                    style={styles.input}
                    placeholder="09:00"
                    placeholderTextColor={colors.subtle}
                  />
                </View>
                <View style={[styles.formGroup, styles.flex]}>
                  <Text style={styles.inputLabel}>Closes At (HH:mm)</Text>
                  <TextInput
                    value={String(lab.available_to || '').slice(0, 5)}
                    onChangeText={v => updateLabField('available_to', v)}
                    style={styles.input}
                    placeholder="18:00"
                    placeholderTextColor={colors.subtle}
                  />
                </View>
              </View>

              <View style={styles.switchBox}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>Marketplace Visibility</Text>
                  <Text style={styles.switchSubtitle}>Allow patients to discover this lab publicly.</Text>
                </View>
                <Switch
                  value={Number(lab.is_marketplace_visible) !== 0}
                  onValueChange={v => updateLabField('is_marketplace_visible', v ? 1 : 0)}
                  trackColor={{ true: colors.primary, false: colors.input }}
                  thumbColor={colors.surface}
                />
              </View>
            </LiquidBorderScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditOpen(false)} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryModalBtn} onPress={handleSaveLab} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <>
                    <Save size={16} color={colors.surface} />
                    <Text style={styles.primaryModalBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </AppModal>

      {/* ── MODAL 3: LAB ADMINISTRATORS LIST MODAL ── */}
      <AppModal visible={adminsListOpen} animationType="slide" transparent onRequestClose={() => setAdminsListOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <View style={[styles.modalHeaderIconBox, { backgroundColor: '#1D4ED8' }]}>
                  <UsersRound size={18} color={colors.surface} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.modalSheetTitle}>Lab Administrators</Text>
                  <Text style={styles.modalSheetSubtitle}>
                    {admins.length} administrator{admins.length === 1 ? '' : 's'} mapped to {savedLab.name}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setAdminsListOpen(false)} style={styles.modalCloseBtn}>
                  <X size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
            </View>

            <LiquidBorderScrollView style={styles.modalBody}>
              {canAdd ? (
                <TouchableOpacity
                  style={styles.addAdminBannerBtn}
                  onPress={() => {
                    setAdminsListOpen(false);
                    setAdminOpen(true);
                  }}
                >
                  <Plus size={16} color={colors.primary} />
                  <Text style={styles.addAdminBannerText}>Add New Administrator</Text>
                </TouchableOpacity>
              ) : null}

              {admins.length === 0 ? (
                <View style={styles.emptyAdminsCard}>
                  <UsersRound size={36} color={colors.subtle} />
                  <Text style={styles.emptyAdminsTitle}>No administrators added</Text>
                  <Text style={styles.emptyAdminsSub}>Use Add Administrator to create an admin account.</Text>
                </View>
              ) : (
                admins.map(admin => (
                  <View key={admin.id} style={styles.adminCard}>
                    <View style={styles.adminCardHeader}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarInitial}>
                          {String(admin.full_name || 'A').trim().slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.adminHeaderInfo}>
                        <Text style={styles.adminName}>{admin.full_name}</Text>
                        <Text style={styles.adminRole}>Lab Administrator</Text>
                      </View>
                      <View style={[styles.activeBadge, Number(admin.is_active) ? styles.badgeActive : styles.badgeInactive]}>
                        <Text style={[styles.activeBadgeText, Number(admin.is_active) ? styles.textActive : styles.textInactive]}>
                          {Number(admin.is_active) ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.adminContactDetails}>
                      <View style={styles.contactItemRow}>
                        <Mail size={13} color={colors.muted} />
                        <Text style={styles.contactItemText}>{admin.email}</Text>
                      </View>
                      <View style={styles.contactItemRow}>
                        <Phone size={13} color={colors.muted} />
                        <Text style={styles.contactItemText}>{admin.phone}</Text>
                      </View>
                      {admin.address ? (
                        <View style={styles.contactItemRow}>
                          <MapPin size={13} color={colors.muted} />
                          <Text style={styles.contactItemText}>{admin.address}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.adminCardActionsRow}>
                      <TouchableOpacity
                        style={styles.adminSmallActionBtn}
                        onPress={() => {
                          setAdminsListOpen(false);
                          openAdminDetails(admin, 'view');
                        }}
                      >
                        <Eye size={13} color={colors.primaryDark} />
                        <Text style={styles.adminSmallActionText}>View</Text>
                      </TouchableOpacity>

                      {canEdit ? (
                        <TouchableOpacity
                          style={styles.adminSmallActionBtn}
                          onPress={() => {
                            setAdminsListOpen(false);
                            openAdminDetails(admin, 'edit');
                          }}
                        >
                          <Edit3 size={13} color={colors.primaryDark} />
                          <Text style={styles.adminSmallActionText}>Edit</Text>
                        </TouchableOpacity>
                      ) : null}

                      {canEdit ? (
                        <TouchableOpacity
                          style={styles.adminSmallActionBtn}
                          onPress={() => {
                            setAdminsListOpen(false);
                            openResetPassword(admin);
                          }}
                        >
                          <KeyRound size={13} color={colors.primaryDark} />
                          <Text style={styles.adminSmallActionText}>Password</Text>
                        </TouchableOpacity>
                      ) : null}

                      {canEdit ? (
                        <TouchableOpacity
                          style={[styles.adminSmallActionBtn, Number(admin.is_active) ? styles.btnDanger : styles.btnSuccess]}
                          onPress={() => toggleAdminStatus(admin)}
                          disabled={adminUpdating}
                        >
                          <Power size={13} color={Number(admin.is_active) ? colors.destructive : colors.successDark} />
                          <Text style={[styles.adminSmallActionText, Number(admin.is_active) ? styles.textDanger : styles.textSuccess]}>
                            {Number(admin.is_active) ? 'Deactivate' : 'Activate'}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </LiquidBorderScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAdminsListOpen(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </AppModal>

      {/* ── MODAL 4: ADD LAB ADMIN MODAL ── */}
      <AppModal visible={adminOpen} animationType="slide" transparent onRequestClose={() => setAdminOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <View style={[styles.modalHeaderIconBox, { backgroundColor: colors.primary }]}>
                  <UserCog size={18} color={colors.surface} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.modalSheetTitle}>Add Lab Admin</Text>
                  <Text style={styles.modalSheetSubtitle}>Mapped only to {savedLab.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setAdminOpen(false)} style={styles.modalCloseBtn}>
                  <X size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
            </View>

            <LiquidBorderScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Full Name <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  value={adminForm.full_name}
                  onChangeText={v => {
                    setAdminForm(c => ({ ...c, full_name: v }));
                    setAdminErrors(c => ({ ...c, full_name: '' }));
                  }}
                  style={[styles.input, Boolean(adminErrors.full_name) && styles.inputError]}
                  placeholder="Enter administrator full name"
                  placeholderTextColor={colors.subtle}
                />
                {adminErrors.full_name ? <Text style={styles.errorText}>{adminErrors.full_name}</Text> : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Email <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  value={adminForm.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={v => {
                    setAdminForm(c => ({ ...c, email: v }));
                    setAdminErrors(c => ({ ...c, email: '' }));
                  }}
                  style={[styles.input, Boolean(adminErrors.email) && styles.inputError]}
                  placeholder="admin@example.com"
                  placeholderTextColor={colors.subtle}
                />
                {adminErrors.email ? <Text style={styles.errorText}>{adminErrors.email}</Text> : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Mobile Number (10 digits) <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  value={adminForm.phone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  onChangeText={v => {
                    const phone = v.replace(/\D/g, '').slice(0, 10);
                    setAdminForm(c => ({ ...c, phone }));
                    setAdminErrors(c => ({ ...c, phone: '' }));
                  }}
                  style={[styles.input, Boolean(adminErrors.phone) && styles.inputError]}
                  placeholder="9876543210"
                  placeholderTextColor={colors.subtle}
                />
                {adminErrors.phone ? <Text style={styles.errorText}>{adminErrors.phone}</Text> : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Temporary Password <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  value={adminForm.password}
                  secureTextEntry
                  onChangeText={v => {
                    setAdminForm(c => ({ ...c, password: v }));
                    setAdminErrors(c => ({ ...c, password: '' }));
                  }}
                  style={[styles.input, Boolean(adminErrors.password) && styles.inputError]}
                  placeholder="Minimum 8 characters"
                  placeholderTextColor={colors.subtle}
                />
                {adminErrors.password ? <Text style={styles.errorText}>{adminErrors.password}</Text> : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  value={adminForm.address}
                  multiline
                  numberOfLines={2}
                  onChangeText={v => setAdminForm(c => ({ ...c, address: v }))}
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Residential or clinic address"
                  placeholderTextColor={colors.subtle}
                />
              </View>
            </LiquidBorderScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAdminOpen(false)} disabled={adminSaving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryModalBtn} onPress={handleAddAdmin} disabled={adminSaving}>
                {adminSaving ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <>
                    <Plus size={16} color={colors.surface} />
                    <Text style={styles.primaryModalBtnText}>Add Admin</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </AppModal>

      {/* ── MODAL 5: ADMIN DETAILS MODAL (VIEW / EDIT) ── */}
      <AppModal visible={adminDetailsOpen} animationType="slide" transparent onRequestClose={() => setAdminDetailsOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <View style={[styles.modalHeaderIconBox, { backgroundColor: colors.primary }]}>
                  {adminDetailsMode === 'view' ? <Eye size={18} color={colors.surface} /> : <Edit3 size={18} color={colors.surface} />}
                </View>
                <View style={styles.flex}>
                  <Text style={styles.modalSheetTitle}>
                    {adminDetailsMode === 'view' ? 'Lab Admin Details' : 'Edit Lab Admin'}
                  </Text>
                  <Text style={styles.modalSheetSubtitle}>
                    {adminDetailsMode === 'view' ? 'View administrator account and status' : 'Update name, mobile and address'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setAdminDetailsOpen(false)} style={styles.modalCloseBtn}>
                  <X size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
            </View>

            <LiquidBorderScrollView style={styles.modalBody}>
              {selectedAdmin && adminDetailsMode === 'view' ? (
                <>
                  <View style={styles.adminViewCard}>
                    <View style={styles.avatarCircleLarge}>
                      <Text style={styles.avatarInitialLarge}>
                        {String(selectedAdmin.full_name || 'A').trim().slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.adminNameLarge}>{selectedAdmin.full_name}</Text>
                    <Text style={styles.adminRoleLarge}>Lab Administrator</Text>
                    <View style={[styles.activeBadge, Number(selectedAdmin.is_active) ? styles.badgeActive : styles.badgeInactive]}>
                      <Text style={[styles.activeBadgeText, Number(selectedAdmin.is_active) ? styles.textActive : styles.textInactive]}>
                        {Number(selectedAdmin.is_active) ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoCellFull}>
                    <Text style={styles.infoCellLabel}>EMAIL</Text>
                    <Text style={styles.infoCellValue}>{selectedAdmin.email}</Text>
                  </View>
                  <View style={[styles.infoCellFull, { marginTop: spacing.sm }]}>
                    <Text style={styles.infoCellLabel}>MOBILE NUMBER</Text>
                    <Text style={styles.infoCellValue}>{selectedAdmin.phone}</Text>
                  </View>
                  <View style={[styles.infoCellFull, { marginTop: spacing.sm }]}>
                    <Text style={styles.infoCellLabel}>ADDRESS</Text>
                    <Text style={styles.infoCellValue}>{selectedAdmin.address || '—'}</Text>
                  </View>
                </>
              ) : selectedAdmin ? (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>
                      Full Name <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      value={editAdminForm.full_name}
                      onChangeText={v => {
                        setEditAdminForm(c => ({ ...c, full_name: v }));
                        setAdminErrors(c => ({ ...c, full_name: '' }));
                      }}
                      style={[styles.input, Boolean(adminErrors.full_name) && styles.inputError]}
                    />
                    {adminErrors.full_name ? <Text style={styles.errorText}>{adminErrors.full_name}</Text> : null}
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Email (cannot be changed)</Text>
                    <TextInput value={editAdminForm.email} editable={false} style={[styles.input, styles.inputDisabled]} />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>
                      Mobile Number (10 digits) <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      value={editAdminForm.phone}
                      keyboardType="phone-pad"
                      maxLength={10}
                      onChangeText={v => {
                        const phone = v.replace(/\D/g, '').slice(0, 10);
                        setEditAdminForm(c => ({ ...c, phone }));
                        setAdminErrors(c => ({ ...c, phone: '' }));
                      }}
                      style={[styles.input, Boolean(adminErrors.phone) && styles.inputError]}
                    />
                    {adminErrors.phone ? <Text style={styles.errorText}>{adminErrors.phone}</Text> : null}
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Address</Text>
                    <TextInput
                      value={editAdminForm.address}
                      multiline
                      numberOfLines={3}
                      onChangeText={v => setEditAdminForm(c => ({ ...c, address: v }))}
                      style={[styles.input, styles.multilineInput]}
                    />
                  </View>
                </>
              ) : null}
            </LiquidBorderScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAdminDetailsOpen(false)} disabled={adminUpdating}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
              {adminDetailsMode === 'view' && canEdit ? (
                <TouchableOpacity style={styles.primaryModalBtn} onPress={() => setAdminDetailsMode('edit')}>
                  <Edit3 size={15} color={colors.surface} />
                  <Text style={styles.primaryModalBtnText}>Edit Admin</Text>
                </TouchableOpacity>
              ) : adminDetailsMode === 'edit' ? (
                <TouchableOpacity style={styles.primaryModalBtn} onPress={handleSaveAdminChanges} disabled={adminUpdating}>
                  {adminUpdating ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <>
                      <Save size={15} color={colors.surface} />
                      <Text style={styles.primaryModalBtnText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </AppModal>

      {/* ── MODAL 6: RESET PASSWORD MODAL ── */}
      <AppModal visible={resetPasswordOpen} animationType="fade" transparent onRequestClose={() => setResetPasswordOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { maxHeight: 420 }]}>
            <View style={styles.modalSheetHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <View style={[styles.modalHeaderIconBox, { backgroundColor: colors.primary }]}>
                  <KeyRound size={18} color={colors.surface} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.modalSheetTitle}>Reset Password</Text>
                  <Text style={styles.modalSheetSubtitle}>For {selectedAdmin?.full_name || 'Admin'}</Text>
                </View>
                <TouchableOpacity onPress={() => setResetPasswordOpen(false)} style={styles.modalCloseBtn}>
                  <X size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
            </View>

            <LiquidBorderScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  New Password <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  value={resetPasswordForm.password}
                  secureTextEntry
                  onChangeText={v => {
                    setResetPasswordForm(c => ({ ...c, password: v }));
                    setResetPasswordError('');
                  }}
                  style={styles.input}
                  placeholder="Minimum 8 characters"
                  placeholderTextColor={colors.subtle}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Confirm New Password <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  value={resetPasswordForm.confirmPassword}
                  secureTextEntry
                  onChangeText={v => {
                    setResetPasswordForm(c => ({ ...c, confirmPassword: v }));
                    setResetPasswordError('');
                  }}
                  style={[styles.input, Boolean(resetPasswordError) && styles.inputError]}
                  placeholder="Re-enter password"
                  placeholderTextColor={colors.subtle}
                />
                {resetPasswordError ? <Text style={styles.errorText}>{resetPasswordError}</Text> : null}
              </View>
            </LiquidBorderScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setResetPasswordOpen(false)} disabled={adminUpdating}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryModalBtn} onPress={handleResetPassword} disabled={adminUpdating}>
                {adminUpdating ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <>
                    <KeyRound size={15} color={colors.surface} />
                    <Text style={styles.primaryModalBtnText}>Reset Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </AppModal>

      {/* ── MODAL 7: LOCATION SEARCH PICKER (STATE / CITY) ── */}
      <AppModal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { maxHeight: '80%' }]}>
            <View style={styles.modalSheetHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <MapPin size={20} color={colors.primary} />
                <Text style={[styles.modalSheetTitle, { marginLeft: spacing.sm }]}>
                  Select {pickerType === 'state' ? 'State' : 'City'}
                </Text>
                <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.modalCloseBtn}>
                  <X size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
              <View style={styles.pickerSearchWrap}>
                <Search size={16} color={colors.muted} />
                <TextInput
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                  style={styles.pickerSearchInput}
                  placeholder={`Search ${pickerType}...`}
                  placeholderTextColor={colors.subtle}
                />
              </View>
            </View>

            <FlatList
              data={filteredLocations}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => {
                const selected =
                  pickerType === 'state'
                    ? lab.state.toLowerCase() === item.name.toLowerCase()
                    : lab.city.toLowerCase() === item.name.toLowerCase();
                return (
                  <TouchableOpacity
                    style={[styles.pickerItemRow, selected && styles.pickerItemSelected]}
                    onPress={() => selectLocation(item)}
                  >
                    <Text style={[styles.pickerItemText, selected && styles.pickerItemTextSelected]}>
                      {item.name}
                    </Text>
                    {selected ? <Check size={16} color={colors.primary} /> : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyPickerWrap}>
                  <Text style={styles.emptyPickerText}>
                    {statesLoading || citiesLoading ? 'Loading locations...' : 'No locations found'}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </AppModal>
    </View>
  );
}
