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

function createNavigationResponse(pathname: string, origin: string) {
  const destination = new URL(pathname, origin);
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="0;url=${destination.toString()}" />
    <title>Redirecting…</title>
  </head>
  <body>
    <script>
      window.location.replace(${JSON.stringify(destination.toString())});
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
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
  const response = createNavigationResponse(next, origin);

  if (code) {
    const supabase = createCallbackClient(request, response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Failed to exchange OAuth code for session", {
        code: error.code,
        message: error.message,
        status: error.status,
      });

      const errorResponse = createNavigationResponse("/login?error=auth_callback", origin);
      const errorClient = createCallbackClient(request, errorResponse);
      await errorClient.auth.signOut();
      return errorResponse;
    }
  }

  return response;
}
