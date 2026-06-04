import { requireUser } from "@/lib/auth";
import type { BusinessProfileForm, TaxRegistration } from "@/types/domain";

type BusinessProfileRow = {
  organization_id: string;
  company_name: string;
  email: string | null;
  phone: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  business_number: string | null;
  tax_registrations: unknown;
  invoice_prefix: string;
  next_invoice_sequence: number;
  default_currency: "CAD" | "USD";
  default_payment_methods: unknown;
  default_notes: string | null;
  logo_path: string | null;
};

function asArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function getSignedLogoUrl(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  path?: string | null,
) {
  if (!path) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from("branding-assets")
    .createSignedUrl(path, 60 * 60);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

function mapBusinessProfileRow(
  row: BusinessProfileRow,
  logoUrl: string | null,
): BusinessProfileForm {
  return {
    companyName: row.company_name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    address1: row.address1 ?? "",
    address2: row.address2 ?? "",
    city: row.city ?? "",
    province: row.province ?? "",
    postalCode: row.postal_code ?? "",
    country: row.country ?? "Canada",
    businessNumber: row.business_number ?? "",
    taxRegistrations: asArray<TaxRegistration>(row.tax_registrations),
    invoicePrefix: row.invoice_prefix,
    nextInvoiceSequence: row.next_invoice_sequence,
    defaultCurrency: row.default_currency,
    defaultPaymentMethods: asArray<Partial<BusinessProfileForm["defaultPaymentMethods"][number]> & { id: string; label: string }>(
      row.default_payment_methods,
    ).map((method) => ({
      id: method.id,
      label: method.label,
      details: method.details ?? "",
      preferred: Boolean(method.preferred),
      processingFeeEnabled: Boolean(method.processingFeeEnabled),
      processingFeePercent: Number(method.processingFeePercent ?? 0),
      processingFeeFlatAmount: Number(method.processingFeeFlatAmount ?? 0),
      stripePaymentLink: method.stripePaymentLink ?? "",
      stripeQrEnabled: Boolean(method.stripeQrEnabled),
    })),
    defaultNotes: row.default_notes ?? "",
    logoPath: row.logo_path,
    logoUrl,
  };
}

export function serializeBusinessProfile(profile: BusinessProfileForm) {
  return {
    company_name: profile.companyName,
    email: profile.email || null,
    phone: profile.phone || null,
    address1: profile.address1 || null,
    address2: profile.address2 || null,
    city: profile.city || null,
    province: profile.province || null,
    postal_code: profile.postalCode || null,
    country: profile.country || "Canada",
    business_number: profile.businessNumber || null,
    tax_registrations: profile.taxRegistrations,
    invoice_prefix: profile.invoicePrefix.trim().toUpperCase(),
    next_invoice_sequence: profile.nextInvoiceSequence,
    default_currency: profile.defaultCurrency,
    default_payment_methods: profile.defaultPaymentMethods,
    default_notes: profile.defaultNotes,
    logo_path: profile.logoPath ?? null,
  };
}

export async function ensureBusinessProfileForOrganization(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  organizationId: string,
  fallbackEmail: string,
) {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle<BusinessProfileRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return mapBusinessProfileRow(data, await getSignedLogoUrl(supabase, data.logo_path));
  }

  const empty: BusinessProfileForm = {
    companyName: "My Business",
    email: fallbackEmail,
    phone: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    postalCode: "",
    country: "Canada",
    businessNumber: "",
    taxRegistrations: [],
    invoicePrefix: "INV",
    nextInvoiceSequence: 1,
    defaultCurrency: "CAD",
    defaultPaymentMethods: [],
    defaultNotes: "",
  };

  const { data: inserted, error: insertError } = await supabase
    .from("business_profiles")
    .insert({
      organization_id: organizationId,
      ...serializeBusinessProfile(empty),
    })
    .select("*")
    .single<BusinessProfileRow>();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return mapBusinessProfileRow(
    inserted,
    await getSignedLogoUrl(supabase, inserted.logo_path),
  );
}

export async function getBusinessProfileForCurrentUser() {
  const { requireOrganizationContext } = await import("@/lib/organizations/data");
  const { profile } = await requireOrganizationContext();
  return profile;
}
