export interface ClinicItem {
  id: string | number;
  name: string;
  code: string;
  logo_url?: string;
  address: string;
  email: string;
  phone: string;
  admins_count: number;
  status: 'Active' | 'Inactive';
  doctors_count?: number;
  patients_count?: number;
  subscription_plan?: string;
  city?: string;
  state?: string;
  country?: string;
  created_at?: string;
  website?: string;
  license_number?: string;
  available_days?: string;
  available_from?: string;
  available_to?: string;
}

export interface ClinicFormState {
  logo_url?: string;
  id?: string | number;
  name: string;
  email: string;
  phone: string;
  address: string;
  state: string;
  city: string;
  country: string;
  website: string;
  license_number: string;
  available_days: string;
  available_from: string;
  available_to: string;
}

export const DEFAULT_CLINIC_FORM: ClinicFormState = {
  name: '',
  email: '',
  phone: '',
  address: '',
  state: '',
  city: '',
  country: 'India',
  website: '',
  license_number: '',
  available_days: 'Mon,Tue,Wed,Thu,Fri',
  available_from: '12:30 AM',
  available_to: '02:30 AM',
};

export interface ClinicAdminItem {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address?: string;
  status: 'Active' | 'Inactive';
}

export type ClinicColumnKey =
  | 'name'
  | 'address'
  | 'contact'
  | 'created'
  | 'country'
  | 'website'
  | 'license_number'
  | 'available_days'
  | 'available_from'
  | 'available_to'
  | 'admins'
  | 'status'
  | 'actions';

export const CLINIC_COLUMN_OPTIONS: Array<{
  key: ClinicColumnKey;
  label: string;
  defaultVisible: boolean;
}> = [
  { key: 'name', label: 'Clinic Name', defaultVisible: true },
  { key: 'address', label: 'Address', defaultVisible: true },
  { key: 'contact', label: 'Contact', defaultVisible: true },
  { key: 'created', label: 'Created', defaultVisible: false },
  { key: 'country', label: 'Country', defaultVisible: false },
  { key: 'website', label: 'Website', defaultVisible: false },
  { key: 'license_number', label: 'License Number', defaultVisible: false },
  { key: 'available_days', label: 'Available Days', defaultVisible: false },
  { key: 'available_from', label: 'Available From', defaultVisible: false },
  { key: 'available_to', label: 'Available To', defaultVisible: false },
  { key: 'admins', label: 'Admins', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'actions', label: 'Actions', defaultVisible: true },
];
