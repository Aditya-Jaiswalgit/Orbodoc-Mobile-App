import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addLabAdminApi,
  emptyLab,
  fetchCitiesApi,
  fetchLabAdminsApi,
  fetchLabProfileApi,
  fetchStatesApi,
  IndiaLocation,
  LabAdmin,
  LabProfile,
  normalizeLabProfile,
  updateLabAdminApi,
  updateLabProfileApi,
} from '../api/labProfileApi';
import { chooseAndUploadClinicLogo } from '../api/profilePhotoApi';
import { showErrorToast, showSuccessToast } from '../utils/toast';

export function useLabProfileManagement(token: string | null | undefined, canView: boolean) {
  const [lab, setLab] = useState<LabProfile>(emptyLab);
  const [savedLab, setSavedLab] = useState<LabProfile>(emptyLab);
  const [admins, setAdmins] = useState<LabAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminUpdating, setAdminUpdating] = useState(false);

  // States & Cities
  const [locationStates, setLocationStates] = useState<IndiaLocation[]>([]);
  const [locationCities, setLocationCities] = useState<IndiaLocation[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const activeAdmins = useMemo(
    () => admins.filter(admin => Number(admin.is_active) !== 0).length,
    [admins],
  );

  const loadData = useCallback(async (manual = false) => {
    if (!token || !canView) {
      setLoading(false);
      return;
    }
    if (manual) setRefreshing(true);
    else setLoading(true);

    try {
      const [labResponse, adminResponse] = await Promise.all([
        fetchLabProfileApi(),
        fetchLabAdminsApi(),
      ]);

      if (!labResponse.success) throw new Error(labResponse.message || 'Could not load lab profile.');
      if (!adminResponse.success) throw new Error(adminResponse.message || 'Could not load lab administrators.');

      const labData = (labResponse.data as any)?.lab || labResponse.data || emptyLab;
      const loaded = normalizeLabProfile(labData);
      setLab(loaded);
      setSavedLab(loaded);

      const adminList = Array.isArray((adminResponse.data as any)?.admins)
        ? (adminResponse.data as any).admins
        : [];
      setAdmins(adminList);
    } catch (error) {
      showErrorToast('Lab Management', error instanceof Error ? error.message : 'Could not load data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canView, token]);

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [loadData]);

  const loadStates = async () => {
    if (locationStates.length) return locationStates;
    setStatesLoading(true);
    try {
      const list = await fetchStatesApi();
      setLocationStates(list);
      return list;
    } catch {
      return [];
    } finally {
      setStatesLoading(false);
    }
  };

  const loadCities = async (stateId: string | number) => {
    if (!stateId) {
      setLocationCities([]);
      return [];
    }
    setCitiesLoading(true);
    try {
      const list = await fetchCitiesApi(stateId);
      setLocationCities(list);
      return list;
    } catch {
      return [];
    } finally {
      setCitiesLoading(false);
    }
  };

  const updateLabField = (field: keyof LabProfile, value: string | number) => {
    setLab(current => ({ ...current, [field]: value }));
  };

  const handleUploadLogo = async () => {
    setUploadingLogo(true);
    try {
      const url = await chooseAndUploadClinicLogo(() => true);
      if (url) {
        updateLabField('logo_url', url);
        showSuccessToast('Logo Uploaded', 'Save changes to update the lab profile.');
        return url;
      }
    } catch (error) {
      showErrorToast('Upload Failed', error instanceof Error ? error.message : 'Choose a JPG or PNG up to 2MB.');
    } finally {
      setUploadingLogo(false);
    }
    return null;
  };

  const removeLogo = () => {
    updateLabField('logo_url', '');
  };

  const saveLab = async (targetLab: LabProfile) => {
    setSaving(true);
    try {
      const response = await updateLabProfileApi({
        name: targetLab.name.trim(),
        license_number: targetLab.license_number.trim(),
        email: targetLab.email.trim(),
        phone: targetLab.phone.trim(),
        address: targetLab.address.trim(),
        city: targetLab.city.trim(),
        state: targetLab.state.trim(),
        website: targetLab.website.trim(),
        logo_url: targetLab.logo_url.trim(),
        available_days: targetLab.available_days.trim(),
        available_from: targetLab.available_from || null,
        available_to: targetLab.available_to || null,
        is_marketplace_visible: Number(Boolean(targetLab.is_marketplace_visible)),
      });

      if (!response.success) throw new Error(response.message || 'Failed to update lab');

      const updated = normalizeLabProfile((response.data as any)?.lab || targetLab);
      setLab(updated);
      setSavedLab(updated);
      showSuccessToast('Success', response.message || 'Lab profile updated successfully');
      return true;
    } catch (error) {
      showErrorToast('Update Failed', error instanceof Error ? error.message : 'Failed to update lab');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addAdmin = async (adminData: {
    full_name: string;
    email: string;
    phone: string;
    password?: string;
    address?: string;
  }) => {
    setAdminSaving(true);
    try {
      const response = await addLabAdminApi({
        full_name: adminData.full_name.trim(),
        email: adminData.email.trim(),
        phone: adminData.phone.trim(),
        password: adminData.password,
        address: adminData.address?.trim(),
      });

      if (!response.success) throw new Error(response.message || 'Failed to add Lab Admin');

      const added = (response.data as any)?.admin;
      if (added) {
        setAdmins(current => [added, ...current]);
      } else {
        await loadData(true);
      }
      showSuccessToast('Success', response.message || 'Lab Admin added successfully');
      return true;
    } catch (error) {
      showErrorToast('Failed', error instanceof Error ? error.message : 'Failed to add Lab Admin');
      return false;
    } finally {
      setAdminSaving(false);
    }
  };

  const updateAdmin = async (
    adminId: number,
    payload: Record<string, unknown>,
    successMessage?: string,
  ) => {
    setAdminUpdating(true);
    try {
      const response = await updateLabAdminApi(adminId, payload);
      if (!response.success) throw new Error(response.message || 'Failed to update Lab Admin');

      const updated = (response.data as any)?.admin;
      if (updated) {
        setAdmins(current => current.map(item => (item.id === updated.id ? { ...item, ...updated } : item)));
      }
      showSuccessToast('Updated', successMessage || response.message || 'Lab Admin updated successfully');
      return updated || true;
    } catch (error) {
      showErrorToast('Update Failed', error instanceof Error ? error.message : 'Failed to update Lab Admin');
      return null;
    } finally {
      setAdminUpdating(false);
    }
  };

  const toggleAdminStatus = async (admin: LabAdmin) => {
    const activating = Number(admin.is_active) === 0;
    return updateAdmin(
      admin.id,
      { is_active: activating ? 1 : 0 },
      `Lab Admin ${activating ? 'activated' : 'deactivated'} successfully`,
    );
  };

  const resetAdminPassword = async (adminId: number, password: string) => {
    return updateAdmin(
      adminId,
      { password },
      'Lab Admin password reset successfully',
    );
  };

  return {
    lab,
    setLab,
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
    updateAdmin,
    toggleAdminStatus,
    resetAdminPassword,
  };
}
