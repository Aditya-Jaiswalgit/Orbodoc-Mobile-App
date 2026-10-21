import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import {
  fetchRegistrationCitiesApi,
  fetchRegistrationStatesApi,
  loginRegisteredDoctorApi,
  loginRegisteredPatientApi,
  PublicDoctorRegistration,
  PublicPatientRegistration,
  PublicLabRegistration,
  registerIndependentDoctorApi,
  registerPublicPatientApi,
  registerPublicLabApi,
} from '../api/publicRegistrationApi';

export type RegistrationLocation = { id: number; name: string };

export function usePublicRegistration() {
  const { saveAuthSession } = useAuthContext();
  const [states, setStates] = useState<RegistrationLocation[]>([]);
  const [cities, setCities] = useState<RegistrationLocation[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const citiesRequestId = useRef(0);

  useEffect(() => {
    let active = true;
    setLocationsLoading(true);
    fetchRegistrationStatesApi().then(result => {
      if (!result.success) throw new Error(result.message || 'Could not load states.');
      if (active) {
        setStates((result.data || []).map(item => ({ id: Number(item.id), name: item.state_name })));
      }
    }).catch(e => {
      if (active) setError(e instanceof Error ? e.message : 'Could not load states.');
    }).finally(() => { if (active) setLocationsLoading(false); });
    return () => { active = false; };
  }, []);

  const selectState = useCallback(async (stateId: number | null) => {
    const requestId = ++citiesRequestId.current;
    setSelectedStateId(stateId);
    setCities([]);
    setError('');
    if (!stateId) {
      setCitiesLoading(false);
      return;
    }
    setCitiesLoading(true);
    try {
      const result = await fetchRegistrationCitiesApi(stateId);
      if (!result.success) throw new Error(result.message);
      if (requestId === citiesRequestId.current) {
        setCities((result.data || []).map(item => ({ id: Number(item.id), name: item.city_name })));
      }
    } catch (e) {
      if (requestId === citiesRequestId.current) {
        setError(e instanceof Error ? e.message : 'Could not load cities.');
      }
    } finally {
      if (requestId === citiesRequestId.current) setCitiesLoading(false);
    }
  }, []);

  const submitPatient = useCallback(async (payload: PublicPatientRegistration) => {
    setSubmitting(true); setError('');
    try {
      const result = await registerPublicPatientApi(payload);
      if (!result.success) throw new Error(result.message || 'Patient registration failed.');
      const login = await loginRegisteredPatientApi(payload.phone, payload.password);
      if (!login.success || !login.data) throw new Error('Registration completed. Please sign in with your mobile number and password.');
      await saveAuthSession(login.data, 'patient');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Patient registration failed.');
      return false;
    } finally { setSubmitting(false); }
  }, [saveAuthSession]);

  const submitDoctor = useCallback(async (payload: PublicDoctorRegistration) => {
    setSubmitting(true); setError('');
    try {
      const result = await registerIndependentDoctorApi(payload);
      if (!result.success) throw new Error(result.message || 'Doctor registration failed.');
      const login = await loginRegisteredDoctorApi(payload.email, payload.password);
      if (!login.success || !login.data) throw new Error('Registration completed. Please sign in with your email and password.');
      await saveAuthSession(login.data, 'staff');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Doctor registration failed.');
      return false;
    } finally { setSubmitting(false); }
  }, [saveAuthSession]);

  const submitLab = useCallback(async (payload: PublicLabRegistration) => {
    setSubmitting(true); setError('');
    try {
      const result = await registerPublicLabApi(payload);
      if (!result.success) throw new Error(result.message || 'Lab registration failed.');
      const login = await loginRegisteredDoctorApi(payload.email, payload.password);
      if (!login.success || !login.data) throw new Error('Registration completed. Please sign in with your email and password.');
      await saveAuthSession(login.data, 'staff');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lab registration failed.');
      return false;
    } finally { setSubmitting(false); }
  }, [saveAuthSession]);

  return { states, cities, selectedStateId, locationsLoading, citiesLoading, submitting, error, setError, selectState, submitPatient, submitDoctor, submitLab };
}
