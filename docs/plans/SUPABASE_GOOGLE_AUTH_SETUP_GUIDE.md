# Supabase Google Auth Setup Guide (for fast-eat-client)

Last updated: 2026-02-24
Reference: Supabase Docs — Login with Google

## 1) Overview

This guide enables Google login for `fast-eat-client` using Supabase Auth OAuth.

Core flow:
1. User clicks Google button in app.
2. App calls `supabase.auth.signInWithOAuth({ provider: 'google' })`.
3. Google redirects back to `app/auth/callback/route.ts`.
4. Callback exchanges OAuth code for Supabase session.

## 2) Configure Google Cloud

1. Open Google Cloud Console > Google Auth Platform.
2. Create OAuth Client ID with type **Web application**.
3. Add Authorized JavaScript Origins:
   - `http://localhost:3000` (or your local port)
   - your production domain origin (no path)
4. Add Authorized Redirect URI:
   - Supabase callback URL from Supabase Dashboard (Google provider section).
   - local dev fallback: `http://localhost:3000/auth/v1/callback` when relevant in Supabase local setup.
5. Save Client ID and Client Secret.

## 3) Configure Supabase Dashboard

1. Go to Project > Authentication > Providers > Google.
2. Enable Google provider.
3. Paste Client ID and Client Secret from Google.
4. Save.

## 4) Configure Redirect URLs in Supabase Auth

In Authentication URL settings:
- Site URL: set your app base URL.
- Redirect allow-list: include callback route(s), for example:
  - `http://localhost:3000/auth/callback`
  - `https://<your-domain>/auth/callback`

Important:
- Callback route used by app must exactly match what frontend sends in `redirectTo`.

## 5) App-side requirements

- Implement callback route at `src/app/auth/callback/route.ts`.
- In sign-in page, use:

```ts
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${window.location.origin}/auth/callback` },
})
```

- In callback route, exchange code for session.

## 6) Validation checklist

- Google button opens consent page.
- Callback route receives `code` query param.
- Session is created and persisted.
- User is redirected to app home (or `next` route).

## 7) Common issues

- Mismatched redirect URL (most common).
- Provider enabled in Google but not enabled in Supabase.
- Missing callback code exchange.
- Using wrong project keys/URL in frontend env vars.

## 8) Security recommendations

- Use your production custom domain when possible.
- Keep Google client secret only in secure server-side configuration.
- Validate `next` redirect target as internal-only path.
