"use client";

import type { ChangeEvent } from "react";
import { startTransition, useState } from "react";
import { HelpCircle, ImageUp, Loader2, Trash2 } from "lucide-react";

import { saveBusinessProfile } from "@/app/actions";
import { createPaymentInstruction } from "@/lib/invoices/defaults";
import { createClient } from "@/lib/supabase/client";
import type {
  BusinessProfileForm,
  OrganizationInvite,
  OrganizationMember,
} from "@/types/domain";

import { TeamManagement } from "@/components/settings/team-management";

const MAX_LOGO_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

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
  organizationId,
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

    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      setMessage("Invalid logo format. Use PNG, JPG, WebP, or SVG.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_LOGO_FILE_SIZE) {
      setMessage("Logo file is too large. Maximum size is 2 MB.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop() ?? "png";
      const path = `${organizationId}/logo/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from("branding-assets")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) throw error;

      const { data } = await supabase.storage
        .from("branding-assets")
        .createSignedUrl(path, 60 * 60);

      updateField("logoPath", path);
      updateField("logoUrl", data?.signedUrl ?? null);
      setMessage("Logo uploaded successfully. Save settings to apply.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
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
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoUpload}
                type="file"
              />
            </label>
          </div>

          <div className="p-5">
            {profile.logoUrl && (
              <div className="mb-6 flex items-center gap-4">
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

        <section className="card-surface overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] bg-[#fafbfb] flex items-center justify-between">
            <h2 className="text-base font-semibold">Payment instructions</h2>
            <button
              className="btn btn-secondary text-xs !py-1 !px-2 shadow-sm"
              onClick={() =>
                updateField("defaultPaymentMethods", [
                  ...profile.defaultPaymentMethods,
                  createPaymentInstruction("Bank transfer"),
                ])
              }
              type="button"
            >
              Add method
            </button>
          </div>
          <div className="p-5">
            {profile.defaultPaymentMethods.length === 0 ? (
              <p className="text-sm text-[var(--muted)] text-center py-4">No payment methods configured.</p>
            ) : (
              <div className="space-y-4">
                {profile.defaultPaymentMethods.map((method, index) => (
                  <div className="p-4 rounded-md border border-[var(--border)] bg-[#fafbfb]" key={method.id}>
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-3">
                        <input
                          className="field"
                          placeholder="Method label (e.g. e-Transfer)"
                          value={method.label}
                          onChange={(event) => {
                            const next = [...profile.defaultPaymentMethods];
                            next[index] = { ...method, label: event.target.value };
                            updateField("defaultPaymentMethods", next);
                          }}
                        />
                        <input
                          className="field"
                          placeholder="Instructions (e.g. Send to email@...)"
                          value={method.details}
                          onChange={(event) => {
                            const next = [...profile.defaultPaymentMethods];
                            next[index] = { ...method, details: event.target.value };
                            updateField("defaultPaymentMethods", next);
                          }}
                        />
                        <label className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                          <input
                            checked={Boolean(method.processingFeeEnabled)}
                            onChange={(event) => {
                              const next = [...profile.defaultPaymentMethods];
                              next[index] = {
                                ...method,
                                processingFeeEnabled: event.target.checked,
                              };
                              updateField("defaultPaymentMethods", next);
                            }}
                            type="checkbox"
                          />
                          Add a processing fee on top for this payment method
                        </label>
                        {method.processingFeeEnabled ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="field-label">Fee percent</label>
                              <input
                                className="field"
                                min="0"
                                placeholder="2.9"
                                step="0.01"
                                type="number"
                                value={method.processingFeePercent ?? 0}
                                onChange={(event) => {
                                  const next = [...profile.defaultPaymentMethods];
                                  next[index] = {
                                    ...method,
                                    processingFeePercent: Number(event.target.value),
                                  };
                                  updateField("defaultPaymentMethods", next);
                                }}
                              />
                            </div>
                            <div>
                              <label className="field-label">Flat fee</label>
                              <input
                                className="field"
                                min="0"
                                placeholder="0.30"
                                step="0.01"
                                type="number"
                                value={method.processingFeeFlatAmount ?? 0}
                                onChange={(event) => {
                                  const next = [...profile.defaultPaymentMethods];
                                  next[index] = {
                                    ...method,
                                    processingFeeFlatAmount: Number(event.target.value),
                                  };
                                  updateField("defaultPaymentMethods", next);
                                }}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          className={`btn text-xs !py-1.5 ${method.preferred ? "btn-primary shadow-sm" : "btn-secondary shadow-sm"}`}
                          onClick={() => {
                            const next = profile.defaultPaymentMethods.map((item) => ({
                              ...item,
                              preferred: item.id === method.id,
                            }));
                            updateField("defaultPaymentMethods", next);
                          }}
                          type="button"
                        >
                          Preferred
                        </button>
                        <button
                          className="btn btn-secondary text-xs !py-1.5 text-[var(--danger)] hover:bg-[#fed3d1] hover:border-[#fed3d1] shadow-sm"
                          onClick={() =>
                            updateField(
                              "defaultPaymentMethods",
                              profile.defaultPaymentMethods.filter((item) => item.id !== method.id),
                            )
                          }
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <TeamManagement
          currentMemberRole={currentMembership.role}
          invites={initialInvites}
          members={initialMembers}
        />
      </div>
    </div>
  );
}
