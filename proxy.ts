import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "ns_session";
const PROTECTED = ["/profile"];
const AUTH_ONLY = ["/auth"];

function secretBytes(): Uint8Array {
  const s = process.env.AUTH_JWT_SECRET || "dev-secret-change-me";
  return new TextEncoder().encode(s);
}

async function isAuthed(cookie: string | undefined): Promise<boolean> {
  if (!cookie) return false;
  try {
    const { payload } = await jwtVerify(cookie, secretBytes(), { algorithms: ["HS256"] });
    return !!payload.sub;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const authed = await isAuthed(cookie);

  if (PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    if (!authed) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth";
      url.searchParams.set("next", path + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }

  if (AUTH_ONLY.includes(path) && authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/profile";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/rpc).*)"],
};