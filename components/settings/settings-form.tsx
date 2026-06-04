"use client";

import type { ChangeEvent } from "react";
import { startTransition, useState } from "react";
import { HelpCircle, ImageUp, Loader2, Trash2 } from "lucide-react";

import { saveBusinessProfile, uploadLogo } from "@/app/actions";
import { PaymentMethodsEditor } from "@/components/invoices/payment-methods-editor";
import { TeamManagement } from "@/components/settings/team-management";
import type {
  BusinessProfileForm,
  OrganizationInvite,
  OrganizationMember,
} from "@/types/domain";

type SettingsFormProps = {
  currentMembership: OrganizationMember;
  initialInvites: OrganizationInvite[];
  initialMembers: OrganizationMember[];
  initialProfile: BusinessProfileForm;
  organizationId: string;
};

export function SettingsForm({
  currentMembership,
  initialInvites,
  initialMembers,
  initialProfile,
}: SettingsFormProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function updateField<K extends keyof BusinessProfileForm>(key: K, value: BusinessProfileForm[K]) {
    setProfile((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("logo", file);

    const result = await uploadLogo(formData);

    if (!result.ok) {
      setMessage(result.error);
    } else {
      updateField("logoPath", result.data.path);
      updateField("logoUrl", result.data.signedUrl || null);
      setMessage("Logo uploaded successfully. Save settings to apply.");
    }

    setUploading(false);
    event.target.value = "";
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      await saveBusinessProfile(profile);
      setMessage("Settings saved successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save settings.");
    }

    setSaving(false);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="display-font text-2xl font-semibold">Settings</h1>
        <button
          className="btn btn-primary shadow-sm"
          disabled={saving}
          onClick={() => startTransition(handleSave)}
          type="button"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
          Save
        </button>
      </div>

      {message && (
        <div className="rounded-md bg-[#e0f2fe] p-4 border border-[#bae6fd]">
          <p className="text-sm font-medium text-[#006eb3]">{message}</p>
        </div>
      )}

      <div className="grid gap-6">
        <section className="card-surface overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] bg-[#fafbfb] flex items-center justify-between">
            <h2 className="text-base font-semibold">Business profile</h2>
            <label className="btn btn-secondary text-xs !py-1 !px-2 cursor-pointer shadow-sm">
              {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ImageUp className="h-3 w-3 mr-1" />}
              Upload Logo
              <input
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
                type="file"
              />
            </label>
          </div>

          <div className="p-5">
            {profile.logoUrl && (
              <div className="mb-6 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- Supabase signed logo URLs should render exactly as stored. */}
                <img src={profile.logoUrl} alt="Logo" className="w-16 h-16 rounded border border-[var(--border)] object-cover bg-white" />
              </div>
            )}
            
            <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="field-label">Company name</label>
                <input className="field" value={profile.companyName} onChange={(event) => updateField("companyName", event.target.value)} />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input className="field" type="email" value={profile.email} onChange={(event) => updateField("email", event.target.value)} />
              </div>
              <div>
                <label className="field-label">Phone</label>
                <input className="field" value={profile.phone} onChange={(event) => updateField("phone", event.target.value)} />
              </div>
              <div className="md:col-span-2 border-t border-[var(--border)] pt-4 mt-2">
                <label className="field-label">Address line 1</label>
                <input className="field" value={profile.address1} onChange={(event) => updateField("address1", event.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="field-label">Address line 2</label>
                <input className="field" value={profile.address2} onChange={(event) => updateField("address2", event.target.value)} />
              </div>
              <div>
                <label className="field-label">City</label>
                <input className="field" value={profile.city} onChange={(event) => updateField("city", event.target.value)} />
              </div>
              <div>
                <label className="field-label">Province / Territory</label>
                <input className="field" value={profile.province} onChange={(event) => updateField("province", event.target.value)} />
              </div>
              <div>
                <label className="field-label">Postal code</label>
                <input className="field" value={profile.postalCode} onChange={(event) => updateField("postalCode", event.target.value)} />
              </div>
              <div>
                <label className="field-label">Country</label>
                <input className="field" value={profile.country} onChange={(event) => updateField("country", event.target.value)} />
              </div>
              <div className="md:col-span-2 border-t border-[var(--border)] pt-4 mt-2">
                <label className="field-label">Business number</label>
                <input className="field" value={profile.businessNumber} onChange={(event) => updateField("businessNumber", event.target.value)} />
                <p className="text-xs text-[var(--muted)] mt-1 flex items-center gap-1"><HelpCircle className="h-3 w-3"/> Displayed on all invoices if provided.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="card-surface overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] bg-[#fafbfb]">
            <h2 className="text-base font-semibold">Invoice defaults</h2>
          </div>
          <div className="p-5">
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <div>
                <label className="field-label">Invoice prefix</label>
                <input className="field" maxLength={12} value={profile.invoicePrefix} onChange={(event) => updateField("invoicePrefix", event.target.value.toUpperCase())} placeholder="INV-" />
              </div>
              <div>
                <label className="field-label">Default currency</label>
                <select className="field" value={profile.defaultCurrency} onChange={(event) => updateField("defaultCurrency", event.target.value as BusinessProfileForm["defaultCurrency"])}>
                  <option value="CAD">CAD (Canadian Dollar)</option>
                  <option value="USD">USD (US Dollar)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="field-label">Default notes</label>
                <textarea className="field h-24 resize-y" value={profile.defaultNotes} onChange={(event) => updateField("defaultNotes", event.target.value)} placeholder="Terms of payment, thank you message..." />
              </div>
            </div>
          </div>
        </section>

        <section className="card-surface overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] bg-[#fafbfb] flex items-center justify-between">
            <h2 className="text-base font-semibold">Tax registrations</h2>
            <button
              className="btn btn-secondary text-xs !py-1 !px-2 shadow-sm"
              onClick={() =>
                updateField("taxRegistrations", [
                  ...profile.taxRegistrations,
                  { id: crypto.randomUUID(), label: "GST/HST", number: "" },
                ])
              }
              type="button"
            >
              Add tax
            </button>
          </div>
          <div className="p-5">
            {profile.taxRegistrations.length === 0 ? (
              <p className="text-sm text-[var(--muted)] text-center py-4">No tax registrations configured.</p>
            ) : (
              <div className="space-y-3">
                {profile.taxRegistrations.map((registration, index) => (
                  <div className="flex items-start gap-3" key={registration.id}>
                    <div className="flex-1">
                      <input
                        className="field"
                        placeholder="Label (e.g. GST)"
                        value={registration.label}
                        onChange={(event) => {
                          const next = [...profile.taxRegistrations];
                          next[index] = { ...registration, label: event.target.value };
                          updateField("taxRegistrations", next);
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        className="field"
                        placeholder="Registration Number"
                        value={registration.number}
                        onChange={(event) => {
                          const next = [...profile.taxRegistrations];
                          next[index] = { ...registration, number: event.target.value };
                          updateField("taxRegistrations", next);
                        }}
                      />
                    </div>
                    <button
                      className="btn btn-secondary !p-2 text-[var(--danger)] hover:bg-[#fed3d1] hover:border-[#fed3d1]"
                      onClick={() =>
                        updateField(
                          "taxRegistrations",
                          profile.taxRegistrations.filter((item) => item.id !== registration.id),
                        )
                      }
                      type="button"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <PaymentMethodsEditor
          defaultLabel="Bank transfer"
          methods={profile.defaultPaymentMethods}
          onChange={(nextMethods) => updateField("defaultPaymentMethods", nextMethods)}
        />

        <TeamManagement
          currentMemberRole={currentMembership.role}
          invites={initialInvites}
          members={initialMembers}
        />
      </div>
    </div>
  );
}
