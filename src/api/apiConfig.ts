import { ApiResponse } from '../types/auth';

// Base API configuration
export const BASE_URL = 'https://api.orbodoc.com/api';

export const API_TIMEOUT = 15000; // 15 seconds

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: json.message || json.error || `HTTP Error ${response.status}`,
        error: json.message || json.error || 'Server error',
      };
    }

    if (json.success !== undefined) {
      return {
        success: json.success,
        message: json.message || 'Success',
        data: json.data !== undefined ? json.data : json,
      };
    }

    return {
      success: true,
      message: 'Success',
      data: json,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return {
        success: false,
        message: 'Network request timed out. Check backend server connection.',
        error: 'TimeoutError',
      };
    }
    return {
      success: false,
      message: err.message || 'Network error. Please check backend connection.',
      error: err.toString(),
    };
  }
}
