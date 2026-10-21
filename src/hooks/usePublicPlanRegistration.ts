import { useEffect, useState } from 'react';
import RazorpayCheckout from 'react-native-razorpay';
import { createPlanOrderApi, fetchPublicPlansApi, PublicPlan, registerPlanAdminApi, registerPlanClinicApi, verifyPlanPaymentApi } from '../api/publicPlanRegistrationApi';
import { useAuth } from './useAuth';

const unwrap = (response: any) => response?.data?.data ?? response?.data ?? {};

export function usePublicPlanRegistration() {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { loginStaff } = useAuth();

  useEffect(() => {
    let active = true;
    fetchPublicPlansApi().then(response => {
      const payload: any = response.data;
      const rows = Array.isArray(payload?.result) ? payload.result : Array.isArray(payload) ? payload : [];
      if (active && response.success) setPlans(rows);
      else if (active) setError(response.message || 'Could not load plans.');
    }).catch(() => { if (active) setError('Could not load plans.'); }).finally(() => { if (active) setLoadingPlans(false); });
    return () => { active = false; };
  }, []);

  const register = async (plan: PublicPlan, cycle: 'monthly' | 'yearly', form: Record<string, any>) => {
    setSubmitting(true); setError('');
    try {
      const clinicResponse = await registerPlanClinicApi({
        plan_id: plan.id,
        clinic_name: form.clinic_name.trim(),
        clinic_phone: form.clinic_phone.trim(),
        clinic_email: form.clinic_email.trim() || null,
        clinic_address: form.clinic_address.trim() || null,
        state_id: form.state_id ? Number(form.state_id) : null,
        city_id: form.city_id ? Number(form.city_id) : null,
      });
      if (!clinicResponse.success) throw new Error(clinicResponse.message || 'Clinic registration failed.');
      const clinic = unwrap(clinicResponse);
      const clinicId = Number(clinic.clinic_id ?? clinic.id);
      if (!clinicId) throw new Error('Clinic was created but its ID was not returned.');
      const price = Number(cycle === 'yearly' ? (clinic.prices?.yearly ?? plan.price_yearly) : (clinic.prices?.monthly ?? plan.price_monthly));

      if (clinic.requires_payment !== false && price > 0) {
        const orderResponse = await createPlanOrderApi({ clinic_id: clinicId, plan_id: plan.id, billing_cycle: cycle });
        const order = unwrap(orderResponse);
        if (!orderResponse.success || !order.order_id || !order.key_id) throw new Error(orderResponse.message || 'Could not prepare payment.');
        const payment = await RazorpayCheckout.open({
          key: String(order.key_id), amount: order.amount, currency: order.currency || 'INR', order_id: String(order.order_id),
          name: 'OrboDoc Clinic Management', description: `${order.plan_name || plan.plan_name} plan subscription`, theme: { color: '#0f766e' },
          prefill: { name: form.full_name, email: form.email, contact: form.phone },
        });
        const verifyResponse = await verifyPlanPaymentApi({ clinic_id: clinicId, plan_id: plan.id, billing_cycle: cycle, ...payment });
        if (!verifyResponse.success) throw new Error(verifyResponse.message || 'Payment verification failed.');
      }

      const adminResponse = await registerPlanAdminApi({
        clinic_id: clinicId, plan_id: plan.id, billing_cycle: cycle,
        full_name: form.full_name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password, confirm_password: form.confirm_password,
        ...(form.is_doctor ? { role: 'doctor', is_doctor: 1, specialization: form.specialization.trim() || null, qualification: form.qualification.trim() || null, registration_number: form.registration_number.trim() || null, experience_years: form.experience ? Number(form.experience) : null, department: form.department.trim() || null, consultation_fee: form.consultation_fee ? Number(form.consultation_fee) : null } : {}),
      });
      if (!adminResponse.success) throw new Error(adminResponse.message || 'Administrator registration failed.');
      const session = await loginStaff({ email: form.email.trim(), password: form.password });
      if (!session) throw new Error('Registration completed. Sign in with your email and password.');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Plan registration failed.');
      return false;
    } finally { setSubmitting(false); }
  };

  return { plans, loadingPlans, submitting, error, setError, register };
}
