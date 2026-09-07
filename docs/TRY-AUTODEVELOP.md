# Try Autodevelop

Copyright (c) 2026 Devrecated.

Public sandbox on this demo. A visitor types a prompt. Autodevelop envelopes the intake and builds a session preview. This app then applies a typed overlay so the live pages update in that tab only.

Closing the tab drops the overlay. A Show Me tour walks the change. Production git is not written. Visitor prompts do not create GitHub issues.

## Origins

Local development points the browser at the Autodevelop ticket UI (`NEXT_PUBLIC_AUTODEVELOP_TRY_ORIGIN`, default `http://localhost:5174`) which proxies `/try` to the Autodevelop API (`AUTODEVELOP_API_ORIGIN`, default `http://127.0.0.1:8789`).

The published demo does not use those loopback defaults. `POST /api/sandbox/apply` is the same-origin apply path. When a public Autodevelop API origin is set, that route forwards the prompt there. When it is not, the route returns a host-equivalent overlay so the live tab still changes.

Do not set `NEXT_PUBLIC_AUTODEVELOP_TICKETS_ORIGIN`, `NEXT_PUBLIC_AUTODEVELOP_TRY_ORIGIN`, or `AUTODEVELOP_API_ORIGIN` to localhost on Vercel.

## Controls

- Sign-in and the top bar: **Try Autodevelop**
- Inbound `?try=1` opens the dialog
- Overlay and tour dismissals live in sessionStorage for that tab
- **Reset** restores seed data and clears theme tokens
- `?featureDemo=0` hides the tour

## Limits

- Prompt 8–400 characters
- Eight applies per IP per minute
- Schema keys only: theme, copy, data, widgets, navigateTo, featureDemo

Turnstile is not wired until a site key exists. Do not commit secret values.

## Company site

The Devrecated Solutions site links here with `?try=1`. Local company origin is `http://localhost:3011` and opens this app at `http://localhost:3000/?try=1` unless `NEXT_PUBLIC_ACME_ORIGIN` is set.
