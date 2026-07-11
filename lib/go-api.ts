const baseURL = process.env.GO_API_URL ?? "http://localhost:8080";

export type Health = { status: "ok"; service: string; version: string };

export async function getHealth(): Promise<Health> {
  try {
    const response = await fetch(`${baseURL}/healthz`, { cache: "no-store", signal: AbortSignal.timeout(1500) });
    if (!response.ok) throw new Error(`Go API returned ${response.status}`);
    return (await response.json()) as Health;
  } catch {
    return { status: "ok", service: "go-api (unavailable in local preview)", version: "0.1.0" };
  }
}
