import React from 'react';
import { ScrollView, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Award, Building, Calendar, Clock, GraduationCap, IndianRupee, Mail, MapPin, Phone, Stethoscope, X } from 'lucide-react-native';
import { AppModal } from '../../../components/common/AppModal';
import { formatCreatedAt, UserItem } from './userManagementTypes';
import { styles } from '../styles/UserManagement.styles';

interface Props {
  user: UserItem | null;
  isMobile: boolean;
  addressLoading: boolean;
  addressError: string;
  onClose: () => void;
  onRetryAddress: () => void;
}

export function UserDetailsModal({ user, isMobile, addressLoading, addressError, onClose, onRetryAddress }: Props) {
  return (
    <AppModal visible={!!user} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.viewModalCard, isMobile && styles.viewModalCardMobile]}>
              <View style={[styles.viewModalHeader, isMobile && { padding: 12 }]}>
                <View style={styles.viewAvatarCircle}><Text style={styles.viewAvatarText}>{(user?.full_name || 'U').charAt(0).toUpperCase()}</Text></View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.viewModalName, isMobile && { fontSize: 16 }]} numberOfLines={1}>{user?.full_name}</Text>
                  <Text style={[styles.viewModalEmail, isMobile && { fontSize: 12 }]} numberOfLines={1}>{user?.email}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <View style={styles.viewRoleBadge}><Text style={styles.viewRoleBadgeText}>{user?.role}</Text></View>
                    <View style={[styles.viewActiveBadge, user?.status === 'Inactive' && { backgroundColor: '#EF4444' }]}>
                      <Text style={styles.viewActiveBadgeText}>{user?.status}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeHeaderBtn} accessibilityRole="button" accessibilityLabel="Close user details">
                  <X size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ padding: isMobile ? 12 : 16 }} showsVerticalScrollIndicator={false}>
                <View style={styles.viewSectionCard}>
                  <Text style={styles.viewSectionTitle}>Account information</Text>
                  <View style={[styles.viewGrid2Col, isMobile && { flexDirection: 'column', gap: 8 }]}>
                    <Info icon={<Mail size={14} color="#0D9488" style={{ marginRight: 6 }} />} label="Email address" value={user?.email} />
                    <Info icon={<Phone size={14} color="#0D9488" style={{ marginRight: 6 }} />} label="Phone number" value={user?.phone} />
                  </View>
                  <View style={[styles.viewInfoBox, { marginTop: 10 }]}>
                    <View style={styles.viewInfoLabelRow}><Clock size={14} color="#0D9488" style={{ marginRight: 6 }} /><Text style={styles.viewInfoLabel}>Created at</Text></View>
                    <Text style={styles.viewInfoVal}>{formatCreatedAt(user?.created_at)}</Text>
                  </View>
                </View>

                <View style={[styles.viewSectionCard, { marginTop: 14 }]}>
                  <Text style={styles.viewSectionTitle}>Professional details</Text>
                  <View style={[styles.viewGrid3Col, isMobile && { flexDirection: 'column', gap: 8 }]}>
                    <Info icon={<Building size={13} color="#0D9488" style={{ marginRight: 4 }} />} label="Department" value={user?.department || '\u2014'} small />
                    <Info icon={<Stethoscope size={13} color="#0D9488" style={{ marginRight: 4 }} />} label="Specialization" value={user?.specialization || '\u2014'} small />
                    <Info icon={<GraduationCap size={13} color="#0D9488" style={{ marginRight: 4 }} />} label="Qualification" value={user?.qualification || '\u2014'} small />
                  </View>
                  <View style={[styles.viewGrid3Col, { marginTop: 10 }, isMobile && { flexDirection: 'column', gap: 8, marginTop: 8 }]}>
                    <Info icon={<Award size={13} color="#0D9488" style={{ marginRight: 4 }} />} label="Registration number" value={user?.registration_number || '\u2014'} small />
                    <Info icon={<Clock size={13} color="#0D9488" style={{ marginRight: 4 }} />} label="Experience" value={user?.experience || '\u2014'} small />
                    <Info icon={<IndianRupee size={13} color="#0D9488" style={{ marginRight: 4 }} />} label="Consultation fee" value={`₹${user?.consultation_fee || '0.00'}`} small />
                  </View>
                  <View style={[styles.viewInfoBox, { marginTop: 10 }]}>
                    <View style={styles.viewInfoLabelRow}><Calendar size={13} color="#0D9488" style={{ marginRight: 6 }} /><Text style={styles.viewInfoLabel}>Available days</Text></View>
                    <Text style={styles.viewInfoVal}>{user?.available_days || '\u2014'}</Text>
                  </View>
                </View>

                <View style={[styles.viewSectionCard, { marginTop: 14, marginBottom: 10 }]}>
                  <View style={styles.viewInfoLabelRow}><MapPin size={14} color="#0D9488" style={{ marginRight: 6 }} /><Text style={styles.viewInfoLabel}>Address</Text></View>
                  <Text style={[styles.viewInfoVal, { marginTop: 4 }]}>{addressLoading ? 'Loading address\u2026' : addressError || user?.address || 'No address provided'}</Text>
                  {!!addressError && <TouchableOpacity onPress={onRetryAddress}><Text>Retry</Text></TouchableOpacity>}
                </View>
              </ScrollView>

              <View style={[styles.viewModalFooter, isMobile && styles.viewModalFooterMobile]}>
                <TouchableOpacity style={[styles.modalCloseFooterBtn, isMobile && { width: '100%', alignItems: 'center' }]} onPress={onClose}>
                  <Text style={styles.modalCloseFooterBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </AppModal>
  );
}

function Info({ icon, label, value, small = false }: { icon: React.ReactNode; label: string; value?: string; small?: boolean }) {
  return (
    <View style={small ? styles.viewInfoBoxSmall : styles.viewInfoBox}>
      <View style={styles.viewInfoLabelRow}>{icon}<Text style={styles.viewInfoLabel}>{label}</Text></View>
      <Text style={small ? styles.viewInfoValSmall : styles.viewInfoVal}>{value || '\u2014'}</Text>
    </View>
  );
}
