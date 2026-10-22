import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
const COOKIE_NAME = "lite_pos_session";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "change-this-lite-pos-secret-in-production");
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/_next") || path === "/favicon.ico" || path === "/login" || path === "/api/auth/login") return NextResponse.next();
  const token=request.cookies.get(COOKIE_NAME)?.value;
  try { if (!token) throw new Error(); await jwtVerify(token,secret); return NextResponse.next(); }
  catch { if(path.startsWith("/api/")) return NextResponse.json({message:"Unauthenticated"},{status:401}); return NextResponse.redirect(new URL("/login",request.url)); }
}
export const config={matcher:["/((?!_next/static|_next/image|.*\\.png$).*)"]};
