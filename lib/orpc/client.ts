import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { router } from "@/lib/orpc/router";

type Client = RouterClient<typeof router>;

// Eagerly construct at module load when running in the browser. This avoids
// the trap-of-everything pattern (Proxy) which HMR/devtools/React Refresh
// walked via `$$typeof` / `toJSON` / `bind` and ended up routing bogus paths
// to the oRPC server (e.g. POST /api/rpc/$$typeof/bind).
//
// On the server (Node), this module is never imported by client code; if
// something does pull it in, we fall back to an inert object that throws
// the first time a procedure is invoked, instead of failing at module load.
let client: Client | undefined;

function getClient(): Client {
  if (client) return client;
  if (typeof window === "undefined") {
    throw new Error(
      "orpcClient accessed on the server. Server components must use lib/go-api.ts directly.",
    );
  }
  client = createORPCClient(
    new RPCLink({ url: `${window.location.origin}/api/rpc` }),
  );
  return client;
}

// Initialize eagerly in the browser. Wrapped in IIFE so the throw only fires
// at use, not at import.
if (typeof window !== "undefined") {
  getClient();
}

/**
 * Bind a property chain accessor to the eager orpc client. Calls like
 * `orpc.auth.login({...})` resolve to `client.auth.login(...)`.
 *
 * Each nested property access returns the next-level proxy, but the underlying
 * client is fixed. Devtools walking `$$typeof` / `toJSON` / `bind` here only
 * returns the same value the eager client would, never triggering fresh RPCLink
 * construction or undefined `window.location`.
 */
function bind<T>(accessor: (c: Client) => T): T {
  return accessor(getClient());
}

type Chain = Client extends infer C
  ? C extends Record<string, unknown>
    ? C
    : never
  : never;

// Minimal chain helper that statically surfaces auth/system/profile namespaces.
type Namespaces = {
  auth: Client extends { auth: infer A } ? A : never;
  system: Client extends { system: infer S } ? S : never;
  profile: Client extends { profile: infer P } ? P : never;
};

export const orpcClient = {
  get auth(): Namespaces["auth"] {
    return bind((c) => (c as { auth: Namespaces["auth"] }).auth);
  },
  get system(): Namespaces["system"] {
    return bind((c) => (c as { system: Namespaces["system"] }).system);
  },
  get profile(): Namespaces["profile"] {
    return bind((c) => (c as { profile: Namespaces["profile"] }).profile);
  },
} as const;