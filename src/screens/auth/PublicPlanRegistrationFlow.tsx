import { colors, radii, spacing, typography } from '../../theme/tokens';
import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LiquidBorderScrollView } from '../../components/common/LiquidBorderScrollView';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Eye, EyeOff, Search, X } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';
import { PublicPlan } from '../../api/publicPlanRegistrationApi';
import { RegistrationLocation } from '../../hooks/usePublicRegistration';
import { usePublicPlanRegistration } from '../../hooks/usePublicPlanRegistration';

type Props = { states: RegistrationLocation[]; cities: RegistrationLocation[]; selectedStateId: number | null; locationsLoading: boolean; citiesLoading: boolean; onSelectState: (id: number | null) => void; onReady: () => void; onBack: () => void };
const phonePattern = /^[6-9]\d{9}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PublicPlanRegistrationFlow(props: Props) {
  const flow = usePublicPlanRegistration();
  const [plan, setPlan] = useState<PublicPlan | null>(null);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [picker, setPicker] = useState<'state' | 'city' | null>(null);
  const [query, setQuery] = useState('');
  const [values, setValues] = useState<Record<string, string>>({ is_doctor: '' });
  const [doctor, setDoctor] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activePlanIndex, setActivePlanIndex] = useState(0);
  const [planTrackWidth, setPlanTrackWidth] = useState(0);
  const planCarousel = useRef<any>(null);
  const { width: windowWidth } = useWindowDimensions();
  const planCardWidth = Math.max(220, (planTrackWidth || windowWidth - 100) - 16);
  const set = (key: string, value: string) => { setValues(current => ({ ...current, [key]: value })); setLocalError(''); flow.setError(''); };
  const options = picker === 'state' ? props.states : props.cities;
  const filtered = useMemo(() => options.filter(row => row.name.toLowerCase().includes(query.trim().toLowerCase())), [options, query]);

  React.useEffect(() => {
    if (!flow.loadingPlans) props.onReady();
  }, [flow.loadingPlans, props.onReady]);

  const submit = async () => {
    if (!plan) return;
    const required = ['clinic_name', 'clinic_phone', 'full_name', 'email', 'phone', 'password', 'confirm_password'];
    if (required.some(key => !values[key]?.trim())) return setLocalError('Please complete all required fields.');
    if (!phonePattern.test(values.clinic_phone.trim()) || !phonePattern.test(values.phone.trim())) return setLocalError('Enter valid 10-digit Indian mobile numbers.');
    if (!emailPattern.test(values.email.trim())) return setLocalError('Enter a valid email address.');
    if (values.clinic_email?.trim() && !emailPattern.test(values.clinic_email.trim())) return setLocalError('Enter a valid clinic email address.');
    if (values.password.length < 8) return setLocalError('Password must be at least 8 characters.');
    if (values.password !== values.confirm_password) return setLocalError('Passwords do not match.');
    if (doctor && (!values.department?.trim() || !values.specialization?.trim() || !values.registration_number?.trim() || !values.consultation_fee?.trim())) return setLocalError('Complete the required doctor profile fields.');
    const stateId = props.selectedStateId;
    const cityId = props.cities.find(row => row.name === values.city)?.id;
    if (values.state && !stateId) return setLocalError('Select a state from the list.');
    if (values.city && !cityId) return setLocalError('Select a city from the list.');
    const ok = await flow.register(plan, cycle, { ...values, state_id: stateId, city_id: cityId, is_doctor: doctor });
    if (ok) props.onBack();
  };

  const field = (key: string, label: string, placeholder: string, opts: { keyboard?: 'default' | 'email-address' | 'phone-pad' | 'decimal-pad'; secure?: boolean; required?: boolean } = {}) => <View style={styles.field} key={key}><Text style={styles.label}>{label}{opts.required === false ? null : <Text style={styles.required}> *</Text>}</Text><View style={opts.secure ? styles.passwordRow : undefined}><TextInput style={opts.secure ? styles.passwordInput : styles.input} value={values[key] || ''} onChangeText={value => set(key, key.includes('phone') ? value.replace(/\D/g, '').slice(0, 10) : value)} keyboardType={opts.keyboard || 'default'} autoCapitalize={opts.secure || opts.keyboard === 'email-address' ? 'none' : 'sentences'} secureTextEntry={opts.secure && !(key === 'password' ? showPassword : showConfirmPassword)} placeholder={placeholder} placeholderTextColor={colors.subtle} />{opts.secure ? <TouchableOpacity onPress={() => key === 'password' ? setShowPassword(current => !current) : setShowConfirmPassword(current => !current)}><Text style={styles.show}>{(key === 'password' ? showPassword : showConfirmPassword) ? <EyeOff size={18} color={colors.muted} /> : <Eye size={18} color={colors.muted} />}</Text></TouchableOpacity> : null}</View></View>;
  const pick = (key: 'state' | 'city', title: string, placeholder: string, disabled = false) => <View style={styles.field}><Text style={styles.label}>{title}</Text><TouchableOpacity disabled={disabled} style={[styles.input, styles.select, disabled && styles.disabled]} onPress={() => { setPicker(key); setQuery(''); }}><Text style={values[key] ? styles.value : styles.placeholder}>{values[key] || placeholder}</Text><ChevronDown size={18} color={colors.muted} /></TouchableOpacity></View>;

  return <View style={styles.page}>
    {plan ? <TouchableOpacity style={styles.back} onPress={() => setPlan(null)}><ArrowLeft size={18} color={colors.primaryDark} /><Text style={styles.backText}>Back to plans</Text></TouchableOpacity> : null}
    {flow.error || localError ? <Text style={styles.error}>{localError || flow.error}</Text> : null}
    {!plan ? <>
      <Text style={styles.title}>Choose Your Plan</Text><Text style={styles.subtitle}>Select a clinic plan and billing cycle to continue.</Text>
      <View style={styles.cycles}>{(['monthly', 'yearly'] as const).map(value => <TouchableOpacity key={value} style={[styles.cycle, cycle === value && styles.cycleActive]} onPress={() => setCycle(value)}><Text style={[styles.cycleText, cycle === value && styles.cycleTextActive]}>{value === 'monthly' ? 'Monthly' : 'Yearly'}</Text></TouchableOpacity>)}</View>
      {flow.loadingPlans ? <ActivityIndicator color={colors.successDark} /> : flow.plans.length === 0 ? <Text style={styles.empty}>No plans are available right now.</Text> : <>
        <LiquidBorderScrollView ref={planCarousel} horizontal snapToInterval={planCardWidth + 14} decelerationRate="fast" showsHorizontalScrollIndicator={false} style={[styles.planTrack, { marginHorizontal: -18, paddingLeft: 18 }]} onLayout={event => setPlanTrackWidth(event.nativeEvent.layout.width)} contentContainerStyle={styles.planTrackContent} onMomentumScrollEnd={event => setActivePlanIndex(Math.min(flow.plans.length - 1, Math.round(event.nativeEvent.contentOffset.x / (planCardWidth + 14))))}>
          {flow.plans.map((item, index) => {
            const price = Number(cycle === 'yearly' ? item.price_yearly : item.price_monthly);
            const highlighted = index === 1;
            const featureList = (item.features || []).filter(feature => Number(feature.is_enabled) === 1 && feature.object_name).slice(0, 6);
            const summary = item.plan_type === 'multi' ? 'For multi-clinic teams needing centralized operations and scale.' : 'For single clinics launching and growing with structured workflows.';
            return <View key={item.id} style={[styles.planCard, { width: planCardWidth }, highlighted && styles.planCardFeatured]}>
              <View style={styles.planTop}><Text style={[styles.planType, highlighted && styles.featuredMuted]}>{item.plan_name}</Text>{highlighted ? <Text style={styles.popular}>MOST POPULAR</Text> : null}</View>
              <Text style={[styles.price, highlighted && styles.featuredText]}>{price > 0 ? `Rs ${price.toLocaleString('en-IN')}` : 'Free'}</Text>
              <Text style={[styles.period, highlighted && styles.featuredMuted]}>{price > 0 ? `/${cycle === 'yearly' ? 'year' : 'month'}` : ''}</Text>
              <Text style={[styles.planSummary, highlighted && styles.featuredSummary]}>{summary}</Text>
              <View style={styles.featureList}>{featureList.map((feature, i) => <View key={`${feature.object_name}-${i}`} style={[styles.featureRow, highlighted && styles.featureRowFeatured]}><CheckCircle2 size={16} color={highlighted ? '#9ff7e8' : colors.primaryDark} /><Text numberOfLines={1} style={[styles.feature, highlighted && styles.featuredText]}>{String(feature.object_name).split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')}</Text></View>)}</View>
              <TouchableOpacity style={[styles.planCta, highlighted && styles.planCtaFeatured]} onPress={() => setPlan(item)}><Text style={[styles.planCtaText, highlighted && styles.planCtaTextFeatured]}>{price > 0 ? 'Choose Paid Plan' : 'Choose Free Plan'}</Text><ArrowRight size={16} color={highlighted ? colors.primaryDark : colors.surface} /></TouchableOpacity>
            </View>;
          })}
        </LiquidBorderScrollView>
        <View style={styles.pagination}><TouchableOpacity style={styles.pageArrow} disabled={activePlanIndex === 0} onPress={() => planCarousel.current?.scrollTo({ x: Math.max(0, activePlanIndex - 1) * (planCardWidth + 14), animated: true })}><ArrowLeft size={17} color={colors.primaryDark} /></TouchableOpacity><View style={styles.dots}>{flow.plans.map((item, index) => <TouchableOpacity key={item.id} onPress={() => planCarousel.current?.scrollTo({ x: index * (planCardWidth + 14), animated: true })} style={[styles.dot, activePlanIndex === index && styles.dotActive]} />)}</View><TouchableOpacity style={styles.pageArrow} disabled={activePlanIndex >= flow.plans.length - 1} onPress={() => planCarousel.current?.scrollTo({ x: Math.min(flow.plans.length - 1, activePlanIndex + 1) * (planCardWidth + 14), animated: true })}><ArrowRight size={17} color={colors.primaryDark} /></TouchableOpacity></View>
      </>}
    </> : <LiquidBorderScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
      <Text style={styles.title}>Register your clinic</Text><Text style={styles.subtitle}>Plan: {plan.plan_name} · {cycle}</Text>
      {field('clinic_name', 'Clinic Name', 'e.g. Arogya Health Clinic')}
      {field('clinic_phone', 'Clinic Phone', '9876543210', { keyboard: 'phone-pad' })}
      {field('clinic_email', 'Clinic Email', 'clinic@example.com', { keyboard: 'email-address', required: false })}
      {field('clinic_address', 'Clinic Address', 'Street, area, building', { required: false })}
      {pick('state', 'State', props.locationsLoading ? 'Loading states...' : 'Select state / UT', props.locationsLoading)}
      {pick('city', 'City', !props.selectedStateId ? 'Select state first' : props.citiesLoading ? 'Loading cities...' : 'Select city', !props.selectedStateId || props.citiesLoading)}
      <Text style={styles.section}>Clinic administrator</Text>
      {field('full_name', 'Full Name', 'Your full name')}
      {field('email', 'Email Address', 'admin@yourclinic.com', { keyboard: 'email-address' })}
      {field('phone', 'Phone Number', '9876543210', { keyboard: 'phone-pad' })}
      <View style={styles.field}><Text style={styles.label}>Password<Text style={styles.required}> *</Text></Text><View style={styles.passwordRow}><TextInput style={styles.passwordInput} value={values.password || ''} onChangeText={value => set('password', value)} secureTextEntry={!showPassword} placeholder="Min. 8 characters" placeholderTextColor={colors.subtle} /><TouchableOpacity onPress={() => setShowPassword(value => !value)}><Text style={styles.show}>{showPassword ? 'Hide' : 'Show'}</Text></TouchableOpacity></View></View>
      {field('confirm_password', 'Confirm Password', 'Re-enter password', { secure: true })}
      <View style={styles.doctorRow}><Text style={styles.doctorLabel}>Register the owner as a doctor too</Text><Switch value={doctor} onValueChange={setDoctor} trackColor={{ false: colors.input, true: colors.mintBorder }} thumbColor={doctor ? colors.successDark : colors.background} /></View>
      {doctor ? <>{field('department', 'Department', 'e.g. General Medicine')}{field('specialization', 'Specialization', 'e.g. General Physician')}{field('experience', 'Experience (Years)', 'e.g. 8', { keyboard: 'decimal-pad', required: false })}{field('qualification', 'Qualification', 'e.g. MBBS, MD', { required: false })}{field('registration_number', 'Medical Registration No.', 'e.g. MMC123456')}{field('consultation_fee', 'Consultation Fee', 'e.g. 500', { keyboard: 'decimal-pad' })}</> : null}
      <TouchableOpacity disabled={flow.submitting} style={[styles.primary, flow.submitting && styles.disabled]} onPress={() => void submit()}>{flow.submitting ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Continue</Text>}</TouchableOpacity>
    </LiquidBorderScrollView>}
    <Modal transparent visible={picker !== null} animationType="fade" onRequestClose={() => setPicker(null)}><View style={styles.modalBackdrop}><View style={styles.pickerCard}><View style={styles.pickerHeader}><Text style={styles.section}>Select {picker}</Text><TouchableOpacity onPress={() => setPicker(null)}><X size={20} color={colors.muted} /></TouchableOpacity></View><View style={styles.search}><Search size={16} color={colors.muted} /><TextInput style={styles.searchInput} placeholder={`Search ${picker}...`} value={query} onChangeText={setQuery} /></View><FlatList data={filtered} keyExtractor={row => String(row.id)} ListEmptyComponent={<Text style={styles.empty}>No matching options.</Text>} renderItem={({ item }) => <TouchableOpacity style={styles.option} onPress={() => { if (picker === 'state') { set('state', item.name); set('city', ''); void props.onSelectState(item.id); } else set('city', item.name); setPicker(null); }}><Text style={styles.value}>{item.name}</Text></TouchableOpacity>} /></View></View></Modal>
  </View>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background, padding: 18, borderRadius: 20 }, back: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: spacing.sm }, backText: { color: colors.primaryDark, fontWeight: typography.weight.bold }, title: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.title, fontWeight: typography.weight.extrabold, marginTop: spacing.md }, subtitle: { color: colors.muted, marginTop: spacing.xs, marginBottom: 18 }, cycles: { alignSelf: 'center', width: 190, flexDirection: 'row', backgroundColor: colors.surface, borderColor: '#cde2de', borderWidth: 1, borderRadius: 24, padding: spacing.xs, marginBottom: 15 }, cycle: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 22 }, cycleActive: { backgroundColor: colors.primaryDark }, cycleText: { color: '#35505a', fontWeight: typography.weight.bold }, cycleTextActive: { color: colors.surface }, planTrack: { height: 580, width: '100%' }, planTrackContent: { gap: 14, paddingTop: 3, paddingBottom: spacing.md, paddingRight: 18 }, planCard: { height: 560, backgroundColor: colors.surface, borderRadius: 23, borderWidth: 1, borderColor: '#dbe8e6', padding: spacing.lg, shadowColor: colors.text, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 3 }, planCardFeatured: { backgroundColor: '#0b3a46', borderColor: colors.primaryDark }, planTop: { minHeight: 38 }, planType: { fontFamily: typography.family, color: '#67808b', marginTop: 2, fontSize: typography.size.sm, fontWeight: typography.weight.extrabold, textTransform: 'uppercase' }, popular: { fontFamily: typography.family, color: colors.surface, fontSize: typography.size.micro, fontWeight: typography.weight.extrabold, marginTop: 9 }, price: { fontFamily: typography.family, color: colors.text, fontSize: 29, fontWeight: typography.weight.black, marginTop: 13 }, featuredText: { color: colors.surface }, period: { fontFamily: typography.family, color: '#6a8088', fontSize: typography.size.caption, fontWeight: typography.weight.medium, marginTop: -1 }, featuredMuted: { color: 'rgba(255,255,255,0.72)' }, planSummary: { fontFamily: typography.family, color: '#556874', fontSize: typography.size.caption, lineHeight: 22, marginTop: 14 }, featuredSummary: { color: 'rgba(255,255,255,0.8)' }, featureList: { flex: 1, gap: spacing.sm, marginTop: 13 }, featureRow: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 37, borderWidth: 1, borderColor: '#e7f0ef', backgroundColor: '#f8fcfb', borderRadius: radii.lg, paddingHorizontal: 10 }, featureRowFeatured: { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.06)' }, feature: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.sm, flex: 1 }, planCta: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 26, marginBottom: 10, borderRadius: radii.lg, backgroundColor: colors.primaryDark }, planCtaFeatured: { backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }, planCtaText: { fontFamily: typography.family, color: colors.surface, fontSize: typography.size.caption, fontWeight: typography.weight.extrabold }, planCtaTextFeatured: { color: colors.primaryDark }, pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 13, paddingTop: 7, paddingBottom: spacing.md }, pageArrow: { width: 36, height: 36, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#cfe3df', alignItems: 'center', justifyContent: 'center' }, dots: { flexDirection: 'row', alignItems: 'center', gap: 7 }, dot: { width: 9, height: 9, borderRadius: radii.sm, backgroundColor: '#bdd8d3' }, dotActive: { width: 26, backgroundColor: colors.primaryDark }, primary: { minHeight: 49, borderRadius: radii.lg, marginTop: spacing.md, backgroundColor: colors.successDark, alignItems: 'center', justifyContent: 'center' }, primaryText: { fontFamily: typography.family, color: colors.surface, fontSize: 15, fontWeight: typography.weight.extrabold }, field: { marginBottom: spacing.md }, label: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.body, fontWeight: typography.weight.bold, marginBottom: spacing.tiny }, required: { color: colors.destructive }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.input, borderRadius: radii.lg, backgroundColor: colors.surface, paddingHorizontal: 13, color: colors.text }, select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13 }, value: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.body }, placeholder: { color: colors.subtle }, section: { fontFamily: typography.family, color: colors.text, fontSize: 17, fontWeight: typography.weight.extrabold, marginTop: spacing.md, marginBottom: 10 }, form: { paddingBottom: spacing.xxl }, passwordRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.input, borderRadius: radii.lg, backgroundColor: colors.surface, paddingHorizontal: spacing.md }, passwordInput: { flex: 1, color: colors.text, paddingVertical: 10 }, show: { color: colors.primaryDark, fontWeight: typography.weight.bold, padding: 5 }, doctorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.mint, borderRadius: radii.lg, padding: spacing.md, marginVertical: 5 }, doctorLabel: { flex: 1, color: colors.foreground, fontWeight: typography.weight.semibold }, disabled: { opacity: 0.6 }, error: { color: colors.destructiveDark, backgroundColor: colors.destructiveSoft, borderColor: colors.destructiveSoft, borderWidth: 1, borderRadius: 11, padding: 11, marginVertical: spacing.sm }, empty: { color: colors.muted, textAlign: 'center', padding: 18 }, modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 22 }, pickerCard: { backgroundColor: colors.surface, borderRadius: 18, maxHeight: '75%', overflow: 'hidden' }, pickerHeader: { padding: 15, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, search: { margin: spacing.md, paddingHorizontal: 11, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md }, searchInput: { flex: 1, color: colors.text }, option: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border } });
