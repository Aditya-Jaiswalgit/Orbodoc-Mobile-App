import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Check, ChevronDown, Pencil, Plus, Trash2, X } from 'lucide-react-native';
import { AppModal } from '../../components/common/AppModal';
import { Pagination } from '../../components/common/Pagination';
import { StaffHeader } from '../../components/common/StaffHeader';
import { fetchSystemObjectsApi, SystemObject } from '../../api/roleManagementApi';
import {
  createSubscriptionPlanApi,
  createSubscriptionPlanFeatureApi,
  deleteSubscriptionPlanApi,
  fetchMultiSubscriptionPlansApi,
  fetchSingleSubscriptionPlansApi,
  fetchSubscriptionPlanByIdApi,
  fetchSubscriptionPlansApi,
  SubscriptionPlan,
  SubscriptionPlanFeature,
  SubscriptionPlanPayload,
  SubscriptionPlanType,
  updateSubscriptionPlanApi,
  updateSubscriptionPlanFeatureApi,
} from '../../api/superAdminApi';
import { useAuthContext } from '../../context/AuthContext';
import { normalizeRoleName } from '../../utils/rolePermissions';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { styles } from './styles/SuperAdmin.styles';

type Props = { onOpenDrawer: () => void };
type PlanFilter = 'all' | SubscriptionPlanType;
type ObjectOption = { id: number; name: string };

const EMPTY_PLAN: SubscriptionPlanPayload = {
  plan_name: '', plan_type: 'single', max_clinics: 1, max_staff: null,
  max_patients: null, price_monthly: 0, price_yearly: 0,
};
const PAGE_SIZES = [5, 10, 20, 50];
const money = (value: number | null | undefined) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const toOptionalNumber = (value: string) => value.trim() ? (Number.isFinite(Number(value)) ? Number(value) : null) : null;

function SelectField({ label, value, options, onSelect }: { label: string; value: string; options: { value: string; label: string }[]; onSelect: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.selectButton} onPress={() => setOpen(current => !current)}>
        <Text style={styles.selectValue}>{options.find(option => option.value === value)?.label || value}</Text>
        <ChevronDown size={16} color="#64748B" />
      </TouchableOpacity>
      {open ? <ScrollView style={styles.selectOptions} nestedScrollEnabled keyboardShouldPersistTaps="handled">{options.map(option => <TouchableOpacity key={option.value} style={[styles.selectOption, option.value === value && styles.selectOptionActive]} onPress={() => { onSelect(option.value); setOpen(false); }}><Text style={styles.selectValue}>{option.label}</Text>{option.value === value ? <Check size={15} color="#0D9488" /> : null}</TouchableOpacity>)}</ScrollView> : null}
    </View>
  );
}

function NumberField({ label, value, onChange, placeholder }: { label: string; value: number | null; onChange: (value: number | null) => void; placeholder?: string }) {
  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.textInput} value={value == null ? '' : String(value)} onChangeText={text => onChange(toOptionalNumber(text))} keyboardType="decimal-pad" placeholder={placeholder || '0'} placeholderTextColor="#94A3B8" />
    </View>
  );
}

export default function SubscriptionPlansScreen({ onOpenDrawer }: Props) {
  const { role } = useAuthContext();
  const isSuperAdmin = normalizeRoleName(role || '') === 'super_admin';
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [singlePlans, setSinglePlans] = useState<SubscriptionPlan[]>([]);
  const [multiPlans, setMultiPlans] = useState<SubscriptionPlan[]>([]);
  const [systemObjects, setSystemObjects] = useState<ObjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPlanId, setEditPlanId] = useState<number | null>(null);
  const [form, setForm] = useState<SubscriptionPlanPayload>(EMPTY_PLAN);
  const [filter, setFilter] = useState<PlanFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewPlan, setViewPlan] = useState<SubscriptionPlan | null>(null);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [featureObjectId, setFeatureObjectId] = useState('');
  const [featureEnabled, setFeatureEnabled] = useState<'1' | '0'>('1');
  const [addingFeature, setAddingFeature] = useState(false);
  const [updatingFeatureId, setUpdatingFeatureId] = useState<number | null>(null);

  const loadAllData = useCallback(async (showSpinner = true) => {
    if (!isSuperAdmin) return;
    if (showSpinner) setLoading(true);
    try {
      const [allRows, singleRows, multiRows, objectResponse] = await Promise.all([
        fetchSubscriptionPlansApi(), fetchSingleSubscriptionPlansApi(), fetchMultiSubscriptionPlansApi(),
        fetchSystemObjectsApi().catch(() => null),
      ]);
      setPlans(allRows);
      setSinglePlans(singleRows);
      setMultiPlans(multiRows);
      const rawObjects = objectResponse?.success ? objectResponse.data || [] : [];
      setSystemObjects(rawObjects.map(item => {
        const row = item as SystemObject & { sys_obj_id?: number | string; object_name?: string; display_name?: string };
        return {
          id: Number(row.sys_obj_id ?? row.id),
          name: String(row.object_name ?? row.name ?? row.display_name ?? ''),
        };
      }).filter(item => item.id && item.name));
      setViewPlan(current => current ? allRows.find(item => item.id === current.id) || current : null);
    } catch (cause) {
      showErrorToast('Could not load subscription plans', cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => { loadAllData().catch(() => undefined); }, [loadAllData]);

  const rowsByFilter = useMemo(() => ({ all: plans, single: singlePlans, multi: multiPlans }), [plans, singlePlans, multiPlans]);
  const filteredPlans = rowsByFilter[filter];
  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / pageSize));
  const visiblePlans = filteredPlans.slice((page - 1) * pageSize, page * pageSize);

  const openCreate = () => { setEditPlanId(null); setForm({ ...EMPTY_PLAN }); setDialogOpen(true); };

  const openEdit = async (planId: number) => {
    setSaving(true);
    try {
      const row = await fetchSubscriptionPlanByIdApi(planId);
      setEditPlanId(planId);
      setForm({
        plan_name: String(row.plan_name || ''), plan_type: row.plan_type === 'multi' ? 'multi' : 'single',
        max_clinics: row.max_clinics ?? null, max_staff: row.max_staff ?? null,
        max_patients: row.max_patients ?? null, price_monthly: Number(row.price_monthly || 0),
        price_yearly: Number(row.price_yearly || 0),
      });
      setDialogOpen(true);
    } catch (cause) {
      showErrorToast('Could not fetch plan', cause instanceof Error ? cause.message : undefined);
    } finally { setSaving(false); }
  };

  const savePlan = async () => {
    const payload = { ...form, plan_name: form.plan_name.trim(), price_monthly: Number(form.price_monthly || 0), price_yearly: Number(form.price_yearly || 0) };
    if (!payload.plan_name) { showErrorToast('Plan name is required'); return; }
    setSaving(true);
    try {
      if (editPlanId) { await updateSubscriptionPlanApi(editPlanId, payload); showSuccessToast('Plan updated'); }
      else { await createSubscriptionPlanApi(payload); showSuccessToast('Plan created'); }
      setDialogOpen(false); setEditPlanId(null); setForm({ ...EMPTY_PLAN }); await loadAllData(false);
    } catch (cause) { showErrorToast('Failed to save plan', cause instanceof Error ? cause.message : undefined); }
    finally { setSaving(false); }
  };

  const deletePlan = async (id: number) => {
    setDeletingId(id);
    try { await deleteSubscriptionPlanApi(id); showSuccessToast('Plan deleted'); await loadAllData(false); }
    catch (cause) { showErrorToast('Failed to delete plan', cause instanceof Error ? cause.message : undefined); }
    finally { setDeletingId(null); }
  };

  const openFeatures = (plan: SubscriptionPlan) => {
    setViewPlan(plan); setFeatureObjectId(''); setFeatureEnabled('1'); setFeatureDialogOpen(true);
  };

  const addFeature = async () => {
    if (!viewPlan?.id) { showErrorToast('Plan not selected'); return; }
    if (!featureObjectId) { showErrorToast('Please select feature object'); return; }
    if ((viewPlan.features || []).some(item => Number(item.sys_obj_id) === Number(featureObjectId))) { showErrorToast('This feature is already mapped to the selected plan.'); return; }
    setAddingFeature(true);
    try {
      await createSubscriptionPlanFeatureApi({ plan_id: viewPlan.id, sys_obj_id: Number(featureObjectId), is_enabled: Number(featureEnabled) });
      showSuccessToast('Feature added'); setFeatureObjectId(''); setFeatureEnabled('1'); await loadAllData(false);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to add feature';
      const duplicate = message.toLowerCase().includes('duplicate entry') || message.includes('uq_plan_sysobj');
      showErrorToast(duplicate ? 'Feature already exists for this plan' : 'Failed to add feature', duplicate ? 'Please choose another object.' : message);
    } finally { setAddingFeature(false); }
  };

  const updateFeature = async (feature: SubscriptionPlanFeature) => {
    if (!viewPlan?.id || !feature.feature_id || !feature.sys_obj_id) { showErrorToast('Invalid feature row'); return; }
    setUpdatingFeatureId(Number(feature.feature_id));
    try {
      await updateSubscriptionPlanFeatureApi(Number(feature.feature_id), { plan_id: viewPlan.id, sys_obj_id: Number(feature.sys_obj_id), is_enabled: Number(feature.is_enabled) ? 0 : 1 });
      showSuccessToast('Feature updated'); await loadAllData(false);
    } catch (cause) { showErrorToast('Failed to update feature', cause instanceof Error ? cause.message : undefined); }
    finally { setUpdatingFeatureId(null); }
  };

  if (!isSuperAdmin) return <View style={styles.root}><StaffHeader onOpenDrawer={onOpenDrawer} title="Subscription Plans" /><View style={styles.emptyCard}><Text style={styles.cardTitle}>Access Restricted</Text><Text style={styles.mutedText}>Only Super Admin can manage subscription plans.</Text></View></View>;

  return (
    <View style={styles.root}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Subscription Plans" />
      <ScrollView contentContainerStyle={styles.pageContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadAllData().catch(() => undefined)} />}>
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.flexOne}><Text style={styles.pageTitle}>Subscription Plans</Text><Text style={styles.mutedText}>Super Admin can create, read, update and delete all subscription plans.</Text></View>
            <TouchableOpacity style={styles.primaryButton} onPress={openCreate}><Plus size={17} color="#fff" /><Text style={styles.primaryButtonText}>Create Plan</Text></TouchableOpacity>
          </View>
          <View style={styles.contentInset}>
            <SelectField label="Filter Plans" value={filter} options={[{ value: 'all', label: `All (${plans.length})` }, { value: 'single', label: `Single (${singlePlans.length})` }, { value: 'multi', label: `Multi (${multiPlans.length})` }]} onSelect={value => { setFilter(value as PlanFilter); setPage(1); }} />
            {loading ? <View style={styles.loading}><ActivityIndicator color="#0D9488" /><Text style={styles.mutedText}>Loading plans...</Text></View> : visiblePlans.length ? <View style={styles.listGap}>
              {visiblePlans.map(plan => <View key={plan.id} style={styles.dataCard}>
                <View style={styles.cardTopRow}><View style={styles.flexOne}><Text style={styles.cardTitle}>{plan.plan_name}</Text><Text style={styles.mutedText}>Plan ID: {plan.id}</Text></View><View style={[styles.statusBadge, plan.plan_type === 'multi' ? styles.statusBadgeTeal : styles.statusBadgeMuted]}><Text style={[styles.statusText, plan.plan_type === 'multi' ? styles.statusTextTeal : styles.statusTextMuted]}>{plan.plan_type}</Text></View></View>
                <View style={styles.detailGrid}>
                  <View style={styles.detailCell}><Text style={styles.detailLabel}>Clinics</Text><Text style={styles.detailValue}>{plan.max_clinics ?? '-'}</Text></View>
                  <View style={styles.detailCell}><Text style={styles.detailLabel}>Staff</Text><Text style={styles.detailValue}>{plan.max_staff ?? '-'}</Text></View>
                  <View style={styles.detailCell}><Text style={styles.detailLabel}>Patients</Text><Text style={styles.detailValue}>{plan.max_patients ?? '-'}</Text></View>
                  <View style={styles.detailCell}><Text style={styles.detailLabel}>Monthly</Text><Text style={styles.detailValue}>{money(plan.price_monthly)}</Text></View>
                  <View style={styles.detailCell}><Text style={styles.detailLabel}>Yearly</Text><Text style={styles.detailValue}>{money(plan.price_yearly)}</Text></View>
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.outlineButton} onPress={() => openFeatures(plan)}><Text style={styles.outlineButtonText}>View Features</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.iconButton} onPress={() => openEdit(plan.id)} disabled={saving} accessibilityLabel={`Edit ${plan.plan_name}`}><Pencil size={17} color="#334155" /></TouchableOpacity>
                  <TouchableOpacity style={styles.iconButton} onPress={() => deletePlan(plan.id)} disabled={deletingId === plan.id} accessibilityLabel={`Delete ${plan.plan_name}`}>{deletingId === plan.id ? <ActivityIndicator size="small" color="#E11D48" /> : <Trash2 size={17} color="#E11D48" />}</TouchableOpacity>
                </View>
              </View>)}
            </View> : <View style={styles.emptyCard}><Text style={styles.cardTitle}>No plans found.</Text></View>}
          </View>
          {!loading ? <Pagination currentPage={page} totalPages={totalPages} totalItems={filteredPlans.length} pageSize={pageSize} itemLabel="plans" pageSizeOptions={PAGE_SIZES} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} /> : null}
        </View>
      </ScrollView>

      <AppModal visible={dialogOpen} transparent animationType="slide" onRequestClose={() => setDialogOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.formModalCard}>
          <View style={styles.modalHeader}><TouchableOpacity style={styles.modalClose} onPress={() => setDialogOpen(false)}><X size={18} color="#64748B" /></TouchableOpacity><Text style={styles.modalTitle}>{editPlanId ? 'Update Plan' : 'Create Plan'}</Text><Text style={styles.mutedText}>Fill subscription plan details.</Text></View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
            <View style={styles.formField}><Text style={styles.fieldLabel}>Plan Name</Text><TextInput style={styles.textInput} value={form.plan_name} onChangeText={plan_name => setForm(current => ({ ...current, plan_name }))} placeholder="Basic / Professional / Enterprise" /></View>
            <SelectField label="Plan Type" value={form.plan_type} options={[{ value: 'single', label: 'single' }, { value: 'multi', label: 'multi' }]} onSelect={value => setForm(current => ({ ...current, plan_type: value as SubscriptionPlanType }))} />
            <NumberField label="Max Clinics" value={form.max_clinics} onChange={max_clinics => setForm(current => ({ ...current, max_clinics }))} placeholder="1" />
            <NumberField label="Max Staff" value={form.max_staff} onChange={max_staff => setForm(current => ({ ...current, max_staff }))} placeholder="50" />
            <NumberField label="Max Patients" value={form.max_patients} onChange={max_patients => setForm(current => ({ ...current, max_patients }))} placeholder="1000" />
            <NumberField label="Price Monthly" value={form.price_monthly} onChange={price_monthly => setForm(current => ({ ...current, price_monthly: price_monthly ?? 0 }))} placeholder="999" />
            <NumberField label="Price Yearly" value={form.price_yearly} onChange={price_yearly => setForm(current => ({ ...current, price_yearly: price_yearly ?? 0 }))} placeholder="9999" />
          </ScrollView>
          <View style={styles.modalFooter}><TouchableOpacity style={styles.outlineButton} disabled={saving} onPress={() => setDialogOpen(false)}><Text style={styles.outlineButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.primaryButton} disabled={saving} onPress={() => savePlan()}>{saving ? <ActivityIndicator size="small" color="#fff" /> : null}<Text style={styles.primaryButtonText}>{editPlanId ? 'Update' : 'Create'}</Text></TouchableOpacity></View>
        </View></View>
      </AppModal>

      <AppModal visible={featureDialogOpen} transparent animationType="slide" onRequestClose={() => setFeatureDialogOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.featureModalCard}>
          <View style={styles.modalHeader}><TouchableOpacity style={styles.modalClose} onPress={() => setFeatureDialogOpen(false)}><X size={18} color="#64748B" /></TouchableOpacity><Text style={styles.modalTitle}>{viewPlan?.plan_name || 'Plan'} Features</Text><Text style={styles.mutedText}>Plan details and mapped feature access.</Text></View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
            <View style={styles.detailGrid}>
              <View style={styles.detailCell}><Text style={styles.detailLabel}>Plan ID</Text><Text style={styles.detailValue}>{viewPlan?.id ?? '-'}</Text></View>
              <View style={styles.detailCell}><Text style={styles.detailLabel}>Type</Text><Text style={styles.detailValue}>{viewPlan?.plan_type ?? '-'}</Text></View>
              <View style={styles.detailCell}><Text style={styles.detailLabel}>Max Clinics</Text><Text style={styles.detailValue}>{viewPlan?.max_clinics ?? '-'}</Text></View>
              <View style={styles.detailCell}><Text style={styles.detailLabel}>Max Staff</Text><Text style={styles.detailValue}>{viewPlan?.max_staff ?? '-'}</Text></View>
              <View style={styles.detailCell}><Text style={styles.detailLabel}>Max Patients</Text><Text style={styles.detailValue}>{viewPlan?.max_patients ?? '-'}</Text></View>
              <View style={styles.detailCell}><Text style={styles.detailLabel}>Monthly / Yearly</Text><Text style={styles.detailValue}>{money(viewPlan?.price_monthly)} / {money(viewPlan?.price_yearly)}</Text></View>
              <View style={styles.detailCell}><Text style={styles.detailLabel}>Feature Count</Text><Text style={styles.detailValue}>{viewPlan?.features?.length ?? 0}</Text></View>
            </View>
            <View style={styles.dataCard}>
              <Text style={styles.cardTitle}>Add Feature</Text>
              <SelectField label="System Object" value={featureObjectId} options={[{ value: '', label: 'Select object' }, ...systemObjects.map(item => ({ value: String(item.id), label: `${item.name} (#${item.id})` }))]} onSelect={setFeatureObjectId} />
              <SelectField label="Status" value={featureEnabled} options={[{ value: '1', label: 'enabled' }, { value: '0', label: 'disabled' }]} onSelect={value => setFeatureEnabled(value as '1' | '0')} />
              <TouchableOpacity style={[styles.primaryButton, styles.fullButton]} onPress={() => addFeature()} disabled={addingFeature}>{addingFeature ? <ActivityIndicator size="small" color="#fff" /> : null}<Text style={styles.primaryButtonText}>Add Feature</Text></TouchableOpacity>
            </View>
            {(viewPlan?.features || []).map((feature, index) => <View key={`${feature.feature_id}-${feature.sys_obj_id}-${index}`} style={styles.dataCard}>
              <View style={styles.cardTopRow}><Text style={styles.cardTitle}>{feature.object_name || `Feature ${index + 1}`}</Text><View style={[styles.statusBadge, Number(feature.is_enabled) ? styles.statusBadgeTeal : styles.statusBadgeMuted]}><Text style={[styles.statusText, Number(feature.is_enabled) ? styles.statusTextTeal : styles.statusTextMuted]}>{Number(feature.is_enabled) ? 'enabled' : 'disabled'}</Text></View></View>
              <Text style={styles.mutedText}>Feature ID: {feature.feature_id ?? '-'} · System Object ID: {feature.sys_obj_id ?? '-'}</Text>
              <TouchableOpacity style={styles.outlineButton} onPress={() => updateFeature(feature)} disabled={updatingFeatureId === Number(feature.feature_id)}>{updatingFeatureId === Number(feature.feature_id) ? <ActivityIndicator size="small" color="#0D9488" /> : <Text style={styles.outlineButtonText}>Update</Text>}</TouchableOpacity>
            </View>)}
            {(viewPlan?.features || []).length === 0 ? <Text style={styles.mutedText}>No features mapped to this plan.</Text> : null}
          </ScrollView>
          <View style={styles.modalFooter}><TouchableOpacity style={[styles.outlineButton, styles.fullButton]} onPress={() => setFeatureDialogOpen(false)}><Text style={styles.outlineButtonText}>Close</Text></TouchableOpacity></View>
        </View></View>
      </AppModal>
    </View>
  );
}

