import { RPCHandler } from "@orpc/server/fetch";
import { router } from "@/lib/orpc/router";
import { takePendingCookie } from "@/lib/auth-cookies";

const handler = new RPCHandler(router);

async function handle(request: Request) {
  const { response } = await handler.handle(request, { prefix: "/api/rpc" });
  const base = response ?? new Response("Not found", { status: 404 });

  // Forward any Set-Cookie leaked from lib/go-api.ts (auth endpoints).
  const pending = takePendingCookie();
  if (pending) {
    base.headers.append("set-cookie", pending);
  }

  return base;
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };