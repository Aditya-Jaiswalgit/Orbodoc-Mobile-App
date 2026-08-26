import { useCallback, useEffect, useState } from 'react';
import { getClinicsApi } from '../api/clinicApi';
import { getCitiesByStateApi, getStatesApi, StateItem, CityItem } from '../api/locationApi';
import { useAuthContext } from '../context/AuthContext';
import { Clinic } from '../types/clinicTypes';

export const useClinics = () => {
  const { token } = useAuthContext();

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [statesList, setStatesList] = useState<StateItem[]>([]);
  const [citiesList, setCitiesList] = useState<CityItem[]>([]);

  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClinics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getClinicsApi(token || '');
      if (res.success && Array.isArray(res.data)) {
        setClinics(res.data);
      } else {
        setClinics([]);
        setError(res.message || 'Failed to fetch clinics from backend');
      }
    } catch (err: any) {
      setClinics([]);
      setError(err.message || 'Error loading clinics from backend');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchStates = useCallback(async () => {
    try {
      const res = await getStatesApi();
      if (res.success && Array.isArray(res.data)) {
        setStatesList(res.data);
      }
    } catch (e) {}
  }, []);

  const fetchCitiesForState = useCallback(async (stateId: number) => {
    try {
      const res = await getCitiesByStateApi(stateId);
      if (res.success && Array.isArray(res.data)) {
        setCitiesList(res.data);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchClinics();
    fetchStates();
  }, [fetchClinics, fetchStates]);

  useEffect(() => {
    if (selectedStateId) {
      fetchCitiesForState(selectedStateId);
    } else {
      setCitiesList([]);
    }
  }, [selectedStateId, fetchCitiesForState]);

  return {
    clinics,
    statesList,
    citiesList,
    selectedStateId,
    setSelectedStateId,
    loading,
    error,
    refreshClinics: fetchClinics,
  };
};

export default useClinics;
