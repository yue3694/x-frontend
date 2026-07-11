import { os } from "@orpc/server";
import { z } from "zod";
import { getHealth } from "@/lib/go-api";

export const router = {
  system: {
    health: os
      .input(z.object({}).optional())
      .handler(async () => getHealth()),
  },
};
