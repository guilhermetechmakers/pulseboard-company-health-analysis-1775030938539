# Single-company mode (PulseBoard)

PulseBoard enforces **one active company per authenticated user** for dashboards, analysis, integrations, and exports.

## Client

- **`ActiveCompanyProvider`** (`src/contexts/active-company-context.tsx`) resolves the user’s company via `useMyCompany`, mirrors the id to `sessionStorage` / `localStorage`, and syncs `profiles.last_context_company_id` when it drifts.
- **`RequireCompanyRoute`** redirects signed-in users without a company row to `/company/create`.
- **Headers**: `buildAuthenticatedEdgeHeaders()` and `getAuthHeaders()` send `X-Active-Company-Id` and `X-PulseBoard-Active-Company-Id` when an id is stored (`src/lib/pulseboard-request-headers.ts`, `src/lib/api.ts`).
- **Flags**: `VITE_SINGLE_COMPANY_MODE=false` relaxes client redirects only. `profiles.single_company_mode` (default `true`, migration `20260401280000_single_company_mode_profile_flag.sql`) can disable client gating per user when set to `false`.

## Edge Functions

- **`pulse-companies-api`**: `me_get`, `me_patch`, and `me_delete` resolve the target company with `resolveScopedCompanyId()` — validating optional scope headers against owned rows and `last_context_company_id` for legacy duplicates. Ops `resolve_active_company` and `context_sync` support login/onboarding flows.
- **`admin-api`**: `user_set_primary_company` sets `profiles.last_context_company_id` for a target user after admin verification.
- **`pulse-active-company`**: optional `resolve` / `sync_context` using the user JWT and RLS.

## Admin

Use **Admin → Switch / merge** (`/admin/company-consolidation`): duplicate detection, merge, dry-run, and **Set primary company context** for users with multiple company rows.

## User remediation

- **Blocked scope**: `/workspace/blocked` and `/company/scope-notice` render `SingleCompanyBlockedPage` with links back to the workspace.
