# Auth, Roles, and Access

Senex uses Better Auth for signed-in users and administrative access. Product
identity modes are broader than auth accounts, so keep account state separate
from consent state and local/offline state.

## Authentication

- **Email and password:** sign up at `/sign-up`, sign in at `/sign-in`, and
  reset passwords through `/forgot-password` and `/reset-password`.
- **Account profile:** signed-in users manage their Better Auth display name
  and profile image at `/account`.
- **Google OAuth:** enabled when `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET` are configured.
- **Bearer tokens:** available through the Better Auth bearer plugin for API or
  native-client use cases.

The server uses the single Better Auth instance in `lib/auth/index.ts`. Shared
plugin options live in `lib/auth/options.ts` so schema generation and runtime
configuration stay aligned.

## Platform Roles

The Better Auth admin plugin adds `user.role`:

- `user`: default signed-in account
- `admin`: staff/operator access

Use `requireUser()` and `requireAdmin()` from `lib/auth/helpers.ts` for
server-side route protection.

## Account Data Controls

The `/account` page lets signed-in users download an `account-export-v1` JSON
file containing account profile fields and account-linked sync records. It also
lets users create an auditable account deletion request after acknowledging that
already shared research submissions require review/exclusion handling and local
browser history must be deleted on the device. Changing account profile fields
does not change research consent, anonymous reporting consent, or local-only
history.

## Organization Roles

The organization plugin is installed for future team or partner workflows.
Avoid building product-specific authorization into the auth plugin itself.
When a feature needs record-level sharing, add explicit app tables and a single
helper for access checks.

## Product Identity Modes

The PRD defines three product modes:

| Mode                     | Account?               | Notes                                  |
| ------------------------ | ---------------------- | -------------------------------------- |
| Offline Mode             | no                     | local-only browser data                |
| Anonymous Reporting Mode | no traditional account | random study id plus consented uploads |
| Signed-In Mode           | yes                    | Better Auth account and account sync   |

Do not link anonymous reporting history to a signed-in account without an
explicit consent step.
