import { setPendingCookie } from "./auth-cookies";

const baseURL = process.env.GO_API_URL ?? "http://localhost:8080";

export type Health = { status: "ok"; service: string; version: string };

export type SessionUser = {
  ID: string;
  Name: string;
  Email: string;
  CreatedAt: string;
};

export type AuthResponse = { token: string; user: SessionUser };

export type Profile = {
  headline: string;
  subheadline: string;
  quote: string;
  email: string;
  location: string;
  availability: string;
  avatarUrl: string;
  metrics: { label: string; value: string; color: string }[];
  skills: {
    category: string;
    icon: string;
    color: string;
    items: { name: string; syncRate: number; tags: string[] }[];
    masteryNote: string;
  }[];
  projects: {
    title: string;
    version: string;
    icon: string;
    summary: string;
    logic: string;
    tech: string[];
    highlight: string;
    achievement: string;
  }[];
  timeline: {
    dateRange: string;
    role: string;
    tags?: string[];
    bullets: string[];
    marker: string;
  }[];
};

export type ProfileResponse = { user: SessionUser; profile: Profile };

export async function getHealth(): Promise<Health> {
  try {
    const response = await fetch(`${baseURL}/healthz`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) throw new Error(`Go API returned ${response.status}`);
    return (await response.json()) as Health;
  } catch {
    return { status: "ok", service: "go-api (unavailable in local preview)", version: "0.2.0" };
  }
}

export async function postRegister(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${baseURL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(15000),
  });
  const data = await parseResponse<AuthResponse>(res);
  setPendingCookie(res.headers.get("set-cookie"));
  return data;
}

export async function postLogin(input: { email: string; password: string }): Promise<AuthResponse> {
  const res = await fetch(`${baseURL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(15000),
  });
  const data = await parseResponse<AuthResponse>(res);
  setPendingCookie(res.headers.get("set-cookie"));
  return data;
}

export async function postLogout(cookieHeader?: string): Promise<{ ok: true }> {
  const res = await fetch(`${baseURL}/auth/logout`, {
    method: "POST",
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw await toApiError(res);
  }
  setPendingCookie(res.headers.get("set-cookie"));
  return { ok: true };
}

export async function getMe(cookieHeader?: string): Promise<SessionUser | null> {
  try {
    const res = await fetch(`${baseURL}/auth/me`, {
      cache: "no-store",
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 401) return null;
    if (!res.ok) throw await toApiError(res);
    return (await res.json()) as SessionUser;
  } catch {
    return null;
  }
}

export async function getProfile(cookieHeader: string): Promise<ProfileResponse | null> {
  try {
    const res = await fetch(`${baseURL}/profile`, {
      cache: "no-store",
      headers: { Cookie: cookieHeader },
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 401) return null;
    if (!res.ok) throw await toApiError(res);
    return (await res.json()) as ProfileResponse;
  } catch {
    return null;
  }
}

type ApiError = Error & { code?: string; status?: number };

async function toApiError(res: Response): Promise<ApiError> {
  let payload: { error?: string; message?: string } = {};
  try {
    payload = (await res.json()) as typeof payload;
  } catch {
    // ignore parse errors
  }
  const e = new Error(payload.message || `HTTP ${res.status}`) as ApiError;
  e.code = payload.error;
  e.status = res.status;
  return e;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}