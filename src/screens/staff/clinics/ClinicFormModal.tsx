import React from 'react';
import { Dispatch, SetStateAction } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Camera, ChevronDown, ChevronsUpDown, Clock, Edit, MapPin, Plus, X } from 'lucide-react-native';
import { AppModal } from '../../../components/common/AppModal';
import { profilePhotoUrl } from '../../../api/profilePhotoApi';
import type { ClinicFormState } from './clinicTypes';
import { styles } from '../styles/ClinicsManagement.styles';

type LocationOption = { id: string | number; state_name?: string; city_name?: string };

interface Props {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  isMobile: boolean;
  editingClinicId: string | number | null;
  clinicForm: ClinicFormState;
  setClinicForm: Dispatch<SetStateAction<ClinicFormState>>;
  stateOptions: LocationOption[];
  cityOptions: LocationOption[];
  stateLabel: string;
  cityLabel: string;
  showFormStateDropdown: boolean;
  setShowFormStateDropdown: (visible: boolean) => void;
  showFormCityDropdown: boolean;
  setShowFormCityDropdown: (visible: boolean) => void;
  showFormCountryDropdown: boolean;
  setShowFormCountryDropdown: (visible: boolean) => void;
  clinicSaving: boolean;
  logoUploading: boolean;
  logoFailed: boolean;
  setLogoFailed: (failed: boolean) => void;
  canEdit: boolean;
  canAdd: boolean;
  isMultiClinicPlan: boolean;
  handleChooseLogo: () => void;
  handleSaveClinic: () => void;
}

export function ClinicFormModal(props: Props) {
  const {
    modalVisible, setModalVisible, isMobile, editingClinicId, clinicForm,
    setClinicForm, stateOptions, cityOptions, stateLabel, cityLabel,
    showFormStateDropdown, setShowFormStateDropdown, showFormCityDropdown,
    setShowFormCityDropdown, showFormCountryDropdown, setShowFormCountryDropdown,
    clinicSaving, logoUploading, logoFailed, setLogoFailed, canEdit, canAdd,
    isMultiClinicPlan, handleChooseLogo, handleSaveClinic,
  } = props;
  return (<AppModal visible={modalVisible} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.editClinicModalCard,
                  isMobile && styles.extractedInline57,
                ]}
              >
                {/* Header */}
                <View style={styles.editClinicModalHeader}>
                  <View style={styles.editHeaderIconBox}>
                    {editingClinicId ? (
                      <Edit color="#0F172A" size={18} />
                    ) : (
                      <Plus color="#0F172A" size={18} />
                    )}
                  </View>
                  <View style={styles.extractedInline29}>
                    <Text style={styles.editClinicModalTitle}>
                      {editingClinicId
                        ? `Edit Clinic: ${clinicForm.name}`
                        : 'Register New Clinic'}
                    </Text>
                    <Text style={styles.editClinicModalSubtitle}>
                      {editingClinicId
                        ? 'Update clinic information.'
                        : 'Register a new clinic into the system.'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Form Body */}
                <ScrollView
                  style={styles.extractedInline58}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  decelerationRate="normal"
                >
                  {/* Clinic Logo Upload Box */}
                  <View style={styles.clinicLogoUploadBox}>
                    <Text style={styles.logoBoxLabel}>Clinic Logo</Text>
                    <View style={styles.cameraIconCircleBadge}>
                      {clinicForm.logo_url && !logoFailed ? (
                        <Image
                          source={{ uri: profilePhotoUrl(clinicForm.logo_url) }}
                          onError={() => setLogoFailed(true)}
                          style={styles.extractedInline59}
                        />
                      ) : (
                        <Camera size={22} color="#64748B" />
                      )}
                      <TouchableOpacity
                        style={styles.smallCloseBadge}
                        disabled={logoUploading || clinicSaving}
                        onPress={() =>
                          setClinicForm(form => ({ ...form, logo_url: '' }))
                        }
                      >
                        <X size={10} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={styles.extractedInline60}
                      disabled={logoUploading || clinicSaving}
                      onPress={handleChooseLogo}
                    >
                      <Text style={styles.changeLogoLink}>Change logo</Text>
                    </TouchableOpacity>
                    <Text style={styles.logoHelperText}>
                      PNG/JPG only, max 2MB
                    </Text>
                  </View>

                  {/* Row 1: Clinic Name & Email */}
                  <View
                    style={[
                      styles.grid2ColRow,
                      isMobile && styles.extractedInline61,
                    ]}
                  >
                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>
                        Clinic Name{' '}
                        <Text style={styles.extractedInline62}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="Aarogya Care Clinic"
                        placeholderTextColor="#94A3B8"
                        value={clinicForm.name}
                        onChangeText={v =>
                          setClinicForm({ ...clinicForm, name: v })
                        }
                      />
                    </View>

                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>
                        Email Address{' '}
                        <Text style={styles.extractedInline62}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="contact@aarogyacare.com"
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        value={clinicForm.email}
                        onChangeText={v =>
                          setClinicForm({ ...clinicForm, email: v })
                        }
                      />
                    </View>
                  </View>

                  {/* Row 2: Phone & Address */}
                  <View
                    style={[
                      styles.grid2ColRow,
                      styles.extractedInline63,
                      isMobile && styles.extractedInline64,
                    ]}
                  >
                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>
                        Phone Number{' '}
                        <Text style={styles.extractedInline62}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="9876543210"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        value={clinicForm.phone}
                        onChangeText={v =>
                          setClinicForm({ ...clinicForm, phone: v })
                        }
                      />
                    </View>

                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>
                        Address <Text style={styles.extractedInline62}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="102, Shree Heights, AB Road"
                        placeholderTextColor="#94A3B8"
                        value={clinicForm.address}
                        onChangeText={v =>
                          setClinicForm({ ...clinicForm, address: v })
                        }
                      />
                    </View>
                  </View>

                  {/* Row 3: State & City Dropdowns */}
                  <View
                    style={[
                      styles.grid2ColRow,
                      styles.extractedInline63,
                      isMobile && styles.extractedInline64,
                    ]}
                  >
                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>
                        State <Text style={styles.extractedInline62}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.formDropdownSelectTrigger}
                        onPress={() =>
                          setShowFormStateDropdown(!showFormStateDropdown)
                        }
                      >
                        <View style={styles.extractedInline23}>
                          <MapPin
                            size={14}
                            color="#64748B"
                            style={styles.extractedInline7}
                          />
                          <Text style={styles.formDropdownText}>
                            {stateLabel}
                          </Text>
                        </View>
                        <ChevronDown size={16} color="#64748B" />
                      </TouchableOpacity>

                      {showFormStateDropdown && (
                        <View style={styles.formDropdownList}>
                          {stateOptions.map(st => (
                            <TouchableOpacity
                              key={st.id}
                              style={styles.formDropdownListItem}
                              onPress={() => {
                                setClinicForm({
                                  ...clinicForm,
                                  state: String(st.id),
                                  city: '',
                                });
                                setShowFormStateDropdown(false);
                              }}
                            >
                              <Text style={styles.formDropdownItemText}>
                                {st.state_name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>
                        City <Text style={styles.extractedInline62}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.formDropdownSelectTrigger}
                        onPress={() =>
                          setShowFormCityDropdown(!showFormCityDropdown)
                        }
                      >
                        <View style={styles.extractedInline23}>
                          <MapPin
                            size={14}
                            color="#64748B"
                            style={styles.extractedInline7}
                          />
                          <Text style={styles.formDropdownText}>
                            {cityLabel}
                          </Text>
                        </View>
                        <ChevronDown size={16} color="#64748B" />
                      </TouchableOpacity>

                      {showFormCityDropdown && (
                        <View style={styles.formDropdownList}>
                          {cityOptions.map(ct => (
                            <TouchableOpacity
                              key={ct.id}
                              style={styles.formDropdownListItem}
                              onPress={() => {
                                setClinicForm({
                                  ...clinicForm,
                                  city: String(ct.id),
                                });
                                setShowFormCityDropdown(false);
                              }}
                            >
                              <Text style={styles.formDropdownItemText}>
                                {ct.city_name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Row 4: Country & Website */}
                  <View
                    style={[
                      styles.grid2ColRow,
                      styles.extractedInline63,
                      isMobile && styles.extractedInline64,
                    ]}
                  >
                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>
                        Country <Text style={styles.extractedInline62}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.formDropdownSelectTrigger}
                        onPress={() =>
                          setShowFormCountryDropdown(!showFormCountryDropdown)
                        }
                      >
                        <Text style={styles.formDropdownText}>
                          {clinicForm.country}
                        </Text>
                        <ChevronDown size={16} color="#64748B" />
                      </TouchableOpacity>

                      {showFormCountryDropdown && (
                        <View style={styles.formDropdownList}>
                          {[
                            'India',
                            'United States',
                            'United Kingdom',
                            'UAE',
                          ].map(cn => (
                            <TouchableOpacity
                              key={cn}
                              style={styles.formDropdownListItem}
                              onPress={() => {
                                setClinicForm({ ...clinicForm, country: cn });
                                setShowFormCountryDropdown(false);
                              }}
                            >
                              <Text style={styles.formDropdownItemText}>
                                {cn}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>Website</Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="https://clinic.example.com"
                        placeholderTextColor="#94A3B8"
                        value={clinicForm.website}
                        onChangeText={v =>
                          setClinicForm({ ...clinicForm, website: v })
                        }
                      />
                    </View>
                  </View>

                  {/* Row 5: License Number & Available Days */}
                  <View
                    style={[
                      styles.grid2ColRow,
                      styles.extractedInline63,
                      isMobile && styles.extractedInline64,
                    ]}
                  >
                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>License Number</Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="L123"
                        placeholderTextColor="#94A3B8"
                        value={clinicForm.license_number}
                        onChangeText={v =>
                          setClinicForm({ ...clinicForm, license_number: v })
                        }
                      />
                    </View>

                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>Available Days</Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="Mon,Tue,Wed,Thu,Fri"
                        placeholderTextColor="#94A3B8"
                        value={clinicForm.available_days}
                        onChangeText={v =>
                          setClinicForm({ ...clinicForm, available_days: v })
                        }
                      />
                    </View>
                  </View>

                  {/* Row 6: Available From & Available To */}
                  <View
                    style={[
                      styles.grid2ColRow,
                      styles.extractedInline63,
                      isMobile && styles.extractedInline64,
                    ]}
                  >
                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>Available From</Text>
                      <View style={styles.formInputBoxWithIcon}>
                        <Clock
                          size={14}
                          color="#64748B"
                          style={styles.extractedInline7}
                        />
                        <TextInput
                          style={styles.formInputBoxBare}
                          placeholder="12:30 AM"
                          placeholderTextColor="#94A3B8"
                          value={clinicForm.available_from}
                          onChangeText={v =>
                            setClinicForm({ ...clinicForm, available_from: v })
                          }
                        />
                        <ChevronsUpDown size={14} color="#64748B" />
                      </View>
                      <Text style={styles.apiTimeHelperText}>
                        API time: 00:30:00 (24-hour format)
                      </Text>
                    </View>

                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>Available To</Text>
                      <View style={styles.formInputBoxWithIcon}>
                        <Clock
                          size={14}
                          color="#64748B"
                          style={styles.extractedInline7}
                        />
                        <TextInput
                          style={styles.formInputBoxBare}
                          placeholder="02:30 AM"
                          placeholderTextColor="#94A3B8"
                          value={clinicForm.available_to}
                          onChangeText={v =>
                            setClinicForm({ ...clinicForm, available_to: v })
                          }
                        />
                        <ChevronsUpDown size={14} color="#64748B" />
                      </View>
                      <Text style={styles.apiTimeHelperText}>
                        API time: 02:30:00 (24-hour format)
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                {/* Footer Buttons */}
                <View style={styles.addAdminFooterRow}>
                  <TouchableOpacity
                    style={styles.addAdminCancelBtn}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.addAdminCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.addAdminSubmitBtn}
                    onPress={handleSaveClinic}
                    disabled={
                      logoUploading ||
                      clinicSaving ||
                      (editingClinicId
                        ? !canEdit
                        : !canAdd || !isMultiClinicPlan)
                    }
                  >
                    {clinicSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        {editingClinicId ? (
                            <Edit
                            size={15}
                            color="#FFFFFF"
                            style={styles.extractedInline7}
                          />
                        ) : (
                          <Plus
                            size={15}
                            color="#FFFFFF"
                            style={styles.extractedInline7}
                          />
                        )}
                        <Text style={styles.addAdminSubmitText}>
                          {editingClinicId
                            ? 'Update Clinic'
                            : 'Register Clinic'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </AppModal>  );
}
