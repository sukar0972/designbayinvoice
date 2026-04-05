import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function getRedirectOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");
  const next =
    requestedNext && requestedNext.startsWith("/") ? requestedNext : "/dashboard";
  const origin = getRedirectOrigin(request);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(new URL("/login?error=auth_callback", origin));
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
