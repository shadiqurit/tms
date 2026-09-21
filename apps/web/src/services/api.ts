const baseUrl = import.meta.env.VITE_API_URL ?? '/api';

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('tms_token');
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unable to reach the server.' }));
    throw new Error(error.message ?? 'Request failed.');
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
