"use client";

import type { ChangeEvent } from "react";
import { startTransition, useState } from "react";
import { ImageUp, Loader2, Plus, Save, Trash2 } from "lucide-react";

import { saveBusinessProfile } from "@/app/actions";
import { createPaymentInstruction } from "@/lib/invoices/defaults";
import { createClient } from "@/lib/supabase/client";
import type { BusinessProfileForm } from "@/types/domain";

type SettingsFormProps = {
  initialProfile: BusinessProfileForm;
  userId: string;
};

export function SettingsForm({ initialProfile, userId }: SettingsFormProps) {
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

    if (!file) {
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop() ?? "png";
      const path = `${userId}/logo/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from("branding-assets")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) {
        throw error;
      }

      const { data } = await supabase.storage
        .from("branding-assets")
        .createSignedUrl(path, 60 * 60);

      updateField("logoPath", path);
      updateField("logoUrl", data?.signedUrl ?? null);
      setMessage("Logo uploaded. Save settings to make the change permanent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to upload the logo.");
    }

    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      await saveBusinessProfile(profile);
      setMessage("Settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save settings.");
    }

    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <section className="card-surface rounded-[2.4rem] p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--accent)]">Business profile</p>
            <h1 className="display-font mt-4 text-4xl sm:text-5xl">Set the defaults every new invoice should inherit.</h1>
          </div>
          <button
            className="btn btn-primary self-start"
            disabled={saving}
            onClick={() => startTransition(handleSave)}
            type="button"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save settings
          </button>
        </div>

        {message ? (
          <p className="mt-5 whitespace-pre-line rounded-2xl bg-[rgba(20,87,255,0.08)] px-4 py-3 text-sm font-semibold text-[var(--accent)]">
            {message}
          </p>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="card-surface rounded-[2rem] p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">Identity</p>
              <h2 className="mt-2 text-2xl font-black">Business details</h2>
            </div>
            <label className="btn btn-secondary cursor-pointer">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
              Upload logo
              <input className="hidden" onChange={handleLogoUpload} type="file" accept="image/*" />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
            <div className="md:col-span-2">
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
            <div className="md:col-span-2">
              <label className="field-label">Business number</label>
              <input className="field" value={profile.businessNumber} onChange={(event) => updateField("businessNumber", event.target.value)} />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <article className="card-surface rounded-[2rem] p-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">Defaults</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="field-label">Invoice prefix</label>
                <input className="field" maxLength={12} value={profile.invoicePrefix} onChange={(event) => updateField("invoicePrefix", event.target.value.toUpperCase())} />
              </div>
              <div>
                <label className="field-label">Default currency</label>
                <select className="field" value={profile.defaultCurrency} onChange={(event) => updateField("defaultCurrency", event.target.value as BusinessProfileForm["defaultCurrency"])}>
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="field-label">Default notes</label>
                <textarea className="field min-h-[140px]" value={profile.defaultNotes} onChange={(event) => updateField("defaultNotes", event.target.value)} />
              </div>
            </div>
          </article>

          <article className="card-surface rounded-[2rem] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">Tax registrations</p>
                <h3 className="mt-2 text-xl font-black">Optional registration details</h3>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() =>
                  updateField("taxRegistrations", [
                    ...profile.taxRegistrations,
                    { id: crypto.randomUUID(), label: "GST/HST", number: "" },
                  ])
                }
                type="button"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
            <div className="space-y-3">
              {profile.taxRegistrations.map((registration, index) => (
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" key={registration.id}>
                  <input
                    className="field"
                    placeholder="Label"
                    value={registration.label}
                    onChange={(event) => {
                      const next = [...profile.taxRegistrations];
                      next[index] = { ...registration, label: event.target.value };
                      updateField("taxRegistrations", next);
                    }}
                  />
                  <input
                    className="field"
                    placeholder="Registration number"
                    value={registration.number}
                    onChange={(event) => {
                      const next = [...profile.taxRegistrations];
                      next[index] = { ...registration, number: event.target.value };
                      updateField("taxRegistrations", next);
                    }}
                  />
                  <button
                    className="btn btn-danger"
                    onClick={() =>
                      updateField(
                        "taxRegistrations",
                        profile.taxRegistrations.filter((item) => item.id !== registration.id),
                      )
                    }
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>

      <section className="card-surface rounded-[2rem] p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">Payment instructions</p>
            <h3 className="mt-2 text-xl font-black">Methods shown on new invoices</h3>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() =>
              updateField("defaultPaymentMethods", [
                ...profile.defaultPaymentMethods,
                createPaymentInstruction("Bank transfer"),
              ])
            }
            type="button"
          >
            <Plus className="h-4 w-4" />
            Add method
          </button>
        </div>

        <div className="space-y-4">
          {profile.defaultPaymentMethods.map((method, index) => (
            <article className="rounded-[1.7rem] border border-[var(--border)] bg-white/80 p-4" key={method.id}>
              <div className="grid gap-4 md:grid-cols-[1fr_2fr_auto_auto]">
                <input
                  className="field"
                  placeholder="Method label"
                  value={method.label}
                  onChange={(event) => {
                    const next = [...profile.defaultPaymentMethods];
                    next[index] = { ...method, label: event.target.value };
                    updateField("defaultPaymentMethods", next);
                  }}
                />
                <input
                  className="field"
                  placeholder="Instructions"
                  value={method.details}
                  onChange={(event) => {
                    const next = [...profile.defaultPaymentMethods];
                    next[index] = { ...method, details: event.target.value };
                    updateField("defaultPaymentMethods", next);
                  }}
                />
                <button
                  className={`btn ${method.preferred ? "btn-primary" : "btn-secondary"}`}
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
                  className="btn btn-danger"
                  onClick={() =>
                    updateField(
                      "defaultPaymentMethods",
                      profile.defaultPaymentMethods.filter((item) => item.id !== method.id),
                    )
                  }
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
