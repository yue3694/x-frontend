/**
 * auth-cookies: small leaky channel to forward Set-Cookie from lib/go-api.ts
 * (which makes raw fetch calls to the Go API) back to the browser through the
 * oRPC route handler. The oRPC handler reads takePendingCookie() and appends
 * Set-Cookie to its response.
 *
 * Not thread-safe across concurrent requests — fine for this single-user demo,
 * but if you scale out, switch to AsyncLocalStorage.
 */
let pending: string | null = null;

export function setPendingCookie(value: string | null): void {
  pending = value;
}

export function takePendingCookie(): string | null {
  const value = pending;
  pending = null;
  return value;
}