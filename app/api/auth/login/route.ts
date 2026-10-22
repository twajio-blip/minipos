import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { COOKIE_NAME, createToken } from "@/lib/auth";

export async function POST(request: Request) {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ message: "Enter a valid email and password." }, { status: 422 });
  const user = db.prepare("SELECT id,name,email,password FROM users WHERE email=?").get(parsed.data.email) as { id:number; name:string; email:string; password:string } | undefined;
  if (!user || !bcrypt.compareSync(parsed.data.password, user.password)) return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
  const response = NextResponse.json({ user: { id:user.id, name:user.name, email:user.email } });
  response.cookies.set(COOKIE_NAME, await createToken(user), { httpOnly:true, sameSite:"lax", secure:new URL(request.url).protocol === "https:", path:"/", maxAge:604800 });
  return response;
}
