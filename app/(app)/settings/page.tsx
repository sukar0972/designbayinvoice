import { getSettingsSnapshot } from "@/lib/data";

import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const snapshot = await getSettingsSnapshot();

  return (
    <SettingsForm
      currentMembership={snapshot.membership}
      initialInvites={snapshot.invites}
      initialMembers={snapshot.members}
      initialProfile={snapshot.profile}
      organizationId={snapshot.organization.id}
    />
  );
}
