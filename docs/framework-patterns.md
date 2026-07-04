# Framework Patterns

Senex uses vinext's Next.js 16 App Router API on Cloudflare Workers. Treat this
as a constrained runtime, not generic Next.js on Node.

## Route Organization

- Use `app/` file-system routes.
- Use route groups for layout separation without changing URLs. Current
  example: `app/(public)/layout.tsx` wraps home and auth pages, while
  `app/dashboard/page.tsx` uses its own dashboard shell.
- Keep product logic outside route files. Pages should compose UI and call
  domain/repository functions.

## Server Components

Server Components are the default for pages and shared shell components.

Current examples:

- `app/(public)/page.tsx` renders public content without client JavaScript.
- `components/site-header.tsx` reads the current user on the server and renders
  links.
- `app/dashboard/page.tsx` requires a user on the server before rendering the
  dashboard.

Use Server Components for:

- database-backed reads
- auth checks
- non-interactive layout and content
- Cloudflare binding access

Do not pass secrets or binding objects into Client Components.

## Client Components

Use Client Components only when the component needs browser interactivity,
state, effects, or client-side library hooks.

Current examples:

- `components/auth/sign-in-form.tsx`
- `components/auth/sign-up-form.tsx`
- `components/auth/forgot-password-form.tsx`
- `components/auth/reset-password-form.tsx`
- shadcn sidebar/dropdown primitives under `components/ui/`

Place `"use client"` at the top of the file. Keep the client boundary narrow:
prefer a small form or control component inside a Server Component shell.

## Route Handlers

Use `route.ts` files for HTTP APIs, webhooks, reporting endpoints, and library
integrations that expect request/response handlers.

Current example:

- `app/api/auth/[...all]/route.ts` mounts Better Auth endpoints with
  `toNextJsHandler(auth)`.

Route handlers should validate input, call domain/repository functions, and
return explicit status codes. Do not put long-term product rules directly in the
handler body.

## Server Actions

Server Actions are allowed only after the flow has a browser or integration test
covering it. Prefer route handlers for API-like boundaries and use Server
Actions for simple form mutations where a React form flow benefits from direct
server execution.

Server Actions must follow the same rules as route handlers: validate inputs,
call shared domain/repository functions, and keep consent checks explicit.

## Cloudflare Bindings

Access runtime bindings with:

```ts
import { env } from "cloudflare:workers";
```

Use this only in server-only modules: Server Components, route handlers, server
actions, Worker entry code, and server libraries. Current examples:

- `lib/auth/index.ts` reads `env.DB` for Better Auth.
- `lib/email.ts` sends through `env.EMAIL`.
- `app/dashboard/page.tsx` reads `env.APP_ENV`.
- `components/site-footer.tsx` reads `env.APP_ENV` in a Server Component.

Do not use `getPlatformProxy()` in app code. Do not import
`cloudflare:workers` from Client Components, Vitest-only helpers, or Node CLI
scripts.

## Vinext Sharp Edges

- `vinext` is experimental and targets the latest Next.js API surface rather
  than bug-for-bug compatibility.
- `next/font/google` loads through the runtime CDN in vinext; it is not
  self-hosted at build time.
- `next/image` does not do build-time optimization. Local image optimization
  relies on the Cloudflare Images binding in production.
- `runtime` and `preferredRegion` route segment config values are ignored.
- `vinext start` is useful for testing production output, but Workers are the
  production target.
