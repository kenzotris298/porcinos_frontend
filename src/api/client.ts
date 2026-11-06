
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

let csrfToken: string | null = null;

interface ApiErrorBody {
  error?: unknown;
}

interface CsrfResponse {
  csrfToken: string;
}

export class ApiClientError extends Error {
  readonly status: number;

  constructor(
    message: string,
    status: number
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      if (response.ok) throw new Error('El backend devolvió una respuesta inválida.');
    }
  }
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body &&
      typeof (body as ApiErrorBody).error === 'string'
        ? (body as ApiErrorBody).error as string
        : `La solicitud al servidor falló (HTTP ${response.status}).`;
    throw new ApiClientError(message, response.status);
  }
  if (body && typeof body === 'object' && 'csrfToken' in body &&
      typeof body.csrfToken === 'string') {
    csrfToken = body.csrfToken;
  }
  return body as T;
}

async function fetchResponse(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'include'
    });
  } catch {
    throw new Error('No se pudo conectar con el backend. Verifica que la API esté iniciada.');
  }
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const response = await fetchResponse('/auth/csrf', { method: 'GET' });
  const result = await readResponse<CsrfResponse>(response);
  if (typeof result?.csrfToken !== 'string' || result.csrfToken.length === 0) {
    throw new Error('El backend no devolvió un token CSRF válido.');
  }
  csrfToken = result.csrfToken;
  return csrfToken;
}

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const method = options.method ?? 'GET';
  const headers = new Headers();
  let body: string | undefined;
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers.set('X-CSRF-Token', await getCsrfToken());
  }
  const response = await fetchResponse(path, { method, headers, body });
  return readResponse<T>(response);
}

export function clearApiCsrfToken(): void {
  csrfToken = null;
}
