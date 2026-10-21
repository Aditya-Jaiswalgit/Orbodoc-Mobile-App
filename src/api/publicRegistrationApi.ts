import { apiFetch } from './apiConfig';
export type PublicPatientRegistration = {
  full_name: string;
  phone: string;
  password: string;
  gender: string;
  date_of_birth: string;
  blood_group?: string | null;
  city: string;
  state: string;
};

export type PublicDoctorRegistration = {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  country: string;
  state: string;
  city: string;
  specialization: string;
  qualification: string;
  registration_number: string;
  consultation_fee: number;
  video_rate_per_minute: number;
};

export type PublicLabRegistration = {
  lab_name: string;
  owner_name: string;
  lab_mobile_number: string;
  email: string;
  password: string;
  license_number: string;
  address: string;
  state: string;
  city: string;
  home_collection_available: boolean;
};

export type PublicRegistrationResult = { patient_id?: number; doctorId?: number };

export async function fetchRegistrationStatesApi() {
  return apiFetch<Array<{ id: number; state_name: string }>>('/location/states');
}

export async function fetchRegistrationCitiesApi(stateId: number | string) {
  return apiFetch<Array<{ id: number; city_name: string }>>(
    `/location/cities/${encodeURIComponent(String(stateId))}`,
  );
}

export function registerPublicPatientApi(payload: PublicPatientRegistration) {
  return apiFetch<PublicRegistrationResult>('/doctors/register-patient', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function registerIndependentDoctorApi(payload: PublicDoctorRegistration) {
  return apiFetch<PublicRegistrationResult>('/doctors/register-solo', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function registerPublicLabApi(payload: PublicLabRegistration) {
  const body = new FormData();
  body.append('lab_name', payload.lab_name);
  body.append('owner_name', payload.owner_name);
  body.append('lab_mobile_number', payload.lab_mobile_number);
  body.append('email', payload.email);
  body.append('password', payload.password);
  body.append('license_number', payload.license_number);
  body.append('address', payload.address);
  body.append('state', payload.state);
  body.append('city', payload.city);
  body.append('home_collection_available', payload.home_collection_available ? '1' : '0');
  return apiFetch<PublicRegistrationResult>('/doctors/register-lab', { method: 'POST', body });
}

export function loginRegisteredPatientApi(phone: string, password: string) {
  return apiFetch<any>('/auth/patient/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
}

export function loginRegisteredDoctorApi(email: string, password: string) {
  return apiFetch<any>('/auth/staff/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}
