import { redirect } from "next/navigation";

import { getOptionalUser } from "@/lib/auth";

export default async function InviteAcceptPage() {
  const user = await getOptionalUser();

  if (user) {
    redirect("/join");
  }

  redirect("/login");
}
