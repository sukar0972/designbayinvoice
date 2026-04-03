# DesignBayInvoice Agent Notes

## Overview
- Next.js 16 App Router invoice generator for Canadian businesses.
- Hosted on Netlify.
- Auth, database, and storage are handled by Supabase.
- Main product areas: landing/login, dashboard, invoice editor, print/PDF export, settings.

## Stack
- `next@16`
- `react@19`
- Tailwind CSS v4
- `@supabase/ssr`
- `@supabase/supabase-js`
- `html2canvas` + `jspdf` for browser PDF generation
- `vitest` for utility tests

## Important Routes
- `/` marketing landing page
- `/login` magic-link login
- `/auth/callback` Supabase auth callback
- `/dashboard` invoice overview
- `/invoices/new` new invoice composer
- `/invoices/[id]` invoice editor
- `/invoices/[id]/print` print view
- `/settings` business profile and defaults

## Key Files
- `app/actions.ts`: server actions for profile and invoice mutations
- `lib/data.ts`: Supabase reads, row mapping, serialization
- `lib/supabase/*`: browser/server/proxy clients
- `components/invoices/invoice-editor.tsx`: main invoice editing UI
- `components/invoices/invoice-document.tsx`: canonical invoice render for preview/print/PDF
- `supabase/migrations/001_init.sql`: schema, RLS, storage bucket, invoice numbering RPC
- `netlify.toml`: Netlify build/plugin config

## Data Model
- `organizations`
  - one shared workspace per business
- `organization_members`
  - active users attached to a shared organization
- `organization_invites`
  - pending/accepted/revoked member invites
- `business_profiles`
  - one row per organization
  - stores company info, invoice prefix, default currency, payment methods, notes, logo path
- `invoices`
  - owned by `organization_id`
  - stores snapshotted company data, bill-to data, line items, tax lines, totals, and status
- Storage bucket: `branding-assets`

## Auth And Security
- Supabase magic-link auth.
- Protected routes use server-side auth checks.
- Shared data is organization-scoped through memberships, not direct `auth.uid()` ownership.
- `SUPABASE_SECRET_KEY` is not required by the current app and should stay server-only if ever used.

## Deployment Notes
- Netlify env vars required:
  - `NEXT_PUBLIC_SITE_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- These `NEXT_PUBLIC_*` values must not be marked as secret in Netlify because they are intentionally exposed to the client.
- Netlify config currently uses `@netlify/plugin-nextjs`.
- If Netlify deploy issues appear, inspect whether the Next runtime/plugin actually provisioned functions.

## Current Gotchas
- PDF export uses `html2canvas`, so invoice document styles were simplified to literal color values to avoid unsupported color-function errors.
- Validation errors are formatted into readable multiline messages via `lib/invoices/errors.ts`.
- `inspo/` is local reference material only and should not be tracked in git.
