export type StaffRole =
  | 'super_admin'
  | 'clinic_admin'
  | 'doctor'
  | 'receptionist'
  | 'pharmacist'
  | 'lab_technician'
  | 'accountant'
  | 'nurse'
  | 'patient';

export interface Clinic {
  id: number;
  name: string;
  code?: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  status: 'active' | 'inactive' | 'suspended';
  subscription_plan?: string;
  max_doctors?: number;
  created_at?: string;
  doctors_count?: number;
  patients_count?: number;
}

export interface StaffMember {
  id: number;
  clinic_id: number;
  clinic_name?: string;
  full_name: string;
  email: string;
  phone: string;
  role_name: StaffRole;
  role_id?: number;
  department?: string;
  specialization?: string;
  qualification?: string;
  consultation_fee?: number;
  is_active: boolean;
  profile_photo?: string;
  created_at?: string;
}

export interface PatientModel {
  id: number;
  clinic_id?: number;
  full_name: string;
  phone: string;
  email?: string;
  gender?: 'male' | 'female' | 'other' | string;
  date_of_birth?: string;
  dob?: string;
  age?: number | string;
  blood_group?: string;
  address?: string;
  city?: string;
  state?: string;
  patient_code?: string;
  emergency_contact?: string;
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  allergies?: string;
  chronic_conditions?: string;
  medical_history?: string;
  current_medications?: string;
  registered_at?: string;
  created_at?: string;
  last_visit?: string;
  is_active?: boolean;
}

export interface Appointment {
  id: number;
  clinic_id?: number;
  patient_id: number;
  doctor_id?: number;
  patient_name?: string;
  patient_phone?: string;
  doctor_name?: string;
  doctor_specialization?: string;
  clinic_name?: string;
  appointment_date: string;
  appointment_time?: string;
  time_slot?: string;
  consultation_mode?: string;
  type?: 'consultation' | 'follow_up' | 'emergency' | 'teleconsultation' | string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'approved' | 'complete' | 'cancel' | string;
  reason?: string;
  notes?: string;
  created_at?: string;
}

export interface PrescriptionItem {
  id?: number;
  prescription_id?: number;
  medicine_id?: number;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity: number;
}

export interface Prescription {
  id: number;
  clinic_id: number;
  appointment_id?: number;
  patient_id: number;
  patient_name: string;
  patient_age?: number;
  patient_gender?: string;
  doctor_id: number;
  doctor_name: string;
  diagnosis: string;
  symptoms?: string;
  vital_bp?: string;
  vital_pulse?: string;
  vital_temp?: string;
  vital_weight?: string;
  notes?: string;
  created_at: string;
  items: PrescriptionItem[];
}

export interface Medicine {
  id: number;
  clinic_id: number;
  name: string;
  generic_name?: string;
  category: string;
  manufacturer?: string;
  batch_number?: string;
  expiry_date?: string;
  unit_price: number;
  selling_price: number;
  stock_quantity: number;
  reorder_level: number;
  location_rack?: string;
  is_active: boolean;
}

export interface MedicineBillItem {
  id?: number;
  medicine_id: number;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  tax_pct: number;
  total_price: number;
}

export interface MedicineBill {
  id: number;
  clinic_id: number;
  patient_id: number;
  patient_name: string;
  prescription_id?: number;
  bill_number: string;
  bill_date: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  payment_status: 'paid' | 'pending' | 'partially_paid' | 'cancelled';
  payment_mode?: 'cash' | 'card' | 'upi' | 'insurance';
  created_by_name?: string;
  items: MedicineBillItem[];
}

export interface TreatmentBillItem {
  id?: number;
  service_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  tax_pct: number;
  total_price: number;
}

export interface TreatmentBill {
  id: number;
  clinic_id: number;
  patient_id: number;
  patient_name: string;
  appointment_id?: number;
  bill_number: string;
  bill_date: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  payment_status: 'paid' | 'pending' | 'partially_paid' | 'cancelled';
  payment_mode?: 'cash' | 'card' | 'upi' | 'insurance';
  items: TreatmentBillItem[];
}

export interface LabTestOrder {
  id: number;
  clinic_id: number;
  patient_id: number;
  patient_name?: string;
  patient_phone?: string;
  patient_code?: string;
  doctor_id?: number;
  doctor_name?: string;
  test_name: string;
  test_code?: string;
  category?: string;
  cost?: number;
  price?: number;
  urgency?: string;
  status: 'ordered' | 'sample_collected' | 'processing' | 'in_progress' | 'completed' | 'verified' | 'cancelled' | string;
  ordered_date?: string;
  created_at?: string;
  sample_collected_at?: string;
  report_id?: number;
  report_ready?: number | boolean;
  report_uploaded_at?: string;
}

export interface LabReport {
  id: number;
  clinic_id?: number;
  test_order_id?: number;
  lab_test_id?: number;
  patient_id?: number;
  patient_name?: string;
  test_name?: string;
  technician_name?: string;
  lab_technician_id?: number;
  result_summary?: string;
  report_data?: any;
  findings?: string;
  remarks?: string;
  reference_range?: string;
  is_abnormal?: number | boolean;
  status?: 'draft' | 'final' | 'verified' | string;
  file_url?: string;
  report_file_url?: string;
  file_name?: string;
  created_at?: string;
  uploaded_at?: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'appointment' | 'prescription' | 'billing' | 'lab' | 'system' | 'broadcast';
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: number;
  clinic_id?: number;
  user_id: number;
  user_type: 'staff' | 'patient';
  user_name: string;
  user_role: string;
  action: string;
  table_name: string;
  record_id?: number;
  ip_address?: string;
  details?: string;
  created_at: string;
}

export interface ClinicDashboardStats {
  todayAppointmentsCount: number;
  todayRevenue: number;
  activeDoctorsCount: number;
  totalPatientsCount: number;
  lowStockCount: number;
  pendingLabOrders: number;
  pendingBillsCount: number;
  revenueChart: { month: string; amount: number }[];
  appointmentsTrend: { day: string; count: number }[];
}

export interface SuperAdminStats {
  totalClinics: number;
  activeClinics: number;
  totalRevenue: number;
  totalStaff: number;
  totalPatients: number;
  subscriptionBreakdown: { plan: string; count: number }[];
  recentClinics: Clinic[];
}

export interface DoctorDashboardStats {
  todayQueueCount: number;
  inProgressCount: number;
  completedCount: number;
}
