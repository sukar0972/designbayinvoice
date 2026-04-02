# DesignBayInvoice

DesignBayInvoice is a Next.js invoice generator for Canadian businesses. It uses Supabase for auth, database, and storage, and is structured to stay lightweight enough for a Netlify Free v1 deployment.

## Stack

- Next.js App Router
- React 19
- Tailwind CSS v4
- Supabase Auth + Postgres + Storage
- Netlify deployment target
- Browser-side PDF generation with `html2canvas` + `jspdf`

## Environment

Use `.env.example` as the safe template.

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

Optional server-only variable:

- `SUPABASE_SECRET_KEY`

Do not expose secret keys with a `NEXT_PUBLIC_` prefix.

## Database Setup

Apply the SQL in `supabase/migrations/001_init.sql` to create:

- `business_profiles`
- `invoices`
- `branding-assets` storage bucket
- RLS policies
- the `reserve_invoice_sequence()` RPC used for atomic invoice numbering

## Local Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm run test
npm run build
```

## Routes

- `/`
- `/login`
- `/dashboard`
- `/invoices/new`
- `/invoices/[id]`
- `/invoices/[id]/print`
- `/settings`
