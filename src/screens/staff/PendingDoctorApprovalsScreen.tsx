import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Search, ShieldCheck, UserRoundX, X } from 'lucide-react-native';
import { AppModal } from '../../components/common/AppModal';
import { Pagination } from '../../components/common/Pagination';
import { StaffHeader } from '../../components/common/StaffHeader';
import { approveDoctorApi, DoctorApprovalRecord, fetchDoctorApprovalsApi, rejectDoctorApi } from '../../api/superAdminApi';
import { useAuthContext } from '../../context/AuthContext';
import { normalizeRoleName } from '../../utils/rolePermissions';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { styles } from './styles/SuperAdmin.styles';

type Props = { onOpenDrawer: () => void };
type ApprovalTab = 'pending' | 'approved';
const PAGE_SIZES = [5, 10, 20, 50];
const doctorId = (doctor: DoctorApprovalRecord) => Number(doctor.id ?? doctor.doctor_id ?? 0);
const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function PendingDoctorApprovalsScreen({ onOpenDrawer }: Props) {
  const { role } = useAuthContext();
  const isSuperAdmin = normalizeRoleName(role || '') === 'super_admin';
  const [pendingDoctors, setPendingDoctors] = useState<DoctorApprovalRecord[]>([]);
  const [approvedDoctors, setApprovedDoctors] = useState<DoctorApprovalRecord[]>([]);
  const [tab, setTab] = useState<ApprovalTab>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [pendingPage, setPendingPage] = useState(1);
  const [approvedPage, setApprovedPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rejecting, setRejecting] = useState<DoctorApprovalRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const loadDoctors = useCallback(async (showSpinner = true) => {
    if (!isSuperAdmin) return;
    if (showSpinner) setLoading(true);
    try {
      setError('');
      const [pending, approved] = await Promise.all([
        fetchDoctorApprovalsApi('pending-approval'), fetchDoctorApprovalsApi('approved'),
      ]);
      setPendingDoctors(pending);
      setApprovedDoctors(approved);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to load doctor approvals';
      setError(message); setPendingDoctors([]); setApprovedDoctors([]);
    } finally { if (showSpinner) setLoading(false); }
  }, [isSuperAdmin]);

  useEffect(() => { loadDoctors().catch(() => undefined); }, [loadDoctors]);

  const filteredPending = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return pendingDoctors;
    return pendingDoctors.filter(doctor => [doctor.full_name, doctor.email, doctor.phone, doctor.specialization, doctor.qualification, doctor.registration_number].some(value => String(value || '').toLowerCase().includes(query)));
  }, [pendingDoctors, search]);
  const filteredApproved = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return approvedDoctors;
    return approvedDoctors.filter(doctor => [doctor.full_name, doctor.email, doctor.phone, doctor.specialization, doctor.qualification, doctor.registration_number].some(value => String(value || '').toLowerCase().includes(query)));
  }, [approvedDoctors, search]);

  useEffect(() => { setPendingPage(1); setApprovedPage(1); }, [tab, search]);

  const rows = tab === 'pending' ? filteredPending : filteredApproved;
  const page = tab === 'pending' ? pendingPage : approvedPage;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleDoctors = rows.slice((page - 1) * pageSize, page * pageSize);

  const confirmApprove = (doctor: DoctorApprovalRecord) => {
    Alert.alert(
      'Approve doctor registration?',
      `Are you sure registration number ${doctor.registration_number || '-'} is valid? This doctor will become available in the marketplace after approval.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm Approve', onPress: () => { approveDoctor(doctor).catch(() => undefined); } },
      ],
      { cancelable: true },
    );
  };

  const approveDoctor = async (doctor: DoctorApprovalRecord) => {
    const id = doctorId(doctor);
    if (!id) { showErrorToast('Invalid doctor record'); return; }
    setSubmittingId(id);
    try {
      await approveDoctorApi(id);
      showSuccessToast('Doctor approved successfully');
      setApprovedDoctors(current => [doctor, ...current.filter(item => doctorId(item) !== id)]);
      setPendingDoctors(current => current.filter(item => doctorId(item) !== id));
    } catch (cause) { showErrorToast('Failed to approve doctor', cause instanceof Error ? cause.message : undefined); }
    finally { setSubmittingId(null); }
  };

  const submitRejection = async () => {
    if (!rejecting) return;
    const id = doctorId(rejecting);
    if (!id) { showErrorToast('Invalid doctor record'); return; }
    setSubmittingId(id);
    try {
      await rejectDoctorApi(id, rejectionReason);
      showSuccessToast('Doctor rejected successfully');
      setPendingDoctors(current => current.filter(item => doctorId(item) !== id));
      setRejecting(null); setRejectionReason('');
    } catch (cause) { showErrorToast('Failed to reject doctor', cause instanceof Error ? cause.message : undefined); }
    finally { setSubmittingId(null); }
  };

  if (!isSuperAdmin) return <View style={styles.root}><StaffHeader onOpenDrawer={onOpenDrawer} title="Pending Doctor Approvals" /><View style={styles.emptyCard}><Text style={styles.cardTitle}>Access Restricted</Text><Text style={styles.mutedText}>Only Super Admin can review pending doctor approvals.</Text></View></View>;

  return (
    <View style={styles.root}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Pending Doctor Approvals" />
      <ScrollView contentContainerStyle={styles.pageContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadDoctors().catch(() => undefined)} />}>
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.flexOne}><Text style={styles.pageTitle}>Pending Doctor Approvals</Text><Text style={styles.mutedText}>Review pending registrations and monitor approved teleconsultation doctors.</Text></View>
          </View>
          <View style={styles.contentInset}>
            <Text style={styles.fieldLabel}>Search doctors</Text>
            <View style={styles.searchBox}><Search size={17} color="#64748B" /><TextInput value={search} onChangeText={setSearch} placeholder="Search by name, email, phone, or registration number" placeholderTextColor="#94A3B8" style={styles.searchInput} /></View>
            <View style={styles.tabRow}>
              <TouchableOpacity style={[styles.tabButton, tab === 'pending' && styles.tabButtonActive]} onPress={() => setTab('pending')}><Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>Pending ({pendingDoctors.length})</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.tabButton, tab === 'approved' && styles.tabButtonActive]} onPress={() => setTab('approved')}><Text style={[styles.tabText, tab === 'approved' && styles.tabTextActive]}>Approved ({approvedDoctors.length})</Text></TouchableOpacity>
            </View>

            {loading ? <View style={styles.loading}><ActivityIndicator color="#0D9488" /><Text style={styles.mutedText}>Loading doctor approvals...</Text></View> : error ? <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text><TouchableOpacity style={styles.outlineButton} onPress={() => loadDoctors().catch(() => undefined)}><Text style={styles.outlineButtonText}>Retry</Text></TouchableOpacity></View> : visibleDoctors.length === 0 ? (
              <View style={styles.emptyCard}><ShieldCheck size={36} color="#CBD5E1" /><Text style={styles.cardTitle}>{tab === 'pending' ? 'No pending approvals' : 'No approved doctors'}</Text><Text style={styles.mutedText}>{tab === 'pending' ? 'All doctor registrations are already reviewed.' : 'Approved teleconsultation doctors will appear here.'}</Text></View>
            ) : <View style={styles.listGap}>
              {visibleDoctors.map(doctor => {
                const id = doctorId(doctor);
                const busy = submittingId === id;
                return <View key={`${tab}-${id}`} style={styles.dataCard}>
                  <View style={styles.cardTopRow}><View style={styles.flexOne}><Text style={styles.cardTitle}>{doctor.full_name || '-'}</Text><View style={[styles.statusBadge, tab === 'pending' ? styles.statusBadgeMuted : styles.statusBadgeSuccess]}><Text style={[styles.statusText, tab === 'pending' ? styles.statusTextMuted : styles.statusTextSuccess]}>{tab === 'pending' ? 'Pending Review' : 'Approved'}</Text></View></View></View>
                  <View style={styles.approvalDetails}>
                    <Text style={styles.detailLabel}>Contact</Text><Text style={styles.detailValue}>{doctor.email || '-'}{doctor.phone ? ` · ${doctor.phone}` : ''}</Text>
                    <Text style={styles.detailLabel}>Specialization</Text><Text style={styles.detailValue}>{doctor.specialization || '-'}</Text>
                    <Text style={styles.detailLabel}>Qualification</Text><Text style={styles.detailValue}>{doctor.qualification || '-'}</Text>
                    <Text style={styles.detailLabel}>Registration No.</Text><Text style={styles.detailValue}>{doctor.registration_number || '-'}</Text>
                    <Text style={styles.detailLabel}>Consultation Fee</Text><Text style={styles.detailValue}>{doctor.consultation_fee == null ? '-' : `Rs. ${Number(doctor.consultation_fee).toLocaleString('en-IN')}`}</Text>
                    {tab === 'pending' ? <><Text style={styles.detailLabel}>Registered</Text><Text style={styles.detailValue}>{formatDate(doctor.created_at)}</Text></> : <><Text style={styles.detailLabel}>Status</Text><Text style={styles.detailValue}>Live in Marketplace</Text></>}
                  </View>
                  {tab === 'pending' ? <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.primaryButton, styles.flexButton]} onPress={() => confirmApprove(doctor)} disabled={busy}>{busy ? <ActivityIndicator size="small" color="#fff" /> : null}<Text style={styles.primaryButtonText}>Approve</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.dangerOutlineButton, styles.flexButton]} onPress={() => { setRejecting(doctor); setRejectionReason(''); }} disabled={busy}><UserRoundX size={16} color="#E11D48" /><Text style={styles.dangerText}>Reject</Text></TouchableOpacity>
                  </View> : null}
                </View>;
              })}
            </View>}
          </View>
          {!loading && !error ? <Pagination currentPage={page} totalPages={totalPages} totalItems={rows.length} pageSize={pageSize} itemLabel="doctors" pageSizeOptions={PAGE_SIZES} onPageChange={next => tab === 'pending' ? setPendingPage(next) : setApprovedPage(next)} onPageSizeChange={size => { setPageSize(size); setPendingPage(1); setApprovedPage(1); }} /> : null}
        </View>
      </ScrollView>

      <AppModal visible={Boolean(rejecting)} transparent animationType="fade" onRequestClose={() => { setRejecting(null); setRejectionReason(''); }}>
        <View style={styles.modalBackdrop}><View style={styles.formModalCard}>
          <View style={styles.modalHeader}><TouchableOpacity style={styles.modalClose} onPress={() => { setRejecting(null); setRejectionReason(''); }}><X size={18} color="#64748B" /></TouchableOpacity><Text style={styles.modalTitle}>Reject doctor registration</Text><Text style={styles.mutedText}>You can optionally provide a reason for rejecting this registration.</Text></View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
            <View style={styles.dataCard}><Text style={styles.fieldLabel}>Doctor: {rejecting?.full_name || '-'}</Text><Text style={styles.mutedText}>Registration No.: {rejecting?.registration_number || '-'}</Text></View>
            <Text style={styles.fieldLabel}>Rejection Reason (optional)</Text>
            <TextInput style={[styles.textInput, styles.textArea]} value={rejectionReason} onChangeText={setRejectionReason} placeholder="Add a note for why this registration is being rejected" placeholderTextColor="#94A3B8" multiline textAlignVertical="top" />
          </ScrollView>
          <View style={styles.modalFooter}><TouchableOpacity style={styles.outlineButton} disabled={submittingId === doctorId(rejecting || {})} onPress={() => { setRejecting(null); setRejectionReason(''); }}><Text style={styles.outlineButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.dangerButton} disabled={submittingId === doctorId(rejecting || {})} onPress={() => submitRejection()}><Text style={styles.dangerButtonText}>{submittingId === doctorId(rejecting || {}) ? 'Rejecting...' : 'Reject Doctor'}</Text></TouchableOpacity></View>
        </View></View>
      </AppModal>
    </View>
  );
}

