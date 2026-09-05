export type UserRoleType = 'staff' | 'patient';

export interface StaffLoginPayload {
  email: string;
  password: string;
}

export interface PatientLoginPayload {
  phone: string;
  password: string;
}

export interface UserClinic {
  id: number;
  name: string;
  is_primary?: number;
}

export interface AuthUser {
  id: number;
  fullName: string;
  full_name?: string;
  email?: string;
  phone?: string;
  role_id?: number;
  roleId?: number;
  roleName?: string;
  role?: string;
  clinicId?: number;
  clinic_id?: number;
  clinicName?: string;
  clinic_name?: string;
  activeClinicId?: number;
  clinics?: UserClinic[];
  isMultiClinic?: boolean;
  department?: string;
  specialization?: string;
  qualification?: string;
  profilePhoto?: string;
  userId?: number;
  patient_id?: number;
  is_doctor?: number | boolean | string;
  isDoctor?: boolean;
  gender?: string;
  dob?: string;
  age?: number | string;
  blood_group?: string;
}

export interface AuthResponseData {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  user: AuthUser;
  permissions?: Record<string, any>;
  plan?: Record<string, any>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
