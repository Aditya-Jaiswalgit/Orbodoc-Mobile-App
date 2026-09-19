// Authentication Types & Interfaces

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
  activeClinicId?: number;
  clinics?: UserClinic[];
  isMultiClinic?: boolean;
  department?: string;
  specialization?: string;
  profilePhoto?: string;
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

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  userType: UserRoleType | null;
  role: string;
  activeClinicId: number | null;
  activeClinicName: string;
  assignedClinics: UserClinic[];
  isMultiClinic: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  saveAuthSession: (data: AuthResponseData, userType: UserRoleType) => void;
  switchClinic: (clinicId: number) => Promise<boolean>;
  logout: () => void;
}

