import React from 'react';
import { ScrollView, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Building2, CalendarDays, Mail, MapPin, X } from 'lucide-react-native';
import { AppModal } from '../../../components/common/AppModal';
import type { ClinicItem } from './clinicTypes';
import { formatClinicDate, formatClinicTime } from './clinicUtils';
import { styles } from '../styles/ClinicsManagement.styles';

interface Props {
  viewClinicModal: ClinicItem | null;
  isMobile: boolean;
  resolvedViewClinicState: string;
  resolvedViewClinicCity: string;
  onClose: () => void;
}

export function ClinicDetailsModal({ viewClinicModal, isMobile, resolvedViewClinicState, resolvedViewClinicCity, onClose }: Props) {
  return (<AppModal visible={!!viewClinicModal} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => onClose()}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.viewClinicCard,
                  isMobile && styles.extractedInline57,
                ]}
              >
                {/* Header Banner */}
                <View style={styles.viewClinicHeader}>
                  <View style={styles.clinicLogoSquareLarge}>
                    <Building2 color="#27A599" size={24} />
                  </View>
                  <View style={styles.extractedInline65}>
                    <Text style={styles.viewClinicTitle}>
                      {viewClinicModal?.name}
                    </Text>
                    <Text style={styles.viewClinicSubtitle}>
                      {resolvedViewClinicCity || viewClinicModal?.city
                        ? `${
                            resolvedViewClinicCity || viewClinicModal?.city
                          } â€¢ `
                        : ''}
                      {viewClinicModal?.country || 'India'}
                    </Text>
                    <View style={styles.viewClinicStatusTag}>
                      <Text style={styles.viewClinicStatusText}>
                        {viewClinicModal?.status}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => onClose()}
                    style={styles.extractedInline66}
                  >
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.extractedInline67}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  decelerationRate="normal"
                >
                  {/* Contact & Identity Section */}
                  <View style={styles.viewSectionCard}>
                    <View style={styles.sectionHeaderTitleRow}>
                      <Mail
                        size={15}
                        color="#27A599"
                        style={styles.extractedInline7}
                      />
                      <Text style={styles.viewSectionCardTitle}>
                        Contact & Identity
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.grid2ColRow,
                        isMobile && styles.extractedInline68,
                      ]}
                    >
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>Email Address</Text>
                        <Text style={styles.infoBoxVal}>
                          {viewClinicModal?.email || '—'}
                        </Text>
                      </View>
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>Phone Number</Text>
                        <Text style={styles.infoBoxVal}>
                          {viewClinicModal?.phone || '—'}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.grid2ColRow,
                        styles.extractedInline69,
                        isMobile && styles.extractedInline70,
                      ]}
                    >
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>Website</Text>
                        <Text style={styles.infoBoxVal}>
                          {viewClinicModal?.website || '—'}
                        </Text>
                      </View>
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>License Number</Text>
                        <Text style={styles.infoBoxVal}>
                          {viewClinicModal?.license_number || '—'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Location Section */}
                  <View
                    style={[styles.viewSectionCard, styles.extractedInline71]}
                  >
                    <View style={styles.sectionHeaderTitleRow}>
                      <MapPin
                        size={15}
                        color="#27A599"
                        style={styles.extractedInline7}
                      />
                      <Text style={styles.viewSectionCardTitle}>Location</Text>
                    </View>
                    <View
                      style={[
                        styles.grid2ColRow,
                        isMobile && styles.extractedInline68,
                      ]}
                    >
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>Address</Text>
                        <Text style={styles.infoBoxVal}>
                          {viewClinicModal?.address || '—'}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.grid2ColRow,
                        styles.extractedInline69,
                        isMobile && styles.extractedInline70,
                      ]}
                    >
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>City</Text>
                        <Text style={styles.infoBoxVal}>
                          {resolvedViewClinicCity ||
                            viewClinicModal?.city ||
                            '—'}
                        </Text>
                      </View>
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>State</Text>
                        <Text style={styles.infoBoxVal}>
                          {resolvedViewClinicState ||
                            viewClinicModal?.state ||
                            '—'}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.grid2ColRow,
                        styles.extractedInline69,
                        isMobile && styles.extractedInline70,
                      ]}
                    >
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>Country</Text>
                        <Text style={styles.infoBoxVal}>
                          {viewClinicModal?.country || 'India'}
                        </Text>
                      </View>
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>Created</Text>
                        <Text style={styles.infoBoxVal}>
                          {formatClinicDate(viewClinicModal?.created_at)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Availability Section */}
                  <View
                    style={[
                      styles.viewSectionCard,
                      styles.availabilityBgCard,
                      styles.extractedInline72,
                    ]}
                  >
                    <View style={styles.sectionHeaderTitleRow}>
                      <CalendarDays
                        size={15}
                        color="#27A599"
                        style={styles.extractedInline7}
                      />
                      <Text style={styles.viewSectionCardTitle}>
                        Availability
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.grid3ColRow,
                        isMobile && styles.extractedInline68,
                      ]}
                    >
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>Available Days</Text>
                        <Text style={styles.infoBoxVal}>
                          {viewClinicModal?.available_days || '—'}
                        </Text>
                      </View>
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>Available From</Text>
                        <Text style={styles.infoBoxVal}>
                          {formatClinicTime(viewClinicModal?.available_from)}
                        </Text>
                      </View>
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>Available To</Text>
                        <Text style={styles.infoBoxVal}>
                          {formatClinicTime(viewClinicModal?.available_to)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                {/* Footer */}
                <View style={styles.viewClinicFooter}>
                  <TouchableOpacity
                    style={styles.viewClinicCloseBtn}
                    onPress={() => onClose()}
                  >
                    <Text style={styles.viewClinicCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </AppModal>  );
}
