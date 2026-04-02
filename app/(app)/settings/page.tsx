import { requireUser } from "@/lib/auth";
import { getBusinessProfileForCurrentUser } from "@/lib/data";

import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const profile = await getBusinessProfileForCurrentUser();
  const { user } = await requireUser();

  return <SettingsForm initialProfile={profile} userId={user.id} />;
}
