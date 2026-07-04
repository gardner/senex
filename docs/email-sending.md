# Email Sending

Senex sends transactional email through Cloudflare Email Sending. The Worker
gets an `EMAIL` binding and sends through `lib/email.ts`.

## Scope

Allowed email:

- Password resets
- Account or organization invitations
- Product-triggered transactional notifications as features are added

Not allowed:

- Marketing blasts
- Newsletters
- Bulk email unrelated to a direct user action or account event

## Binding

`wrangler.jsonc` defines the binding:

```jsonc
"send_email": [
  {
    "name": "EMAIL",
    "remote": true,
    "allowed_sender_addresses": ["no-reply@senex.nz"]
  }
]
```

`remote: true` means local development proxies sends to the real Cloudflare
Email Sending service. Emails can really deliver from a local dev server.

## Sender Isolation

All sending goes through `lib/email.ts`:

```ts
const FROM = { email: "no-reply@senex.nz", name: "Senex" };
```

Application code should not call `env.EMAIL.send` directly. This keeps sender
identity, validation, and future logging in one place.

Always provide both HTML and plain text bodies. Some clients render only plain
text, and text-less messages are more likely to look suspicious to spam filters.

## Local Development

- Only send test email to addresses you control.
- Do not test with fake recipients; bounces can hurt sender reputation.
- If a flow should be tested without real delivery, assert the surrounding app
  behavior instead of sending mail.

## Useful Commands

```bash
pnpm wrangler email sending list
pnpm wrangler email sending enable <domain>
pnpm cf:typegen
```

Cloudflare Email Sending setup and DNS authentication are managed in the
Cloudflare dashboard.
