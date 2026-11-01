# Symbiosis

A React messaging site with a deliberately nostalgic mid-2000s social-web visual.

## What is included

- Email + password sign up/login
- Usernames, top-bar user search, and friend requests
- One live `#lobby` room
- Private one-to-one direct messages
- Editable profiles with mood, location, and About Me
- Real-time messages using Supabase Realtime
- Old-web glossy buttons, blue underlined links, gradients, beveled panels, bright colors
- Mobile-friendly layout

## 1. Create the database

1. Create a project at Supabase.
2. Open **SQL Editor**.
3. Paste the whole **`supabase-install.sql`** file into SQL Editor and run it. This single transactional installer handles a new or incomplete database, creates missing tables such as `friendships`, and applies the security fixes last. Deploying the frontend does not run it.
4. Make sure email/password authentication is enabled in Supabase Auth.
5. Copy your project URL and browser-safe publishable key from the Supabase project settings.

## 2. Add your keys

Open `src/config.js` and replace:

```js
export const SUPABASE_URL = 'PASTE_YOUR_SUPABASE_URL_HERE';
export const SUPABASE_KEY = 'PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE';
```

with your project's values.

Use the browser-safe publishable/anon key only. Never put a Supabase `service_role` secret into this site.

## 3. Test locally

Install the dependencies and start Vite:

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite.

## 4. Put it on GitHub

Create a new GitHub repository and push these files. A typical command sequence is:

```bash
git init
git add .
git commit -m "Create Symbiosis"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/symbiosis.git
git push -u origin main
```

## 5. Put it on Vercel

Import the GitHub repo into Vercel. Vercel should detect Vite automatically. The build command is `npm run build` and the output directory is `dist`.

## Important before a big public launch

This is a starter, not a finished social platform. Before a public release, add account-level rate limits, message pagination, stronger abuse prevention, backups, and a legal/privacy review.

## Moderator setup

After running the complete `supabase.sql`, promote the first trusted moderator in the Supabase SQL Editor:

```sql
update public.profiles
set role = 'moderator', tags = array['OWNER']
where username = 'YOUR_USERNAME';
```

Moderators get a private report queue, message removal, and database-enforced lobby slow mode. Members can report messages or profiles and block other users. Blocking prevents new friend requests and direct messages in either direction.

Moderators can type `/slowmode SECONDS` with any non-negative whole number, such as `/slowmode 30`, or `/slowmode 0` to turn it off. Cooldowns are calculated from database history and survive refreshes and navigation.

Profile images can be uploaded directly to the `profile-images` Supabase Storage bucket created by `supabase.sql`. Profiles also include four original built-in retro tracks plus the existing direct-audio URL option.

Before launch, replace the Privacy page's operator/contact wording with your real operator identity, contact address, retention periods, and any disclosures required where you operate.

## PR #2 database migration

Run `supabase-pr2.sql` once in the Supabase SQL Editor before deploying the
custom cursors, room upgrades, login history, account export, and site-wide
events update. The migration is written so it can safely be run again.


## Security update (PR #3)

If you see `relation "public.friendships" does not exist` (or another missing-table error), run the whole **`supabase-install.sql`** instead of the security-only migration. It includes the base setup, PR #2, and security migration in the correct order, inside one transaction. It retains existing app rows and can be rerun.

For an existing installation already using PR #2 with all tables present, run **only**
`supabase-security.sql` in the Supabase SQL Editor. It is transactional and
rerunnable. Apply it before deploying the updated frontend. If you rerun an
older setup script later, run the security migration last again, because older
scripts replace policies and triggers.

The migration closes profile-insert privilege escalation, mutable friendship
participants, locked-room message reads, ban bypasses, private block RPC probes,
and slow-mode bypasses through timestamp spoofing/deletion. It adds a private
per-room send clock; all existing features and the Aero skin remain available.

Vercel reads `vercel.json` on deployment for CSP, anti-framing, MIME-sniffing and
referrer headers. If you change the Supabase project, update CSP `connect-src`
to its HTTPS and WSS origins as well as updating `src/config.js`.

Run repeatable security checks:

```bash
npm ci
npm run test:security
npx playwright install chromium
npm run test:security:browser
npm run build
npm audit
```

For an already installed Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`
when running the browser suite. The browser tests build a separate fixture
bundle in `.security-dist`; that bundle is never part of `npm run build` or
production deployment. Database tests use disposable PostgreSQL via PGlite,
with minimal local Auth/Storage schema stubs. They never contact your live data.
See `QA_SECURITY.md` for findings, evidence and remaining deployment checks.


## User search and profile borders

Signed-in users can search usernames in the top bar, open a result's profile,
send a friend request or accept an incoming request. Existing friends and
outgoing requests have separate labels. Search queries go to the database,
return at most 10 results, and hide your own account and accounts you blocked.

The Fire gradient avatar border has been removed. Existing profiles saved with
that border render with no frame; the profile editor selects None and saves
that supported value when updated. No extra border migration is required.

`supabase-install.sql` is generated from the three source migrations. After
editing those migrations, run `npm run build:database`; the security suite checks
that the generated installer is current.
