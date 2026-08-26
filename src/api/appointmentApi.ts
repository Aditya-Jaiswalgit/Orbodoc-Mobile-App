import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { Appointment } from '../types/clinicTypes';

export async function getAppointmentsApi(token: string, queryParams?: string): Promise<ApiResponse<Appointment[]>> {
  const query = queryParams ? `?${queryParams}` : '';
  return apiFetch<Appointment[]>(`/appointments${query}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getTodayAppointmentsApi(token: string): Promise<ApiResponse<Appointment[]>> {
  return apiFetch<Appointment[]>('/appointments/today', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getAvailableSlotsApi(
  token: string,
  doctorId: number,
  date: string
): Promise<ApiResponse<string[]>> {
  return apiFetch<string[]>(`/appointments/slots?doctor_id=${doctorId}&date=${date}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function bookAppointmentApi(
  token: string,
  appointmentData: Partial<Appointment>
): Promise<ApiResponse<Appointment>> {
  return apiFetch<Appointment>('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(appointmentData),
  });
}

export async function updateAppointmentStatusApi(
  token: string,
  id: number,
  status: Appointment['status']
): Promise<ApiResponse<Appointment>> {
  return apiFetch<Appointment>(`/appointments/${id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
}

export async function cancelAppointmentApi(token: string, id: number): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/appointments/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
