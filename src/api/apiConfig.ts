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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function firstMessage(...values: unknown[]): string | undefined {
  const value = values.find(candidate => typeof candidate === 'string' && candidate.trim());
  return typeof value === 'string' ? value : undefined;
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
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      return { success: false, message: 'Invalid server response', error: 'InvalidResponse' };
    }
    const payload = asRecord(json) ?? {};
    if (!response.ok) {
      return {
        success: false,
        message: firstMessage(payload.message, payload.error) || 'Request failed (' + response.status + ')',
        error: 'HTTP_' + response.status,
        code: typeof payload.code === 'string' ? payload.code : undefined,
        data: payload.data as T | undefined,
      };
    }
    return {
      success: payload.success === undefined ? payload.status !== false : Boolean(payload.success),
      message: firstMessage(payload.message, payload.msg, payload.error) || 'Success',
      data: payload.data !== undefined ? payload.data as T : json as T,
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
