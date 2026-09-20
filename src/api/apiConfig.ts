import { ApiResponse } from '../types/auth';

// Base API configuration loaded dynamically from Environment Variable
const envBaseUrl =
  (globalThis as any)?.process?.env?.API_BASE_URL ||
  (globalThis as any)?.process?.env?.REACT_APP_API_BASE_URL;

export const BASE_URL = (envBaseUrl || 'https://api.orbodoc.com/api').replace(/\/$/, '');

export const API_TIMEOUT = 15000; // 15 seconds

let globalAuthToken: string | null = null;

export function setGlobalAuthToken(token: string | null) {
  globalAuthToken = token;
}

export function getGlobalAuthToken(): string | null {
  return globalAuthToken;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(globalAuthToken ? { Authorization: `Bearer ${globalAuthToken}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const method = (options.method || 'GET').toUpperCase();

  console.log(`🌐 [API REQUEST] ${method} ${url}`);
  if (options.body) {
    try {
      console.log(`  └─ Payload:`, JSON.parse(options.body as string));
    } catch {
      console.log(`  └─ Payload:`, options.body);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = { rawText: text };
    }

    if (!response.ok) {
      console.warn(`❌ [API ERROR ${response.status}] ${method} ${url}`);
      console.warn(`  └─ Response Payload:`, JSON.stringify(json, null, 2));
      return {
        success: false,
        message: json.message || json.error || `HTTP Error ${response.status}`,
        error: json.message || json.error || 'Server error',
      };
    }

    console.log(`✅ [API SUCCESS ${response.status}] ${method} ${url}`);
    console.log(`  └─ Response Payload:`, JSON.stringify(json, null, 2));

    if (json.success !== undefined) {
      return {
        success: Boolean(json.success),
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
      console.error(`💥 [API TIMEOUT] ${method} ${url}`);
      return {
        success: false,
        message: 'Network request timed out. Check backend server connection.',
        error: 'TimeoutError',
      };
    }
    console.error(`💥 [API EXCEPTION] ${method} ${url}`, err);
    return {
      success: false,
      message: err.message || 'Network error. Please check backend connection.',
      error: err.toString(),
    };
  }
}
