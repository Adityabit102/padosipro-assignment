import { getApiUrl } from './config';

const TIMEOUT_MS = 15_000;

/** Error codes the server can return, plus two client-side ones. */
export type ApiErrorCode = string | 'NETWORK_ERROR' | 'TIMEOUT';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details: Record<string, unknown> = {},
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetwork(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT';
  }
}

/** Turns anything thrown into a message fit for the user. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong. Please try again.';
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Called when an authenticated request gets a 401, i.e. the session expired. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type Method = 'GET' | 'POST' | 'PUT';

export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    throw new ApiError(
      0,
      aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
      aborted
        ? 'The server took too long to respond. Please try again.'
        : "Can't reach the server. Check your internet connection and try again.",
    );
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => null);
  if (res.ok) return data as T;

  const error = data?.error;
  if (res.status === 401 && authToken) onUnauthorized?.();
  throw new ApiError(
    res.status,
    error?.code ?? 'HTTP_ERROR',
    error?.message ?? `Request failed (${res.status}). Please try again.`,
    error?.details ?? {},
    error?.fields ?? {},
  );
}
