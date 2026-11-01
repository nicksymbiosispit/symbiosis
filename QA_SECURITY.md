# Symbiosis security QA — PR #3

Reviewed the unmerged `ui/frutiger-aero` changes together with application code,
SQL migrations, dependency lockfile, service worker and hosting configuration.
PR remains open; no production data or accounts were altered.

## Confirmed repository vulnerabilities and fixes

| Severity | Finding and local reproduction | Fix in this PR |
| --- | --- | --- |
| Critical | Authenticated profile INSERT accepts `role='moderator'` or `tags=['OWNER']`; the original trigger only runs on UPDATE. A direct INSERT in the disposable database produced a staff account. | Check INSERT and UPDATE, force new client-created accounts to ordinary members, retain trusted SQL provisioning. |
| High | An invite recipient can change `requester_id` while accepting, fabricating an accepted friendship with another account. DMs trust accepted friendships. | Make friendship identities immutable and reject acceptance across an active block; ordinary requests/accept/decline and valid DMs still pass. |
| High | Message SELECT policy is `using(true)`, returning staff-room content to a normal member despite the room lock. Room INSERT also permits caller-selected staff-only locks. | Enforce room access on message and metadata reads and on room creation; keep room URL keys immutable to protect historical content; authorized staff retain access. |
| Medium | A caller can backdate `created_at`, or delete their most recent message, to reset history-based slow mode. Competing inserts have no atomic shared send clock. | Server timestamps plus a private atomic per-user/per-room clock that survives deletion; both cooldown RPCs read that clock. Seed it from existing messages and deletion logs. |
| Medium | The site-ban UI does not stop direct authenticated DM, bulletin, room and Storage API writes. | Restrictive database policies deny those operations while the ban is active, including data writes by a banned staff account. Existing public-chat moderation remains enforced. |
| Medium | `users_blocked(a,b)` is a SECURITY DEFINER RPC callable with arbitrary account IDs, disclosing private third-party block relationships. | Return a block result only when the caller is one of the two accounts; third-party probes return false. |

All six attack groups fail the expected-denial checks against the original SQL,
and pass with the new migration. These are findings in repository-defined
policies, not a claim that the deployed database was inspected or exploited.

## Additional hardening and negative tests

- Added Vercel HTTP CSP, `X-Frame-Options: DENY`, `nosniff` and `no-referrer`.
  Browser tests confirmed inline script injection and framing are blocked.
  This is hardening, not evidence of an exploited clickjacking incident.
- Tenor/Giphy frames are sandboxed; external images and profile frames suppress
  referrers. Existing script-free custom profile HTML/CSS remains available,
  as do profile colors, avatar-frame choices and music player skins.
- React message/profile payloads containing `<img onerror=...>` render as text.
  Custom profile HTML scripts and attempts to submit a form into the top window
  do not escape the existing empty sandbox. No working stored XSS was found in
  the tested paths. This does not cover every possible payload/browser.
- Malformed URLs, `javascript:`/`data:` media URLs, credentialed host lookalikes
  and deceptive Tenor/Giphy suffixes do not become executable media frames.
- Caller-scoped account export and login-history reads deny cross-account access.
- Updated Vite 7.3.6 → 7.3.7 and source-map-js 1.2.1 → 1.2.2. npm audit originally
  reported two high-severity vulnerable packages; after the updates it reports
  zero advisories. Vite's advisories concern development tooling, not a proven
  command-execution vulnerability in the deployed static app.
- Bumped the service-worker cache name so an updated worker retires old cached
  assets. The Aero styling and app features remain included.

## Validation

- `npm run test:security`: 12 passing tests, including PostgreSQL RLS/trigger attack tests, migration replay,
  upgrade seeding, valid-user controls, media URL cases and header assertions.
- `npm run test:security:browser`: real Chromium against a local production build
  using the proposed HTTP headers. No browser security protections disabled.
  External network calls aborted; sample accounts and malicious payloads are
  local test fixtures, not production records.
- Browser checks cover auth, Help/Privacy navigation, chat/profile injection,
  iframe isolation, personal profile colors, room directory and moderator
  layouts at 360, 390, 768 and 1440 pixels.
- `npm run build`, `git diff --check`, `npm audit`.

Tests use real PostgreSQL execution through PGlite with lightweight Auth and
Storage schema stubs. They do not simulate Supabase's HTTP gateway, hosted
Storage MIME handling, Realtime internals or concurrent database connections.
The send-clock UPSERT is atomic by PostgreSQL conflict semantics; the suite
exercises batched inserts but is not a multi-connection load test.

## Deployment and remaining verification

1. **Run `supabase-security.sql` in Supabase after the two existing scripts.**
   The browser deployment and a future PR merge do not run database migrations.
   Do not rerun older scripts afterwards unless you reapply this one last.
2. Review every existing `role` and `tags` assignment against your trusted staff
   list. This closes future self-promotion; it cannot identify or undo historical
   unauthorized promotions. A read-only inventory is:
   ```sql
   select id, username, role, tags, created_at
   from public.profiles
   where role <> 'member' or cardinality(tags) > 0
   order by created_at;
   ```
3. Deploy the branch to a staging Supabase project and repeat valid-member,
   staff, blocked-pair and banned-account flows through the actual Data API,
   Storage and Realtime. Confirm response headers on the deployed app itself.
4. Review Supabase Auth rate limits, email confirmation, CAPTCHA, credential
   policy and any additional live policies/RPCs in dashboard settings. These
   settings are not represented in this repository and were not verified.
5. The PR preview returned a Vercel SSO redirect, so authenticated live preview
   testing was unavailable. No production brute force, mass signup, destructive
   probes, real-message exfiltration or load testing was performed.

This is a scoped security assessment, not a guarantee that the service has no
remaining vulnerabilities. The PR has not been merged and the live database has
not been migrated by this assessment.
