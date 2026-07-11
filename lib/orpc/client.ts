import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { router } from "@/lib/orpc/router";

export const orpcClient: RouterClient<typeof router> = createORPCClient(
  new RPCLink({ url: "/api/rpc" }),
);
