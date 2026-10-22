import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "change-this-lite-pos-secret-in-production");
export const COOKIE_NAME = "lite_pos_session";

export async function createToken(user: { id: number; name: string; email: string }) {
  return new SignJWT(user).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret);
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return { id: Number(payload.id), name: String(payload.name), email: String(payload.email) };
  } catch { return null; }
}
