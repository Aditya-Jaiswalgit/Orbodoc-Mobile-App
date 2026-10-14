import { apiFetch } from './apiConfig';

export type LabProfile = {
  id: number;
  entity_type: string;
  name: string;
  license_number: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  website: string;
  logo_url: string;
  available_days: string;
  available_from: string;
  available_to: string;
  is_marketplace_visible: number;
  is_active: number;
  subscription_plan?: string;
  subscription_status?: string;
};

export type LabAdmin = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  address?: string;
  is_active: number | boolean;
  created_at?: string;
};

export type IndiaLocation = {
  id: number | string;
  name: string;
};

export const emptyLab: LabProfile = {
  id: 0,
  entity_type: 'lab',
  name: '',
  license_number: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  postal_code: '',
  website: '',
  logo_url: '',
  available_days: '',
  available_from: '',
  available_to: '',
  is_marketplace_visible: 0,
  is_active: 1,
  subscription_plan: 'Free',
  subscription_status: 'Active',
};

export function normalizeLabProfile(value: any): LabProfile {
  const raw = value || {};
  return {
    ...emptyLab,
    id: Number(raw.id || 0),
    entity_type: String(raw.entity_type ?? 'lab'),
    name: String(raw.name ?? ''),
    license_number: String(raw.license_number ?? ''),
    email: String(raw.email ?? ''),
    phone: String(raw.phone ?? ''),
    address: String(raw.address ?? ''),
    city: String(raw.city ?? ''),
    state: String(raw.state ?? ''),
    country: String(raw.country ?? 'India'),
    postal_code: String(raw.postal_code ?? ''),
    website: String(raw.website ?? ''),
    logo_url: String(raw.logo_url ?? ''),
    available_days: String(raw.available_days ?? ''),
    available_from: String(raw.available_from ?? ''),
    available_to: String(raw.available_to ?? ''),
    is_marketplace_visible: Number(raw.is_marketplace_visible ?? 0),
    is_active: Number(raw.is_active ?? 1),
    subscription_plan: String(raw.subscription_plan ?? 'Free'),
    subscription_status: String(raw.subscription_status ?? 'Active'),
  };
}

export async function fetchLabProfileApi() {
  return apiFetch<{ lab?: LabProfile }>('/clinics/lab-management');
}

export async function fetchLabAdminsApi() {
  return apiFetch<{ admins?: LabAdmin[] }>('/clinics/lab-management/admins');
}

export async function updateLabProfileApi(payload: {
  name: string;
  license_number: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  website: string;
  logo_url: string;
  available_days: string;
  available_from: string | null;
  available_to: string | null;
  is_marketplace_visible: number;
}) {
  return apiFetch<{ lab?: LabProfile }>('/clinics/lab-management', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function addLabAdminApi(payload: {
  full_name: string;
  email: string;
  phone: string;
  password?: string;
  address?: string;
}) {
  return apiFetch<{ admin?: LabAdmin }>('/clinics/lab-management/admins', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateLabAdminApi(
  adminId: number,
  payload: Record<string, unknown>,
) {
  return apiFetch<{ admin?: LabAdmin }>(`/clinics/lab-management/admins/${adminId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchStatesApi(): Promise<IndiaLocation[]> {
  const res = await apiFetch<any[]>('/location/states');
  return (res.data || []).map((item: any) => ({
    id: item.id,
    name: item.state_name || item.name || '',
  }));
}

export async function fetchCitiesApi(stateId: string | number): Promise<IndiaLocation[]> {
  const res = await apiFetch<any[]>(`/location/cities/${encodeURIComponent(String(stateId))}`);
  return (res.data || []).map((item: any) => ({
    id: item.id || item.city_name,
    name: item.city_name || item.name || '',
  }));
}
