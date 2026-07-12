import { os } from "@orpc/server";
import { z } from "zod";
import { getHealth, getMe, getProfile, postLogin, postLogout, postRegister, type ProfileResponse, type SessionUser } from "@/lib/go-api";
import { headers } from "next/headers";

const cookieHeaderOf = async () => (await headers()).get("cookie") ?? "";

export const router = {
  system: {
    health: os
      .input(z.object({}).optional())
      .handler(async () => getHealth()),
  },
  auth: {
    register: os
      .input(
        z.object({
          name: z.string().min(1).max(80),
          email: z.string().email().max(120).transform((s) => s.toLowerCase()),
          password: z.string().min(8).max(120),
        }),
      )
      .output(
        z.object({
          token: z.string(),
          user: z.object({
            ID: z.string(),
            Name: z.string(),
            Email: z.string(),
            CreatedAt: z.string().optional(),
          }),
        }),
      )
      .handler(async ({ input }) => postRegister(input)),

    login: os
      .input(
        z.object({
          email: z.string().email().transform((s) => s.toLowerCase()),
          password: z.string().min(1),
        }),
      )
      .output(
        z.object({
          token: z.string(),
          user: z.object({
            ID: z.string(),
            Name: z.string(),
            Email: z.string(),
            CreatedAt: z.string().optional(),
          }),
        }),
      )
      .handler(async ({ input }) => postLogin(input)),

    logout: os
      .input(z.object({}).optional())
      .output(z.object({ ok: z.literal(true) }))
      .handler(async () => postLogout(await cookieHeaderOf())),

    me: os
      .input(z.object({}).optional())
      .output(
        z
          .object({
            ID: z.string(),
            Name: z.string(),
            Email: z.string(),
            CreatedAt: z.string().optional(),
          })
          .nullable(),
      )
      .handler(async (): Promise<SessionUser | null> => getMe(await cookieHeaderOf())),
  },
  profile: {
    get: os
      .input(z.object({}).optional())
      .output(z.any())
      .handler(async (): Promise<ProfileResponse | null> => getProfile(await cookieHeaderOf())),
  },
};