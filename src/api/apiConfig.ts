import { ApiResponse } from '../types/auth';

export const PRIMARY_BASE_URL = 'https://api.orbodoc.com/api';
export const LOCAL_BASE_URLS = [
  'http://192.168.29.224:5000/api',
  'http://10.0.2.2:5000/api',
  'http://localhost:5000/api',
];

export const API_TIMEOUT = 15000;

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const targetUrls = [PRIMARY_BASE_URL, ...LOCAL_BASE_URLS];
  let lastErrorMessage = '';

  for (const baseUrl of targetUrls) {
    const url = `${baseUrl}${cleanEndpoint}`;
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
      let json: any = {};
      try {
        json = await response.json();
      } catch (e) {
        json = {};
      }

      if (!response.ok) {
        let errMsg = json.message || json.error || `Server Error (${response.status})`;
        if (json.errors && typeof json.errors === 'object') {
          const details = Object.values(json.errors).join(', ');
          if (details) errMsg += `: ${details}`;
        }
        return {
          success: false,
          message: errMsg,
          data: json,
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
      lastErrorMessage = err.message || err.toString();
    }
  }

  return {
    success: false,
    message: lastErrorMessage || 'Unable to connect to backend server API.',
    error: lastErrorMessage,
  };
}
