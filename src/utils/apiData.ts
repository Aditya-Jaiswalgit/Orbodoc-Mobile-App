export type ApiRecord = Record<string, unknown>;

function asRecord(value: unknown): ApiRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as ApiRecord
    : null;
}

/** Extracts a row list from the response envelopes used by the API. */
export function extractArrayData<T = ApiRecord>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  const root = asRecord(response);
  if (!root) return [];
  const data = asRecord(root.data);
  const listKeys = ['data', 'rows', 'clinics', 'users', 'roles', 'permissions', 'objects', 'system_objects', 'staff', 'result'] as const;

  for (const key of listKeys) {
    const candidate = root[key];
    if (Array.isArray(candidate)) return candidate as T[];
  }
  if (data) {
    for (const key of listKeys) {
      const candidate = data[key];
      if (Array.isArray(candidate)) return candidate as T[];
    }
    for (const candidate of Object.values(data)) {
      if (Array.isArray(candidate)) return candidate as T[];
    }
  }
  for (const [key, candidate] of Object.entries(root)) {
    if (key !== 'headers' && key !== 'config' && Array.isArray(candidate)) return candidate as T[];
  }
  return [];
}
