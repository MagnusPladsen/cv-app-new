# CVApp Accounts — Manual Verification

Playwright covers the signed-out half: that accounts never become a
prerequisite, that the header still fits a phone with the account link
showing, that the auth endpoints are not locale-prefixed, and that a hostile
`next` is discarded. It cannot cover the signed-in half — real OAuth needs a
Google account and a headful browser — so **a green suite is not evidence that
sync works**.

Run these against the live Supabase project, in order: a failure makes the
next check meaningless. Tick them off in a PR or a comment, not from memory.

- [ ] **0. Sign up and confirm.** On `/no/login`, create an account with a real
      address. You should see "Sjekk e-posten din", then a confirmation email.
      Open the link: it lands on `/auth/callback` and signs you in.

      **Supabase's built-in email sender is rate-limited to a handful of
      messages an hour.** Hitting it shows "For mange forsøk" rather than a
      confirmation, and it is the most likely reason a test signup fails. For
      anything beyond occasional testing, configure a real SMTP sender in
      Authentication → Emails.

- [ ] **1. Sign-in claims local work.** Signed out, create two CVs. Sign in
      with Google. The banner names two CVs; the Supabase table editor shows
      two `cv_documents` rows with your `user_id`.

- [ ] **2. A second device pulls them.** Open a private window, sign in as the
      same user. Both CVs appear, once each. No duplicates.

- [ ] **3. An edit propagates.** Rename a CV in window A. Wait a few seconds,
      reload window B: the new name is there.

- [ ] **4. A delete stays deleted.** Delete a CV in window A. Reload window B:
      gone. Reload again: still gone. *This is the tombstone check. Without
      tombstones the CV comes back on the second reload, and it is the single
      most likely thing to be broken.*

- [ ] **5. Offline edits catch up.** In devtools, go offline. Edit a CV — the
      badge reads "Frakoblet". Go back online: the badge returns to "Lagret på
      kontoen din" and the row's `updated_at` moves.

- [ ] **6. Sign-out leaves nothing behind.** Sign out. The dashboard is empty
      and the badge reads "Lagret bare på denne enheten". Now sign in as a
      *different* Google account: it sees only its own CVs, never the first
      account's.

- [ ] **7. Another user cannot read yours.** Signed in as user B, in the
      browser console:
      ```js
      await (await fetch('https://<ref>.supabase.co/rest/v1/cv_documents?select=id', {
        headers: { apikey: '<publishable key>' },
      })).json()
      ```
      Expect `[]`, never user A's rows. This is the RLS check and it is the one
      worth doing slowly.

- [ ] **7b. Erasure leaves nothing behind.** Run
      `supabase/tests/delete_own_account.sql` in the SQL editor. It must print
      `OK: erasure removed every row…`. This is the Art. 17 evidence: check 8
      exercises the user-facing flow, this one proves the database keeps its
      promise, including that the cascade does not reach another user's rows.

- [ ] **8. Account deletion really deletes.** On `/account`, type SLETT and
      delete. The Supabase dashboard shows no user and no `cv_documents` rows
      for them.

- [ ] **9. Apple, once enabled.** Repeat check 1 on the deployed HTTPS domain.
      Apple refuses `localhost` return URLs, so this cannot be done locally.

- [ ] **10. Mobile.** Repeat checks 1 and 3 at a phone width. The header still
      fits with the account link in it.

## If something fails

- Every sign-in failing at once: check the Supabase project is not paused
  (free projects pause after about a week idle; `/api/keep-alive` runs daily
  to prevent it).
- Sign-in redirects to `/auth/auth-code-error`: the exact callback URL is
  probably missing from Authentication → URL Configuration.
- No sign-in buttons at all: `NEXT_PUBLIC_AUTH_PROVIDERS` is unset. It is
  opt-in, and empty means none.
