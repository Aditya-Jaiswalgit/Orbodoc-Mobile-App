import { ApiResponse } from '../types/auth';

// Keep development and release builds on the same API used by the web app.
export const BASE_URL = 'https://api.orbodoc.com/api';

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
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    Accept: 'application/json',
    ...(globalAuthToken ? { Authorization: `Bearer ${globalAuthToken}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const method = (options.method || 'GET').toUpperCase();

  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel);
  if (options.signal?.aborted) cancel();
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, API_TIMEOUT);

  try {
    const response = await fetch(url, { ...options, headers, signal: controller.signal });
    const text = await response.text();
    // Only metadata is logged in development. Bodies can contain credentials
    // and patient information, so they are never written to the console.
    if (__DEV__) console.debug('[API]', method, response.status);
    let json: any;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      return { success: false, message: 'Invalid server response', error: 'InvalidResponse' };
    }
    if (!response.ok) {
      return {
        success: false,
        message: json?.message || json?.error || 'Request failed (' + response.status + ')',
        error: 'HTTP_' + response.status,
      };
    }
    return {
      success: json?.success === undefined ? json?.status !== false : Boolean(json.success),
      message: json?.message || json?.msg || json?.error || 'Success',
      data: json?.data !== undefined ? json.data : json,
    };
  } catch {
    return {
      success: false,
      message: timedOut ? 'Request timed out. Please try again.'
        : controller.signal.aborted ? 'Request cancelled.' : 'Unable to connect. Please try again.',
      error: timedOut ? 'TimeoutError' : controller.signal.aborted ? 'AbortError' : 'NetworkError',
    };
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener('abort', cancel);
  }
}
