import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function getOptionalSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function getOptionalUser() {
  const { user } = await getOptionalSession();
  return user;
}

export async function requireUser() {
  const { supabase, user } = await getOptionalSession();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}
