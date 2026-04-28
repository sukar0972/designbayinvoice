import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/invoices/:path*",
    "/settings/:path*",
    "/workspaces/:path*",
    "/join",
    "/auth/finish",
    "/api/:path*",
  ],
};
