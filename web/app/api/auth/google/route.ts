import { NextResponse } from "next/server";
import { fetchGoogleAuthorizationUrl } from "@/lib/auth-google";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";
  try {
    const url = await fetchGoogleAuthorizationUrl(next);
    return NextResponse.redirect(url);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Google sign-in failed.";
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", message);
    return NextResponse.redirect(loginUrl);
  }
}
