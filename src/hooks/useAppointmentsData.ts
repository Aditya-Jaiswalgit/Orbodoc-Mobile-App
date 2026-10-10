import { useCallback, useEffect, useRef, useState } from 'react';
import { Appointment } from '../types/clinicTypes';
import { getAppointmentsApi } from '../api/appointmentApi';

function extractAppointments(value: unknown): Appointment[] {
  if (Array.isArray(value)) return value as Appointment[];
  if (!value || typeof value !== 'object') return [];
  const data = value as Record<string, unknown>;
  if (Array.isArray(data.data)) return data.data as Appointment[];
  if (Array.isArray(data.appointments))
    return data.appointments as Appointment[];
  return [];
}

export function useAppointmentsData(
  token: string | null,
  clinicId: number | string | null,
  enabled: boolean,
  filters: { status?: string; date?: string; date_from?: string; date_to?: string } = {},
) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState('');
  const requestId = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !token) {
      controllerRef.current?.abort();
      setAppointments([]);
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (clinicId) query.set('clinic_id', String(clinicId));
      if (filters.status) query.set('status', filters.status);
      if (filters.date) query.set('date', filters.date);
      if (filters.date_from) query.set('date_from', filters.date_from);
      if (filters.date_to) query.set('date_to', filters.date_to);
      const params = query.toString() || undefined;
      const response = await getAppointmentsApi(
        token,
        params,
        controller.signal,
      );
      if (id !== requestId.current) return;
      if (!response.success)
        throw new Error(response.message || 'Unable to load appointments.');
      setAppointments(extractAppointments(response.data));
      setLastRefreshed(
        new Date().toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
        }),
      );
    } catch (cause) {
      if (id !== requestId.current) return;
      const message =
        cause instanceof Error ? cause.message : 'Unable to load appointments.';
      setError(message);
      setAppointments([]);
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        controllerRef.current = null;
      }
    }
  }, [clinicId, enabled, filters.date, filters.date_from, filters.date_to, filters.status, token]);

  useEffect(() => {
    refresh();
    return () => {
      requestId.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [refresh]);

  return { appointments, loading, error, lastRefreshed, refresh };
}
