// TypeScript Interfaces for Clinic SaaS System

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

// Clinic Model
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

// Staff Member Model
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

// Patient Model
export interface PatientModel {
  id: number;
  clinic_id: number;
  full_name: string;
  phone: string;
  email?: string;
  gender: 'male' | 'female' | 'other';
  date_of_birth?: string;
  age?: number;
  blood_group?: string;
  address?: string;
  emergency_contact?: string;
  allergies?: string;
  medical_history?: string;
  registered_at?: string;
  last_visit?: string;
}

// Appointment Model
export interface Appointment {
  id: number;
  clinic_id: number;
  patient_id: number;
  doctor_id: number;
  patient_name: string;
  patient_phone?: string;
  doctor_name: string;
  doctor_specialization?: string;
  appointment_date: string;
  time_slot: string;
  type: 'consultation' | 'follow_up' | 'emergency' | 'teleconsultation';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  reason?: string;
  notes?: string;
  created_at?: string;
}

// Prescription Model
export interface PrescriptionItem {
  id?: number;
  prescription_id?: number;
  medicine_id?: number;
  medicine_name: string;
  dosage: string; // e.g. "500mg"
  frequency: string; // e.g. "1-0-1 (After meals)"
  duration: string; // e.g. "5 days"
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

// Medicine & Inventory Model
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

// Billing Models
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

// Lab Model
export interface LabTestOrder {
  id: number;
  clinic_id: number;
  patient_id: number;
  patient_name: string;
  doctor_id?: number;
  doctor_name?: string;
  test_name: string;
  category: string;
  cost: number;
  status: 'ordered' | 'sample_collected' | 'processing' | 'completed' | 'cancelled';
  ordered_date: string;
  sample_collected_at?: string;
  report_id?: number;
}

export interface LabReport {
  id: number;
  clinic_id: number;
  test_order_id: number;
  patient_id: number;
  patient_name: string;
  test_name: string;
  technician_name: string;
  result_summary: string;
  findings?: string;
  reference_range?: string;
  status: 'draft' | 'final' | 'verified';
  file_url?: string;
  file_name?: string;
  created_at: string;
}

// Notification Model
export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'appointment' | 'prescription' | 'billing' | 'lab' | 'system' | 'broadcast';
  is_read: boolean;
  created_at: string;
}

// Audit Log Model
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

// Dashboard KPIs
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
