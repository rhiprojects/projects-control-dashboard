# Projects Control Dashboard — Supabase Foundation v3.1

**Private GitHub source repository. No Cloudflare deployment has been authorized or performed.**

This revision preserves the approved Version 2 dashboard layout and styling. The application now uses **Supabase exclusively**: no Notion requests, integrations, tokens, dependencies, migrations, or environment variables.

## Current confirmed backend (live Supabase, verified 2026-11-14)

Project ref: `vhbpnshbcggocfhffpbx`; regional host was provisioned in Tokyo (`ap-northeast-1`).

- `public.project_users`: 3 approved profiles.
- `public.ongoing_projects`: 10 imported projects from `On-goinig Projects F Status(2).xlsx` / earlier source register; historical 2024, 2025 and Jan–Jun 2026 source financial amounts retained.
- `public.project_assignments`: 736 and 776 allocated to Mohamed Mahmoud. Project 766 is NOT allocated despite sharing the Amreyah client name.
- Supabase RLS enabled on all three tables. Unauthenticated users have no data access.
- No `auth.users` accounts currently linked. Password login will reject all users until Auth identities are verified and linked.

## Approved roles

| Role | Temporary email | Scope |
| --- | --- | --- |
| Super Admin | `rhiprojects26@gmail.com` | All projects, current assignment visibility |
| Head of Projects | `rhiprojects26+hassan@gmail.com` | All projects |
| Team Member | `rhiprojects26+mohd@gmail.com` | 736 (Amreyah) and 776 (RICG) only |

The role is looked up from the authorized `project_users` table, not browser-selectable. A verified Supabase Auth email and matching `auth_user_id` are required before a profile becomes active. No invitation or password is committed to this repository.

## What the source code does

- `public/`: approved responsive dashboard visuals, sign-in, portfolio, project cards, register details, reports, search, read-only assignment listing.
- `functions/`: same-origin Cloudflare Pages Functions connecting to Supabase. Request authorization is checked server-side; the Supabase REST API applies RLS independently.
- `GET /api/projects`: returns only RLS-visible projects.
- `PUT /api/projects/:code`: checks ownership, exact previous `last_updated`, and an allowlist: `contractValue`, `progress`, `status`. Changes use a conditional PostgREST PATCH to prevent lost updates.
- `GET /api/admin/users`: Super Admin only, read-only users and assignments. Assignment editing is intentionally disabled pending activation and proper auditing.
- PDF uses browser Print / Save as PDF. Email prepares a local mail draft, not sends. AI uses limited local rules, not a generative model.

All money retains original currency. The source's `Total Progress` is a **financial amount, not physical progress percent, revenue recognized, or an invoice ledger**. No COGS, detailed P&L, invoice or collections table has been created.

## Configuration (local / private only)

1. Copy `.dev.vars.example` to `.dev.vars` and set `SUPABASE_URL` and **publishable** key from the connected Supabase project. These two parameters are public configuration, not secrets.
2. Activate and verify approved Supabase Auth users by separately authorized action. Do not send passwords or secret tokens through chat or GitHub. Before launch, configure redirect URLs, disable unrestricted signup, and test login flows.
3. Run `npm install` to install pinned Wrangler version and then `npm test`; run `npm run dev` to test locally with Pages Functions.
4. Verify 401 for signed out, 403 for an unprovisioned user, 2 projects for Mohamed, 10 for Hassan and Super Admin, and that Mohamed cannot access or write 766 or any unassigned project. Real-user Auth tests cannot run before identities are activated.
5. Only after approval, connect GitHub to Cloudflare Pages and configure builds; do not deploy from this repository without explicit permission.

**Important:** The Supabase Free project has no automatic backups. A backup/recovery procedure should be approved before business use. Database credentials should never be included in source code.

## Reference documentation

- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Auth email: https://supabase.com/docs/guides/auth/auth-email-password
- Supabase REST Data API: https://supabase.com/docs/guides/api
- Cloudflare Pages Functions: https://developers.cloudflare.com/pages/functions/