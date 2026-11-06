import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, clearApiCsrfToken } from './client';

describe('cliente de API', () => {
  afterEach(() => {
    clearApiCsrfToken();
    vi.unstubAllGlobals();
  });

  it('envía cookies y token CSRF en las solicitudes de escritura', async () => {
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'csrf-test-token' }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { email: 'test@example.org' } }), { status: 200 })
      );
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: 'test@example.org', password: 'not-a-real-password' }
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/auth/csrf',
      expect.objectContaining({ credentials: 'include', method: 'GET' })
    );
    const loginRequest = fetchMock.mock.calls[1]?.[1];
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/auth/login');
    expect(loginRequest?.credentials).toBe('include');
    expect(loginRequest?.method).toBe('POST');
    expect(new Headers(loginRequest?.headers).get('X-CSRF-Token')).toBe('csrf-test-token');
  });

  it('expone el fallo de conexión sin sustituir la respuesta con datos locales', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>().mockRejectedValue(
        new TypeError('network unavailable')
      )
    );

    await expect(apiRequest('/auth/me')).rejects.toThrow(
      'No se pudo conectar con el backend. Verifica que la API esté iniciada.'
    );
  });
});
