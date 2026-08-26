import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';

export interface StateItem {
  id: number;
  state_code?: string;
  state_name: string;
}

export interface CityItem {
  id: number;
  city_name: string;
}

export async function getStatesApi(): Promise<ApiResponse<StateItem[]>> {
  return apiFetch<StateItem[]>('/location/states', {
    method: 'GET',
  });
}

export async function getCitiesByStateApi(stateId: number): Promise<ApiResponse<CityItem[]>> {
  return apiFetch<CityItem[]>(`/location/cities/${stateId}`, {
    method: 'GET',
  });
}
