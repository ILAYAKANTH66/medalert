/**
 * MedAlert API Client
 *
 * Provides typed, production-safe HTTP helpers for all frontend services.
 * - ApiError: structured error with HTTP status + server message
 * - fetchPublic:   unauthenticated requests (login, register)
 * - fetchWithAuth: JWT-injected requests with 401 auto-dispatch
 *
 * All responses are unwrapped from the backend ApiResponse<T> envelope:
 *   { success: boolean, data: T, message: string, status: number }
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://medalert-production.up.railway.app/api';

/** Request timeout in milliseconds */
const TIMEOUT_MS = 15_000;

// ─── ApiError ─────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  public readonly status: number;
  public readonly serverMessage: string;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.serverMessage = message;
    // Restore prototype chain (required for `instanceof` in transpiled output)
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// ─── Backend envelope type ────────────────────────────────────────────────────

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  status?: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Reads the stored JWT, stripping any accidental surrounding quotes. */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('token');
  if (!raw) return null;
  return raw.replace(/^"|"$/g, '').trim() || null;
}

/** Fires the global auth-expired event so AuthProvider can redirect to /login. */
function dispatchAuthExpired(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth-expired'));
  }
}

/**
 * Core fetch wrapper. Adds:
 *  - AbortController timeout
 *  - JSON Content-Type header
 *  - ApiResponse<T> envelope unwrapping
 *  - Structured ApiError on failures
 */
async function coreFetch<T>(
  path: string,
  init: RequestInit & { _auth?: string | null },
): Promise<T> {
  const { _auth, ...fetchInit } = init;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (_auth) {
    headers['Authorization'] = `Bearer ${_auth}`;
  }

  // Merge caller headers on top of defaults
  const callerHeaders = fetchInit.headers as Record<string, string> | undefined;
  if (callerHeaders) {
    Object.assign(headers, callerHeaders);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...fetchInit,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Request timed out. Please try again.', 408);
    }
    throw new ApiError('Network error. Check your connection.', 0);
  } finally {
    clearTimeout(timeoutId);
  }

  // ── Handle 204 No Content ────────────────────────────────────────────────
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  // ── Try to parse JSON body ───────────────────────────────────────────────
  let json: ApiEnvelope<T> | null = null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      json = await response.json();
    } catch {
      // Body isn't JSON — fall through to status-based error
    }
  }

  // ── Handle auth errors ───────────────────────────────────────────────────
  if (response.status === 401) {
    dispatchAuthExpired();
    const msg = json?.message ?? 'Session expired. Please log in again.';
    throw new ApiError(msg, 401);
  }

  // ── Handle other HTTP errors ─────────────────────────────────────────────
  if (!response.ok) {
    const msg =
      json?.message ??
      `Request failed with status ${response.status}`;
    throw new ApiError(msg, response.status);
  }

  // ── Unwrap ApiResponse<T> envelope ──────────────────────────────────────
  if (json !== null) {
    // Backend always wraps via ApiResponseBodyAdvice: { success, data, message }
    if ('success' in json) {
      if (json.success === false) {
        throw new ApiError(
          json.message ?? 'An unexpected error occurred',
          json.status ?? response.status,
        );
      }
      // Return the unwrapped data. For some endpoints data may be null/undefined.
      return json.data as T;
    }
    // Fallback: the body itself is the payload (shouldn't happen with the advice)
    return json as unknown as T;
  }

  return undefined as unknown as T;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Unauthenticated fetch — for /auth/login, /auth/register, and any public route.
 */
export async function fetchPublic<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return coreFetch<T>(path, { ...init, _auth: null });
}

/**
 * Authenticated fetch — automatically injects the JWT Bearer token.
 * Fires the `auth-expired` event and throws ApiError(401) if token is missing
 * or rejected by the server.
 */
export async function fetchWithAuth<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();
  if (!token) {
    dispatchAuthExpired();
    throw new ApiError('No authentication token found. Please log in.', 401);
  }
  return coreFetch<T>(path, { ...init, _auth: token });
}