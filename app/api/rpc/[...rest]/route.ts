import { RPCHandler } from "@orpc/server/fetch";
import { router } from "@/lib/orpc/router";

const handler = new RPCHandler(router);

async function handle(request: Request) {
  const { response } = await handler.handle(request, { prefix: "/api/rpc" });
  return response ?? new Response("Not found", { status: 404 });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
