import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";

function getRedirectOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

function createCallbackClient(request: NextRequest, response: NextResponse) {
  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");
  const next =
    requestedNext && requestedNext.startsWith("/") ? requestedNext : "/auth/finish";
  const origin = getRedirectOrigin(request);
  const nextUrl = new URL(next, origin);
  const errorUrl = new URL("/login?error=auth_callback", origin);
  const response = NextResponse.redirect(nextUrl);

  if (code) {
    const supabase = createCallbackClient(request, response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Failed to exchange OAuth code for session", {
        code: error.code,
        message: error.message,
        status: error.status,
      });

      const errorResponse = NextResponse.redirect(errorUrl);
      const errorClient = createCallbackClient(request, errorResponse);
      await errorClient.auth.signOut();
      return errorResponse;
    }
  }

  return response;
}
