import { apiFetch } from './apiConfig';

export interface PublicLabTest {
  id: number;
  test_name: string;
  test_code?: string | null;
  description?: string | null;
  min_price?: number;
  min_discount_price?: number;
  clinic_count?: number;
  home_collection_available?: number;
}

export interface PublicClinicTest {
  lab_test_id: number;
  test_name: string;
  test_code?: string | null;
  description?: string | null;
  price: number;
  discount_price?: number;
  home_collection_available?: number;
  is_available?: number;
}

export interface PublicLabClinic {
  clinic_id: number;
  clinic_name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  tests: PublicClinicTest[];
}

export interface PublicLabDiscovery {
  recommendedTests: PublicLabTest[];
  clinics: PublicLabClinic[];
}

export async function searchPublicLabTests(
  query: string,
  state = '',
  city = '',
) {
  const params = new URLSearchParams({ query });
  if (state) params.set('state', state);
  if (city) params.set('city', city);
  const response = await apiFetch<PublicLabDiscovery>(
    `/public/labs/disease-lab-discovery?${params}`,
  );
  if (!response.success)
    throw new Error(response.message || 'Could not search lab tests');
  return response.data || { recommendedTests: [], clinics: [] };
}

export async function lookupPublicLabPatient(phone: string) {
  const response = await apiFetch<{
    found?: boolean;
    data?: { full_name?: string; phone?: string; email?: string };
  }>(`/public/labs/patient-lookup?phone=${encodeURIComponent(phone)}`);
  if (!response.success)
    throw new Error(response.message || 'Could not find patient record');
  return response.data;
}

export async function fetchPublicLabSlots(clinicId: number, date: string) {
  const params = new URLSearchParams({ clinic_id: String(clinicId), date });
  const response = await apiFetch<{
    slots?: Array<{ time?: string; available?: boolean }>;
  }>(`/public/labs/slots?${params}`);
  if (!response.success)
    throw new Error(response.message || 'Could not load available slots');
  return (response.data?.slots || [])
    .filter(slot => slot.available)
    .map(slot => String(slot.time || ''))
    .filter(Boolean);
}

export async function bookPublicLabTest(payload: Record<string, unknown>) {
  const response = await apiFetch<Record<string, unknown>>(
    '/public/labs/book-test',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  if (!response.success)
    throw new Error(response.message || 'Could not book lab test');
  return response.data;
}
